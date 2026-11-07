import type { CareerSave, EditorDatabase, EditorPlayer } from "../editor-data";
import type { Player } from "../mock-data";
import type { CareerSeason } from "../season";
import { seededRandom } from "../live-match";
import { civilDate } from "./foundation";

export const PLAYER_RULES=Object.freeze({version:"players-v1",yearlyGrowth:2,yearlyDecline:2,retirementAge:42,injuryDays:10,relapseDays:14,maximumEvents:1000});
export type PlayerCondition={ validThrough?:string;birthDate?:string; injuredUntil?:string; suspendedUntil?:string; retiredOn?:string; morale:number; treatment:"rest"|"rehabilitation"; load:number; promise?:{minutes:number;played:number;dueOn:string;status:"pending"|"kept"|"broken"}; origin:"catalog"|"legacy"|"simulated" };
export type Person=PlayerCondition & {id:string;adoptedOn:string;through:string;birthDate?:string;baseAge:number;age:number;overall:number;potential:number;energy:number;developmentYear:number;gains:number;losses:number;lastMonth:string;relapseUntil?:string;trainingDays:string[];promises:{id:string;clubId:string;madeOn:string;dueOn:string;minutes:number;played:number;status:"pending"|"kept"|"broken"}[]};
export type PlayerPopulation={version:1;rulesVersion:"players-v1";through:string;people:Record<string,Person>;generated:Record<string,EditorPlayer>;fixtures:string[];events:{id:string;date:string;personId:string;kind:"injury"|"relapse"|"recovered"|"development"|"decline"|"retired"|"promise-kept"|"promise-broken";reason:string}[]};
const limit=(n:number,a=0,b=100)=>Math.max(a,Math.min(b,n));
export const dayAfter=(date:string,days:number)=>new Date(Date.parse(`${civilDate(date)}T12:00:00Z`)+days*86400000).toISOString().slice(0,10);
export function playerEligible(p:{registrationStatus?:string;age?:number;condition?:PlayerCondition},date?:string) {
  const c=p.condition;if(p.registrationStatus==="pending" || c?.retiredOn) return false;
  if((c?.injuredUntil && (!date || date<c.injuredUntil)) || (c?.suspendedUntil && (!date || date<c.suspendedUntil))) return false;
  if(date && c?.validThrough && date>=c.validThrough && p.age!==undefined) {
    const age=c.birthDate ? Number(date.slice(0,4))-Number(c.birthDate.slice(0,4))-Number(date.slice(5)<c.birthDate.slice(5)) : p.age+Number(date.slice(0,4))-Number(c.validThrough.slice(0,4));
    if(age>=PLAYER_RULES.retirementAge) return false;
  }
  return true;
}
function person(player:EditorPlayer,date:string,seed:string,origin:Person["origin"]):Person {
  let birthDate:string|undefined;
  try {const birth=player.transfermarkt?.dateOfBirth;if(birth && civilDate(birth)<=date) birthDate=birth;} catch { /* Unknown remains unknown. */ }
  const value:Person={id:player.id,origin,adoptedOn:date,through:date,birthDate,baseAge:player.age,age:player.age,overall:player.overall,potential:limit(player.overall+Math.floor(seededRandom(`${seed}:potential:${player.id}`)()*16),player.overall,99),energy:player.energy,morale:50,treatment:"rest",load:0,developmentYear:Number(date.slice(0,4)),gains:0,losses:0,lastMonth:date.slice(0,7),trainingDays:[],promises:[]};
  value.age=ageAt(value,date);return value;
}
export function localPersonId(careerId:string,clubId:string,id:number){return `local:${careerId}:${clubId}:${id}`;}
export function editorFromPlayer(p:Player,id:string,clubId:string):EditorPlayer {
  return {id,clubId,name:p.name,shirtNumber:p.shirtNumber ?? p.id,primaryPosition:p.position,secondaryPosition:p.secondaryPosition ?? null,preferredFoot:p.foot,overall:p.overall,age:p.age,energy:p.energy,salaryMonthlyBrl:p.salary*1000,marketValueBrl:p.marketValue*1e6,marketStatus:p.marketAvailability ?? "normal",goals:p.goals,assists:p.assists,ownGoals:p.ownGoals,averageRating:p.avgRating,starRating:1,qualityPrimary:p.traits,qualitySecondary:"",contractEndsOn:p.contractUntil,loan:p.loan};
}
/** Additive identity adoption. Never rewrite frozen catalog, IDs, statistics, contracts or saved youth. */
export function migratePlayerSave(save:CareerSave,db:EditorDatabase):CareerSave {
  const p=save.progress;if(!p) return save;
  const current=p.worldMarket?.population;
  if(current) {
    if(current.version!==1 || current.rulesVersion!==PLAYER_RULES.version || !current.people || !current.generated || current.through!==save.inGameDate) throw new Error("Condição dos jogadores incompatível; save preservado.");
    if(db.players.every(v=>current.people[v.id]) && (p.careerSquad ?? []).every(v=>v.sourceId && current.people[v.sourceId])) return save;
  }
  const population:PlayerPopulation=current ? structuredClone(current) : {version:1,rulesVersion:"players-v1",through:save.inGameDate,people:{},generated:{},fixtures:(p.competitionSeason?.fixtures ?? []).filter(f=>f.status==="played").map(f=>f.id),events:[]};
  for(const player of db.players) if(!population.people[player.id]) population.people[player.id]=person(player,save.inGameDate,save.id,"catalog");
  const squad=p.careerSquad?.map(player=>{
    const id=player.sourceId ?? localPersonId(save.id,save.clubId,player.id);
    if(!population.people[id]) {const source=editorFromPlayer(player,id,save.clubId);population.generated[id]=source;population.people[id]=person(source,save.inGameDate,save.id,player.youthId ? "simulated" : "legacy");}
    // Preserve real in-game state, not the static seed.
    if(!current) Object.assign(population.people[id],{energy:player.energy,overall:player.overall,potential:Math.max(population.people[id].potential,player.overall)});
    population.people[id].age=ageAt(population.people[id],save.inGameDate);
    return {...player,sourceId:id,age:population.people[id].age,overall:population.people[id].overall,energy:Math.round(population.people[id].energy),condition:conditionOf(population.people[id])};
  });
  return {...save,progress:{...p,careerSquad:squad ?? p.careerSquad,worldMarket:{listings:{},events:[],...p.worldMarket,population}}};
}
export function conditionOf(p:Person):PlayerCondition{return {validThrough:p.through,birthDate:p.birthDate,injuredUntil:p.injuredUntil,suspendedUntil:p.suspendedUntil,retiredOn:p.retiredOn,morale:p.morale,treatment:p.treatment,load:p.load,origin:p.origin,promise:p.promises.at(-1)};}
export function populationDatabase(db:EditorDatabase,state?:PlayerPopulation):EditorDatabase {
  if(!state) return db;
  const ids=new Set(db.players.map(p=>p.id));
  return {...db,players:[...db.players,...Object.values(state.generated).filter(p=>!ids.has(p.id))].map(p=>{
    const s=state.people[p.id];return s ? {...p,age:s.age,overall:s.overall,energy:s.energy,condition:conditionOf(s)} : p;
  })};
}
function event(s:PlayerPopulation,p:Person,date:string,kind:PlayerPopulation["events"][number]["kind"],reason:string,reference=date){s.events.push({id:`${p.id}:${kind}:${reference}`,date,personId:p.id,kind,reason});}
export function ageAt(p:Person,date:string){return p.birthDate ? Number(date.slice(0,4))-Number(p.birthDate.slice(0,4))-Number(date.slice(5)<p.birthDate.slice(5)) : p.baseAge+Number(date.slice(0,4))-Number(p.adoptedOn.slice(0,4));}
/** Calendar-bound monthly development, never a random draw per render/training click. */
function recoverPerson(state:PlayerPopulation,p:Person,date:string,seed:string,autoTraining=false) {
  if(date<p.through) throw new Error("Condição não pode retroceder.");
  for(let at=dayAfter(p.through,1);at<=date;at=dayAfter(at,1)) {
    p.age=ageAt(p,at);
    p.energy=limit(p.energy+Math.max(2.5,5-(p.age-25)*.09));p.load=Math.max(0,p.load-8);
    if(p.injuredUntil && p.injuredUntil<=at) {event(state,p,p.injuredUntil,"recovered","Tratamento concluído; retorno com risco de recaída.");p.relapseUntil=dayAfter(p.injuredUntil,PLAYER_RULES.relapseDays);p.injuredUntil=undefined;}
    if(p.suspendedUntil && p.suspendedUntil<=at) p.suspendedUntil=undefined;
    if(!p.retiredOn && p.age>=PLAYER_RULES.retirementAge){p.retiredOn=at;event(state,p,at,"retired","Aposentadoria pela política etária simulada; cadastro/histórico preservados.");}
    // Same light training effect as the human, at most once per civil week; never immediate GER.
    if(autoTraining && !p.retiredOn && !p.injuredUntil && !p.suspendedUntil && p.energy>=75 && new Date(`${at}T12:00:00Z`).getUTCDay()===1){p.energy-=2;p.load+=2;p.trainingDays=[...p.trainingDays,`${at}:auto`].slice(-60);}
    if(at.slice(0,7)!==p.lastMonth) {
      const month=at.slice(0,7),year=Number(at.slice(0,4));
      if(p.developmentYear!==year){p.developmentYear=year;p.gains=0;p.losses=0;}
      const random=seededRandom(`${seed}:development:${p.id}:${month}`);
      const practice=p.trainingDays.some(d=>d.slice(0,10)>=dayAfter(at,-30));
      if(!p.retiredOn && p.age<=27 && p.overall<p.potential && p.gains<PLAYER_RULES.yearlyGrowth && !p.injuredUntil && p.energy>=55 && random()<(practice?.12:.08)){p.overall++;p.gains++;event(state,p,at,"development","Evolução simulada condicionada a idade, treino, saúde e potencial.");}
      if(!p.retiredOn && p.age>=32 && p.overall>25 && p.losses<PLAYER_RULES.yearlyDecline && random()<.25){p.overall--;p.losses++;event(state,p,at,"decline","Declínio simulado registrado; estatísticas preservadas.");}
      p.lastMonth=month;
    }
    for(const promise of p.promises) if(promise.status==="pending" && promise.dueOn<at){promise.status=promise.played>=promise.minutes ? "kept" : "broken";p.morale=limit(p.morale+(promise.status==="kept"?8:-12));event(state,p,promise.dueOn,promise.status==="kept"?"promise-kept":"promise-broken","Compromisso de minutos avaliado pelo vínculo e participações registradas.",promise.id);}
  }
  p.through=date;
}
/** Shared participation rule: CPU uses recorded lineup contributions, human uses actual live stints.
 * No invented cards or injuries in historical matches; already-known fixtures were marked at adoption. */
