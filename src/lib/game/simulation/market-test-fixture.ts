/** Test-only miniature universe; never imported by runtime modules. */
import { createDefaultDatabase,buildSquadFromDatabase,type EditorDatabase,type CareerSave } from "../editor-data";
import { createCareerSeason } from "../season";
import { initializeCareerMarket } from "../manager-jobs";
import { createPlayerCareer } from "../career";
import { CURRENT_CAREER_RULESET } from "../career-rules";
import type { CareerProgress } from "../progress";
import { engineState } from "./foundation";
import { migrateFinanceSave } from "./settlement";
export function marketFixture(rival=false) {
  const original=createDefaultDatabase(), clubs=original.clubs.slice(0,rival ? 4 : 3), template=original.players[0];
  const [human,buyer,seller,competitor]=clubs;
  const thin=["G","L","L","Z","Z","M","M","M","A","A","A"] as const;
  const deep=["G","G","G",...Array(5).fill("L"),...Array(5).fill("Z"),...Array(6).fill("M"),...Array(5).fill("A")] as (typeof thin[number])[];
  const database: EditorDatabase={clubs,players:clubs.flatMap(c=>(c.id===seller.id ? deep : thin).map((position,i)=>({...template,id:`${c.id}:test:${i}`,clubId:c.id,name:`Fixture ${i}`,primaryPosition:position,overall:c.id===seller.id ? 70 : 60,salaryMonthlyBrl:c.id===seller.id ? 1000000 : 1000,marketValueBrl:100000000,marketStatus:"normal" as const,loan:undefined,contractEndsOn:"2028-12-31"})))};
  const target=database.players.find(p=>p.clubId===seller.id && p.primaryPosition==="M")!;
  Object.assign(target,{id:"test-target",overall:65,age:21,salaryMonthlyBrl:1000,marketValueBrl:100000,marketStatus:"sale"});
  const season=createCareerSeason(original,human.id,2026)!;
  const market=initializeCareerMarket(database,season,"Test coach",1000);
  for(const club of Object.values(market.clubs)) club.budget=1000;
  const squad=buildSquadFromDatabase(database,human.name,true)!;
  const progress={activeSaveId:"e4000000-0000-4000-8000-000000000001",page:"hub",coach:"Test coach",club:human.name,division:human.division,round:1,budget:1000,formation:"4-3-3",style:"Equilibrado",marking:"Leve",focus:"Pelo meio",starters:squad.slice(0,11).map(p=>p.id),careerSquad:squad,playerCareers:Object.fromEntries(squad.map(p=>[p.id,createPlayerCareer(p,human.name)])),manualPositions:{},minute:0,homeScore:0,awayScore:0,events:[],substitutionsLeft:5,detailOpen:false,matchRunning:false,matchSpeed:1,halftimeWaiting:false,competitionSeason:season,managerMarket:market} as CareerProgress;
  const save: CareerSave={id:"e4000000-0000-4000-8000-000000000001",careerRuleset:CURRENT_CAREER_RULESET,name:"Market fixture",managerName:"Test coach",clubId:human.id,clubName:human.name,division:human.division,round:1,budget:1000,inGameDate:"2026-01-11",updatedAt:"2026-01-11T00:00:00Z",progress};
  save.progress!.engine=engineState(undefined,save.id,save.inGameDate);
  const adopted=migrateFinanceSave(save,database);
  const input={database,humanClubId:human.id,date:"2026-01-18",previousDate:save.inGameDate,negotiations:[],loans:{},managers:adopted.progress!.managerMarket!,season,revision:0,careerId:save.id};
  return {database,human,buyer,seller,competitor,target,save:adopted,input};
}
