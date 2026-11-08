// @vitest-environment jsdom
import { expect,it } from "vitest";
import { buildSquadFromDatabase,type CareerSave } from "../editor-data";
import { importBrazilDatabase } from "@/lib/importer/brazil-database";
import { applyNovemberDatabase } from "@/lib/importer/november-database";
import { initializeCareerMarket } from "../manager-jobs";
import { createCareerSeason,nextCareerFixture } from "../season";
import { migrateFinanceSave } from "./settlement";
import { migrateCoachSave } from "./coaches";
import { migratePlayerSave } from "./players";
import { engineState } from "./foundation";
import { marketFixture } from "./market-test-fixture";
import { advanceCareer } from "./advance";
import { writeLocalSaves,readLocalSaves } from "../persistence";
it("stores two full-universe E6 careers and a market advance inside the unchanged browser quota",async()=>{
  localStorage.clear();const db=(await applyNovemberDatabase(await importBrazilDatabase())).database,club=db.clubs.find(c=>c.name==="Flamengo")!,season=createCareerSeason(db,club.id,2026)!;
  let save:CareerSave={...marketFixture().save,clubId:club.id,clubName:club.name,budget:12624,inGameDate:nextCareerFixture(season)!.scheduledDate!};
  save.progress={...save.progress!,universeSnapshot:db,careerSquad:buildSquadFromDatabase(db,club.name,true)!,competitionSeason:season,budget:12624,managerMarket:initializeCareerMarket(db,season,"Test coach",12624),worldMarket:undefined};
  save.progress.engine=engineState(undefined,save.id,save.inGameDate);
  save=migratePlayerSave(migrateCoachSave(migrateFinanceSave(save,db),db),db);
  expect(writeLocalSaves([save],"large-e6")).toBe(true);
  const second={...structuredClone(save),id:"e6000000-0000-4000-8000-000000000002"};
  expect(writeLocalSaves([save,second],"large-e6")).toBe(true);
  const next=advanceCareer(save,db,{operationId:"full-e6",fromDate:save.inGameDate,expectedRevision:0,targetDate:"2026-01-22"});
  expect(writeLocalSaves([next,second],"large-e6")).toBe(true);
  expect(readLocalSaves("large-e6")[0].progress!.worldMarket!.population!.people).toEqual(next.progress!.worldMarket!.population!.people);
},120000);
