import type { CareerSave, EditorDatabase } from "../editor-data";
import type { ManagerMarket } from "../manager-market";
import type { CareerSeason } from "../season";
import { dateAfterMonths } from "../loans";
import { accrueFinance, availableCents, projectFinance, type FinanceState } from "./finance";
import { civilDate, engineState } from "./foundation";

export const COACH_RULES = Object.freeze({ version: "coaches-v1", minimumGames: 5, reviewWindow: 8, dismissalRatio: .55, contractMonths: 12, severanceMonths: 2, vacancyDays: 7 });
export type Coach = { id: string; name: string; origin: "catalog" | "human" | "simulated"; reputation: number; clubId: string | null; availableOn: string; contract?: { id: string; startsOn: string; endsOn: string; monthlyCents: number }; history: { clubId: string; startedOn: string; endedOn?: string; reason?: "dismissed" | "expired" | "resigned"; games: number; points: number; wins: number; draws: number; defeats: number }[] };
export type CoachState = { version: 1; rulesVersion: "coaches-v1"; humanId: string; coaches: Record<string, Coach>; boards: Record<string, { expectedPoints: number; objective: string; score: number; games: { id: string; points: number; expected: number }[]; seen: string[]; vacantSince?: string; reason?: string }>; events: { id: string; date: string; type: "hired" | "dismissed" | "expired"; coachId: string; clubId: string; costCents: number }[] };
const plusDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`)+days*86400000).toISOString().slice(0,10);
const clamp = (n: number, lo=0, hi=100) => Math.max(lo,Math.min(hi,n));
const wage = (level: number) => Math.round(250_000+clamp(level,1,20)*15_000);
const key = (id: string) => `coach:${id}`;
export const isUnemployed = (market?: ManagerMarket) => !!market?.staff && !market.staff.coaches[market.staff.humanId]?.clubId;
function registerContract(finance: FinanceState, coach: Coach, clubId: string, date: string, salary: number) {
  const id=`${key(coach.id)}:${clubId}:${date}:${coach.history.length}`;
  coach.clubId=clubId; coach.contract={id,startsOn:date,endsOn:dateAfterMonths(date,COACH_RULES.contractMonths),monthlyCents:salary};
  finance.contracts[key(coach.id)]={id,playerId:key(coach.id),personKind:"coach",clubId,startsOn:date,endsOn:coach.contract.endsOn,monthlyCents:salary,accruedThrough:date,origin:"game",status:"active"};
  coach.history.push({clubId,startedOn:date,games:0,points:0,wins:0,draws:0,defeats:0});
}
/** Additive adoption: biography/name is catalog data, contracts/expectations are explicitly simulation policy.
 * No jobs before this snapshot, back-pay or reconstructed match history. Identity survives club changes. */
export function migrateCoachSave(save: CareerSave, database: EditorDatabase): CareerSave {
  const p=save.progress, market=p?.managerMarket;
  if(!p || !market?.finance) return save;
  if(market.staff) {
    if(market.staff.version!==1 || market.staff.rulesVersion!==COACH_RULES.version) throw new Error("Modelo de técnicos incompatível; save preservado.");
    assertCoachState(market); return save;
  }
  const next=structuredClone(market), finance=next.finance!;
  const staff: CoachState={version:1,rulesVersion:"coaches-v1",humanId:`human:${save.id}`,coaches:{},boards:{},events:[]};
  const names=new Map<string,string>();
  for(const club of [...database.clubs].sort((a,b)=>Number(b.id===save.clubId)-Number(a.id===save.clubId) || a.id.localeCompare(b.id))) {
    const state=next.clubs[club.id]; if(!state) continue;
    const level=clamp(Number.isFinite(club.level) ? club.level : 10,1,20);
    staff.boards[club.id]={expectedPoints:clamp(.8+level/10,.9,2.4),objective:level>=15 ? "Disputar títulos" : level>=10 ? "Competir na parte superior" : "Consolidar o clube",score:50,games:[],seen:[...state.processedFixtures],vacantSince:state.coach ? undefined : save.inGameDate};
    const name=(club.id===save.clubId ? save.managerName : state.coach)?.trim();
    if(!name) continue;
    const normalized=name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
    if(names.has(normalized)) { state.coach=null; staff.boards[club.id].vacantSince=save.inGameDate; continue; }
    const id=club.id===save.clubId ? staff.humanId : `catalog:${club.id}`;
    if(club.id!==save.clubId) names.set(normalized,id);
    const coach: Coach={id,name,origin:club.id===save.clubId ? "human" : "catalog",reputation:clamp(level,1,20),clubId:null,availableOn:save.inGameDate,history:[]};
    staff.coaches[id]=coach; registerContract(finance,coach,club.id,save.inGameDate,wage(level)); state.coach=name;
  }
  next.staff=staff;
  return {...save,progress:{...p,managerMarket:projectFinance(next)}};
}
export function assertCoachState(market: ManagerMarket) {
  const occupied=new Set<string>();
  for(const c of Object.values(market.staff?.coaches ?? {})) if(c.clubId) {
    if(occupied.has(c.clubId) || !c.contract || market.clubs[c.clubId]?.coach!==c.name || market.finance?.contracts[key(c.id)]?.status!=="active" || market.finance.contracts[key(c.id)].clubId!==c.clubId) throw new Error("Vínculos de técnicos inconsistentes; save preservado.");
    occupied.add(c.clubId);
  }
}
function charge(finance: FinanceState, clubId: string, id: string, date: string, cents: number) {
  if(finance.ledger.some(e=>e.id===id)) throw new Error("Custo de técnico já liquidado.");
  if(!Number.isSafeInteger(cents) || cents<0 || cents>availableCents(finance,clubId)) throw new Error("Caixa livre insuficiente para o contrato do técnico.");
  finance.clubs[clubId].cashCents-=cents;
  finance.ledger.push({id,date,clubId,kind:"coach-fee",amountCents:cents,cashDeltaCents:-cents,reference:id});
}
function release(market: ManagerMarket, coach: Coach, date: string, reason: "dismissed" | "expired" | "resigned", cost: number) {
  const staff=market.staff!, clubId=coach.clubId!, club=market.clubs[clubId], contract=market.finance!.contracts[key(coach.id)];
  if(cost) charge(market.finance!,clubId,`coach-end:${coach.contract!.id}`,date,cost);
  if(contract) { contract.status="expired"; contract.endsOn=date; market.finance!.history.push({...contract}); }
  const tenure=coach.history.at(-1); if(tenure) { tenure.endedOn=date; tenure.reason=reason; }
  coach.clubId=null; coach.contract=undefined; coach.availableOn=plusDays(date,reason==="dismissed" ? 14 : 0);
  club.coach=null; club.vacancyVersion=(club.vacancyVersion ?? 0)+1;
  staff.boards[clubId].vacantSince=date;
  if(reason!=="resigned") staff.events.push({id:`${reason}:${coach.id}:${clubId}:${date}`,date,type:reason,coachId:coach.id,clubId,costCents:cost});
}
/** The only hiring executor, shared by CPU and the human acceptance path. Rechecks vacancy,
 * exclusive employment, cash, payables, reservations and twelve months of salary at commit time. */
export function hireCoach(market: ManagerMarket, coachId: string, clubId: string, date: string, humanMove=false): ManagerMarket {
  civilDate(date);
  const next=structuredClone(market);
  next.finance=accrueFinance(next.finance!,date);
  hireCoachOnSnapshot(next,coachId,clubId,date,humanMove);
  assertCoachState(next); return projectFinance(next);
}
/** Mutates only an already private transaction snapshot, after all preconditions. CPU batches
 * share this executor without cloning the entire universe or accruing all wages for each hire. */
function hireCoachOnSnapshot(next: ManagerMarket, coachId: string, clubId: string, date: string, humanMove=false) {
  const staff=next.staff, c=staff?.coaches[coachId], board=staff?.boards[clubId];
  if(!staff || !c || !board || next.clubs[clubId]?.coach!==null || c.availableOn>date || (c.clubId && !humanMove)) throw new Error("Técnico ou vaga indisponível.");
  if(humanMove && coachId!==staff.humanId) throw new Error("Apenas o próprio técnico pode aceitar esta proposta.");
  const level=(board.expectedPoints-.8)*10, salary=wage(level), fee=salary;
  if(next.finance?.through!==date || availableCents(next.finance,clubId)<fee+salary*12) throw new Error("Clube sem caixa livre para contratação e salário.");
  const feeId=`coach-hire:${c.id}:${clubId}:${date}:${c.history.length}`;
  if(next.finance.ledger.some(e=>e.id===feeId)) throw new Error("Contratação já liquidada.");
  if(c.clubId) release(next,c,date,"resigned",0);
  charge(next.finance,clubId,feeId,date,fee);
  registerContract(next.finance,c,clubId,date,salary);
  next.clubs[clubId]={...next.clubs[clubId],coach:c.name,history:[],startingBudget:next.clubs[clubId].budget};
  board.games=[]; board.score=50; board.vacantSince=undefined; board.reason="Contratação confirmada pelo executor comum.";
  staff.events.push({id:`hired:${c.contract!.id}`,date,type:"hired",coachId:c.id,clubId,costCents:fee});
}
export function processCoaches(market: ManagerMarket, database: EditorDatabase, season: CareerSeason | undefined, date: string): ManagerMarket {
  if(!market.staff) return market;
  const next=structuredClone(market);
  next.finance=accrueFinance(next.finance!,date);
  const staff=next.staff!;
  for(const fixture of [...(season?.fixtures ?? [])].filter(f=>f.status==="played").sort((a,b)=>a.calendarRound-b.calendarRound || a.id.localeCompare(b.id))) {
    if(!Number.isInteger(fixture.homeScore) || !Number.isInteger(fixture.awayScore)) continue;
    for(const clubId of [fixture.homeClubId,fixture.awayClubId]) {
      const b=staff.boards[clubId]; if(!b || b.seen.includes(fixture.id)) continue; b.seen.push(fixture.id);
      const c=Object.values(staff.coaches).find(c=>c.clubId===clubId); if(!c) continue;
      const home=fixture.homeClubId===clubId, own=home ? fixture.homeScore! : fixture.awayScore!, other=home ? fixture.awayScore! : fixture.homeScore!;
      const points=own===other ? fixture.winnerClubId ? Number(fixture.winnerClubId===clubId)*3 : 1 : own>other ? 3 : 0;
      const opponent=staff.boards[home ? fixture.awayClubId : fixture.homeClubId];
      const expected=clamp(1.5+(b.expectedPoints-(opponent?.expectedPoints ?? 1.5))*1.5,.6,2.4);
      b.games.push({id:fixture.id,points,expected}); b.games=b.games.slice(-COACH_RULES.reviewWindow);
      const tenure=c.history.at(-1)!; tenure.games++; tenure.points+=points; if(points===3) tenure.wins++; else if(points===1) tenure.draws++; else tenure.defeats++;
      const ratio=b.games.reduce((s,g)=>s+g.points,0)/b.games.reduce((s,g)=>s+g.expected,0);
      b.score=Math.round(clamp(50+40*(ratio-1))); b.reason=`${b.objective}: ${b.games.length} jogos, ${ratio.toFixed(2)} do rendimento esperado.`;
      c.reputation=clamp(c.reputation+(points-expected)*.15,1,20);
    }
  }
  for(const c of Object.values(staff.coaches).sort((a,b)=>a.id.localeCompare(b.id))) {
    if(!c.clubId || !c.contract) continue;
    if(c.contract.endsOn<date) { release(next,c,date,"expired",0); continue; }
    const b=staff.boards[c.clubId], games=b.games;
    const ratio=games.reduce((s,g)=>s+g.points,0)/Math.max(.01,games.reduce((s,g)=>s+g.expected,0));
    if(games.length>=COACH_RULES.minimumGames && ratio<COACH_RULES.dismissalRatio) {
      const days=Math.max(0,(Date.parse(`${c.contract.endsOn}T12:00:00Z`)-Date.parse(`${date}T12:00:00Z`))/86400000);
      const cost=Math.round(c.contract.monthlyCents*Math.min(COACH_RULES.severanceMonths,days/30));
      if(availableCents(next.finance!,c.clubId)>=cost) release(next,c,date,"dismissed",cost);
      else b.reason="Rendimento abaixo da meta, mas caixa livre insuficiente para rescisão.";
    }
  }
  // Vacancies remain open for at least seven simulated days; valid human offers protect their deadline.
  for(const club of [...database.clubs].filter(c=>c.country?.toLocaleLowerCase("pt-BR")==="brasil" && c.division!=="Sem divisão nacional").sort((a,b)=>a.id.localeCompare(b.id))) {
    const b=staff.boards[club.id];
    if(!b?.vacantSince || plusDays(b.vacantSince,COACH_RULES.vacancyDays)>date || next.clubs[club.id]?.coach!==null || next.applications?.some(a=>a.clubId===club.id && a.status==="offered" && a.expiresOn>=date)) continue;
    const free=Object.values(staff.coaches).filter(c=>c.id!==staff.humanId && !c.clubId && c.availableOn<=date).sort((a,b)=>Math.abs(a.reputation-club.level)-Math.abs(b.reputation-club.level) || a.id.localeCompare(b.id));
    let candidate=free[0];
    if(!candidate) { const id=`simulated:${club.id}`; if(staff.coaches[id]) continue; candidate={id,name:`Treinador simulado ${club.name}`,origin:"simulated",reputation:clamp(club.level-2,1,20),clubId:null,availableOn:date,history:[]}; staff.coaches[id]=candidate; }
    try {
      hireCoachOnSnapshot(next,candidate.id,club.id,date);
    } catch (error) { b.reason=error instanceof Error ? error.message : "Contratação adiada."; }
  }
  assertCoachState(next); return projectFinance(next);
}
export function coachCheckpoint(save: CareerSave, market: ManagerMarket, operationId: string): CareerSave {
  const p=save.progress!, engine=engineState(p.engine,save.id,save.inGameDate);
  if(engine.operations.some(o=>o.id===operationId)) return save;
  engine.revision++; engine.operations.push({id:operationId,from:save.inGameDate,to:save.inGameDate,revision:engine.revision});
  engine.events.push({id:`${operationId}:committed`,operationId,date:save.inGameDate,type:"coach-processed",entityIds:[market.staff!.humanId],revision:engine.revision});
  return {...save,budget:market.clubs[save.clubId].budget,progress:{...p,engine,managerMarket:market,budget:market.clubs[save.clubId].budget}};
}
