import { assertSeasonArchives } from "./season-lifecycle";
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
  goals: { clubId: string; playerId?: string; minute?:number }[];
  granularity?: "15-minute-v2";
  plans?:import("./match-plans").MatchPlan[];
  substitutions?:{clubId:string;minute:number;out:string;in:string;interval:boolean;reason:string}[];
  cards: { clubId: string; playerId: string; card: "yellow" | "red"; secondYellow?: boolean; minute?: number }[];
  /** Explicit service at the club owning the player then; never a date-based/global suspension. */
  servedBans: string[];
  disciplinePolicy: "automatic-red-only-v1" | "brazil-cards-v2";
};
const integer=(n:number,min=0,max=90)=>Number.isSafeInteger(n) && n>=min && n<=max;
export function assertMatchReport(f: SeasonFixture): void {
  const r=f.report;if(!r) return;
  if(r.version!==1 || r.rulesVersion!=="matches-v1" || !["live","background"].includes(r.origin) || !r.seed || !["automatic-red-only-v1","brazil-cards-v2"].includes(r.disciplinePolicy) || f.status!=="played" || !integer(f.homeScore!,0,100) || !integer(f.awayScore!,0,100)) throw new Error("Resultado de partida incompatível.");
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
  for(const g of r.goals)if(g.minute!==undefined && !integer(g.minute))throw new Error("Minuto de gol inválido.");
  if(r.substitutions) {
    const used=new Map<string,Set<string>>(),left=new Map<string,Set<string>>();
    for(const club of clubs) {
      const changes=r.substitutions.filter(c=>c.clubId===club);
      if(changes.length>5 || new Set(changes.filter(c=>!c.interval).map(c=>c.minute)).size>3)throw new Error("Limite de substituições excedido.");
    }
    for(const change of r.substitutions) {
      const entrants=used.get(change.clubId) ?? new Set<string>(),departed=left.get(change.clubId) ?? new Set<string>();used.set(change.clubId,entrants);left.set(change.clubId,departed);
      const out=rows.find(p=>p.clubId===change.clubId && p.playerId===change.out),incoming=rows.find(p=>p.clubId===change.clubId && p.playerId===change.in);
      if(!clubs.includes(change.clubId) || !out || !incoming || change.out===change.in || !integer(change.minute,0,89) || change.interval && change.minute!==45 || entrants.has(change.in) || departed.has(change.in) || departed.has(change.out) || r.cards.some(c=>c.card==="red" && c.playerId===change.out && (c.minute ?? 90)<=change.minute))throw new Error("Substituição inválida.");
      entrants.add(change.in);departed.add(change.out);
    }
    for(const event of [...r.goals,...r.cards])if(event.playerId && event.minute!==undefined){
      const entered=r.substitutions.find(c=>c.clubId===event.clubId && c.in===event.playerId)?.minute ?? 0;
      const exited=r.substitutions.find(c=>c.clubId===event.clubId && c.out===event.playerId)?.minute ?? 90;
      const red=r.cards.find(c=>c.clubId===event.clubId && c.playerId===event.playerId && c.card==="red")?.minute ?? 90;
      if(event.minute<entered || event.minute>Math.min(exited,red))throw new Error("Evento fora da participação registrada.");
    }
  }

}
export type Discipline = Map<string,Map<string,number>> & { yellows?:Map<string,Map<string,number>>; phases?:Map<string,string> };
/** Explicit 2026 Brazilian policy. Unknown estadual resets are not guessed. */
export function disciplinePhase(f:SeasonFixture) {
 if(f.division==="Série D" && f.type==="league")return f.stage==="groups" ? "groups" : (f.knockoutStage ?? 0)>=3 || f.stage==="access-playoff" ? "after-fourth":"knockout";
 if(f.division==="Série B" && f.stage==="knockout")return "playoffs";
 return "continuous";
}
function prepareDiscipline(state:Discipline,f:SeasonFixture) {
 state.yellows ??= new Map();state.phases ??= new Map();
 const phase=disciplinePhase(f),old=state.phases.get(f.competitionId);
 if(old && phase!==old && phase!=="continuous")state.yellows.set(f.competitionId,new Map());
 state.phases.set(f.competitionId,phase);
}

