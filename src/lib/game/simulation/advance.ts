import { buildSquadFromDatabase, type CareerSave, type EditorDatabase } from "../editor-data";
import { nextCareerFixture } from "../season";
import { careerCalendarDate } from "../brazilian-calendar";
import { expireLoans, reconcileLoanSquad } from "../loans";
import { refreshJobOffers } from "../manager-jobs";
import { recoverSquadBetweenMatches } from "../live-match";
import { generateIncomingOffers } from "../incoming-offers";
import { simulateWorldMarket, worldDatabase } from "../world-market";
import { ENGINE_CONFIG, EngineConflict, civilDate, engineState, orderedAgenda, type ScheduledEvent } from "./foundation";

export type AdvanceCommand = { operationId: string; expectedRevision: number; fromDate: string; targetDate?: string; fixtureId?: string };
/** Pure command boundary. All effects are computed on a private snapshot; caller publishes only after commit. */
export function advanceCareer(save: CareerSave, database: EditorDatabase, command: AdvanceCommand): CareerSave {
  if (!save.progress || !command.operationId) throw new Error("Carreira ou comando inválido.");
  const engine = engineState(save.progress.engine,save.id,save.inGameDate);
  const old = engine.operations.find(op => op.id === command.operationId);
  if (old) {
    if (old.from !== command.fromDate || (command.targetDate && old.to !== command.targetDate)) throw new Error("Comando reutilizado para outro intervalo.");
    return save;
  }
  if (engine.revision !== command.expectedRevision || command.fromDate !== save.inGameDate) throw new EngineConflict();
  const p = structuredClone(save.progress);
  const nextFixture = nextCareerFixture(p.competitionSeason);
  const date = civilDate(command.targetDate ?? careerCalendarDate(save.inGameDate,p.competitionSeason,nextFixture));
  const days = (Date.parse(`${date}T12:00:00Z`)-Date.parse(`${save.inGameDate}T12:00:00Z`))/86400000;
  if (days < 0 || days > ENGINE_CONFIG.maxAdvanceDays) throw new Error("Intervalo de simulação inválido ou muito longo.");
  const revision = engine.revision+1;
  let loans = p.loanContracts ?? {};
  let managers = p.managerMarket;
  const agenda: ScheduledEvent[] = [];
  for (const [id,loan] of Object.entries(loans)) if (loan.status === "active" && loan.endsOn && loan.endsOn <= date) agenda.push({ id: `loan:${id}:${loan.endsOn}`, date: loan.endsOn <= save.inGameDate ? save.inGameDate : loan.endsOn, priority: 1, kind: "loan", entityId: id });
  for (const application of managers?.applications ?? []) if (application.status === "offered") {
    const expires = new Date(`${application.expiresOn}T12:00:00Z`); expires.setUTCDate(expires.getUTCDate()+1);
    agenda.push({ id: `job:${application.id}:${application.expiresOn}`, date: expires.toISOString().slice(0,10), priority: 2, kind: "job", entityId: application.id });
  }
  // Process overdue obligations too, without replaying every real-world day or inventing new periodic charges.
  const start = new Date(`${save.inGameDate}T12:00:00Z`); start.setUTCDate(start.getUTCDate()-1);
  const pending = orderedAgenda(agenda.map(e => e.date < save.inGameDate ? { ...e, date: save.inGameDate } : e),start.toISOString().slice(0,10),date);
  for (const event of pending) {
    if (event.kind === "loan") loans = expireLoans(loans,event.date);
    if (event.kind === "job" && managers) managers = refreshJobOffers(managers,event.date);
    engine.events.push({ id: `${command.operationId}:${event.id}`, operationId: command.operationId, date: event.date, type: event.kind === "loan" ? "loan-returned" : "job-expired", entityIds: [event.entityId], revision });
  }
  loans = expireLoans(loans,date);
  if (managers) managers = refreshJobOffers(managers,date);
  let world = p.worldMarket;
  let deals = p.transferNegotiations ?? [];
  if (managers) {
    const simulation = simulateWorldMarket({ database,humanClubId: save.clubId,date,previousDate: save.inGameDate,world,negotiations: deals,loans,managers });
    world = simulation.world; deals = simulation.negotiations; loans = simulation.loans; managers = simulation.managers;
    if (world.lastWeek !== p.worldMarket?.lastWeek) {
      engine.events.push({ id: `${command.operationId}:market`, operationId: command.operationId,date,type: "market-processed",entityIds: [],revision });
      engine.decisions.push({ id: `${command.operationId}:market`,sector: "market",mode: "internal", actionId: "legacy-weekly-market", rulesVersion: engine.rulesVersion, stateRevision: engine.revision, options: ["legacy-weekly-market"], reason: "Rodada semanal interna preservada, limitada pela configuração de elenco e orçamento.", eventIds: [`${command.operationId}:market`] });
    }
  }
  const existingDeals = new Set((p.transferNegotiations ?? []).filter(deal => deal.status === "completed").map(deal => deal.id));
  for (const deal of deals) if (deal.status === "completed" && !existingDeals.has(deal.id)) {
    const eventId = `${command.operationId}:deal:${deal.id}`;
    engine.events.push({ id:eventId,operationId:command.operationId,date,type:"market-deal-completed",entityIds:[deal.playerId,deal.sourceClubId,deal.buyerClubId].filter(Boolean),revision });
    engine.decisions.push({ id:eventId,sector:"market",mode:"internal",actionId:deal.id,rulesVersion:engine.rulesVersion,stateRevision:engine.revision,options:[deal.id],reason:deal.message,eventIds:[eventId] });
  }
  const effective = worldDatabase(database,deals,loans,world);
  const squad = recoverSquadBetweenMatches(reconcileLoanSquad(p.careerSquad ?? [], buildSquadFromDatabase(effective,save.clubName,true) ?? [],loans,save.clubId,Object.keys(p.playerCareers).map(Number)),save.inGameDate,date);
  const remaining = new Set(squad.map(player => player.id));
  const positions = Object.fromEntries(Object.entries(p.manualPositions).filter(([id]) => remaining.has(Number(id))));
  const records = generateIncomingOffers({ squad,records:p.playerCareers,database:effective,managerMarket:managers,clubId:save.clubId,club:save.clubName,eventId:command.fixtureId ?? p.activeFixtureId ?? `round-${p.round}`,date });
  engine.operations.push({ id:command.operationId,from:save.inGameDate,to:date,revision });
  engine.events.push({ id:`${command.operationId}:checkpoint`,operationId:command.operationId,date,type:"checkpoint",entityIds:[save.id],revision });
  engine.revision=revision; engine.date=date;
  return { ...save,round:save.round+1,inGameDate:date,playerCareers:records,manualPositions:positions,progress: { ...p,engine,page:"hub",round:save.round+1,activeFixtureId:nextFixture?.id,worldMarket:world,transferNegotiations:deals,managerMarket:managers,loanContracts:loans,careerSquad:squad,starters:p.starters.filter(id=>remaining.has(id)),matchBenchIds:p.matchBenchIds?.filter(id=>remaining.has(id)),manualPositions:positions,playerCareers:records } };
}

export interface CheckpointRepository {
  /** Must perform a real atomic compare-and-swap; reject without exposing any partial write. */
  compareAndSwap(id: string, expectedRevision: number, next: CareerSave): Promise<boolean>;
}
export async function commitAdvance(save: CareerSave, database: EditorDatabase, command: AdvanceCommand, repository: CheckpointRepository) {
  const next = advanceCareer(save,database,command);
  if (next === save) return save;
  if (!await repository.compareAndSwap(save.id,command.expectedRevision,next)) throw new EngineConflict();
  return next;
}
