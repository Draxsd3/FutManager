import type { CareerSave, EditorDatabase } from "../editor-data";
import type { CareerSeason } from "../season";
import { knockoutWinner } from "../tournament-progression";
import { archiveChampionships, type ChampionshipRecord } from "../honours";
import { assertMatchReport } from "./matches";
import { civilDate, engineState, EngineConflict } from "./foundation";

export type SeasonIssue = { code: "duplicate-fixture" | "wrong-year" | "pending-fixture" | "unknown-club" | "invalid-result" | "unsettled-date"; fixtureId: string; detail: string };
export type SeasonSummary = {
  year: number; fixtures: number; played: number; cancelled: number; goals: number;
  contributions: number; clubs: string[]; competitionIds: string[];
  /** An archive of the actual career calendar is not proof of coverage of the whole world. */
  missingNationalClubIds: string[];
};
export type SeasonArchive = {
  version: 1; rulesVersion: "season-archive-v1"; id: string; closedOn: string;
  season: CareerSeason; summary: SeasonSummary; honours: ChampionshipRecord[];
};
export type CloseSeasonCommand = { operationId: string; expectedRevision: number; fromDate: string };

/** Audit observations, not invented final scores, registrations or prizes. */
export function auditSeason(season: CareerSeason, database: EditorDatabase, through: string): { summary: SeasonSummary; issues: SeasonIssue[] } {
  civilDate(through);
  if(!Number.isSafeInteger(season.season) || season.season<1900 || season.season>9999)throw new Error("Ano da temporada inválido.");
  const issues: SeasonIssue[] = [], seen = new Set<string>(), known = new Set(database.clubs.map(c => c.id)), clubs = new Set<string>(), leagues = new Set<string>();
  let played=0,cancelled=0,goals=0,contributions=0;
  for(const f of season.fixtures) {
    const issue=(code:SeasonIssue["code"],detail:string)=>issues.push({code,fixtureId:f.id,detail});
    if(seen.has(f.id))issue("duplicate-fixture","Identidade de partida repetida.");seen.add(f.id);
    if(f.season!==season.season)issue("wrong-year","Partida de outro ano na temporada ativa.");
    if(f.status==="cancelled") {cancelled++;continue;}
    if(f.status!=="played") {issue("pending-fixture","Partida ainda agendada ou fase não resolvida.");continue;}
    played++;
    for(const id of [f.homeClubId,f.awayClubId]) {clubs.add(id);if(!known.has(id))issue("unknown-club",`Clube sem cadastro na carreira: ${id}`);}
    if(f.type==="league")for(const id of [f.homeClubId,f.awayClubId])leagues.add(id);
    if(f.scheduledDate && f.scheduledDate>through)issue("unsettled-date","O calendário civil ainda não alcançou a partida concluída.");
    try {
      if(f.homeClubId===f.awayClubId || !Number.isSafeInteger(f.homeScore) || !Number.isSafeInteger(f.awayScore) || f.homeScore!<0 || f.awayScore!<0 || f.homeScore!>100 || f.awayScore!>100)throw new Error("Placar ou adversários inválidos.");
      assertMatchReport(f);
      if(f.winnerClubId && ![f.homeClubId,f.awayClubId].includes(f.winnerClubId))throw new Error("Vencedor não participou da partida.");
    }catch(error){issue("invalid-result",error instanceof Error?error.message:"Súmula inválida.");}
    goals+=(f.homeScore ?? 0)+(f.awayScore ?? 0);contributions+=f.playerContributions?.length ?? 0;
  }
  for(const competitionId of new Set(season.fixtures.map(f=>f.competitionId))) {
    const games=season.fixtures.filter(f=>f.competitionId===competitionId);
    const knockout=games.filter(f=>f.stage==="knockout");
    if(knockout.length) {
      const stage=Math.max(...knockout.map(f=>f.knockoutStage ?? 0)),final=knockout.filter(f=>(f.knockoutStage ?? 0)===stage);
      if(!knockoutWinner(final))issues.push({code:"pending-fixture",fixtureId:final[0]?.id ?? "",detail:"Final eliminatória ainda sem vencedor confirmado."});
    }else if(games[0]?.type==="cup") {
      const last=Math.max(...games.map(f=>f.competitionRound)),final=games.filter(f=>f.competitionRound===last);
      if(final.length!==1 || final[0].status!=="played" || !final[0].winnerClubId)issues.push({code:"pending-fixture",fixtureId:final[0]?.id ?? "",detail:"Final da copa ainda sem resultado confirmado; cancelamento não inventa campeão."});
    }
  }
  if(!season.fixtures.length)issues.push({code:"pending-fixture",fixtureId:"",detail:"Temporada sem calendário; não é um encerramento válido."});
  const missingNationalClubIds=database.clubs.filter(c=>c.country.toLocaleLowerCase("pt-BR")==="brasil" && c.division!=="Sem divisão nacional" && !leagues.has(c.id)).map(c=>c.id).sort();
  return {summary:{year:season.season,fixtures:season.fixtures.length,played,cancelled,goals,contributions,clubs:[...clubs].sort(),competitionIds:[...new Set(season.fixtures.map(f=>f.competitionId))].sort(),missingNationalClubIds},issues};
}