const disciplineCache=new WeakMap<CareerSeason,Discipline>();
export function applyDiscipline(state:Discipline,f:SeasonFixture) {
  if(!f.report) return;
  if(f.report.disciplinePolicy==="brazil-cards-v2")prepareDiscipline(state,f);
  const bans=state.get(f.competitionId) ?? new Map<string,number>();state.set(f.competitionId,bans);
  for(const id of f.report.servedBans) {const count=bans.get(id) ?? 0;if(count>1)bans.set(id,count-1);else bans.delete(id);}
  if(f.report.disciplinePolicy==="brazil-cards-v2") {
    const yellows=state.yellows!.get(f.competitionId) ?? new Map<string,number>();state.yellows!.set(f.competitionId,yellows);
    const secondYellow=new Set(f.report.cards.filter(c=>c.secondYellow).map(c=>c.playerId));
    for(const c of f.report.cards)if(c.card==="yellow" && !secondYellow.has(c.playerId)) {
      const count=(yellows.get(c.playerId) ?? 0)+1;
      yellows.set(c.playerId,count%3);if(count>=3)bans.set(c.playerId,(bans.get(c.playerId) ?? 0)+1);
    }
  }
  for(const c of f.report.cards) if(c.card==="red") bans.set(c.playerId,(bans.get(c.playerId) ?? 0)+1);
}
export function matchDiscipline(season?:CareerSeason):Discipline {
  if(!season) return new Map();
  const cached=disciplineCache.get(season);if(cached)return cached;
  const state:Discipline=new Map();
  for(const f of [...season.fixtures].filter(f=>f.status==="played" && f.report).sort((a,b)=>(a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "") || a.calendarRound-b.calendarRound || a.id.localeCompare(b.id))) applyDiscipline(state,f);
  disciplineCache.set(season,state);return state;
}
export function copyDiscipline(season:CareerSeason):Discipline {
 const old=matchDiscipline(season),next:Discipline=new Map([...old].map(([id,bans])=>[id,new Map(bans)]));
 next.yellows=new Map([...(old.yellows ?? [])].map(([id,cards])=>[id,new Map(cards)]));next.phases=new Map(old.phases);return next;
}
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
export function liveReport(f:SeasonFixture,events:MatchEvent[],squads:{home:Player[];away:Player[]},managedIsHome:boolean,seed?:string,modern=false):MatchReport {
  const clubFor=(side:MatchSide)=>(side==="home")===managedIsHome ? f.homeClubId : f.awayClubId;
  const identity=(side:MatchSide,id:number|undefined)=>{const p=squads[side].find(p=>p.id===id);return p ? p.sourceId ?? `${clubFor(side)}:${p.id}` : undefined;};
  const report=aggregateReport(f,f.playerContributions ?? [],"live");
  if(seed)report.seed=seed;
  if(modern)report.disciplinePolicy="brazil-cards-v2";
  report.goals=events.filter(e=>e.scene?.action==="goal").map(e=>({clubId:clubFor(e.scene!.team),playerId:identity(e.scene!.team,e.scorerId),...(modern?{minute:e.minute}:{})}));
  report.cards=events.filter(e=>e.card && e.scene && e.actorId!==undefined).map(e=>({clubId:clubFor(e.scene!.team),playerId:identity(e.scene!.team,e.actorId) ?? "",card:e.card!,minute:e.minute,...(e.secondYellow?{secondYellow:true}:{})}));
  if(modern)report.substitutions=events.filter(e=>e.substitution && e.team).map(e=>({clubId:clubFor(e.team!),minute:e.minute,out:identity(e.team!,e.substitution!.outId) ?? "",in:identity(e.team!,e.substitution!.inId) ?? "",interval:e.substitution!.interval,reason:"troca confirmada"}));
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
  const p=save.progress;return [p?.competitionSeason,...Object.values(p?.seasonHistory ?? {}).map(a=>a.season),...Object.values(p?.jobClubSnapshots ?? {}).map(s=>s.competitionSeason)].flatMap(s=>s?.fixtures ?? []).filter(f=>!!f.report);
}
/** Same durable-history guard for account-local storage and tests; job snapshots are archives. */
export function assertMatchHistory(previous:CareerSave|undefined,next:CareerSave) {
  assertSeasonArchives(previous,next);
  const after=reportedFixtures(next);
  for(const f of after)assertMatchReport(f);
  const fingerprint=(f:SeasonFixture)=>JSON.stringify(f,(_key,value)=>value && !Array.isArray(value) && typeof value==="object" ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))) : value);
  const indexed=new Map<string,SeasonFixture[]>();for(const f of after)indexed.set(f.id,[...(indexed.get(f.id) ?? []),f]);
  for(const old of previous ? reportedFixtures(previous) : []) {
    const matches=indexed.get(old.id);if(!matches?.length || matches.some(f=>fingerprint(f)!==fingerprint(old)))throw new Error("Resultado concluído não pode ser removido ou reescrito.");
  }
}
