import { describe,expect,it } from "vitest";
import { createDefaultDatabase,buildSquadFromDatabase,type EditorDatabase,type CareerSave } from "../editor-data";
import { createCareerSeason } from "../season";
import { initializeCareerMarket } from "../manager-jobs";
import { createPlayerCareer } from "../career";
import { CURRENT_CAREER_RULESET } from "../career-rules";
import type { CareerProgress } from "../progress";
import { proposeTransfer } from "../transfers";
import { buildStartingXI } from "../mock-data";
import { adoptFinance,accrueFinance,availableCents,brlToCents,financeDatabase,projectFinance,reserveDeal,settleTransfer,renewEmployment,thousandsToCents } from "./finance";
import { applyCareerPlayerAction,migrateFinanceSave,settleCareerTransfer,updateCareerNegotiation,extendCareerLoan,localEmploymentKey } from "./settlement";
function fixture() {
 const original=createDefaultDatabase(), clubs=original.clubs.slice(0,3), template=original.players[0];
 const db: EditorDatabase={clubs,players:clubs.flatMap(c=>Array.from({length:15},(_,i)=>({...template,id:`${c.id}:${i}`,clubId:c.id,name:`${c.id} ${i}`,primaryPosition:i===0 ? "G" as const : template.primaryPosition,salaryMonthlyBrl:1000,marketValueBrl:10000,marketStatus:"sale" as const,loan:undefined,contractEndsOn:"2028-12-31"})))};
 const [seller,buyer,other]=clubs, player=db.players.find(p=>p.clubId===seller.id)!;
 const season=createCareerSeason(original,seller.id,2026)!, market=initializeCareerMarket(db,season,"Coach",1000);
 for(const c of Object.values(market.clubs)) c.budget=1000;
 const finance=adoptFinance(market,db,"2026-01-01").finance!;
 const deal={...proposeTransfer(db,[],{id:"deal",playerId:player.id,buyerClubId:buyer.id,feeBrl:100000}).negotiation!,agreedFeeBrl:10000,offerFeeBrl:10000};
 const squad=buildSquadFromDatabase(db,seller.name,true)!;
 const p={activeSaveId:"save",page:"hub",coach:"Coach",club:seller.name,division:seller.division,round:1,budget:1000,formation:"4-3-3",style:"Equilibrado",marking:"Leve",focus:"Pelo meio",starters:squad.slice(0,11).map(p=>p.id),careerSquad:squad,playerCareers:Object.fromEntries(squad.map(p=>[p.id,createPlayerCareer(p,seller.name)])),manualPositions:{},minute:0,homeScore:0,awayScore:0,events:[],substitutionsLeft:5,detailOpen:false,matchRunning:false,matchSpeed:1,halftimeWaiting:false,competitionSeason:season,managerMarket:market} as CareerProgress;
 const save:CareerSave={id:"save",careerRuleset:CURRENT_CAREER_RULESET,name:"Career",managerName:"Coach",clubId:seller.id,clubName:seller.name,division:seller.division,round:1,budget:1000,inGameDate:"2026-01-01",updatedAt:"2026-01-01T00:00:00Z",progress:p};
 return {db,seller,buyer,other,player,finance,deal,save};
}
describe("E3 financial aggregate",()=>{
 it("uses integer centavos and refuses non-finite or overflowing amounts",()=>{
  expect(brlToCents(1.23)).toBe(123); expect(thousandsToCents(12.624)).toBe(1262400);
  for(const bad of [NaN,Infinity,Number.MAX_SAFE_INTEGER]) expect(()=>brlToCents(bad)).toThrow();
 });
 it("adopts balances once without historical wages, preserving career identity and source catalog",()=>{
  const {save,db}=fixture(), before=structuredClone(save), first=migrateFinanceSave(save,db);
  expect(save).toEqual(before); expect(migrateFinanceSave(first,db)).toEqual(first);
  expect(first.careerRuleset).toBe(save.careerRuleset); expect(first.progress?.managerMarket?.finance?.payables).toEqual({});
  expect(first.progress?.managerMarket?.finance?.through).toBe(save.inGameDate);
 });
 it("pays fee symmetrically once, reserves wages without paying them and creates a new employment",()=>{
  const {finance,deal,db,buyer,seller,player}=fixture(), before=structuredClone(finance);
  const reserved=reserveDeal(finance,deal,db);
  expect(reserved.clubs[buyer.id].cashCents).toBe(finance.clubs[buyer.id].cashCents);
  expect(reserved.reservations.deal.cents).toBe(2200000);
  const result=settleTransfer(reserved,db,deal,"2026-01-01"), s=result.finance;
  expect(s.clubs[buyer.id].cashCents).toBe(finance.clubs[buyer.id].cashCents-1000000);
  expect(s.clubs[seller.id].cashCents).toBe(finance.clubs[seller.id].cashCents+1000000);
  expect(s.contracts[player.id]).toMatchObject({clubId:buyer.id,startsOn:"2026-01-01",origin:"game",monthlyCents:100000});
  expect(s.reservations).toEqual({}); expect(s.ledger.filter(e=>e.kind==="transfer").reduce((n,e)=>n+e.cashDeltaCents,0)).toBe(0);
  expect(availableCents(s,buyer.id)).toBeLessThan(s.clubs[buyer.id].cashCents);
  expect(settleTransfer(s,db,deal,"2026-01-01").finance).toBe(s); expect(finance).toEqual(before);
  expect(()=>settleTransfer(s,db,{...deal,agreedFeeBrl:20000},"2026-01-01")).toThrow(/reutilizada/);
 });
 it("revalidates cash and ownership; rejected/illegal terms expose no partial debit",()=>{
  const {finance,deal,db,buyer,other}=fixture(), poor=structuredClone(finance); poor.clubs[buyer.id].cashCents=1;
  const before=structuredClone(poor);
  expect(()=>settleTransfer(poor,db,deal,"2026-01-01")).toThrow(/insuficiente/); expect(poor).toEqual(before);
  for(const invalid of [{...deal,status:"rejected" as const},{...deal,agreedFeeBrl:-1},{...deal,agreedFeeBrl:NaN},{...deal,instalments:[1,2]},{...deal,commissionBrl:10},{...deal,paymentTerms:{kind:"instalments" as const,schedule:[{dueOn:"2026-02-01",amountBrl:10000}]}},{...deal,commission:{agentId:"test-agent",amountBrl:10,payerClubId:buyer.id}}]) expect(()=>settleTransfer(finance,db,invalid,"2026-01-01")).toThrow();
  const first=settleTransfer(finance,db,deal,"2026-01-01").finance;
  expect(()=>settleTransfer(first,db,{...deal,id:"rival",buyerClubId:other.id},"2026-01-01")).toThrow(/vínculo/);
 });
 it("accrues by calendar competence, independent of match count and interval subdivision",()=>{
  const {finance,buyer}=fixture(), direct=accrueFinance(finance,"2026-03-01");
  let split=finance;
  for(const date of ["2026-01-08","2026-01-20","2026-02-01","2026-02-14","2026-03-01"]) split=accrueFinance(split,date);
  expect(split.clubs).toEqual(direct.clubs); expect(split.payables).toEqual(direct.payables);
  expect(finance.clubs[buyer.id].cashCents-direct.clubs[buyer.id].cashCents).toBe(15*100000*2);
  expect(accrueFinance(direct,"2026-03-01")).toEqual(direct);
 });
 it("records unpaid wages rather than deleting debt or inventing an overdraft",()=>{
  const {finance,buyer}=fixture(); finance.clubs[buyer.id].cashCents=50000;
  const next=accrueFinance(finance,"2026-02-01");
  expect(next.clubs[buyer.id].cashCents).toBe(0);
  expect(Object.values(next.payables).filter(p=>p.clubId===buyer.id).reduce((n,p)=>n+p.amountCents-p.paidCents,0)).toBe(1450000);
 });
 it("splits loan wages and restores ownership/obligation on the real return date across a jump",()=>{
  const {finance,db,deal,seller,buyer,player}=fixture();
  const loanDeal={...deal,kind:"loan" as const,agreedWageSharePercent:50,wageSharePercent:50};
  const loan=settleTransfer(finance,db,loanDeal,"2026-01-01").finance;
  loan.loans[player.id].endsOn="2026-02-01";
  const through=accrueFinance(loan,"2026-03-01");
  const dues=(club:string)=>Object.entries(through.payables).filter(([id,p])=>id.includes(`employment:${player.id}:legacy:`) && p.clubId===club).reduce((n,[,p])=>n+p.amountCents,0);
  expect(dues(seller.id)).toBe(150000); expect(dues(buyer.id)).toBe(50000);
  expect(financeDatabase(db,through).players.find(p=>p.id===player.id)?.clubId).toBe(seller.id);
 });
 it("expires known contracts but never interprets missing/stale source dates as a free pass",()=>{
  const {finance,db,player,save}=fixture(); finance.contracts[player.id].endsOn="2026-01-31";
  const next=accrueFinance(finance,"2026-02-01");
  expect(financeDatabase(db,next).players.find(p=>p.id===player.id)?.clubId).toBe("");
  db.players[0].contractEndsOn="2020-01-01"; save.progress!.playerCareers[1].contractUntil="2020-01-01";
  const legacy=migrateFinanceSave(save,db).progress!.managerMarket!.finance!;
  expect(legacy.contracts[player.id]).toMatchObject({endsOn:null,status:"active"});
 });
 it("requires explicit free-agent status and rejects unknown wages or loan contracts without coverage",()=>{
  const {finance,db,deal,player}=fixture();
  expect(()=>settleTransfer(finance,db,{...deal,freeAgent:true,sourceClubId:"",agreedFeeBrl:0},"2026-01-01")).toThrow();
  const unknown=structuredClone(db); unknown.players[0].salaryMonthlyBrl=NaN;
  expect(()=>settleTransfer(finance,unknown,deal,"2026-01-01")).toThrow(/Salário/);
  finance.contracts[player.id].endsOn=null;
  expect(()=>settleTransfer(finance,db,{...deal,kind:"loan"},"2026-01-01")).toThrow(/cobre/);
 });
 it("keeps employment separate from registration and excludes pending players from automatic lineups",()=>{
  const {finance,db,deal,buyer}=fixture();
  finance.registrationPolicy={source:"Fixture de teste; não é regulamento oficial",validFrom:"2026-01-01",validUntil:"2026-12-31",windows:[{from:"2026-02-01",to:"2026-02-20"}]};
  const next=settleTransfer(finance,db,deal,"2026-01-01").finance;
  expect(next.registrations[deal.playerId].status).toBe("pending");
  const squad=buildSquadFromDatabase(financeDatabase(db,next),buyer.name,true)!;
  const player=squad.find(p=>p.sourceId===deal.playerId)!;
  expect(buildStartingXI("4-3-3",squad)).not.toContain(player.id);
  expect(accrueFinance(next,"2026-02-01").registrations[deal.playerId].status).toBe("registered");
 });
 it("renews with valid new terms and no wage prepayment; persists through reopen",()=>{
  const {finance,player,seller}=fixture();
  const next=renewEmployment(finance,player.id,seller.id,"2026-01-10","2027-12-31",1200);
  expect(next.contracts[player.id]).toMatchObject({monthlyCents:120000,endsOn:"2027-12-31"});
  expect(next.clubs).toEqual(finance.clubs);
  expect(accrueFinance(JSON.parse(JSON.stringify(next)),"2026-02-01")).toEqual(accrueFinance(next,"2026-02-01"));
  expect(()=>renewEmployment(finance,player.id,seller.id,"2026-01-10","2025-12-31",1200)).toThrow();
 });
 it("human outgoing sale uses the buyer debit, seller credit and ownership overlay from the same executor",()=>{
  const {save,db,buyer,player}=fixture(), id=save.progress!.careerSquad!.find(p=>p.sourceId===player.id)!.id;
  let next=applyCareerPlayerAction(save,db,id,{type:"list"}).save;
  next=applyCareerPlayerAction(next,db,id,{type:"offer",id:"incoming",club:buyer.name,fee:0.01}).save;
  const before=structuredClone(next), sold=applyCareerPlayerAction(next,db,id,{type:"accept",id:"incoming"}).save;
  expect(next).toEqual(before); expect(sold.budget).toBe(1010);
  expect(sold.progress!.managerMarket!.clubs[buyer.id].budget).toBe(990);
  expect(sold.progress!.careerSquad!.some(p=>p.id===id)).toBe(false);
  expect(financeDatabase(db,sold.progress!.managerMarket!.finance).players.find(p=>p.id===player.id)?.clubId).toBe(buyer.id);
  const reopened=migrateFinanceSave(JSON.parse(JSON.stringify(sold)),db);
  expect(reopened.progress!.managerMarket!.finance!.contracts[player.id].clubId).toBe(buyer.id);
  expect(()=>applyCareerPlayerAction(sold,db,id,{type:"accept",id:"incoming"})).toThrow();
 });
 it("human purchase and loan extension publish full revised aggregates, not UI-only budget changes",()=>{
  const {save,db,deal,buyer}=fixture();
  const buying={...save,clubId:buyer.id,clubName:buyer.name,progress:{...save.progress!,club:buyer.name,careerSquad:buildSquadFromDatabase(db,buyer.name,true),starters:[]}};
  const proposed=updateCareerNegotiation(buying,db,deal);
  const bought=settleCareerTransfer(proposed,db,deal.id);
  expect(bought.budget).toBe(990); expect(bought.progress!.engine!.revision).toBe(2);
  expect(settleCareerTransfer(bought,db,deal.id)).toBe(bought);
  const loaned=settleCareerTransfer(updateCareerNegotiation(buying,db,{...deal,kind:"loan",agreedWageSharePercent:50}),db,deal.id);
  const extended=extendCareerLoan(loaned,db,deal.playerId,1,250,50).save;
  expect(extended.progress!.loanContracts![deal.playerId].endsOn).toBe("2026-08-01");
  expect(extended.budget).toBe(989.75);
  expect(extended.progress!.managerMarket!.clubs[save.clubId].budget).toBe(1010.25);
 });
 it("projections are repeatable and legacy adjustments are journaled only once",()=>{
  const {save,db}=fixture(), migrated=migrateFinanceSave(save,db), market=migrated.progress!.managerMarket!;
  market.clubs[save.clubId].budget+=151;
  const next=adoptFinance(market,db,"2026-01-01");
  expect(next.clubs[save.clubId].budget).toBe(1151);
  expect(adoptFinance(next,db,"2026-01-01")).toEqual(next); expect(projectFinance(next)).toEqual(next);
  expect(next.finance!.ledger.filter(e=>e.kind==="legacy-adjustment")).toHaveLength(1);
 });
});

