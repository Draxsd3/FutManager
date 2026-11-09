import { assessMove } from "./market-rules";
import { MAX_CLUB_SQUAD_SIZE, type EditorDatabase } from "../editor-data";
import type { ManagerMarket } from "../manager-market";
import type { CareerLoans, LoanContract } from "../loans";
import { dateAfterMonths } from "../loans";
import type { TransferNegotiation } from "../transfers";
import { civilDate } from "./foundation";

/** All domain amounts are integer BRL cents. Legacy screens expose R$ thousands. */
export function brlToCents(value: number) {
  const cents = Math.round(value * 100);
  if (!Number.isFinite(value) || (!Number.isSafeInteger(cents) || Math.abs(cents) > 1e14)) throw new Error("Valor monetário inválido.");
  return cents;
}
export const thousandsToCents = (value: number) => brlToCents(value * 1000);
export const centsToThousands = (value: number) => value / 100_000;
export const FINANCE_RULES = Object.freeze({ version: "finance-v1", salaryHorizonMonths: 12, newContractMonths: 12, loanMonths: 6, commissionSupported: false, instalmentsSupported: false });
export type Employment = {
  personKind?: "coach"; id: string; playerId: string; clubId: string; startsOn: string; endsOn: string | null;
  monthlyCents: number | null; accruedThrough: string; origin: "legacy" | "game"; status: "active" | "expired";
};
export type Registration = { clubId: string; status: "registered" | "pending"; reason: string };
export type RegistrationPolicy = { source: string; validFrom: string; validUntil: string; windows: { from: string; to: string }[] };
export type LedgerEntry = { id: string; date: string; clubId: string; kind: "opening" | "legacy-adjustment" | "coach-fee" | "transfer" | "wage-accrual" | "wage-payment"; amountCents: number; cashDeltaCents: number; reference: string };
export type FinanceState = {
  version: 1; rulesVersion: "finance-v1"; adoptedOn: string; through: string;
  clubs: Record<string, { cashCents: number; projectedThousands: number }>;
  contracts: Record<string, Employment>; history: Employment[];
  registrations: Record<string, Registration>; registrationPolicy?: RegistrationPolicy;
  loans: CareerLoans;
  ledger: LedgerEntry[];
  payables: Record<string, { clubId: string; amountCents: number; paidCents: number; dueOn: string }>;
  reservations: Record<string, { clubId: string; cents: number }>;
  settlements: Record<string, { fingerprint: string; deal: TransferNegotiation }>;
};
const dayAfter = (date: string) => new Date(Date.parse(`${civilDate(date)}T12:00:00Z`) + 86400000).toISOString().slice(0,10);
const min = (a: string,b: string) => a < b ? a : b;
const max = (a: string,b: string) => a > b ? a : b;
function post(s: FinanceState, entry: LedgerEntry) {
  const club = s.clubs[entry.clubId];
  if (!club || !Number.isSafeInteger(entry.amountCents) || !Number.isSafeInteger(entry.cashDeltaCents) || !Number.isSafeInteger(club.cashCents + entry.cashDeltaCents)) throw new Error("Lançamento financeiro inválido.");
  s.ledger.push(entry); club.cashCents += entry.cashDeltaCents;
}
export function registrationAt(s: FinanceState, clubId: string, date: string): Registration {
  const p = s.registrationPolicy;
  if (!p) return { clubId,status:"registered",reason:"Regra legada de inscrição livre; não é certificação de janela oficial." };
  if (!p.source.trim() || civilDate(p.validFrom) > date || civilDate(p.validUntil) < date) return {clubId,status:"pending",reason:"Regulamento sem vigência comprovada nesta data."};
  return { clubId,status:p.windows.some(w => civilDate(w.from) <= date && date <= civilDate(w.to)) ? "registered" : "pending",reason:p.source };
}
/** Opening balances adopt the saved aggregate, never reconstruct or repay historical months. */
export function adoptFinance(market: ManagerMarket, db: EditorDatabase, date: string, loans: CareerLoans = {}, human?: { clubId: string; budget: number }): ManagerMarket {
  civilDate(date);
  if (market.finance && (market.finance.version !== 1 || market.finance.rulesVersion !== FINANCE_RULES.version)) throw new Error("Versão financeira incompatível; save preservado.");
  if (market.finance && market.finance.through === date && Object.entries(market.clubs).every(([id,c]) => market.finance!.clubs[id]?.projectedThousands === (human?.clubId===id ? human.budget : c.budget)) && db.players.every(p=>market.finance!.contracts[p.id] || !p.clubId || !market.clubs[p.loan?.owner.clubId ?? p.clubId])) return market;
  const s: FinanceState = market.finance ? structuredClone(market.finance) : { version:1,rulesVersion:"finance-v1",adoptedOn:date,through:date,clubs:{},contracts:{},history:[],registrations:{},loans:structuredClone(loans),ledger:[],payables:{},reservations:{},settlements:{} };
  if (date < s.through) throw new Error("A data financeira não pode retroceder.");
  for (const [id,c] of Object.entries(market.clubs)) {
    const value = human?.clubId === id ? human.budget : c.budget;
    const cents = thousandsToCents(value);
    if (!s.clubs[id]) {
      s.clubs[id] = {cashCents:0,projectedThousands:value};
      post(s,{id:`opening:${id}`,date,clubId:id,kind:"opening",amountCents:cents,cashDeltaCents:cents,reference:"Saldo salvo na adoção; sem reconstrução histórica."});
    } else if (value !== s.clubs[id].projectedThousands) {
      const delta = cents - s.clubs[id].cashCents;
      post(s,{id:`legacy:${id}:${s.ledger.length}`,date,clubId:id,kind:"legacy-adjustment",amountCents:delta,cashDeltaCents:delta,reference:"Ponte explícita para receita/obra legada; não folha ou transferência."});
    }
    s.clubs[id].projectedThousands = value;
  }
  for (const p of db.players) if (!s.contracts[p.id] && p.clubId && s.clubs[p.loan?.owner.clubId ?? p.clubId]) {
    // Missing, stale or invalid imported expiry never means a free pass.
    let end: string | null = null;
    try { if (p.contractEndsOn >= date) end = civilDate(p.contractEndsOn); } catch { /* preserve unknown */ }
    s.contracts[p.id] = {id:`employment:${p.id}:legacy`,playerId:p.id,clubId:p.loan ? p.loan.owner.clubId ?? `external:${p.loan.owner.externalId ?? p.loan.owner.name}` : p.clubId,startsOn:date,endsOn:end,monthlyCents:Number.isFinite(p.salaryMonthlyBrl) && p.salaryMonthlyBrl >= 0 ? brlToCents(p.salaryMonthlyBrl) : null,accruedThrough:date,origin:"legacy",status:"active"};
    s.registrations[p.id] = {clubId:p.clubId,status:"registered",reason:"Inscrição preservada do save na adoção."};
  }
  return projectFinance({...market,finance:s});
}
/** The cash bridge is only for unconverted legacy income/works. Financial commands use post(). */
export function projectFinance(market: ManagerMarket): ManagerMarket {
  if (!market.finance) return market;
  const s = structuredClone(market.finance), clubs = {...market.clubs};
  const payroll: Record<string,number> = {};
  for (const c of Object.values(s.contracts)) if (!c.endsOn || c.endsOn >= s.through) for (const [id,amount] of payers(c,s.loans[c.playerId],s.through)) payroll[id]=(payroll[id] ?? 0)+amount;
  for (const [id,f] of Object.entries(s.clubs)) {
    f.projectedThousands = centsToThousands(f.cashCents);
    if (clubs[id]) clubs[id] = {...clubs[id],budget:f.projectedThousands,payroll:centsToThousands(payroll[id] ?? 0)};
  }
  return {...market,clubs,finance:s};
}
function payers(c: Employment, loan: LoanContract | undefined, date: string): [string,number][] {
  if (c.monthlyCents === null || c.status !== "active") return [];
  if (loan && loan.startsOn && loan.endsOn && loan.startsOn <= date && date < loan.endsOn) {
    const owner = loan.owner.clubId ?? c.clubId, borrower = loan.borrower.clubId;
    // Unknown split is explicitly the legacy 50% simulation policy, not source data.
    const own = Math.round(c.monthlyCents * (1-(loan.wageSharePercent ?? 50)/100));
    return borrower ? [[owner,own],[borrower,c.monthlyCents-own]] : [[owner,c.monthlyCents]];
  }
  return [[c.clubId,c.monthlyCents]];
}
export function monthlyPayroll(s: FinanceState, clubId: string) {
  return Object.values(s.contracts).reduce((sum,c) => sum + (c.endsOn && c.endsOn < s.through ? 0 : payers(c,s.loans[c.playerId],s.through).filter(([id])=>id===clubId).reduce((n,[,v])=>n+v,0)),0);
}
/** Half-open wage intervals [start, end); cents use calendar-month cumulative rounding.
 * Splitting the same interval into many advances cannot change accrued wages. */
