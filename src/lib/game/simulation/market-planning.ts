import type { EditorDatabase, EditorPlayer } from "../editor-data";
import { dateAfterMonths } from "../loans";
import type { CareerSeason } from "../season";
import { availableCents, type FinanceState } from "./finance";
import { assessMove, contextualPriceBrl, MARKET_RULES, proposedRole, type MarketRole } from "./market-rules";
import type { DecisionRecord } from "./foundation";

export type PositionNeed = { position: EditorPlayer["primaryPosition"]; count: number; target: number; priority: number };
export type ClubMarketPlan = {
  clubId: string; date: string; availableCents: number; spendingLimitCents: number; fixturesNext21Days: number;
  needs: PositionNeed[]; starters?: {id: string;position: string;overall: number;rank: number}[]; leaders: Record<string,{id: string; overall: number}>;
  replacements: { departedId: string; position: string; requiredOverall?: number; roleRank?: number; alternativeId?: string; reason: string }[];
};
export type MarketOption = { actionId: string; kind: "wait" | "approach"; playerId?: string; feeBrl?: number; salaryBrl?: number; role?: MarketRole; score: number; reason: string };
export type MarketContext = {
  decisionId: string; stateRevision: number; rulesVersion: "market-v1"; simulatedOn: string; actorId: string;
  spendingLimitCents: number; needs: PositionNeed[]; missingFacts: string[]; options: MarketOption[];
};
export type MarketSelection = { decisionId: string; stateRevision: number; contextKey: string; actionId: string; reason: string; fallback?: string; mode: DecisionRecord["mode"]; comparedActionId?: string };
export type MarketStrategy = {
  version: 1; mode: DecisionRecord["mode"]; plans: Record<string,ClubMarketPlan>;
  audit: (MarketSelection & { date: string; actorId: string; executed: boolean })[];
  rounds: { date: string; proposals: number; completed: number; rejected: number; clubCount: number; needs: number; availableCents: number }[];
  pilotContext?: MarketContext; circuit?: { failures: number; retryAfter: string };
};
const target = {G:2,L:4,Z:4,M:4,A:4} as const;
export function rosterIndex(db: EditorDatabase) {
  const result = new Map<string,EditorPlayer[]>();
  for (const p of db.players) { const group=result.get(p.clubId) ?? []; group.push(p); result.set(p.clubId,group); }
  return result;
}
export function buildClubPlan(clubId: string, roster: EditorPlayer[], finance: FinanceState, date: string, season?: CareerSeason, previous?: ClubMarketPlan): ClubMarketPlan {
  const until=Date.parse(`${date}T12:00:00Z`)+21*86400000;
  const fixtures=season?.fixtures.filter(f => f.status === "scheduled" && (f.homeClubId===clubId || f.awayClubId===clubId) && f.scheduledDate && f.scheduledDate>=date && Date.parse(`${f.scheduledDate}T12:00:00Z`)<=until).length ?? 0;
  const leaders: ClubMarketPlan["leaders"] = {};
  const starters: NonNullable<ClubMarketPlan["starters"]>=[];
  const needs = (Object.keys(target) as (keyof typeof target)[]).map(position => {
    const peers=roster.filter(p=>p.primaryPosition===position).sort((a,b)=>b.overall-a.overall || a.id.localeCompare(b.id));
    if(peers[0]) leaders[position]={id:peers[0].id,overall:peers[0].overall};
    peers.slice(0,position==="G" ? 1 : position==="L" || position==="Z" ? 2 : 3).forEach((p,rank)=>starters.push({id:p.id,position,overall:p.overall,rank}));
    const desired=target[position]+(fixtures>=4 && position!=="G" ? 1 : 0);
    return {position,count:peers.length,target:desired,priority:Math.max(0,desired-peers.length)+(position==="G" && peers.length<2 ? 3 : 0)};
  });
  const replacements: ClubMarketPlan["replacements"] = [];
  const previousStarters=previous?.starters ?? Object.entries(previous?.leaders ?? {}).map(([position,p])=>({...p,position,rank:0}));
  for(const old of previousStarters) if(!roster.some(p=>p.id===old.id)) {
    const position=old.position;
    const best=starters.find(p=>p.position===position && p.rank===old.rank);
    const adequate=best && best.overall>=old.overall-3;
    replacements.push({departedId:old.id,position,requiredOverall:old.overall-3,roleRank:old.rank,...(adequate ? {alternativeId:best.id} : {}),reason:adequate ? "Alternativa interna de nível próximo assume a vaga." : "Saída de referência abre prioridade de reposição."});
    if(!adequate) { const need=needs.find(n=>n.position===position)!; need.priority=Math.max(3,need.priority); }
  }
  // Keep unresolved departures visible until a comparable replacement is present.
  for(const old of previous?.replacements ?? []) if(!replacements.some(r=>r.departedId===old.departedId) && !old.alternativeId) {
    const best=starters.find(p=>p.position===old.position && p.rank===(old.roleRank ?? 0));
    if(best && best.overall>=(old.requiredOverall ?? 100)) replacements.push({...old,alternativeId:best.id,reason:"Reforço ou evolução de alternativa preenche a necessidade."});
    else { replacements.push(old); const need=needs.find(n=>n.position===old.position); if(need) need.priority=Math.max(2,need.priority); }
  }
  const available=availableCents(finance,clubId);
  return {clubId,date,availableCents:available,spendingLimitCents:Math.floor(available*.25),fixturesNext21Days:fixtures,needs,leaders,starters,replacements:replacements.slice(-20)};
}
export function marketOptions(plan: ClubMarketPlan, roster: EditorPlayer[], candidates: EditorPlayer[], rosters: Map<string,EditorPlayer[]>, finance: FinanceState, database?: EditorDatabase): MarketOption[] {
  const average=roster.length ? roster.reduce((n,p)=>n+p.overall,0)/roster.length : 0;
  const options: MarketOption[]=[];
  if(roster.length>=30 || roster.length<11) return [{actionId:"wait",kind:"wait",score:0,reason:"Sem capacidade segura de integração neste ciclo."}];
  for(const p of candidates) {
    if(p.clubId===plan.clubId || p.loan?.status==="active" || !Number.isFinite(p.salaryMonthlyBrl) || p.salaryMonthlyBrl<=0) continue;
    const need=plan.needs.find(n=>n.position===p.primaryPosition)!;
    const peers=roster.filter(o=>o.primaryPosition===p.primaryPosition);
    if(!need || (need.priority===0 && peers.length>=need.target) || p.overall<average-5 || p.overall>average+15) continue;
    const seller=rosters.get(p.clubId) ?? [];
    const atSeller=seller.filter(o=>o.primaryPosition===p.primaryPosition);
    if(p.clubId && (seller.length<=20 || atSeller.length<=(p.primaryPosition==="G" ? 2 : 3))) continue;
    const kind=p.marketStatus==="loan" ? "loan" : "sale";
    const fee=contextualPriceBrl(p,seller,plan.date), salary=Math.ceil(p.salaryMonthlyBrl*(kind==="loan" ? 1 : 1.1));
    const cost=Math.round((fee+salary*(kind==="loan" ? 3 : 12))*100);
    if(cost>plan.spendingLimitCents) continue;
    if(kind==="loan" && (!finance.contracts[p.id]?.endsOn || finance.contracts[p.id].endsOn!<dateAfterMonths(plan.date,6))) continue;
    const assessment=assessMove(p,roster,kind,salary,database ? {database,buyerClubId:plan.clubId,date:plan.date,sellerRoster:seller} : undefined);
    if(!assessment.accepted) continue;
    options.push({actionId:`approach:${p.id}`,kind:"approach",playerId:p.id,feeBrl:fee,salaryBrl:salary,role:proposedRole(p,roster),score:need.priority*100+p.overall-average-cost/Math.max(1,plan.spendingLimitCents),reason:`${need.priority ? "Carência" : "Oportunidade"} em ${p.primaryPosition}; ${assessment.reason}`});
  }
  options.sort((a,b)=>b.score-a.score || a.actionId.localeCompare(b.actionId));
  return [...options.slice(0,MARKET_RULES.maxOptions),{actionId:"wait",kind:"wait",score:0,reason:"Preservar caixa e elenco também é decisão válida."}];
}
/** Exact bounded context, not an authorization token. Executor rebuilds and compares it at commit. */
export const marketContextKey = (context: MarketContext) => JSON.stringify(context);
