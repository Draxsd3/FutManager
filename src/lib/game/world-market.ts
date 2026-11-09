import { bindMatchCoaches } from "./simulation/match-plans";
import { populationDatabase, type PlayerPopulation } from "./simulation/players";
import { buildClubPlan, marketOptions, rosterIndex, marketContextKey, type MarketStrategy, type MarketSelection, type MarketContext } from "./simulation/market-planning";
import { MARKET_RULES } from "./simulation/market-rules";
import type { CareerSeason } from "./season";
import { adoptFinance, accrueFinance, financeDatabase, projectFinance, reserveDeal, settleTransfer, type FinanceState } from "./simulation/finance";
import { ENGINE_CONFIG } from "./simulation/foundation";
import type { EditorDatabase } from "./editor-data";
import { databaseWithLoans, type CareerLoans } from "./loans";
import { appointManager, type ManagerMarket } from "./manager-market";
import { databaseWithCompletedTransfers, proposeTransfer, respondToTransferNegotiation, type TransferNegotiation } from "./transfers";

export type WorldMarket = {
  population?: PlayerPopulation;
  marketState?: MarketStrategy;
  lastWeek?: number;
  listings: Record<string, "sale" | "loan" | "normal">;
  events: { date: string; text: string }[];
};
export function worldDatabase(database: EditorDatabase, deals: TransferNegotiation[], loans: CareerLoans, world?: WorldMarket, finance?: FinanceState,coaches?:import("./simulation/coaches").CoachState): EditorDatabase {
  const base=populationDatabase(database,world?.population);
  const effective = financeDatabase(databaseWithLoans(databaseWithCompletedTransfers({ ...base, players: base.players.map(p => ({ ...p, loan: undefined })) }, deals), loans), finance);
  return bindMatchCoaches(world ? { ...effective, players: effective.players.map(p => world.listings[p.id] && p.loan?.status !== "active" ? { ...p, marketStatus: world.listings[p.id] } : p) } : effective,coaches?.coaches);
}
const hash = (value: string) => { let n = 2166136261; for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };

/** One bounded decision round per elapsed game week, never on render or wall-clock time.
 * Data is an overlay inside a single career, not a rewrite of the editor's universe.
 * No forced transactions involving the human club or an active human negotiation.
 */