it("releases an agreed reservation on cancellation without altering cash, contracts or wages",()=>{
 const {save,db,deal,buyer}=fixture();
 const buying={...save,clubId:buyer.id,clubName:buyer.name,progress:{...save.progress!,club:buyer.name,careerSquad:buildSquadFromDatabase(db,buyer.name,true)}};
 const agreed=updateCareerNegotiation(buying,db,deal), before=agreed.progress!.managerMarket!.finance!;
 const cancelled=updateCareerNegotiation(agreed,db,deal,{type:"reject"}), after=cancelled.progress!.managerMarket!.finance!;
 expect(after.reservations).toEqual({}); expect(after.clubs).toEqual(before.clubs); expect(after.contracts).toEqual(before.contracts);
 expect(cancelled.progress!.transferNegotiations![0].status).toBe("rejected");
});


it("keeps career-only promoted players on payroll and renews their local contract without inventing catalog identities",()=>{
 const {save,db}=fixture(), p=save.progress!;
 const local={...p.careerSquad![0],id:90000,sourceId:undefined,salary:2,contractUntil:"2027-12-31"};
 p.careerSquad!.push(local); p.playerCareers[local.id]=createPlayerCareer(local,save.clubName);
 const migrated=migrateFinanceSave(save,db), key=localEmploymentKey(save.id,save.clubId,local.id), finance=migrated.progress!.managerMarket!.finance!;
 expect(finance.contracts[key]).toMatchObject({clubId:save.clubId,monthlyCents:200000,endsOn:"2027-12-31"});
 expect(migrateFinanceSave(migrated,db)).toEqual(migrated);
 const month=accrueFinance(finance,"2026-02-01");
 expect(month.ledger.filter(e=>e.kind==="wage-accrual" && e.reference.includes(key)).reduce((n,e)=>n+e.amountCents,0)).toBe(200000);
 const renewed=applyCareerPlayerAction(migrated,db,local.id,{type:"contract",offer:{salary:3,years:2,releaseClause:1}}).save;
 expect(renewed.progress!.managerMarket!.finance!.contracts[key].monthlyCents).toBeGreaterThan(200000);
 expect(db.players.some(p=>p.id===key)).toBe(false);
});
it("preserves invalid local expiry and salary as unknown rather than granting a free pass or negative wages",()=>{
 const {save,db}=fixture(), p=save.progress!;
 const local={...p.careerSquad![0],id:90000,sourceId:undefined,salary:-2,contractUntil:"unknown"};
 p.careerSquad!.push(local); p.playerCareers[local.id]=createPlayerCareer(local,save.clubName);
 const state=migrateFinanceSave(save,db).progress!.managerMarket!.finance!, key=localEmploymentKey(save.id,save.clubId,local.id);
 expect(state.contracts[key]).toMatchObject({endsOn:null,monthlyCents:null,status:"active",clubId:save.clubId});
 expect(accrueFinance(state,"2026-03-01").contracts[key].status).toBe("active");
});