function slices(c: Employment, loan: LoanContract | undefined, from: string, to: string, visit: (club: string,amount: number,month: string,due: string)=>void) {
  if (c.monthlyCents === null || c.status !== "active") return;
  let at = max(from,c.startsOn);
  const end = c.endsOn ? min(to,dayAfter(c.endsOn)) : to;
  while (at < end) {
    const month = at.slice(0,7), first = `${month}-01`, next = dateAfterMonths(first,1);
    let until = min(end,next);
    for (const boundary of [loan?.startsOn,loan?.endsOn]) if (boundary && boundary > at && boundary < until) until=boundary;
    const days = (Date.parse(`${next}T12:00:00Z`)-Date.parse(`${first}T12:00:00Z`))/86400000;
    const before = (Date.parse(`${at}T12:00:00Z`)-Date.parse(`${first}T12:00:00Z`))/86400000;
    const after = (Date.parse(`${until}T12:00:00Z`)-Date.parse(`${first}T12:00:00Z`))/86400000;
    for (const [club,wage] of payers(c,loan,at)) visit(club,Math.floor(wage*after/days)-Math.floor(wage*before/days),month,next);
    at=until;
  }
}
export function financeAvailability(s: FinanceState, clubId: string, excludingReservation?: string) {
  const payables = Object.values(s.payables).filter(p=>p.clubId===clubId).reduce((n,p)=>n+p.amountCents-p.paidCents,0);
  const horizon = dateAfterMonths(s.through,FINANCE_RULES.salaryHorizonMonths);
  let wages = 0, reservations = 0;
  for (const c of Object.values(s.contracts)) {
    const loan=s.loans[c.playerId];
    if (c.clubId!==clubId && loan?.owner.clubId!==clubId && loan?.borrower.clubId!==clubId) continue;
    slices(c,loan,s.through,horizon,(id,amount)=>{if(id===clubId) wages+=amount;});
  }
  for (const [id,r] of Object.entries(s.reservations)) if (id!==excludingReservation && r.clubId===clubId) reservations+=r.cents;
  const cash = s.clubs[clubId]?.cashCents ?? 0;
  const unreserved = cash - payables - wages - reservations;
  return {cash, payables, wages, reservations, unreserved, available: Math.max(0, unreserved)};
}
export function unreservedCents(s: FinanceState, clubId: string, excludingReservation?: string) {
  return financeAvailability(s, clubId, excludingReservation).unreserved;
}
export const availableCents = (s: FinanceState, clubId: string, excludingReservation?: string) => Math.max(0,unreservedCents(s,clubId,excludingReservation));
/** No overdraft fiction: competence is accrued independently; insufficient cash becomes a payable. */
export function accrueFinance(state: FinanceState, date: string): FinanceState {
  civilDate(date);
  if (date < state.through) throw new Error("Competência financeira não pode retroceder.");
  const s = structuredClone(state);
  for (const c of Object.values(s.contracts).sort((a,b)=>a.id.localeCompare(b.id))) {
    slices(c,s.loans[c.playerId],c.accruedThrough,date,(clubId,amount,month,dueOn)=>{
      if (!amount || !s.clubs[clubId]) return;
      const key=`wage:${c.id}:${clubId}:${month}`;
      const due=s.payables[key] ?? {clubId,amountCents:0,paidCents:0,dueOn}; due.amountCents+=amount; s.payables[key]=due;
      post(s,{id:`${key}:${date}`,date,clubId,kind:"wage-accrual",amountCents:amount,cashDeltaCents:0,reference:key});
    });
    c.accruedThrough=date;
    if (c.endsOn && c.endsOn < date && c.status === "active") { c.status="expired"; if(c.personKind!=="coach") s.registrations[c.playerId]={clubId:"",status:"pending",reason:"Contrato encerrado pelo calendário da carreira."}; }
  }
  s.through=date;
  for (const [key,p] of Object.entries(s.payables).sort(([a],[b])=>a.localeCompare(b))) if (p.dueOn <= date && p.paidCents < p.amountCents) {
    const amount=Math.min(p.amountCents-p.paidCents,Math.max(0,s.clubs[p.clubId]?.cashCents ?? 0));
    if (!amount) continue;
    p.paidCents+=amount;
    post(s,{id:`payment:${key}:${p.paidCents}`,date,clubId:p.clubId,kind:"wage-payment",amountCents:amount,cashDeltaCents:-amount,reference:key});
  }
  // A returning player resumes the owner's registration; missing policy stays explicitly legacy.
  for (const [id,loan] of Object.entries(s.loans)) if (loan.endsOn && loan.endsOn <= date && loan.endsOn > state.through && s.contracts[id]?.status === "active") s.registrations[id]=registrationAt(s,s.contracts[id].clubId,date);
  for (const r of Object.values(s.registrations)) if (r.status === "pending" && r.clubId && registrationAt(s,r.clubId,date).status === "registered") Object.assign(r,registrationAt(s,r.clubId,date));
  for (const loan of Object.values(s.loans)) if (loan.endsOn && loan.endsOn <= date) loan.status="returned";
  return s;
}
export function financeDatabase(db: EditorDatabase, s?: FinanceState): EditorDatabase {
  if (!s) return db;
  return {...db,players:db.players.map(p=>{
    const c=s.contracts[p.id]; if(!c) return p;
    const loan=s.loans[p.id], active=loan?.startsOn && loan.endsOn && loan.startsOn <= s.through && s.through < loan.endsOn;
    const clubId=c.status === "expired" ? "" : active ? loan.borrower.clubId ?? c.clubId : c.clubId;
    return {...p,clubId,loan:c.status !== "expired" && loan ? {...loan,status:active ? "active" as const : "returned" as const} : undefined,salaryMonthlyBrl:c.monthlyCents === null ? p.salaryMonthlyBrl : c.monthlyCents/100,contractEndsOn:c.endsOn ?? p.contractEndsOn,registrationStatus:s.registrations[p.id]?.status ?? "registered"};
  })};
}
export function dealCost(deal: TransferNegotiation, monthly: number) {
  if (!Number.isFinite(deal.agreedFeeBrl) || deal.agreedFeeBrl! < 0) throw new Error("Taxa inválida.");
  const share=deal.kind === "loan" ? deal.agreedWageSharePercent ?? deal.wageSharePercent : 100;
  if (!Number.isFinite(share) || share < 0 || share > 100) throw new Error("Participação salarial inválida.");
  return brlToCents(deal.agreedFeeBrl ?? NaN)+Math.round(monthly*share/100)*(deal.kind === "loan" ? FINANCE_RULES.loanMonths : FINANCE_RULES.newContractMonths);
}
export function reserveDeal(state: FinanceState, deal: TransferNegotiation, db: EditorDatabase): FinanceState {
  const s=structuredClone(state);
  delete s.reservations[deal.id];
  if (deal.status !== "agreed") return s;
  if (!deal.id || !s.clubs[deal.buyerClubId]) throw new Error("Reserva de negociação inválida.");
  const p=db.players.find(p=>p.id===deal.playerId);
  if (!p || !Number.isFinite(p.salaryMonthlyBrl) || p.salaryMonthlyBrl < 0) throw new Error("Salário desconhecido ou inválido.");
  const wage=deal.kind === "sale" ? deal.agreedMonthlyWageBrl ?? p.salaryMonthlyBrl : p.salaryMonthlyBrl;
  if(!Number.isFinite(wage) || wage < 0) throw new Error("Salário proposto inválido.");
  const cost=dealCost(deal,brlToCents(wage));
  if (cost > availableCents(s,deal.buyerClubId)) throw new Error("Saldo disponível insuficiente para taxa e compromissos salariais.");
  s.reservations[deal.id]={clubId:deal.buyerClubId,cents:cost};
  return s;
}
/** One executor for human acquisition, human sale and CPU. Private copy until checkpoint commit. */
export function settleTransfer(state: FinanceState, db: EditorDatabase, deal: TransferNegotiation, date: string): {finance: FinanceState; deal: TransferNegotiation; loans: CareerLoans} {
  civilDate(date);
  const fingerprintParts: unknown[]=[deal.playerId,deal.sourceClubId,deal.buyerClubId,deal.kind,deal.agreedFeeBrl,deal.agreedWageSharePercent,date,deal.paymentTerms ?? {kind:"cash"},deal.commission];
  if(deal.agreedMonthlyWageBrl !== undefined) fingerprintParts.push(deal.agreedMonthlyWageBrl);
  const fingerprint=JSON.stringify(fingerprintParts);
  const old=state.settlements[deal.id];
  if(old) {if(old.fingerprint!==fingerprint) throw new Error("Identidade de liquidação reutilizada."); return {finance:state,deal:old.deal,loans:state.loans};}
  if (!deal.id || deal.status !== "agreed" || !["sale","loan"].includes(deal.kind) || !state.clubs[deal.buyerClubId] || deal.buyerClubId===deal.sourceClubId) throw new Error("Acordo de transferência inválido.");
  // Exotic terms are not silently interpreted as an immediate cash deal.
  if ("instalments" in deal || "commissionBrl" in deal || deal.commission || (deal.paymentTerms && deal.paymentTerms.kind !== "cash")) throw new Error("Parcelas e comissões ainda não habilitadas.");
  const s=accrueFinance(state,date), p=db.players.find(p=>p.id===deal.playerId), current=s.contracts[deal.playerId];
  if(p?.condition?.retiredOn) throw new Error("Atleta aposentado não pode assumir novo vínculo.");
  const owner=current ? current.status === "expired" ? "" : current.clubId : p?.clubId;
  const loan=s.loans[deal.playerId];
  if (!p || owner!==deal.sourceClubId || loan && (!loan.endsOn || date < loan.endsOn) && loan.status === "active") throw new Error("O vínculo mudou ou há empréstimo vigente. Revalide a proposta.");
  if (!owner && (!deal.freeAgent || deal.kind !== "sale" || deal.agreedFeeBrl !== 0)) throw new Error("Passe livre exige ausência explícita de vínculo e taxa zero.");
  if (owner && (!s.clubs[owner] || deal.freeAgent || !Number.isFinite(deal.agreedFeeBrl) || deal.agreedFeeBrl! <= 0)) throw new Error("Proprietário ou taxa inválidos.");
  if (!Number.isFinite(p.salaryMonthlyBrl) || p.salaryMonthlyBrl < 0) throw new Error("Salário desconhecido ou inválido.");
  if(deal.expiresOn && civilDate(deal.expiresOn)<date) throw new Error("A proposta expirou; faça uma nova negociação.");
  if(deal.origin==="cpu" && owner) {
    const sellerRoster=financeDatabase(db,s).players.filter(p=>p.clubId===owner);
    if(sellerRoster.length<=20 || sellerRoster.filter(o=>o.primaryPosition===p.primaryPosition).length<=(p.primaryPosition==="G" ? 2 : 3)) throw new Error("A saída comprometeria a profundidade do vendedor.");
  }
  const offered=deal.kind === "sale" ? deal.agreedMonthlyWageBrl ?? p.salaryMonthlyBrl : p.salaryMonthlyBrl;
  if(!Number.isFinite(offered) || offered<0) throw new Error("Salário proposto inválido.");
  if(deal.createdOn) {
    const roster=financeDatabase(db,s).players.filter(p=>p.clubId===deal.buyerClubId);
    const assessment=assessMove(p,roster,deal.kind,offered);
    if(!assessment.accepted) throw new Error(assessment.reason);
  }
  const monthly=brlToCents(offered), cost=dealCost(deal,monthly);
  if(cost > availableCents(s,deal.buyerClubId,deal.id)) throw new Error("Saldo disponível insuficiente para taxa e compromissos salariais.");
  if (financeDatabase(db,s).players.filter(p=>p.clubId===deal.buyerClubId).length >= MAX_CLUB_SQUAD_SIZE) throw new Error("Elenco no limite técnico de contratos.");
  const fee=brlToCents(deal.agreedFeeBrl!);
  post(s,{id:`transfer:${deal.id}:buyer`,date,clubId:deal.buyerClubId,kind:"transfer",amountCents:fee,cashDeltaCents:-fee,reference:deal.id});
  if(owner) post(s,{id:`transfer:${deal.id}:seller`,date,clubId:owner,kind:"transfer",amountCents:fee,cashDeltaCents:fee,reference:deal.id});
  if(deal.kind === "sale") {
    if(current) s.history.push({...current});
    s.contracts[p.id]={id:`employment:${deal.id}`,playerId:p.id,clubId:deal.buyerClubId,startsOn:date,endsOn:new Date(Date.parse(`${dateAfterMonths(date,FINANCE_RULES.newContractMonths)}T12:00:00Z`)-86400000).toISOString().slice(0,10),monthlyCents:monthly,accruedThrough:date,origin:"game",status:"active"};
    delete s.loans[p.id];
  } else {
    if (!current || !current.endsOn || current.endsOn < dateAfterMonths(date,FINANCE_RULES.loanMonths)) throw new Error("Contrato do proprietário não cobre o empréstimo; renove antes.");
    s.loans[p.id]={owner:{clubId:owner,name:deal.sourceClub},borrower:{clubId:deal.buyerClubId,name:db.clubs.find(c=>c.id===deal.buyerClubId)!.name},startsOn:date,endsOn:dateAfterMonths(date,FINANCE_RULES.loanMonths),status:"active",source:"game",wageSharePercent:deal.agreedWageSharePercent ?? deal.wageSharePercent};
  }
  s.registrations[p.id]=registrationAt(s,deal.buyerClubId,date);
  delete s.reservations[deal.id];
  const completed={...deal,status:"completed" as const,completedOn:date,message:"Transferência liquidada: taxa paga uma vez; salários são compromissos por competência."};
  s.settlements[deal.id]={fingerprint,deal:completed};
  return {finance:s,deal:completed,loans:s.loans};
}
export function renewEmployment(state: FinanceState, playerId: string, clubId: string, date: string, endsOn: string, monthlyBrl: number): FinanceState {
  civilDate(endsOn);
  const s=accrueFinance(state,date), c=s.contracts[playerId];
  if (!c || c.clubId!==clubId || c.status!=="active" || endsOn <= date || !Number.isFinite(monthlyBrl) || monthlyBrl <= 0 || s.loans[playerId]?.status === "active") throw new Error("Renovação de contrato inválida.");
  const before=unreservedCents(s,clubId);
  s.history.push({...c});
  s.contracts[playerId]={...c,id:`renewal:${playerId}:${date}:${endsOn}:${monthlyBrl}`,startsOn:date,endsOn,monthlyCents:brlToCents(monthlyBrl)};
  if (unreservedCents(s,clubId) < Math.min(0,before)) throw new Error("Saldo disponível insuficiente para ampliar os compromissos salariais.");
  return s;
}