export function advancePopulation(state:PlayerPopulation,db:EditorDatabase,season:CareerSeason|undefined,date:string,seed:string,human?:{clubId:string;squad:Player[];fixtureId?:string;minutes:Record<number,number>}):PlayerPopulation {
  civilDate(date);if(date<state.through) throw new Error("Condição não pode retroceder.");
  const s=structuredClone(state), sources=new Map(populationDatabase(db,s).players.map(p=>[p.id,p]));
  const seen=new Set(s.fixtures),pending=new Map<string,{relapse:boolean;fixture:string}>();
  for(const f of [...(season?.fixtures ?? [])].filter(f=>f.status==="played" && !seen.has(f.id)).sort((a,b)=>(a.scheduledDate ?? state.through).localeCompare(b.scheduledDate ?? state.through) || a.id.localeCompare(b.id))) {
    if(f.scheduledDate && f.scheduledDate<state.through){seen.add(f.id);continue;}
    const at=f.scheduledDate && f.scheduledDate>=state.through ? f.scheduledDate : state.through;if(at>date) continue;
    const participants=new Map<string,{minutes:number;liveEnergy?:number}>();
    for(const c of f.playerContributions ?? []) if(c.playerId && sources.has(c.playerId)) participants.set(c.playerId,{minutes:c.minutes});
    if(human && human.fixtureId===f.id) for(const p of human.squad) if(p.sourceId && (human.minutes[p.id] ?? 0)>0) participants.set(p.sourceId,{minutes:human.minutes[p.id],liveEnergy:p.energy});
    for(const [id,played] of participants){const p=s.people[id],source=sources.get(id);if(!p || !source) continue;recoverPerson(s,p,at,seed,!human || source.clubId!==human.clubId);if(p.retiredOn || p.injuredUntil || p.suspendedUntil) continue;
      const load=played.minutes*(source.primaryPosition==="L"?1.15:source.primaryPosition==="G"?.55:1)*(p.age>=32?1.15:1);
      p.load+=load;p.energy=played.liveEnergy ?? limit(p.energy-load*.35,15,100);
      for(const promise of p.promises) if(promise.status==="pending" && promise.clubId===source.clubId && at<=promise.dueOn) promise.played+=played.minutes;
      p.morale=limit(p.morale+(played.minutes>=45?1:-.5));
      const relapse=!!p.relapseUntil && at<p.relapseUntil;
      const risk=(p.load>150?.04:.002)+(relapse?(p.treatment==="rehabilitation"?.04:.08):0);
      if(seededRandom(`${seed}:injury:${id}:${f.id}`)()<risk && !pending.has(id)) pending.set(id,{relapse,fixture:f.id});
    }
    seen.add(f.id);
  }
  for(const p of Object.values(s.people)) recoverPerson(s,p,date,seed,!human || sources.get(p.id)?.clubId!==human.clubId);
  // Diagnostics close at this checkpoint: never retroactively invalidate an already played CPU batch.
  for(const [id,injury] of pending) {const p=s.people[id];p.injuredUntil=dayAfter(date,PLAYER_RULES.injuryDays+(injury.relapse?7:0));p.treatment="rehabilitation";event(s,p,date,injury.relapse?"relapse":"injury","Lesão simulada ao fechar participações do período; não diagnóstico médico real.",injury.fixture);}
  s.fixtures=[...seen];s.through=date;s.events=s.events.sort((a,b)=>a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).slice(-PLAYER_RULES.maximumEvents);return s;
}
export function projectSquadCondition(squad:Player[],state?:PlayerPopulation){return !state?squad:squad.map(p=>{const c=p.sourceId && state.people[p.sourceId];return c ? {...p,energy:Math.round(c.energy),age:c.age,overall:c.overall,condition:conditionOf(c)}:p;});}
