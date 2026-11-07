import { describe,it,expect,vi } from "vitest";
import { marketFixture } from "./market-test-fixture";
import { buildClubPlan,marketOptions,rosterIndex } from "./market-planning";
import { assessMove,contextualPriceBrl } from "./market-rules";
import { simulateWorldMarket,worldDatabase } from "../world-market";
import { advanceCareerWithMarketPolicy } from "./market-policy";
import { setMarketMode } from "./market-settings";
import { settleTransfer } from "./finance";
import { proposeTransfer } from "../transfers";

function command(save: ReturnType<typeof marketFixture>["save"]) {return {operationId:"test-week",expectedRevision:save.progress!.engine!.revision,fromDate:save.inGameDate,targetDate:"2026-01-18"};}
describe("E4 planning and negotiations",()=>{
 it("plans depth and fixture congestion from real cash/commitments; a poor club cannot bid like a rich club",()=>{
  const {input,database,buyer}=marketFixture(), finance=input.managers.finance!, rosters=rosterIndex(database), roster=rosters.get(buyer.id)!;
  const plan=buildClubPlan(buyer.id,roster,finance,input.date);
  expect(plan.needs.find(n=>n.position==="M")?.priority).toBeGreaterThan(0);
  expect(marketOptions(plan,roster,database.players.filter(p=>p.marketStatus==="sale"),rosters,finance).length).toBeGreaterThan(1);
  const poor=structuredClone(finance); poor.clubs[buyer.id].cashCents=100;
  const poorPlan=buildClubPlan(buyer.id,roster,poor,input.date);
  expect(poorPlan.spendingLimitCents).toBe(0);
  expect(marketOptions(poorPlan,roster,database.players,rosters,poor).map(o=>o.kind)).toEqual(["wait"]);
  const season={...input.season,fixtures:Array.from({length:4},(_,i)=>({...input.season.fixtures[0],homeClubId:buyer.id,awayClubId:input.humanClubId,scheduledDate:`2026-01-${19+i}`}))};
  const congested=buildClubPlan(buyer.id,roster,finance,input.date,season);
  expect(congested.fixturesNext21Days).toBe(4); expect(congested.needs.find(n=>n.position==="M")!.target).toBeGreaterThan(plan.needs.find(n=>n.position==="M")!.target);
 });
 it("selling a reference opens a replacement need or records a justified internal alternative",()=>{
  const {input,database,buyer,target}=marketFixture(), finance=input.managers.finance!, roster=rosterIndex(database).get(buyer.id)!;
  const old=buildClubPlan(buyer.id,[...roster,target],finance,input.date);
  const missing=buildClubPlan(buyer.id,roster,finance,input.date,undefined,old);
  expect(missing.replacements).toContainEqual(expect.objectContaining({departedId:target.id,reason:expect.stringContaining("prioridade")}));
  const alternative=roster.map(p=>p.primaryPosition==="M" ? {...p,overall:64} : p);
  const covered=buildClubPlan(buyer.id,alternative,finance,input.date,undefined,old);
  expect(covered.replacements[0].alternativeId).toBeTruthy();
 });
 it("prices importance/contract horizon and assesses playing role separately from salary and unknown agents",()=>{
  const {target,database,seller,buyer}=marketFixture(), rosters=rosterIndex(database), roster=rosters.get(buyer.id)!;
  const reserve={...target,age:31,overall:40}; const crowded=[...roster,...roster.filter(p=>p.primaryPosition==="M")];
  expect(assessMove(reserve,crowded,"sale",1100).accepted).toBe(false);
  expect(assessMove(reserve,crowded,"sale",1300)).toMatchObject({accepted:true,representation:"unknown"});
  expect(assessMove({...reserve,age:21},crowded,"loan",1300).accepted).toBe(false);
  const sellers=rosters.get(seller.id)!;
  expect(contextualPriceBrl({...target,overall:99},sellers.map(p=>p.id===target.id ? {...p,overall:99} : p),"2026-01-18")).toBeGreaterThan(contextualPriceBrl(target,sellers,"2026-01-18"));
 });
 it("young surplus can be listed for development on loan instead of forced sale",()=>{
  const {input,target}=marketFixture(); target.marketStatus="normal";
  expect(simulateWorldMarket(input).world.listings[target.id]).toBe("loan");
 });
 it("two buyers can compete but ownership, fees and reservation release commit exactly once after reload",()=>{
  const {input,target,database}=marketFixture(true), before=structuredClone(input);
  const proposed=simulateWorldMarket(input), bids=proposed.negotiations.filter(d=>d.playerId===target.id);
  expect(bids).toHaveLength(2); expect(bids.every(d=>d.revision===1 && d.expiresOn==="2026-02-01")).toBe(true);
  expect(proposed.managers.finance!.ledger.filter(e=>e.kind==="transfer")).toHaveLength(0);
  const next=simulateWorldMarket({...input,...JSON.parse(JSON.stringify(proposed)),previousDate:input.date,date:"2026-01-25"});
  const completed=next.negotiations.filter(d=>d.playerId===target.id && d.status==="completed");
  expect(completed).toHaveLength(1); expect(next.negotiations.find(d=>d.playerId===target.id && d.status==="rejected")).toBeTruthy();
  expect(next.managers.finance!.ledger.filter(e=>e.kind==="transfer")).toHaveLength(2);
  expect(next.managers.finance!.ledger.filter(e=>e.kind==="transfer").reduce((n,e)=>n+e.cashDeltaCents,0)).toBe(0);
  for(const bid of bids) expect(next.managers.finance!.reservations[bid.id]).toBeUndefined();
  expect(worldDatabase(database,next.negotiations,next.loans,next.world,next.managers.finance).players.find(p=>p.id===target.id)!.clubId).toBe(completed[0].buyerClubId);
  expect(input).toEqual(before);
 });
 it("expiry and changed ownership abandon stale bids, never replay missed weeks of purchases",()=>{
  const {input}=marketFixture(), proposed=simulateWorldMarket(input), id=proposed.negotiations[0].id;
  const expired=simulateWorldMarket({...input,...proposed,previousDate:input.date,date:"2026-02-10"});
  expect(expired.negotiations.find(d=>d.id===id)?.status).toBe("rejected");
  expect(expired.managers.finance!.ledger.filter(e=>e.kind==="transfer")).toHaveLength(0);
  const changed=structuredClone(proposed); changed.managers.finance!.contracts[proposed.negotiations[0].playerId].clubId=input.humanClubId;
  const stale=simulateWorldMarket({...input,...changed,previousDate:input.date,date:"2026-01-25"});
  expect(stale.negotiations.find(d=>d.id===id)?.status).toBe("rejected");
 });
 it("response version and deadline do not authorize a second financial execution",()=>{
  const {input,database,target,buyer}=marketFixture();
  const deal=proposeTransfer(database,[],{id:"expired",playerId:target.id,buyerClubId:buyer.id,feeBrl:100000}).negotiation!;
  expect(()=>settleTransfer(input.managers.finance!,database,{...deal,expiresOn:"2026-01-10"},"2026-01-11")).toThrow(/expirou/);
 });
});
describe("E4 real advance policy boundary",()=>{
 it("internal mode never calls a provider; assisted wait affects proposals and replay never consults API",async()=>{
  const {save,database}=marketFixture(), provider={decide:vi.fn(async(_id,ctx)=>({decisionId:ctx.decisionId,stateRevision:ctx.stateRevision,actionId:"wait",reason:"Preservar caixa."}))};
  const internal=await advanceCareerWithMarketPolicy(save,database,command(save),provider); expect(provider.decide).not.toHaveBeenCalled();
  const enabled=setMarketMode(save,"assisted");
  const assisted=await advanceCareerWithMarketPolicy(enabled,database,command(enabled),provider);
  expect(provider.decide).toHaveBeenCalledTimes(1);
  expect(assisted.progress!.transferNegotiations!.length).toBeLessThan(internal.progress!.transferNegotiations!.length);
  expect(assisted.progress!.engine!.decisions.some(d=>d.mode==="assisted" && d.actionId==="wait")).toBe(true);
  const reopened=JSON.parse(JSON.stringify(assisted));
  expect(await advanceCareerWithMarketPolicy(reopened,database,command(enabled),provider)).toBe(reopened);
  expect(provider.decide).toHaveBeenCalledTimes(1);
 });
 it("comparison records the other choice but commits the internal action just once",async()=>{
  const {save,database}=marketFixture(), enabled=setMarketMode(save,"comparison");
  const next=await advanceCareerWithMarketPolicy(enabled,database,command(enabled),{decide:async(_id,ctx)=>({decisionId:ctx.decisionId,stateRevision:ctx.stateRevision,actionId:"wait",reason:"Comparar."})});
  expect(next.progress!.transferNegotiations).toHaveLength(1);
  expect(next.progress!.engine!.decisions.find(d=>d.comparedActionId)?.reason).not.toBe("Comparar.");
  expect(next.progress!.engine!.decisions.some(d=>d.comparedActionId==="wait" && d.actionId!=="wait")).toBe(true);
  expect(next.progress!.engine!.revision).toBe(enabled.progress!.engine!.revision+1);
 });
 it.each(["unknown-action","wrong-revision","extra-command","quota"])("%s falls back without blocking advancement or exposing a partial state",async failure=>{
  const {save,database}=marketFixture(), enabled=setMarketMode(save,"assisted"), before=structuredClone(enabled);
  const next=await advanceCareerWithMarketPolicy(enabled,database,command(enabled),{decide:async(_id,ctx)=>{
   if(failure==="quota") throw new Error("429");
   return {decisionId:ctx.decisionId,stateRevision:ctx.stateRevision+(failure==="wrong-revision" ? 1 : 0),actionId:failure==="unknown-action" ? "delete-save" : "wait",reason:"Teste.",...(failure==="extra-command" ? {command:"pay"} : {})};
  }});
  expect(next.progress!.transferNegotiations).toHaveLength(1);
  expect(next.progress!.engine!.decisions.some(d=>d.fallback==="provider-failed-or-invalid")).toBe(true);
  expect(enabled).toEqual(before);
 });
 it("timeout aborts the provider and persists the circuit/fallback",async()=>{
  const {save,database}=marketFixture(), enabled=setMarketMode(save,"assisted"); let signal: AbortSignal | undefined;
  const next=await advanceCareerWithMarketPolicy(enabled,database,command(enabled),{decide:async(_id,_ctx,s)=>{signal=s;return new Promise(()=>{});}},10);
  expect(signal?.aborted).toBe(true);
  expect(next.progress!.worldMarket!.marketState!.circuit?.failures).toBe(1);
 });
});

