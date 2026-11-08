import type { CareerSave, EditorDatabase } from "../editor-data";
import type { CareerSeason, SeasonFixture, SeasonPlayerContribution } from "../season";
import type { Player } from "../mock-data";
import type { MatchEvent, MatchSide } from "../live-match";
import { seededRandom } from "../live-match";
import { playerEligible } from "./players";

/** First E7 contract. No reconstruction of cards/events for already-played legacy fixtures. */
export type MatchReport = {
  version: 1;
  rulesVersion: "matches-v1";
  origin: "live" | "background";
  seed: string;
  /** Background events are aggregate observations, not invented minute-by-minute commentary. */
  goals: { clubId: string; playerId?: string }[];
  cards: { clubId: string; playerId: string; card: "yellow" | "red"; secondYellow?: boolean; minute?: number }[];
  /** Explicit service at the club owning the player then; never a date-based/global suspension. */
  servedBans: string[];
  disciplinePolicy: "automatic-red-only-v1";
};
const integer=(n:number,min=0,max=90)=>Number.isSafeInteger(n) && n>=min && n<=max;
export function assertMatchReport(f: SeasonFixture): void {
  const r=f.report;if(!r) return;
  if(r.version!==1 || r.rulesVersion!=="matches-v1" || !["live","background"].includes(r.origin) || !r.seed || r.disciplinePolicy!=="automatic-red-only-v1" || f.status!=="played" || !integer(f.homeScore!,0,100) || !integer(f.awayScore!,0,100)) throw new Error("Resultado de partida incompatível.");
  const clubs=[f.homeClubId,f.awayClubId], rows=f.playerContributions ?? [], seen=new Set<string>();
  if(!f.id || !f.competitionId || !f.homeClubId || !f.awayClubId || f.homeClubId===f.awayClubId)throw new Error("Identidade de partida inválida.");
  if(!Array.isArray(r.goals) || r.goals.length>200 || !Array.isArray(r.cards) || r.cards.length>1000 || !Array.isArray(r.servedBans) || r.servedBans.some(id=>typeof id!=="string" || !id || id.length>500) || new Set(r.servedBans).size!==r.servedBans.length || (f.winnerClubId && !clubs.includes(f.winnerClubId))) throw new Error("Súmula inválida.");
  for(const p of rows) {
    if(!clubs.includes(p.clubId) || !p.playerId || seen.has(p.playerId) || !integer(p.minutes) || !integer(p.goals,0,100) || !integer(p.assists,0,100) || (p.rating!==null && (!Number.isFinite(p.rating) || p.rating<0 || p.rating>10)) || r.servedBans.includes(p.playerId)) throw new Error("Participação inválida ou suspensa.");
    if((p.goals || p.assists) && !p.minutes) throw new Error("Atleta sem minutos não pode produzir gols/assistências.");
    seen.add(p.playerId);
    if(r.goals.filter(g=>g.playerId===p.playerId && g.clubId===p.clubId).length!==p.goals) throw new Error("Gols individuais não conciliam.");
  }
  for(const club of clubs) {
    const score=club===f.homeClubId ? f.homeScore! : f.awayScore!;
    if(r.goals.filter(g=>g.clubId===club).length!==score || rows.filter(p=>p.clubId===club).reduce((n,p)=>n+p.assists,0)>score || rows.filter(p=>p.clubId===club).reduce((n,p)=>n+p.minutes,0)>990) throw new Error("Placar, minutos ou assistências não conciliam.");
  }
  if(r.goals.some(g=>!clubs.includes(g.clubId) || (g.playerId && !rows.some(p=>p.playerId===g.playerId && p.clubId===g.clubId))) || r.cards.some(c=>!clubs.includes(c.clubId) || !["yellow","red"].includes(c.card) || !rows.some(p=>p.playerId===c.playerId && p.clubId===c.clubId) || (c.minute!==undefined && !integer(c.minute)) || (c.secondYellow && c.card!=="red"))) throw new Error("Evento sem participação válida.");
  for(const id of seen) if(r.cards.filter(c=>c.playerId===id && c.card==="red").length>1) throw new Error("Expulsão duplicada.");
}
export type Discipline = Map<string,Map<string,number>>;
const disciplineCache=new WeakMap<CareerSeason,Discipline>();
export function applyDiscipline(state:Discipline,f:SeasonFixture) {
  if(!f.report) return;
  const bans=state.get(f.competitionId) ?? new Map<string,number>();state.set(f.competitionId,bans);
  for(const id of f.report.servedBans) {const count=bans.get(id) ?? 0;if(count>1)bans.set(id,count-1);else bans.delete(id);}
  for(const c of f.report.cards) if(c.card==="red") bans.set(c.playerId,(bans.get(c.playerId) ?? 0)+1);
}
export function matchDiscipline(season?:CareerSeason):Discipline {
  if(!season) return new Map();
  const cached=disciplineCache.get(season);if(cached)return cached;
  const state:Discipline=new Map();
  for(const f of [...season.fixtures].filter(f=>f.status==="played" && f.report).sort((a,b)=>(a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "") || a.calendarRound-b.calendarRound || a.id.localeCompare(b.id))) applyDiscipline(state,f);
  disciplineCache.set(season,state);return state;
}
export function copyDiscipline(season:CareerSeason):Discipline {return new Map([...matchDiscipline(season)].map(([id,bans])=>[id,new Map(bans)]));}
export function bannedForFixture(season:CareerSeason|undefined,fixture:SeasonFixture|null|undefined,personId?:string) {
  return !!(personId && fixture && fixture.status!=="played" && (matchDiscipline(season).get(fixture.competitionId)?.get(personId) ?? 0)>0);
}
export function fixtureDatabase(db:EditorDatabase,f:SeasonFixture,state:Discipline):EditorDatabase {
  const bans=state.get(f.competitionId);if(!bans?.size)return db;
  return {...db,players:db.players.filter(p=>!bans.has(p.id))};
}
export function servedBans(db:EditorDatabase,f:SeasonFixture,state:Discipline):string[] {
  const bans=state.get(f.competitionId);return bans ? db.players.filter(p=>[f.homeClubId,f.awayClubId].includes(p.clubId ?? "") && bans.has(p.id)).map(p=>p.id).sort() : [];
}
export function aggregateReport(f:SeasonFixture,rows:SeasonPlayerContribution[],origin:MatchReport["origin"],served:string[]=[]):MatchReport {
  const goals:MatchReport["goals"]=[];
  for(const p of rows) for(let i=0;i<p.goals;i++) goals.push({clubId:p.clubId,playerId:p.playerId});
  for(const [clubId,score] of [[f.homeClubId,f.homeScore!],[f.awayClubId,f.awayScore!]] as const) {
    for(let i=goals.filter(g=>g.clubId===clubId).length;i<score;i++) goals.push({clubId});
  }
  return {version:1,rulesVersion:"matches-v1",origin,seed:`${f.season}|${f.id}`,goals,cards:[],servedBans:served,disciplinePolicy:"automatic-red-only-v1"};
}
/** Aggregate CPU cards occur at full time: they do not fabricate earlier expulsions/lances. */
export function backgroundCards(f:SeasonFixture,rows:SeasonPlayerContribution[]):MatchReport["cards"] {
  const random=seededRandom(`${f.id}:cards-v1`),cards:MatchReport["cards"]=[];
  for(const p of rows) {
    if(!p.minutes)continue;
    if(random()<.10)cards.push({clubId:p.clubId,playerId:p.playerId,card:"yellow",minute:90});
    if(random()<.002)cards.push({clubId:p.clubId,playerId:p.playerId,card:"red",minute:90});
  }
  return cards;
}
const sourceIndexes=new WeakMap<EditorDatabase,Map<string,EditorDatabase["players"][number]>>();
/** Validate a new selection using the same E6 eligibility and competition-specific bans. */
export function assertParticipantsEligible(f:SeasonFixture,db:EditorDatabase,state:Discipline) {
  let sources=sourceIndexes.get(db);if(!sources){sources=new Map(db.players.map(p=>[p.id,p]));sourceIndexes.set(db,sources);}
  for(const p of f.playerContributions ?? []) {
    const source=sources.get(p.playerId);
    if(source && (source.clubId!==p.clubId || !playerEligible(source,f.scheduledDate) || state.get(f.competitionId)?.has(p.playerId))) throw new Error("Atleta inelegível na súmula.");
  }
}
export function liveReport(f:SeasonFixture,events:MatchEvent[],squads:{home:Player[];away:Player[]},managedIsHome:boolean,seed?:string):MatchReport {
  const clubFor=(side:MatchSide)=>(side==="home")===managedIsHome ? f.homeClubId : f.awayClubId;
  const identity=(side:MatchSide,id:number|undefined)=>{const p=squads[side].find(p=>p.id===id);return p ? p.sourceId ?? `${clubFor(side)}:${p.id}` : undefined;};
  const report=aggregateReport(f,f.playerContributions ?? [],"live");
  if(seed)report.seed=seed;
  report.goals=events.filter(e=>e.scene?.action==="goal").map(e=>({clubId:clubFor(e.scene!.team),playerId:identity(e.scene!.team,e.scorerId)}));
  report.cards=events.filter(e=>e.card && e.scene && e.actorId!==undefined).map(e=>({clubId:clubFor(e.scene!.team),playerId:identity(e.scene!.team,e.actorId) ?? "",card:e.card!,minute:e.minute,...(e.secondYellow?{secondYellow:true}:{})}));
  assertMatchReport({...f,report});return report;
}
export function substitutionAllowance(events:MatchEvent[],side:MatchSide,minute:number,interval=false) {
  const subs=events.filter(e=>e.team===side && e.substitution);
  const windows=new Set(subs.filter(e=>!e.substitution!.interval).map(e=>e.minute));
  return minute>=90 || (!interval && !windows.has(minute) && windows.size>=3) ? 0 : Math.max(0,5-subs.length);
}
export function canMakeSubstitution(events:MatchEvent[],side:MatchSide,outId:number,inId:number,minute:number,interval=false) {
  if(outId===inId || minute>=90 || events.some(e=>e.card==="red" && (e.scene?.team ?? e.team)===side && (e.actorId===outId || e.actorId===inId))) return false;
  const subs=events.filter(e=>e.team===side && e.substitution);
  if(substitutionAllowance(events,side,minute,interval)<=0 || subs.some(e=>e.substitution!.outId===inId || e.substitution!.inId===inId))return false;
  const windows=new Set(subs.filter(e=>!e.substitution!.interval).map(e=>e.minute));
  return interval || windows.has(minute) || windows.size<3;
}
function reportedFixtures(save:CareerSave) {
  const p=save.progress;return [p?.competitionSeason,...Object.values(p?.jobClubSnapshots ?? {}).map(s=>s.competitionSeason)].flatMap(s=>s?.fixtures ?? []).filter(f=>!!f.report);
}
/** Same durable-history guard for account-local storage and tests; job snapshots are archives. */
export function assertMatchHistory(previous:CareerSave|undefined,next:CareerSave) {
  const after=reportedFixtures(next);
  for(const f of after)assertMatchReport(f);
  const fingerprint=(f:SeasonFixture)=>JSON.stringify(f,(_key,value)=>value && !Array.isArray(value) && typeof value==="object" ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))) : value);
  const indexed=new Map<string,SeasonFixture[]>();for(const f of after)indexed.set(f.id,[...(indexed.get(f.id) ?? []),f]);
  for(const old of previous ? reportedFixtures(previous) : []) {
    const matches=indexed.get(old.id);if(!matches?.length || matches.some(f=>fingerprint(f)!==fingerprint(old)))throw new Error("Resultado concluído não pode ser removido ou reescrito.");
  }
}
