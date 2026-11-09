// @vitest-environment jsdom
import { expect,it,vi } from "vitest";
vi.mock("fflate",async original=>{const actual=await original<typeof import("fflate")>();return {...actual,unzlibSync:vi.fn(actual.unzlibSync)};});
import { unzlibSync } from "fflate";
import { readLocalSaves,writeLocalSaves } from "../persistence";
import { accountStorageKey } from "../save-utils";
import { marketFixture } from "./market-test-fixture";
function cacheSaves(){
 const {save}=marketFixture();
 const saves=Array.from({length:3},(_,i)=>{
  const next=structuredClone(save);next.id=`e7000000-0000-4000-8000-00000000000${i}`;next.progress!.activeSaveId=next.id;
  next.progress!.competitionSeason={...next.progress!.competitionSeason!,fixtures:[],calendarIssues:[`cache-${i}`]};
  next.progress!.managerMarket!.clubs[next.clubId].coach=`Coach ${i}`;
  next.progress!.worldMarket={listings:{},events:[],population:{version:1,rulesVersion:"players-v1",through:next.inGameDate,people:{},generated:{},fixtures:[],events:[]}};
  return next;
 });
 return saves;
}
it("reuses more than four aggregates across careers without sharing mutable decoded state",()=>{
 localStorage.clear();const saves=cacheSaves();
 expect(writeLocalSaves(saves,"cache-e7")).toBe(true);const loaded=readLocalSaves("cache-e7"),calls=vi.mocked(unzlibSync).mock.calls.length;
 expect(calls).toBeGreaterThan(4);expect(readLocalSaves("cache-e7")).toEqual(loaded);expect(vi.mocked(unzlibSync).mock.calls.length).toBe(calls);
 loaded[0].progress!.competitionSeason!.calendarIssues!.push("Mutation");expect(readLocalSaves("cache-e7")[0].progress!.competitionSeason!.calendarIssues).toEqual(["cache-0"]);
 expect(readLocalSaves("another-owner")).toEqual([]);
});
it("validates cached envelope metadata too, rather than trusting data bytes alone",()=>{
 localStorage.clear();expect(writeLocalSaves(cacheSaves(),"cache-e7")).toBe(true);readLocalSaves("cache-e7");
 const key=accountStorageKey("futmanager.saves.v1","cache-e7"),raw=localStorage.getItem(key)!;
 for(const change of [{size:1},{bytes:1}]) {
  const index=JSON.parse(raw);Object.assign(index[0].progress.worldMarket.population,change);localStorage.setItem(key,JSON.stringify(index));expect(readLocalSaves("cache-e7")).toEqual([]);
 }
 localStorage.setItem(key,raw);expect(readLocalSaves("cache-e7")).toHaveLength(3);
});
