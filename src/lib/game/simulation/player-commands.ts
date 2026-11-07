import { createPlayerCareer } from "../career";
import { buildSquadFromDatabase, type CareerSave, type EditorDatabase } from "../editor-data";
import { generateYouthTeam, promoteYouth, type YouthTeam } from "../youth";
import { dateAfterMonths } from "../loans";
import { applyTrainingSession, TRAINING_DAYS, type TrainingSessionInput, type TrainingSessionRecord } from "../training";
import { seededRandom } from "../live-match";
import { isUnemployed } from "./coaches";
import { availableCents, adoptFinance, brlToCents, FINANCE_RULES, projectFinance } from "./finance";
import { worldDatabase } from "../world-market";
import { engineState } from "./foundation";
import { dayAfter, editorFromPlayer, migratePlayerSave, projectSquadCondition } from "./players";

export function youthCohort(club:EditorDatabase["clubs"][number],careerId:string,year:number):YouthTeam {
  const team=generateYouthTeam(club,`${careerId}:${year}`,`Base anual simulada de ${year}; sem consulta externa.`);
  return {...team,season:year,players:team.players.map((p,i)=>({...p,id:`simulado:${careerId}:${club.id}:${year}:${i}`,birthYear:year-p.age}))};
}
function commandContext(save:CareerSave,db:EditorDatabase){
  if(!save.progress || ["matchOverview","result"].includes(save.progress.page) || isUnemployed(save.progress.managerMarket)) throw new Error("Conclua a partida ou assuma um clube antes desta ação.");
  return migratePlayerSave(save,db);
}
function checkpoint(save:CareerSave,operationId:string):CareerSave {
  const p=save.progress!,engine=engineState(p.engine,save.id,save.inGameDate);
  if(engine.operations.some(o=>o.id===operationId)) return save;
  engine.revision++;engine.operations.push({id:operationId,from:save.inGameDate,to:save.inGameDate,revision:engine.revision});engine.events.push({id:`${operationId}:committed`,operationId,date:save.inGameDate,type:"player-processed",entityIds:[save.clubId],revision:engine.revision});
  return {...save,progress:{...p,engine}};
}
export function trainCareerPlayers(save:CareerSave,db:EditorDatabase,input:TrainingSessionInput):{save:CareerSave;record?:TrainingSessionRecord;error?:string}{
  if(!TRAINING_DAYS.includes(input.day) || !["Leve","Moderada","Intensa"].includes(input.intensity)) throw new Error("Sessão inválida.");
  const current=commandContext(save,db),p=current.progress!,population=p.worldMarket!.population!;
  const operationId=`training:${save.clubId}:${save.inGameDate}:${input.day}`;
  if(p.engine?.operations.some(o=>o.id===operationId)) return {save,error:"Esta sessão já foi concluída nesta data."};
  const participants=(p.careerSquad ?? []).filter(player=>{
    const c=player.sourceId && population.people[player.sourceId];return c && !c.trainingDays.includes(`${save.inGameDate}:${input.day}`) && c.trainingDays.filter(d=>d.startsWith(save.inGameDate)).length<2;
  });
  const result=applyTrainingSession(participants,{...input,season:Number(save.inGameDate.slice(0,4)),week:p.round},seededRandom(`${save.id}:${operationId}`));
  if(!result.record) return {save,error:result.error};
  const state=structuredClone(population),participantsById=new Map(result.squad.map(v=>[v.id,v]));
  for(const before of participants){const after=participantsById.get(before.id)!,s=state.people[before.sourceId!];if(!result.record.playerIds.includes(before.id)) continue;
    // Clicking a session never grants permanent GER: only the monthly service can develop a player.
    s.energy=after.energy;s.load+=result.record.energySpent/Math.max(1,result.record.playerIds.length);s.trainingDays=[...s.trainingDays,`${save.inGameDate}:${input.day}`].slice(-60);
  }
  const record={...result.record,id:operationId,overallImprovements:0};
  const next={...current,progress:{...p,worldMarket:{...p.worldMarket!,population:state},careerSquad:projectSquadCondition(p.careerSquad ?? [],state),trainingSessions:[...(p.trainingSessions ?? []),record].slice(-240)}};
  return {save:checkpoint(next,operationId),record};
}
/** Every promoted youth becomes a career-local universal person, never a fake editor/API row. */
export function promoteCareerYouth(save:CareerSave,db:EditorDatabase,youthId:string,publish=true):{save:CareerSave;message:string}{
  const current=commandContext(save,db),p=current.progress!,team=p.youthTeams?.[save.clubId],junior=team?.players.find(v=>v.id===youthId);
  if(!team || !junior || team.promoted?.includes(youthId)) return {save,message:"Jogador não encontrado na base ou já promovido."};
  const squad=p.careerSquad ?? [];if(squad.length>=200) throw new Error("Elenco principal no limite de 200 jogadores.");
  const promoted=promoteYouth(junior,squad,Object.keys(p.playerCareers).map(Number));if(!promoted) return {save,message:"Jogador já promovido."};
  const id=`youth:${save.id}:${youthId}`;if(p.worldMarket!.population!.people[id]) return {save,message:"Jogador já promovido."};
  const finance=p.managerMarket?.finance;if(!finance || availableCents(finance,save.clubId)<brlToCents(promoted.salary*1000)*FINANCE_RULES.salaryHorizonMonths) throw new Error("Clube sem caixa livre para cobrir o salário da promoção.");
  promoted.sourceId=id;promoted.contractUntil=dateAfterMonths(save.inGameDate,12);
  const state=structuredClone(p.worldMarket!.population!);state.generated[id]=editorFromPlayer(promoted,id,save.clubId);
  // Reuse additive person adoption for the new source without touching any existing person.
  const temporary=migratePlayerSave({...current,progress:{...p,worldMarket:undefined,careerSquad:[promoted]}},{clubs:db.clubs,players:[state.generated[id]]});
  state.people[id]={...temporary.progress!.worldMarket!.population!.people[id],origin:junior.origin==="simulado"?"simulated":"catalog"};
  const market=adoptFinance(p.managerMarket!,{...db,players:[state.generated[id]]},save.inGameDate,p.loanContracts);
  const records={...p.playerCareers,[promoted.id]:createPlayerCareer(promoted,save.clubName,Number(save.inGameDate.slice(0,4)))};
  const next={...current,playerCareers:records,progress:{...p,playerCareers:records,worldMarket:{...p.worldMarket!,population:state},managerMarket:market,careerSquad:projectSquadCondition([...squad,promoted],state),youthTeams:{...p.youthTeams,[save.clubId]:{...team,players:team.players.filter(v=>v.id!==youthId),promoted:[...(team.promoted ?? []),youthId]}}}};
  return {save:publish ? checkpoint(next,`promote:${id}`) : next,message:`${junior.name} promovido ao elenco principal.`};
}
export function playerCareAction(save:CareerSave,db:EditorDatabase,id:number,action:"rest"|"rehabilitation"|"promise"):{save:CareerSave;message:string}{
  if(!["rest","rehabilitation","promise"].includes(action)) throw new Error("Ação de atleta inválida.");
  const current=commandContext(save,db),p=current.progress!,player=p.careerSquad?.find(v=>v.id===id),state=structuredClone(p.worldMarket!.population!);
  const s=player?.sourceId && state.people[player.sourceId];if(!s || s.retiredOn) throw new Error("Atleta indisponível.");
  if(action==="promise") {
    if(s.promises.some(v=>v.status==="pending")) return {save,message:"Já existe um compromisso de minutos pendente."};
    s.promises=[...s.promises,{id:`promise:${save.clubId}:${save.inGameDate}`,clubId:save.clubId,madeOn:save.inGameDate,dueOn:dayAfter(save.inGameDate,30),minutes:180,played:0,status:"pending" as const}].slice(-10);
  } else s.treatment=action;
  const next={...current,progress:{...p,worldMarket:{...p.worldMarket!,population:state},careerSquad:projectSquadCondition(p.careerSquad ?? [],state)}};
  return {save:checkpoint(next,`care:${s.id}:${action}:${save.inGameDate}:${(p.engine?.revision ?? 0)+1}`),message:action==="promise"?"Compromisso registrado: 180 minutos em 30 dias neste clube.":"Plano de tratamento registrado, sem cura instantânea."};
}
/** Annual intake only on civil year crossings; real imported youth is retained, never refreshed from API. */
export function advanceYouth(save:CareerSave,db:EditorDatabase,date:string):CareerSave {
  const p=save.progress!;if(!p.worldMarket?.population || date.slice(0,4)===save.inGameDate.slice(0,4)) return save;
  let next=save;const teams={...p.youthTeams};
  for(let year=Number(save.inGameDate.slice(0,4))+1;year<=Number(date.slice(0,4));year++) for(const club of db.clubs.filter(c=>c.country.toLocaleLowerCase("pt-BR")==="brasil" && c.division!=="Sem divisão nacional")) {
    const old=teams[club.id];if(old?.season && old.season>=year) continue;
    const cohort=youthCohort(club,save.id,year);
    teams[club.id]=old ? {...old,season:year,players:[...old.players.map(v=>({...v,age:year-(v.birthYear ?? ((old.season ?? Number(save.inGameDate.slice(0,4)))-v.age)),birthYear:v.birthYear ?? ((old.season ?? Number(save.inGameDate.slice(0,4)))-v.age)})).filter(v=>v.origin==="transfermarkt" || v.age<=20),...cohort.players.slice((year%5)*4,(year%5)*4+4)].slice(0,40)} : cohort;
  }
  next={...next,progress:{...p,youthTeams:teams}};
  // CPU uses the same promotion executor and financial coverage, at most one youngster per club/year.
  for(const club of db.clubs) if(club.id!==save.clubId && teams[club.id] && teams[club.id].cpuPromotedIn!==Number(date.slice(0,4))) {
    const effective=worldDatabase(db,p.transferNegotiations ?? [],p.loanContracts ?? {},next.progress!.worldMarket,next.progress!.managerMarket?.finance),squad=buildSquadFromDatabase(effective,club.name,true) ?? [];
    if(squad.length>=20) continue;
    const junior=[...teams[club.id].players].sort((a,b)=>b.overall-a.overall || a.id.localeCompare(b.id))[0];if(!junior) continue;
    try {
      // Explicit CPU context; no human job protection or salary exception.
      const cpu={...next,clubId:club.id,clubName:club.name,inGameDate:date,progress:{...next.progress!,page:"hub",careerSquad:squad,managerMarket:{...next.progress!.managerMarket!,staff:undefined}}};
      const result=promoteCareerYouth(cpu,db,junior.id,false);
      next={...next,progress:{...next.progress!,worldMarket:result.save.progress!.worldMarket,managerMarket:projectFinance({...result.save.progress!.managerMarket!,staff:next.progress!.managerMarket?.staff}),youthTeams:result.save!==cpu ? {...result.save.progress!.youthTeams,[club.id]:{...result.save.progress!.youthTeams![club.id],cpuPromotedIn:Number(date.slice(0,4))}} : result.save.progress!.youthTeams}};
    } catch { /* Insufficient budget: keep the youngster in youth; never manufacture funds. */ }
  }
  return next;
}