/** Canonical comparison includes the entire archive, not only its score summary. */
export function archiveFingerprint(value: unknown): string {
  return JSON.stringify(value,(_key,v)=>v && typeof v==="object" && !Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
}
export function assertSeasonArchives(previous:CareerSave|undefined,next:CareerSave):void {
  const archives=next.progress?.seasonHistory ?? {};
  for(const [key,archive] of Object.entries(archives)) {
    if(archive.version!==1 || archive.rulesVersion!=="season-archive-v1" || archive.id!==`${next.id}:${archive.season.season}` || key!==String(archive.season.season))throw new Error("Arquivo de temporada incompatível.");
    civilDate(archive.closedOn);
    if(archive.season.fixtures.some(f=>!["played","cancelled"].includes(f.status)))throw new Error("Arquivo contém partidas pendentes.");
  }
  for(const [year,archive] of Object.entries(previous?.progress?.seasonHistory ?? {}))if(archiveFingerprint(archives[year])!==archiveFingerprint(archive))throw new Error("Temporada arquivada não pode ser removida ou reescrita.");
}

/** Additive closure only. Does NOT roll over the year, pay a fictitious prize or reset data.
 * The production annual transition must use this boundary, then preserve the archive in its CAS. */
export function closeCareerSeason(save:CareerSave,database:EditorDatabase,command:CloseSeasonCommand):CareerSave {
  if(!save.progress || !command.operationId || command.operationId.length>160)throw new Error("Comando de encerramento inválido.");
  const p=save.progress,season=p.competitionSeason;
  if(!season)throw new Error("Carreira sem temporada ativa.");
  const engine=engineState(p.engine,save.id,save.inGameDate),existing=engine.operations.find(o=>o.id===command.operationId);
  if(existing) {
    if(existing.from!==command.fromDate || !engine.events.some(e=>e.operationId===command.operationId && e.type==="season-closed" && e.entityIds.includes(String(season.season))))throw new Error("Comando reutilizado para outro encerramento.");
    return save;
  }
  if(command.expectedRevision!==engine.revision || command.fromDate!==save.inGameDate)throw new EngineConflict();
  if(p.page==="matchOverview" || p.matchRunning)throw new Error("Conclua a partida antes de encerrar a temporada.");
  if(Number(save.inGameDate.slice(0,4))<season.season)throw new Error("O calendário ainda não alcançou a temporada.");
  const audit=auditSeason(season,database,save.inGameDate);
  if(audit.issues.length)throw new Error(`Temporada não encerrada: ${audit.issues[0].detail}`);
  const year=String(season.season),old=p.seasonHistory?.[year];
  if(old) {
    if(archiveFingerprint(old.season)!==archiveFingerprint(season))throw new Error("Temporada diverge do arquivo existente.");
    return save;
  }
  const honours=archiveChampionships(p.championHistory ?? [],season,database,save.managerName);
  const archive:SeasonArchive={version:1,rulesVersion:"season-archive-v1",id:`${save.id}:${season.season}`,closedOn:save.inGameDate,season:structuredClone(season),summary:audit.summary,honours:honours.filter(h=>h.season===season.season)};
  engine.revision++;engine.operations.push({id:command.operationId,from:save.inGameDate,to:save.inGameDate,revision:engine.revision});
  engine.events.push({id:`${command.operationId}:closed`,operationId:command.operationId,date:save.inGameDate,type:"season-closed",entityIds:[String(season.season)],revision:engine.revision});
  const next={...save,progress:{...p,engine,championHistory:honours,seasonHistory:{...p.seasonHistory,[year]:archive}}};
  assertSeasonArchives(save,next);return next;
}
