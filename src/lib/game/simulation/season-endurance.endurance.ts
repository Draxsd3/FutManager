// @vitest-environment jsdom
import {appendFileSync} from "node:fs";
import {expect,it} from "vitest";
import {importBrazilDatabase} from "@/lib/importer/brazil-database";
import {applyNovemberDatabase} from "@/lib/importer/november-database";
import {createCareerSeason,settleSeasonThrough} from "../season";
import {marketFixture} from "./market-test-fixture";
import {buildSquadFromDatabase} from "../editor-data";
import {initializeCareerMarket} from "../manager-jobs";
import {migrateFinanceSave} from "./settlement";
import {migrateCoachSave} from "./coaches";
import {migratePlayerSave} from "./players";
import {engineState} from "./foundation";
import {advanceCareer} from "./advance";
import {worldDatabase} from "../world-market";
import {transitionCareerSeason} from "./season-transition";
import {auditSeason} from "./season-lifecycle";
import {readLocalSaves,writeLocalSaves} from "../persistence";
import {accountStorageKey} from "../save-utils";

it.each(["e8000000-0000-4000-8000-000000000011","e8000000-0000-4000-8000-000000000029"])("ten years of the actual frozen Brazilian world: %s",async(seed)=>{
 const db=(await applyNovemberDatabase(await importBrazilDatabase())).database;
 const club=db.clubs.find(c=>c.name==="Flamengo")!;
 let save={...marketFixture().save,id:seed,clubId:club.id,clubName:club.name,division:club.division,budget:12624,inGameDate:"2026-01-01"};
 save.progress={...save.progress!,activeSaveId:seed,universeSnapshot:db,careerSquad:buildSquadFromDatabase(db,club.name,true)!,competitionSeason:createCareerSeason(db,club.id,2026,"domestic-world")!,managerMarket:initializeCareerMarket(db,createCareerSeason(db,club.id,2026,"domestic-world")!,"Test coach",12624),worldMarket:undefined};
 save.progress.engine=engineState(undefined,seed,save.inGameDate);
 save=migratePlayerSave(migrateCoachSave(migrateFinanceSave(save,db),db),db);
 const metrics:unknown[]=[];
 for(let year=2026;year<2026+Number(process.env.E8_YEARS ?? 10);year++) {
  for(let month=1;month<=12;month++) {
   if(process.env.E8_REPORT) appendFileSync(process.env.E8_REPORT,JSON.stringify({seed,year,month,phase:"start"})+"\n");
   const date=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
   const p=save.progress!;
   const effective=worldDatabase(db,p.transferNegotiations ?? [],p.loanContracts ?? {},p.worldMarket,p.managerMarket?.finance,p.managerMarket?.staff);
   // Test driver alone controls all clubs; gameplay never auto-plays the human.
   const season=settleSeasonThrough(p.competitionSeason!,effective,date);
   save=advanceCareer({...save,progress:{...p,competitionSeason:season} },db,{operationId:`headless:${date}`,fromDate:save.inGameDate,expectedRevision:p.engine!.revision,targetDate:date});
   if(process.env.E8_REPORT) appendFileSync(process.env.E8_REPORT,JSON.stringify({seed,year,month,phase:"processed",heapBytes:process.memoryUsage().heapUsed,ledger:save.progress!.managerMarket!.finance!.ledger.length,payables:Object.keys(save.progress!.managerMarket!.finance!.payables).length,financialCharacters:JSON.stringify(save.progress!.managerMarket).length,populationCharacters:JSON.stringify(save.progress!.worldMarket?.population).length})+"\n");
   // Gameplay saves at advances, not just every ten years: exercise the real codec
   // and durable reload each period so an unreadable intermediate checkpoint fails early.
   expect(writeLocalSaves([save],seed),`Checkpoint mensal ${date}`).toBe(true);
   save=readLocalSaves(seed)[0];
   expect(save?.inGameDate).toBe(date);

  }
  const p=save.progress!,finance=p.managerMarket!.finance!,population=p.worldMarket!.population!;
  const effective=worldDatabase(db,p.transferNegotiations ?? [],p.loanContracts ?? {},p.worldMarket,finance,p.managerMarket?.staff);
  const audit=auditSeason(p.competitionSeason!,effective,save.inGameDate);
  const rosters=new Map(db.clubs.map(c=>[c.id,effective.players.filter(p=>p.clubId===c.id && !p.condition?.retiredOn)]));
  const ages=Object.values(population.people).filter(p=>!p.retiredOn).map(p=>p.age);
  const metric={seed,year,fixtures:audit.summary.played,issues:audit.issues.length,cashCents:Object.values(finance.clubs).reduce((n,c)=>n+c.cashCents,0),payrollCents:Object.values(finance.contracts).filter(c=>c.status==="active").reduce((n,c)=>n+(c.monthlyCents ?? 0),0),payablesCents:Object.values(finance.payables).reduce((n,p)=>n+p.amountCents-p.paidCents,0),arrearsCents:Object.values(finance.payables).filter(p=>p.dueOn<=save.inGameDate).reduce((n,p)=>n+p.amountCents-p.paidCents,0),deals:p.transferNegotiations?.filter(d=>d.status==="completed").length ?? 0,people:ages.length,minAge:Math.min(...ages),maxAge:Math.max(...ages),injuries:population.events.filter(e=>e.kind==="injury").length,unplayable:[...rosters].filter(([id,ps])=>db.clubs.find(c=>c.id===id)?.division!=="Sem divisão nacional" && (ps.length<11 || !ps.some(p=>p.primaryPosition==="G"))).map(([id])=>id)};
  metrics.push(metric);console.log(JSON.stringify(metric));if(process.env.E8_REPORT) appendFileSync(process.env.E8_REPORT,JSON.stringify(metric)+"\n");
  expect(audit.issues).toEqual([]);
  expect(metric.unplayable,"Clubes nacionais sem onze atletas ou sem goleiro").toEqual([]);
  expect(metric.arrearsCents,"Obrigações vencidas sem cobertura financeira").toBe(0);
  save=transitionCareerSeason(save,db,{operationId:`annual:${year}`,fromDate:save.inGameDate,expectedRevision:p.engine!.revision});
  expect(writeLocalSaves([save],seed)).toBe(true);
  const bytes=localStorage.getItem(accountStorageKey("futmanager.saves.v1",seed))!.length*2;
  console.log(JSON.stringify({seed,year,storageBytes:bytes}));
  expect(bytes).toBeLessThan(5_000_000);
  expect(readLocalSaves(seed)[0]?.progress!.competitionSeason?.season).toBe(year+1);
 }
 expect(metrics).toHaveLength(Number(process.env.E8_YEARS ?? 10));
},1_800_000);
