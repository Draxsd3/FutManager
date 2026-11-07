// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { publishLocalCheckpoint } from "./local-checkpoint";
import { readLocalSaves, writeLocalSaves } from "../persistence";
import { CURRENT_CAREER_RULESET } from "../career-rules";
import type { CareerSave } from "../editor-data";
import { engineState } from "./foundation";

const save = (): CareerSave => ({ id:"checkpoint",careerRuleset:CURRENT_CAREER_RULESET,name:"Carreira",managerName:"Teste",clubId:"c",clubName:"Clube",division:"Série A",round:1,budget:100,inGameDate:"2026-01-11",updatedAt:"2026-01-11T00:00:00Z" });
beforeEach(()=>{localStorage.clear();Object.defineProperty(navigator,"locks",{configurable:true,value:{request:async (_name:string, task:()=>unknown)=>task()}});});
afterEach(()=>vi.restoreAllMocks());
it("publishes a checkpoint once and rejects a stale writer without overwriting it",async()=>{
  const old=save();writeLocalSaves([old],"owner");
  const engine={...engineState(undefined,old.id,old.inGameDate),revision:1};
  const next={...old,round:2,progress:{engine}} as CareerSave;
  await publishLocalCheckpoint(next,"owner",0);
  await expect(publishLocalCheckpoint(next,"owner",0)).rejects.toThrow(/mudou/);
  expect(writeLocalSaves([old],"owner")).toBe(false);
  expect(readLocalSaves("owner")[0].round).toBe(2);
});
it("storage failure leaves the previous index unchanged",async()=>{
  const old=save();writeLocalSaves([old],"owner");
  vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("quota");});
  await expect(publishLocalCheckpoint({...old,round:2},"owner",0)).rejects.toThrow(/espaço/);
  expect(readLocalSaves("owner")[0].round).toBe(1);
});
it("fails closed without Web Locks and cannot commit into another account",async()=>{
  const old=save();writeLocalSaves([old],"owner");
  await expect(publishLocalCheckpoint(old,"someone-else",0)).rejects.toThrow(/mudou/);
  Object.defineProperty(navigator,"locks",{configurable:true,value:undefined});
  await expect(publishLocalCheckpoint(old,"owner",0)).rejects.toThrow(/bloqueio seguro/);
  expect(readLocalSaves("owner")[0]).toEqual(old);
});
