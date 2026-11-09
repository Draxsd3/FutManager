// @vitest-environment jsdom
import {IDBFactory} from "fake-indexeddb";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {makePages,verifyPage} from "./pages";
import {putLocalPages,readLocalPage} from "./local-pages";
import {publishLocalCheckpoint} from "../simulation/local-checkpoint";
import {marketFixture} from "../simulation/market-test-fixture";
import {readLocalSaves,writeLocalSaves} from "../persistence";
import {accrueFinance} from "../simulation/finance";
import {careerPageRefs} from "./career-archive";
beforeEach(()=>{vi.stubGlobal("indexedDB",new IDBFactory());localStorage.clear();Object.defineProperty(navigator,"locks",{configurable:true,value:{request:async(_key:string,fn:()=>unknown)=>fn()}});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it("isolates immutable local blobs by both owner and career",async()=>{
 const pages=makePages("ledger",[{id:"a",amount:33}]);await putLocalPages("a","career",pages);
 expect(await readLocalPage("b","career",pages[0])).toBeNull();expect(await readLocalPage("a","other",pages[0])).toBeNull();
 const result=await readLocalPage("a","career",pages[0]);expect(verifyPage(pages[0],result!.text)).toEqual([{id:"a",amount:33}]);
});
it("publishes pages before the pointer, reopens old legacy input and refuses history erasure",async()=>{
 const {save}=marketFixture();writeLocalSaves([save],"owner");
 const next=structuredClone(save);next.progress!.managerMarket!.finance=accrueFinance(next.progress!.managerMarket!.finance!,"2026-03-01");
 await publishLocalCheckpoint(next,"owner",0);
 const loaded=readLocalSaves("owner")[0],refs=careerPageRefs(loaded);expect(refs.length).toBeGreaterThan(0);
 for(const ref of refs)expect(await readLocalPage("owner",save.id,ref)).not.toBeNull();
 expect(loaded.progress!.managerMarket!.finance).toEqual(next.progress!.managerMarket!.finance);
 const erase=structuredClone(loaded);delete erase.progress!.managerMarket!.finance!.archive;
 expect(writeLocalSaves([erase],"owner")).toBe(false);
});
it("IDB failure OR head quota failure never publishes a compact pointer or mutates the candidate",async()=>{
 const {save}=marketFixture();writeLocalSaves([save],"owner");
 const next=structuredClone(save);next.progress!.managerMarket!.finance=accrueFinance(next.progress!.managerMarket!.finance!,"2026-03-01");
 const before=structuredClone(next);
 vi.spyOn(indexedDB,"open").mockImplementation(()=>{throw new Error("disk full");});
 await expect(publishLocalCheckpoint(next,"owner",0)).rejects.toThrow(/disk full/);
 expect(readLocalSaves("owner")[0]).toEqual(save);expect(next).toEqual(before);
 vi.restoreAllMocks();vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("quota");});
 await expect(publishLocalCheckpoint(next,"owner",0)).rejects.toThrow(/espaço/);
 expect(readLocalSaves("owner")[0]).toEqual(save);expect(next).toEqual(before);
 vi.restoreAllMocks();await publishLocalCheckpoint(next,"owner",0);expect(careerPageRefs(readLocalSaves("owner")[0]).length).toBeGreaterThan(0);
});
