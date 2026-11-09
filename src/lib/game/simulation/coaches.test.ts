// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { marketFixture } from "./market-test-fixture";
import { assertCoachState, hireCoach, isUnemployed, migrateCoachSave, processCoaches } from "./coaches";
import { accrueFinance, projectFinance } from "./finance";
import { advanceCareer, commitAdvance } from "./advance";
import { acceptManagerJob, applyForManagerJob, availableManagerJobs } from "../manager-jobs";
import type { CareerSeason } from "../season";
import { readLocalSaves, writeLocalSaves } from "../persistence";

function setup() {
  const f=marketFixture();
  for(const c of f.database.clubs) c.level=10;
  // This scenario uses known, affordable contracts, not an invented economic universe.
  for(const p of f.database.players) p.salaryMonthlyBrl=1000;
  for(const c of Object.values(f.save.progress!.managerMarket!.finance!.contracts)) c.monthlyCents=100_000;
  for(const c of f.database.clubs) if(c.id!==f.human.id) f.save.progress!.managerMarket!.clubs[c.id].coach=`Coach ${c.id}`;
  f.save=migrateCoachSave(f.save,f.database);
  return {...f, market:f.save.progress!.managerMarket!};
}
function lossSeason(f:ReturnType<typeof setup>,n=5): CareerSeason {
  return {...f.save.progress!.competitionSeason!,fixtures:Array.from({length:n},(_,i)=>({id:`coach-game-${i}`,season:2026,calendarRound:i+1,competitionRound:i+1,homeClubId:f.human.id,awayClubId:f.buyer.id,status:"played",homeScore:0,awayScore:2,type:"league"}))} as CareerSeason;
}
describe("E5 identity, boards and shared contracts",()=>{
  it("adopts stable identities and simulated contracts without back-pay or fabricated history; migration is repeatable",()=>{
    const f=setup(), s=f.market.staff!, human=s.coaches[s.humanId];
    expect(human).toMatchObject({clubId:f.human.id,origin:"human",history:[{startedOn:f.save.inGameDate,games:0}]});
    expect(f.market.finance!.ledger.filter(e=>e.kind==="coach-fee")).toEqual([]);
    expect(migrateCoachSave(f.save,f.database)).toBe(f.save);
    assertCoachState(f.market);
  });
  it("does not merge a human identity with a catalog namesake or create two jobs for one catalog person",()=>{
    const f=marketFixture(); f.database.clubs[1].coachName=f.database.clubs[2].coachName="Mesmo nome";
    f.save.progress!.managerMarket!.clubs[f.buyer.id].coach="Mesmo nome";
    f.save.progress!.managerMarket!.clubs[f.seller.id].coach="Mesmo nome";
    f.save.managerName="Mesmo nome";
    const migrated=migrateCoachSave(f.save,f.database).progress!.managerMarket!;
    expect(Object.values(migrated.staff!.coaches).filter(c=>c.name==="Mesmo nome")).toHaveLength(2);
    assertCoachState(migrated);
  });
  it("uses relative board expectations rather than identical targets for rich favorites and underdogs",()=>{
    const f=setup(), initial=f.market;
    initial.staff!.boards[f.human.id].expectedPoints=2;
    initial.staff!.boards[f.buyer.id].expectedPoints=1;
    const season=lossSeason(f,4); season.fixtures.forEach(g=>{g.homeScore=1;g.awayScore=1;});
    const next=processCoaches(initial,f.database,season,"2026-01-12");
    expect(next.staff!.boards[f.human.id].score).toBeLessThan(next.staff!.boards[f.buyer.id].score);
    expect(next.staff!.boards[f.human.id].objective).toBeTruthy();
  });
  it("dismisses the human under the same affordable policy as CPU and records real tenure only",()=>{
    const f=setup(), next=processCoaches(f.market,f.database,lossSeason(f),"2026-01-12");
    expect(isUnemployed(next)).toBe(true);
    expect(next.clubs[f.human.id].coach).toBeNull();
    expect(next.staff!.coaches[next.staff!.humanId].history[0]).toMatchObject({games:5,points:0,defeats:5,reason:"dismissed",endedOn:"2026-01-12"});
    const event=next.staff!.events.find(e=>e.type==="dismissed")!;
    expect(event.costCents).toBeGreaterThan(0);
    expect(next.finance!.clubs[f.human.id].cashCents).toBe(f.market.finance!.clubs[f.human.id].cashCents-event.costCents);
    expect(processCoaches(next,f.database,lossSeason(f),"2026-01-12")).toEqual(next);
    expect(isUnemployed(f.market)).toBe(false);
  });
  it("cannot fire or hire when payables, payroll and reservations consume free cash",()=>{
    const f=setup();
    f.market.finance!.reservations.block={clubId:f.human.id,cents:100_000_000};
    const next=processCoaches(f.market,f.database,lossSeason(f),"2026-01-12");
    expect(isUnemployed(next)).toBe(false);
    expect(next.staff!.boards[f.human.id].reason).toMatch(/caixa livre insuficiente/);
    next.clubs[f.buyer.id].coach=null;
    expect(()=>hireCoach(next,next.staff!.humanId,f.buyer.id,"2026-01-12")).toThrow(/indisponível/);
  });
  it("accrues coach salaries through the existing calendar finance engine and not per fixture",()=>{
    const f=setup(), finance=f.market.finance!;
    const once=accrueFinance(finance,"2026-02-11");
    const split=accrueFinance(accrueFinance(finance,"2026-01-20"),"2026-02-11");
    expect(split.payables).toEqual(once.payables);
    expect(split.clubs).toEqual(once.clubs);
    expect(Object.keys(once.payables).some(k=>k.includes("coach:"))).toBe(true);
    expect(accrueFinance(once,"2026-02-11")).toEqual(once);
  });
  it("expires contracts in a calendar jump, never leaves an expired employee coaching",()=>{
    const f=setup(), c=f.market.staff!.coaches[f.market.staff!.humanId];
    c.contract!.endsOn="2026-01-12"; f.market.finance!.contracts[`coach:${c.id}`].endsOn="2026-01-12";
    f.market.finance=accrueFinance(f.market.finance!,"2026-01-20");
    const next=processCoaches(f.market,f.database,undefined,"2026-01-20");
    expect(isUnemployed(next)).toBe(true);
    expect(next.staff!.events.filter(e=>e.type==="expired")).toHaveLength(1);
    expect(next.finance!.registrations[`coach:${c.id}`]).toBeUndefined();
  });
  it("CPU fills an actual aged vacancy with an exclusive, paid contract, once",()=>{
    const f=setup();
    let next=processCoaches(f.market,f.database,lossSeason(f),"2026-01-12");
    next=processCoaches(next,f.database,undefined,"2026-01-20");
    expect(next.clubs[f.human.id].coach).toBeTruthy();
    expect(isUnemployed(next)).toBe(true);
    expect(next.staff!.events.filter(e=>e.type==="hired")).toHaveLength(1);
    expect(processCoaches(next,f.database,undefined,"2026-01-20")).toEqual(next);
    assertCoachState(next);
  });
  it("allows unemployment to advance weekly without an active fixture, and rejects CAS failure without mutation",async()=>{
    const f=setup();
    f.save.progress!.managerMarket=processCoaches(f.market,f.database,lossSeason(f),f.save.inGameDate);
    f.save.budget=f.save.progress!.managerMarket.clubs[f.human.id].budget;
    f.save.progress!.competitionSeason={...f.save.progress!.competitionSeason!,fixtures:[]};
    f.save.progress!.activeFixtureId=undefined;
    const original=structuredClone(f.save);
    const command={operationId:"unemployment-week",expectedRevision:0,fromDate:f.save.inGameDate};
    const next=advanceCareer(f.save,f.database,command);
    expect(next.inGameDate).toBe("2026-01-18");
    expect(isUnemployed(next.progress!.managerMarket)).toBe(true);
    expect(advanceCareer(next,f.database,command)).toBe(next);
    await expect(commitAdvance(f.save,f.database,command,{compareAndSwap:async()=>false})).rejects.toThrow(/carreira mudou/);
    expect(f.save).toEqual(original);
  });
  it("accepts a human offer through the same costed executor, survives JSON reload and cannot accept twice",()=>{
    const f=setup(), old=f.market.staff!.coaches[f.market.staff!.humanId];
    // Expiry is a real reason for a vacancy; do not forge an occupied club into a job offer.
    const target=Object.values(f.market.staff!.coaches).find(c=>c.clubId===f.buyer.id)!;
    target.contract!.endsOn="2026-01-10";
    f.market.finance!.contracts[`coach:${target.id}`].endsOn="2026-01-10";
    let market=processCoaches(f.market,f.database,undefined,f.save.inGameDate);
    market=applyForManagerJob(market,f.database,f.human.id,f.buyer.id,f.save.inGameDate).market;
    f.save.progress!.managerMarket=market;
    const offer=market.applications![0]; expect(offer.status).toBe("offered");
    const balance=market.finance!.clubs[f.buyer.id].cashCents;
    const next=acceptManagerJob(f.save,f.database,offer.id).save!;
    expect(next).toBeTruthy();
    expect(next.progress!.engine!.revision).toBe(1);
    expect(next.progress!.managerMarket!.staff!.coaches[old.id].clubId).toBe(f.buyer.id);
    expect(next.progress!.managerMarket!.finance!.clubs[f.buyer.id].cashCents).toBeLessThan(balance);
    const loaded=JSON.parse(JSON.stringify(next));
    assertCoachState(loaded.progress.managerMarket);
    expect(acceptManagerJob(loaded,f.database,offer.id).error).toBeTruthy();
    expect(old.clubId).toBe(f.human.id);
    const tenure=loaded.progress.managerMarket.staff.coaches[old.id].history.at(-1);
    const evaluated=processCoaches(loaded.progress.managerMarket,f.database,loaded.progress.competitionSeason,loaded.inGameDate);
    expect(evaluated.staff!.coaches[old.id].history.at(-1)?.games).toBe(tenure.games);
  });
  it("protects pending human offers until deadline, but expired offers cannot claim a CPU-filled vacancy",()=>{
    const f=setup();
    const target=Object.values(f.market.staff!.coaches).find(c=>c.clubId===f.buyer.id)!;
    target.contract!.endsOn="2026-01-10";f.market.finance!.contracts[`coach:${target.id}`].endsOn="2026-01-10";
    let market=processCoaches(f.market,f.database,undefined,"2026-01-11");
    market=applyForManagerJob(market,f.database,f.human.id,f.buyer.id,"2026-01-11").market;
    const offered=processCoaches(market,f.database,undefined,"2026-01-18");
    expect(offered.clubs[f.buyer.id].coach).toBeNull();
    const filled=processCoaches(offered,f.database,undefined,"2026-01-19");
    expect(filled.clubs[f.buyer.id].coach).toBeTruthy();
    f.save.inGameDate="2026-01-19"; f.save.progress!.managerMarket=filled;
    expect(acceptManagerJob(f.save,f.database,market.applications![0].id).error).toBeTruthy();
  });
  it("never offers a deadline before human availability or borrows the successor's club performance",()=>{
    const f=setup();
    const market=processCoaches(f.market,f.database,lossSeason(f),f.save.inGameDate);
    const result=applyForManagerJob(market,f.database,f.human.id,f.human.id,f.save.inGameDate);
    expect(result.error).toMatch(/disponível.*2026-01-25/);
    expect(result.market.applications).toBeUndefined();
    const later=applyForManagerJob(market,f.database,f.human.id,f.human.id,"2026-01-25");
    expect(later.market.applications?.[0].status).toBe("offered");
  });
  it("rechecks a valid human offer against newly committed salary and reservations, without ending the current job",()=>{
    const f=setup(), target=Object.values(f.market.staff!.coaches).find(c=>c.clubId===f.buyer.id)!;
    target.contract!.endsOn="2026-01-10";f.market.finance!.contracts[`coach:${target.id}`].endsOn="2026-01-10";
    let market=processCoaches(f.market,f.database,undefined,f.save.inGameDate);
    market=applyForManagerJob(market,f.database,f.human.id,f.buyer.id,f.save.inGameDate).market;
    market.finance!.reservations.late={clubId:f.buyer.id,cents:100_000_000};
    f.save.progress!.managerMarket=market;
    const original=structuredClone(f.save);
    expect(acceptManagerJob(f.save,f.database,market.applications![0].id).error).toMatch(/caixa livre/);
    expect(f.save).toEqual(original);
    expect(isUnemployed(market)).toBe(false);
  });
  it("round-trips the compressed staff snapshot in an account-isolated local save",()=>{
    const f=setup(); localStorage.clear();
    expect(writeLocalSaves([f.save],"coach-owner")).toBe(true);
    const restored=readLocalSaves("coach-owner")[0];
    expect(restored.progress!.managerMarket!.staff).toEqual(f.market.staff);
    expect(readLocalSaves("another-owner")).toEqual([]);
    expect(availableManagerJobs(f.database,f.market,f.human.id).every(c=>f.market.clubs[c.id].coach===null)).toBe(true);
    expect(projectFinance(f.market).finance!.clubs).toEqual(f.market.finance!.clubs);
  });
});

it("dívida vencida persistente aumenta pressão e pode gerar demissão com rescisão registrada como dívida",()=>{
 const f=setup(), club=f.human.id, board=f.market.staff!.boards[club];
 board.games=Array.from({length:5},(_,i)=>({id:`past-${i}`,points: i<3 ? 1 : 0,expected:1}));
 const finance=f.market.finance!; finance.clubs[club].cashCents=0;
 finance.payables.old={clubId:club,amountCents:50000,paidCents:0,dueOn:"2025-11-01"};
 const result=processCoaches(f.market,f.database,undefined,"2026-01-12");
 expect(isUnemployed(result)).toBe(true);
 const event=result.staff!.events.find(e=>e.coachId===result.staff!.humanId && e.type==="dismissed")!;
 expect(event.costCents).toBeGreaterThan(0);
 expect(Object.entries(result.finance!.payables).find(([id])=>id.startsWith("coach-end:"))?.[1].amountCents).toBe(event.costCents);
 expect(result.finance!.clubs[club].cashCents).toBe(0);
 expect(processCoaches(result,f.database,undefined,"2026-01-12")).toEqual(result);
});