export function simulateWorldMarket(input: { database: EditorDatabase; humanClubId: string; date: string; previousDate: string; world?: WorldMarket; negotiations: TransferNegotiation[]; loans: CareerLoans; managers: ManagerMarket; season?: CareerSeason; revision?: number; careerId?: string; selection?: MarketSelection }) {
  const week = Math.floor(Date.parse(`${input.date}T12:00:00Z`) / 604800000);
  const previousWeek = Math.floor(Date.parse(`${input.previousDate}T12:00:00Z`) / 604800000);
  let world: WorldMarket = input.world ?? { listings: {}, events: [] };
  let managers = input.managers;
  let negotiations = input.negotiations;
  let loans = input.loans;
  if (!Number.isFinite(week) || week <= (world.lastWeek ?? previousWeek)) return { world, managers, negotiations, loans };
  world = { ...world, lastWeek: week, listings: { ...world.listings }, events: [...world.events] };
  managers = adoptFinance(managers, worldDatabase(input.database,negotiations,loans,world),managers.finance?.through ?? input.previousDate,loans);
  managers = projectFinance({...managers,finance:accrueFinance(managers.finance!,input.date)});
  negotiations = [...negotiations]; loans = { ...loans };
  const record = (text: string) => world.events.unshift({ date: input.date, text });
  const state: MarketStrategy = world.marketState ? structuredClone(world.marketState) : {version:1,mode:"internal",plans:{},audit:[],rounds:[]};
  if(state.version!==1 || !["internal","assisted","comparison"].includes(state.mode)) throw new Error("Versão do planejamento de mercado incompatível; save preservado.");
  delete state.pilotContext;
  world.marketState=state;
  let completed=0, rejected=0, proposals=0;
  const close = (id: string, message: string) => {
    negotiations=negotiations.map(d=>d.id===id ? {...d,status:"rejected" as const,revision:(d.revision ?? 0)+1,message} : d);
    delete managers.finance!.reservations[id]; rejected++;
  };
  // Deadlines are simulated dates, not request time. All interested clubs compete on one owner.
  for(const deal of negotiations.filter(d=>d.origin==="cpu" && d.sourceClubId!==input.humanClubId && (d.status==="countered" || d.status==="agreed")).sort((a,b)=>(b.agreedFeeBrl ?? b.counterFeeBrl ?? 0)-(a.agreedFeeBrl ?? a.counterFeeBrl ?? 0) || (b.agreedMonthlyWageBrl ?? 0)-(a.agreedMonthlyWageBrl ?? 0) || a.id.localeCompare(b.id))) {
    if(deal.expiresOn && deal.expiresOn<input.date) { close(deal.id,"Prazo da proposta expirou sem liquidação."); continue; }
    if(completed>=MARKET_RULES.maxSettlements || (deal.respondAfter && deal.respondAfter>input.date)) continue;
    if(!negotiations.some(d=>d.id===deal.id && d.status!=="rejected")) continue;
    let accepted=deal.status==="countered" ? respondToTransferNegotiation(deal,{type:"accept-counter"}).negotiation : deal;
    const current=worldDatabase(input.database,negotiations,loans,world,managers.finance);
    try {
      const settled=settleTransfer(managers.finance!,current,accepted,input.date);
      accepted={...settled.deal,revision:(deal.revision ?? 0)+1}; loans=settled.loans;
      managers=projectFinance({...managers,finance:settled.finance});
      negotiations=negotiations.map(d=>d.id===deal.id ? accepted : d);
      for(const rival of negotiations.filter(d=>d.playerId===deal.playerId && d.id!==deal.id && d.status!=="completed" && d.status!=="rejected")) close(rival.id,"Outro acordo foi liquidado; vínculo indisponível.");
      delete world.listings[deal.playerId]; completed++;
      record(`${current.clubs.find(c=>c.id===deal.buyerClubId)?.name} ${deal.kind==="loan" ? "recebeu por empréstimo" : "contratou"} ${deal.playerName}; taxa e compromissos revalidados.`);
    } catch { close(deal.id,"Condições, propriedade ou saldo mudaram; negociação encerrada sem efeitos parciais."); }
  }
  const db = worldDatabase(input.database, negotiations, loans, world, managers.finance);
  const rosters=rosterIndex(db);
  const protectedPlayers=new Set(negotiations.filter(d => ((d.status==="agreed" || d.status==="countered") && d.buyerClubId===input.humanClubId) || (d.status==="completed" && d.completedOn && Date.parse(`${input.date}T12:00:00Z`)-Date.parse(`${d.completedOn}T12:00:00Z`)<ENGINE_CONFIG.worldMarket.cooldownDays*86400000)).map(d=>d.playerId));
  for(const club of db.clubs) {
    const roster=rosters.get(club.id) ?? [];
    state.plans[club.id]=buildClubPlan(club.id,roster,managers.finance!,input.date,input.season,state.plans[club.id]);
    if(club.id===input.humanClubId || roster.length<=20) continue;
    const surplus=roster.filter(p=>p.marketStatus==="normal" && p.loan?.status!=="active" && !protectedPlayers.has(p.id) && roster.filter(other=>other.primaryPosition===p.primaryPosition).length>(p.primaryPosition==="G" ? 2 : 4)).sort((a,b)=>a.overall-b.overall || a.id.localeCompare(b.id))[0];
    if(surplus && !world.listings[surplus.id]) {
      world.listings[surplus.id]=surplus.age<=23 ? "loan" : "sale"; surplus.marketStatus=world.listings[surplus.id];
      record(`${club.name} disponibilizou ${surplus.name} para ${surplus.marketStatus==="loan" ? "empréstimo" : "venda"}, conforme profundidade do elenco.`);
    }
  }
  const candidates=db.players.filter(p=>(p.marketStatus==="sale" || p.marketStatus==="loan" || !p.clubId.trim()) && p.clubId!==input.humanClubId && !protectedPlayers.has(p.id));
  for(const buyer of [...db.clubs].sort((a,b)=>hash(`${week}:${a.id}`)-hash(`${week}:${b.id}`))) {
    if(proposals>=MARKET_RULES.maxProposals || buyer.id===input.humanClubId || !managers.clubs[buyer.id] || negotiations.some(d=>d.buyerClubId===buyer.id && (d.status==="agreed" || d.status==="countered"))) continue;
    const plan=state.plans[buyer.id], roster=rosters.get(buyer.id) ?? [];
    const options=marketOptions(plan,roster,candidates,rosters,managers.finance!,db);
    if(options.length===1) continue;
    const context: MarketContext={decisionId:`${input.careerId ?? "world"}:market:${week}:${buyer.id}`,stateRevision:input.revision ?? 0,rulesVersion:"market-v1",simulatedOn:input.date,actorId:buyer.id,spendingLimitCents:plan.spendingLimitCents,needs:plan.needs,missingFacts:["personalidade","representação/empresário"],options};
    if(!state.pilotContext) state.pilotContext=context;
    const selection=input.selection?.decisionId===context.decisionId ? input.selection : undefined;
    const valid=selection && selection.mode===state.mode && selection.contextKey===marketContextKey(context) && selection.stateRevision===context.stateRevision && options.some(o=>o.actionId===selection.actionId) && (!selection.comparedActionId || options.some(o=>o.actionId===selection.comparedActionId));
    const action=valid && state.mode==="assisted" ? options.find(o=>o.actionId===selection.actionId)! : options[0];
    state.audit.push({...valid && selection ? selection : {decisionId:context.decisionId,stateRevision:context.stateRevision,contextKey:marketContextKey(context),actionId:action.actionId,reason:action.reason,mode:state.mode,fallback:selection ? "stale-or-invalid-response" : state.mode==="internal" ? undefined : "internal-outside-pilot"},date:input.date,actorId:buyer.id,executed:true});
    if(action.kind==="wait") continue;
    const result=proposeTransfer(db,negotiations,{id:`cpu:${week}:${buyer.id}:${action.playerId}`,playerId:action.playerId!,buyerClubId:buyer.id,feeBrl:action.feeBrl!,monthlyWageBrl:action.salaryBrl,wageSharePercent:50});
    if(!result.negotiation || result.negotiation.status==="rejected") continue;
    const addDays=(days: number)=>new Date(Date.parse(`${input.date}T12:00:00Z`)+days*86400000).toISOString().slice(0,10);
    // The contextual seller price is authoritative, not the fixed catalog asking price.
    const deal: TransferNegotiation={...result.negotiation,askingFeeBrl:action.feeBrl!,offerFeeBrl:action.feeBrl!,counterFeeBrl:undefined,status:"agreed",agreedFeeBrl:action.feeBrl!,agreedWageSharePercent:result.negotiation.kind==="loan" ? 50 : 100,revision:1,createdOn:input.date,respondAfter:addDays(MARKET_RULES.responseDays),expiresOn:addDays(MARKET_RULES.proposalDays),origin:"cpu",message:`Proposta em análise até ${addDays(MARKET_RULES.proposalDays)}. ${action.reason}`};
    try { managers={...managers,finance:reserveDeal(managers.finance!,deal,db)}; }
    catch { continue; }
    negotiations.unshift(deal); proposals++;
    record(`${buyer.name} abriu negociação por ${deal.playerName}: ${action.reason}`);
  }
  state.audit=state.audit.slice(-200);
  state.rounds.push({date:input.date,proposals,completed,rejected,clubCount:db.clubs.length,needs:Object.values(state.plans).reduce((n,p)=>n+p.needs.filter(x=>x.priority>0).length,0),availableCents:Object.values(state.plans).reduce((n,p)=>n+p.availableCents,0)});
  state.rounds=state.rounds.slice(-52);
  // Recompute payroll from actual ownership/loan shares; keep the existing match economy.
  const effective = worldDatabase(input.database, negotiations, loans, world, managers.finance);
  const payroll: Record<string, number> = {};
  for (const p of effective.players) {
    const loan = p.loan;
    if (loan?.status === "active") {
      const share = (loan.wageSharePercent ?? 50)/100;
      if (loan.owner.clubId) payroll[loan.owner.clubId] = (payroll[loan.owner.clubId] ?? 0)+p.salaryMonthlyBrl*(1-share)/1000;
      if (loan.borrower.clubId) payroll[loan.borrower.clubId] = (payroll[loan.borrower.clubId] ?? 0)+p.salaryMonthlyBrl*share/1000;
    } else payroll[p.clubId] = (payroll[p.clubId] ?? 0)+p.salaryMonthlyBrl/1000;
  }
  for (const [id, club] of Object.entries(managers.clubs)) if (id !== input.humanClubId) managers.clubs[id] = { ...club, payroll: payroll[id] ?? 0 };
  // A vacancy waits at least one decision round; live job offers are never stolen.
  const occupied = new Set(Object.values(managers.clubs).map(c => c.coach).filter(Boolean));
  const pool = [...new Set([...db.clubs.map(c => c.coachName), ...managers.dismissals.map(d => d.coach)])].filter(name => name && !occupied.has(name));
  for (const club of db.clubs) {
    if (club.id === input.humanClubId || managers.clubs[club.id]?.coach !== null || managers.applications?.some(a => a.clubId === club.id && a.status === "offered" && a.expiresOn >= input.date) || hash(`${week}:${club.id}:coach`)%3 !== 0) continue;
    const index = pool.findIndex(name => !managers.dismissals.some(d => d.clubId === club.id && d.coach === name));
    if (index < 0) continue;
    const [name] = pool.splice(index, 1);
    const appointed = appointManager(managers, club.id, name);
    if (appointed) { managers = appointed; record(`${club.name} contratou o técnico ${name}.`); }
  }
  world.events = world.events.slice(0,100);
  return { world, managers:projectFinance(managers), negotiations, loans };
}