it("records consecutive rounds and roster/financial health without a forced transaction floor",()=>{
 const {input,seller}=marketFixture(); let result=simulateWorldMarket(input);
 for(let i=1;i<10;i++) {
  const date=new Date(Date.parse(`${input.date}T12:00:00Z`)+i*7*86400000).toISOString().slice(0,10);
  result=simulateWorldMarket({...input,...JSON.parse(JSON.stringify(result)),date,previousDate:result.world.marketState!.rounds.at(-1)!.date});
  expect(Object.values(result.managers.finance!.clubs).every(c=>c.cashCents>=0)).toBe(true);
  const effective=worldDatabase(input.database,result.negotiations,result.loans,result.world,result.managers.finance);
  expect(effective.players.filter(p=>p.clubId===seller.id).length).toBeGreaterThanOrEqual(20);
 }
 const rounds=result.world.marketState!.rounds;
 expect(rounds).toHaveLength(10); expect(rounds.some(r=>r.completed===0)).toBe(true);
 expect(rounds.every(r=>r.completed<=6 && r.proposals<=6)).toBe(true);
 expect(new Set(result.negotiations.filter(d=>d.status==="completed").map(d=>d.playerId)).size).toBe(result.negotiations.filter(d=>d.status==="completed").length);
});

it("tracks the second/third starters too, not just the strongest player in a sector",()=>{
 const {input,database,buyer}=marketFixture(), finance=input.managers.finance!, roster=rosterIndex(database).get(buyer.id)!;
 const midfield=roster.filter(p=>p.primaryPosition==="M"); midfield[0].overall=80; midfield[1].overall=78; midfield[2].overall=50;
 const previous=buildClubPlan(buyer.id,roster,finance,input.date);
 const next=buildClubPlan(buyer.id,roster.filter(p=>p.id!==midfield[1].id),finance,input.date,undefined,previous);
 expect(next.replacements).toContainEqual(expect.objectContaining({departedId:midfield[1].id,roleRank:1,requiredOverall:75}));
 expect(next.replacements.find(r=>r.departedId===midfield[1].id)?.alternativeId).toBeUndefined();
 expect(next.needs.find(n=>n.position==="M")!.priority).toBeGreaterThanOrEqual(3);
});
