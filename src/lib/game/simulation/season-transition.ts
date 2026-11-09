import { completeDomesticCalendar } from "../brazilian-calendar";
import type { CareerSave, EditorDatabase } from "../editor-data";
import type { DivisionKey } from "../mock-data";
import { createCareerSeason, getCompetitionStandings, nextCareerFixture, settleSeasonThrough, type CareerSeason } from "../season";
import { worldDatabase } from "../world-market";
import { advanceCareer } from "./advance";
import { isUnemployed } from "./coaches";
import { engineState, EngineConflict } from "./foundation";
import { auditSeason, closeCareerSeason, assertSeasonArchives, type CloseSeasonCommand } from "./season-lifecycle";

/** Explicit future game policy, NOT a claim about official future CBF regulations.
 * Exchanges conserve each division's size; never give the human club a special place. */
export function nextSeasonDivisions(season:CareerSeason, db:EditorDatabase):Record<string,DivisionKey> {
  const divisions:DivisionKey[]=["Série A","Série B","Série C","Série D"];
  const assignments=Object.fromEntries(db.clubs.map(c=>[c.id,c.division]));
  const tables=divisions.map(d=>getCompetitionStandings(season.fixtures,`league:Brasil:${d}`));
  const moved=new Set<string>();
  for(let index=0;index<3;index++) {
    const upper=tables[index], lower=tables[index+1];
    if(!upper.length || !lower.length) continue;
    const promoted=index===2 && season.promotedClubIds?.length ? season.promotedClubIds : lower.slice(0,4).map(r=>r.clubId);
    const count=Math.min(promoted.length,Math.max(0,upper.length-2),Math.max(0,lower.length-2));
    const up=promoted.filter(id=>!moved.has(id)).slice(0,count);
    const down=upper.filter(r=>!moved.has(r.clubId)).slice(-up.length);
    if(!up.length || up.length!==down.length) continue;
    for(const id of up) {assignments[id]=divisions[index];moved.add(id);}
    for(const {clubId} of down) {assignments[clubId]=divisions[index+1];moved.add(clubId);}
  }
  return assignments;
}

/** Resume remaining CPU competitions, or perform one atomic annual transition.
 * A newly qualified human match returns to the hub instead of being auto-played.
 * Nothing is published here: caller must CAS the complete snapshot before showing it. */
export function transitionCareerSeason(save:CareerSave, database:EditorDatabase, command:CloseSeasonCommand):CareerSave {
  if(!save.progress?.competitionSeason || !command.operationId || command.operationId.length>120) throw new Error("Carreira sem temporada ativa ou comando inválido.");
  const original=save.progress.competitionSeason;
  const engine=engineState(save.progress.engine,save.id,save.inGameDate);
  const prior=engine.operations.find(o=>o.id===command.operationId);
  if(prior) { if(prior.from!==command.fromDate) throw new Error("Comando anual reutilizado.");return save; }
  if(engine.revision!==command.expectedRevision || save.inGameDate!==command.fromDate) throw new EngineConflict();
  if(save.progress.matchRunning || save.progress.page==="matchOverview" || save.progress.page==="result") throw new Error("Conclua a partida e volte ao clube antes de avançar a temporada.");
  const p=save.progress;
  const effective=worldDatabase(database,p.transferNegotiations ?? [],p.loanContracts ?? {},p.worldMarket,p.managerMarket?.finance,p.managerMarket?.staff);
  const human=isUnemployed(p.managerMarket)?undefined:save.clubId;
  if(human && nextCareerFixture(original)) throw new Error("Dispute as partidas pendentes antes de avançar a temporada.");
  const through=`${original.season}-12-31`;
  const settled=settleSeasonThrough(completeDomesticCalendar(original),effective,through,human);
  const nextHuman=human ? nextCareerFixture(settled):null;
  const target=nextHuman?.scheduledDate && nextHuman.scheduledDate<through ? [save.inGameDate,nextHuman.scheduledDate].sort().at(-1)! : [save.inGameDate,through].sort().at(-1)!;
  const boundary=advanceCareer({...save,progress:{...p,competitionSeason:settled}},database,{...command,targetDate:target});
  if(nextHuman) return {...boundary,progress:{...boundary.progress!,competitionSeason:settled,activeFixtureId:nextHuman.id}};
  const audit=auditSeason(settled,effective,boundary.inGameDate);
  if(audit.issues.length) throw new Error(`Não foi possível encerrar: ${audit.issues[0].detail}`);
  if(original.scope==="domestic-world" && audit.summary.missingNationalClubIds.length) throw new Error("Universo nacional incompleto; a inscrição anual foi preservada.");
  const closed=closeCareerSeason(boundary,effective,{operationId:`${command.operationId}:archive`,expectedRevision:boundary.progress!.engine!.revision,fromDate:boundary.inGameDate});
  const divisions=nextSeasonDivisions(settled,effective);
  const world={listings:{},events:[],...closed.progress!.worldMarket,divisions};
  const year=original.season+1;
  if(year>9999 || save.inGameDate>=`${year}-01-01`) throw new Error("Data anual inconsistente; checkpoint preservado.");
  const next=advanceCareer({...closed,progress:{...closed.progress!,worldMarket:world}},database,{operationId:`${command.operationId}:new-year`,expectedRevision:closed.progress!.engine!.revision,fromDate:closed.inGameDate,targetDate:`${year}-01-01`});
  const nextDb=worldDatabase(database,next.progress!.transferNegotiations ?? [],next.progress!.loanContracts ?? {},next.progress!.worldMarket,next.progress!.managerMarket?.finance,next.progress!.managerMarket?.staff);
  const season=createCareerSeason(nextDb,save.clubId,year,"domestic-world");
  if(!season) throw new Error("Não foi possível inscrever o clube na próxima temporada; checkpoint preservado.");
  const first=nextCareerFixture(season);
  const result:CareerSave={...next,round:1,division:divisions[save.clubId] ?? save.division,progress:{...next.progress!,round:1,division:divisions[save.clubId] ?? save.division,competitionSeason:season,activeFixtureId:first?.id,page:"hub",matchPreparation:undefined,minute:0,events:[],participation:{},homeScore:0,awayScore:0,matchRunning:false,halftimeWaiting:false}};
  assertSeasonArchives(save,result);
  return result;
}
