import { describe, expect, it, vi } from "vitest";
import { createDefaultDatabase, buildSquadFromDatabase, type CareerSave } from "../editor-data";
import { CURRENT_CAREER_RULESET } from "../career-rules";
import { createCareerSeason, nextCareerFixture } from "../season";
import { initializeCareerMarket } from "../manager-jobs";
import type { CareerProgress } from "../progress";
import { advanceCareer, commitAdvance } from "./advance";
import { chooseDecision, drawEngineRandom, engineState, migrateEngineSave, orderedAgenda } from "./foundation";
function fixture() {
  const database = createDefaultDatabase(), club = database.clubs[0];
  const season = createCareerSeason(database,club.id,2026)!;
  const squad = buildSquadFromDatabase(database,club.name)!;
  const progress: CareerProgress = { activeSaveId:"test",page:"result",coach:"Técnico",club:club.name,division:club.division,round:1,budget:12624,formation:"4-3-3",style:"Equilibrado",marking:"Leve",focus:"Pelo meio",starters:squad.slice(0,11).map(p=>p.id),careerSquad:squad,playerCareers:{},manualPositions:{},minute:90,homeScore:0,awayScore:0,events:[],substitutionsLeft:5,detailOpen:false,matchRunning:false,matchSpeed:1,halftimeWaiting:false,competitionSeason:season,managerMarket:initializeCareerMarket(database,season,"Técnico",12624),activeFixtureId:nextCareerFixture(season)?.id };
  const save: CareerSave = { id:"test",careerRuleset:CURRENT_CAREER_RULESET,name:"Teste",managerName:"Técnico",clubId:club.id,clubName:club.name,division:club.division,round:1,budget:12624,inGameDate:"2026-01-11",updatedAt:"2026-01-11T00:00:00Z",progress };
  const command = { operationId:"after:fixture",expectedRevision:0,fromDate:save.inGameDate,targetDate:"2026-01-25",fixtureId:progress.activeFixtureId };
  return { database,save,command };
}
describe("foundation / headless command", () => {
  it("migrates additively, repeatedly, preserving identity, loans, events and independent universes", () => {
    const { save } = fixture(); const original = structuredClone(save);
    const migrated = migrateEngineSave(save);
    expect(save).toEqual(original);
    expect(migrateEngineSave(migrated)).toEqual(migrated);
    expect(migrated.progress).toEqual({ ...save.progress,engine:expect.objectContaining({schemaVersion:1,revision:0,seed:"career:test"}) });
    expect(migrateEngineSave({...save,id:"other"}).progress?.engine?.seed).not.toBe(migrated.progress?.engine?.seed);
    expect(migrated.careerRuleset).toBe(CURRENT_CAREER_RULESET);
  });
  it("rejects unknown schema rather than resetting a save", () => {
    const state = engineState(undefined,"x","2026-01-11");
    expect(() => engineState({...state,schemaVersion:2} as never,"x",state.date)).toThrow(/incompatível/);
    expect(() => engineState(state,"x","2026-01-12")).toThrow(/mudou/);
  });
  it("persists independent deterministic RNG streams across reload", () => {
    const state = engineState(undefined,"test","2026-01-11");
    const a = drawEngineRandom(state,"market");
    const b = drawEngineRandom(JSON.parse(JSON.stringify(a.state)),"market");
    expect(drawEngineRandom(a.state,"market")).toEqual(b);
    expect(drawEngineRandom(a.state,"health").value).toBe(drawEngineRandom(state,"health").value);
    expect(state.streams).toEqual({});
    expect(() => drawEngineRandom(state,"constructor")).toThrow();
  });
  it("orders interval deadlines by civil date, priority and stable ID", () => {
    const items = [ {id:"b",date:"2026-01-13",priority:2,kind:"job" as const,entityId:"b"}, {id:"c",date:"2026-01-13",priority:1,kind:"loan" as const,entityId:"c"}, {id:"a",date:"2026-01-12",priority:3,kind:"target" as const,entityId:"a"} ];
    expect(orderedAgenda(items,"2026-01-11","2026-01-13").map(e=>e.id)).toEqual(["a","c","b"]);
    expect(orderedAgenda(items,"2026-01-13","2026-01-14")).toEqual([]);
  });
  it("advances offline without mutation, reproduces serializable checkpoint, ignores duplicate command", () => {
    const {save,database,command} = fixture(); const original = structuredClone(save);
    const next = advanceCareer(save,database,command);
    expect(save).toEqual(original);
    expect(next.inGameDate).toBe(command.targetDate);
    expect(next.progress?.engine?.revision).toBe(1);
    expect(next.progress?.engine?.events.at(-1)?.type).toBe("checkpoint");
    expect(advanceCareer(JSON.parse(JSON.stringify(save)),database,command)).toEqual(next);
    expect(advanceCareer(next,database,command)).toBe(next);
    expect(() => advanceCareer(next,database,{...command,targetDate:"2026-01-26"})).toThrow(/reutilizado/);
    expect(() => advanceCareer(next,database,{...command,operationId:"stale"})).toThrow(/mudou/);
  });
  it("processes loan expiry at the actual deadline during a date jump", () => {
    const {save,database,command} = fixture(); const player = save.progress!.careerSquad![0];
    save.progress!.loanContracts = { [player.sourceId!]: { owner:{clubId:"external",name:"Origem"},borrower:{clubId:save.clubId,name:save.clubName},startsOn:"2026-01-01",endsOn:"2026-01-15",status:"active",source:"game",wageSharePercent:50 } };
    const next = advanceCareer(save,database,command);
    expect(next.progress?.loanContracts?.[player.sourceId!].status).toBe("returned");
    expect(next.progress?.careerSquad?.some(p=>p.id===player.id)).toBe(false);
    expect(next.progress?.engine?.events.find(e=>e.type==="loan-returned")?.date).toBe("2026-01-15");
  });
  it("rejects backward/invalid/excessive intervals without partial changes", () => {
    const {save,database,command} = fixture(); const original = structuredClone(save);
    for (const targetDate of ["2026-01-01","2026-02-30","2099-01-01"]) expect(()=>advanceCareer(save,database,{...command,targetDate})).toThrow();
    expect(save).toEqual(original);
  });
  it("a failed or conflicting atomic repository never publishes the private result", async () => {
    const {save,database,command} = fixture(); let current=save;
    await expect(commitAdvance(save,database,command,{compareAndSwap:async()=>false})).rejects.toThrow(/mudou/);
    await expect(commitAdvance(save,database,command,{compareAndSwap:async()=>{throw new Error("disk failed");}})).rejects.toThrow("disk failed");
    expect(current).toBe(save);
    const repository={compareAndSwap:async (_id:string,expected:number,next:CareerSave)=>{if((current.progress?.engine?.revision??0)!==expected)return false;current=next;return true;}};
    const results=await Promise.allSettled([commitAdvance(save,database,command,repository),commitAdvance(save,database,{...command,operationId:"race"},repository)]);
    expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect(current.progress?.engine?.revision).toBe(1);
  });
});
it("supports fake assisted/comparison policies, validation, failures and bounded waits without Gemini", async () => {
  const context={id:"decision",sector:"market",allowedActionIds:["wait","buy"],internalActionId:"wait"};
  const provider={decide:vi.fn().mockResolvedValue({actionId:"buy"})};
  expect((await chooseDecision(context,"internal",provider)).actionId).toBe("wait");expect(provider.decide).not.toHaveBeenCalled();
  expect((await chooseDecision(context,"assisted",provider)).actionId).toBe("buy");
  expect(await chooseDecision(context,"comparison",provider)).toMatchObject({actionId:"wait",comparedActionId:"buy"});
  expect(await chooseDecision(context,"assisted",{decide:async()=>({actionId:"invent"})})).toMatchObject({actionId:"wait",fallback:"invalid-action"});
  expect(await chooseDecision(context,"assisted")).toMatchObject({fallback:"provider-unavailable"});
  expect(await chooseDecision(context,"assisted",{decide:()=>new Promise(()=>{})},5)).toMatchObject({fallback:"provider-failed"});
});
