import { advancePopulation, dayAfter, migratePlayerSave, playerEligible, projectSquadCondition } from "./players";
import { advanceYouth } from "./player-commands";
import { isUnemployed, processCoaches } from "./coaches";
import { advanceSeasonBeforeDate } from "../season";
import { updateCareerMarket } from "../manager-jobs";
import { migrateFinanceSave, localEmploymentKey } from "./settlement";
import { reconcileContractSquad } from "./contract-squad";
import { adoptFinance, accrueFinance, projectFinance } from "./finance";
import { buildSquadFromDatabase, type CareerSave, type EditorDatabase } from "../editor-data";
import { nextCareerFixture } from "../season";
import { careerCalendarDate } from "../brazilian-calendar";
import { expireLoans, reconcileLoanSquad } from "../loans";
import { refreshJobOffers } from "../manager-jobs";
import { recoverSquadBetweenMatches } from "../live-match";
import { generateIncomingOffers, registerIncomingNegotiations } from "../incoming-offers";
import { simulateWorldMarket, worldDatabase } from "../world-market";
import { ENGINE_CONFIG, EngineConflict, civilDate, engineState, orderedAgenda, type ScheduledEvent } from "./foundation";

export type AdvanceCommand = { marketSelection?: import("./market-planning").MarketSelection; operationId: string; expectedRevision: number; fromDate: string; targetDate?: string; fixtureId?: string };
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
  const financed=migrateFinanceSave(save,database);
  const migrated=migratePlayerSave(financed,worldDatabase(database,financed.progress?.transferNegotiations ?? [],financed.progress?.loanContracts ?? {},financed.progress?.worldMarket,financed.progress?.managerMarket?.finance)).progress!;
  const p = {...structuredClone({...migrated,seasonHistory:undefined}),seasonHistory:migrated.seasonHistory};
  const unemployed = isUnemployed(p.managerMarket);
  const nextFixture = unemployed ? undefined : nextCareerFixture(p.competitionSeason);
  const date = civilDate(command.targetDate ?? (unemployed ? new Date(Date.parse(`${save.inGameDate}T12:00:00Z`)+7*86400000).toISOString().slice(0,10) : careerCalendarDate(save.inGameDate,p.competitionSeason,nextFixture)));
  const days = (Date.parse(`${date}T12:00:00Z`)-Date.parse(`${save.inGameDate}T12:00:00Z`))/86400000;
  if (days < 0 || days > ENGINE_CONFIG.maxAdvanceDays) throw new Error("Intervalo de simulação inválido ou muito longo.");
  const revision = engine.revision+1;
  let loans = p.loanContracts ?? {};
  let managers = p.managerMarket;
  if (managers) {
    managers = adoptFinance(managers,worldDatabase(database,p.transferNegotiations ?? [],loans,p.worldMarket,managers.finance),save.inGameDate,loans,unemployed ? undefined : {clubId:save.clubId,budget:save.budget});

  }
  if (unemployed && p.competitionSeason && managers) {
    p.competitionSeason=advanceSeasonBeforeDate(p.competitionSeason,date,worldDatabase(database,p.transferNegotiations ?? [],loans,p.worldMarket,managers.finance,managers.staff));
    managers=updateCareerMarket(managers,p.competitionSeason,{clubId:"__unemployed__",budget:0,payroll:0},date);
    managers=adoptFinance(managers,worldDatabase(database,p.transferNegotiations ?? [],loans,p.worldMarket,managers.finance),save.inGameDate,loans);
  }
  if(p.worldMarket?.population) {
    const population=advancePopulation(p.worldMarket.population,worldDatabase(database,p.transferNegotiations ?? [],loans,p.worldMarket,managers?.finance),p.competitionSeason,date,save.id,unemployed?undefined:{clubId:save.clubId,squad:p.careerSquad ?? [],fixtureId:command.fixtureId,minutes:Object.fromEntries(Object.entries(p.participation ?? {}).map(([id,v])=>[id,Math.max(0,(v.left ?? 90)-v.entered)]))});
    p.worldMarket={...p.worldMarket,population};
    if(managers?.finance) for(const person of Object.values(population.people)) if(person.retiredOn) {const c=managers.finance.contracts[person.id];if(c && c.status==="active") c.endsOn=person.retiredOn<=c.startsOn ? c.startsOn : dayAfter(person.retiredOn,-1);}
    engine.events.push({id:`${command.operationId}:players`,operationId:command.operationId,date,type:"player-processed",entityIds:[],revision});
  }
  if(managers?.finance) managers=projectFinance({...managers,finance:accrueFinance(managers.finance,date)});
  if(managers?.finance && p.worldMarket?.population) {
    for(const person of Object.values(p.worldMarket.population.people)) if(person.retiredOn && person.retiredOn<=date) {
      const contract=managers.finance.contracts[person.id];if(contract && contract.status==="active") {contract.status="expired";managers.finance.registrations[person.id]={clubId:"",status:"pending",reason:"Aposentadoria registrada na carreira."};}
    }
    managers=projectFinance(managers);
  }
  if(p.worldMarket?.population) {
    const annual=advanceYouth({...save,progress:{...p,managerMarket:managers}},database,date);
    p.youthTeams=annual.progress!.youthTeams;p.worldMarket=annual.progress!.worldMarket;managers=annual.progress!.managerMarket;
  }
  if(managers?.staff) {
    const count=managers.staff.events.length;
    managers=processCoaches(managers,database,p.competitionSeason,date);
    for(const event of managers.staff!.events.slice(count)) engine.events.push({id:event.id,operationId:command.operationId,date:event.date,type:"coach-processed",entityIds:[event.coachId,event.clubId],revision});
    const human=managers.staff!.coaches[managers.staff!.humanId];
    if(!human.clubId) p.managerAppointments=p.managerAppointments?.map(a=>!a.endedOn ? {...a,endedOn:date} : a);
  }
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
  let deals = (p.transferNegotiations ?? []).map(deal=> {
    if(deal.expiresOn && deal.expiresOn<date && (deal.status==="agreed" || deal.status==="countered")) {
      if(managers?.finance) delete managers.finance.reservations[deal.id];
      return {...deal,status:"rejected" as const,revision:(deal.revision ?? 0)+1,message:"Prazo da proposta expirou sem liquidação."};
    }
    return deal;
  });
  if (managers) {
    const simulation = simulateWorldMarket({ database,humanClubId: isUnemployed(managers) ? "__unemployed__" : save.clubId,date,previousDate: save.inGameDate,world,negotiations: deals,loans,managers,season:p.competitionSeason,revision:engine.revision,careerId:save.id,selection:command.marketSelection });
    world = simulation.world; deals = simulation.negotiations; loans = simulation.loans; managers = simulation.managers;
    if (world.lastWeek !== p.worldMarket?.lastWeek) {
      engine.events.push({ id: `${command.operationId}:market`, operationId: command.operationId,date,type: "market-processed",entityIds: [],revision });
      const audits=world.marketState?.audit.filter(a=>a.date===date) ?? [];
      for(const audit of audits) engine.decisions.push({id:audit.decisionId,sector:"market",mode:audit.mode,actionId:audit.actionId,fallback:audit.fallback,comparedActionId:audit.comparedActionId,rulesVersion:"market-v1",stateRevision:engine.revision,options:JSON.parse(audit.contextKey).options.map((o: {actionId: string})=>o.actionId),reason:audit.reason,eventIds:[`${command.operationId}:market`]});
    }
  }
  const existingDeals = new Set((p.transferNegotiations ?? []).filter(deal => deal.status === "completed").map(deal => deal.id));
  for (const deal of deals) if (deal.status === "completed" && !existingDeals.has(deal.id)) {
    const eventId = `${command.operationId}:deal:${deal.id}`;
    engine.events.push({ id:eventId,operationId:command.operationId,date,type:"market-deal-completed",entityIds:[deal.playerId,deal.sourceClubId,deal.buyerClubId].filter(Boolean),revision });
    engine.decisions.push({ id:eventId,sector:"market",mode:"internal",actionId:deal.id,rulesVersion:engine.rulesVersion,stateRevision:engine.revision,options:[deal.id],reason:deal.message,eventIds:[eventId] });
  }
  const effective = worldDatabase(database,deals,loans,world,managers?.finance);
  const recovered = recoverSquadBetweenMatches(reconcileLoanSquad(p.careerSquad ?? [], buildSquadFromDatabase(effective,save.clubName,true) ?? [],loans,save.clubId,Object.keys(p.playerCareers).map(Number)),save.inGameDate,date);
  const squad = world?.population ? projectSquadCondition(reconcileLoanSquad(p.careerSquad ?? [], buildSquadFromDatabase(effective,save.clubName,true) ?? [],loans,save.clubId,Object.keys(p.playerCareers).map(Number)),world.population) : recovered;
  const ownedSquad = projectSquadCondition(reconcileContractSquad(squad,buildSquadFromDatabase(effective,save.clubName,true) ?? [],new Set(effective.players.map(p=>p.id)),Object.keys(p.playerCareers).map(Number)).filter(player=>player.sourceId || managers?.finance?.contracts[localEmploymentKey(save.id,save.clubId,player.id)]?.status !== "expired"),world?.population);
  const remaining = new Set(ownedSquad.filter(player=>playerEligible(player)).map(player => player.id));
  const nextBudget = managers?.clubs[save.clubId]?.budget ?? save.budget;
  const positions = Object.fromEntries(Object.entries(p.manualPositions).filter(([id]) => remaining.has(Number(id))));
  const records = generateIncomingOffers({ squad:ownedSquad,records:p.playerCareers,database:effective,managerMarket:managers,clubId:save.clubId,club:save.clubName,eventId:command.fixtureId ?? p.activeFixtureId ?? `round-${p.round}`,date });
  deals=registerIncomingNegotiations(records,ownedSquad,effective,save.clubId,save.clubName,deals);
  engine.operations.push({ id:command.operationId,from:save.inGameDate,to:date,revision });
  engine.events.push({ id:`${command.operationId}:checkpoint`,operationId:command.operationId,date,type:"checkpoint",entityIds:[save.id],revision });
  engine.revision=revision; engine.date=date;
  return { ...save,round:save.round+1,budget:nextBudget,inGameDate:date,playerCareers:records,manualPositions:positions,progress: { ...p,engine,page:"hub",budget:nextBudget,round:save.round+1,activeFixtureId:nextFixture?.id,worldMarket:world,transferNegotiations:deals,managerMarket:managers,loanContracts:loans,careerSquad:ownedSquad,starters:p.starters.filter(id=>remaining.has(id)),matchBenchIds:p.matchBenchIds?.filter(id=>remaining.has(id)),manualPositions:positions,playerCareers:records } };
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
