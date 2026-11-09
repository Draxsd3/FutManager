import {IDBFactory} from "fake-indexeddb";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {readCareerPage} from "./cloud-pages";
import {makePages} from "./pages";
import {putLocalPages,readLocalPage} from "./local-pages";
const mock=vi.hoisted(()=>({getUser:vi.fn(),from:vi.fn(),single:vi.fn()}));
vi.mock("@/lib/supabase/client",()=>({createBrowserSupabaseClient:()=>({auth:{getUser:mock.getUser},from:mock.from})}));
const page=makePages("ledger",[{id:"a",text:"São Paulo"}])[0];
beforeEach(()=>{
 vi.clearAllMocks();vi.stubGlobal("indexedDB",new IDBFactory());mock.getUser.mockResolvedValue({data:{user:{id:"owner"}},error:null});mock.single.mockResolvedValue({data:{payload:page.text},error:null});
 const chain={eq:()=>chain,single:mock.single};mock.from.mockReturnValue({select:()=>chain});
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it("uses a verified local copy offline, but restores it from the server when the cache is corrupt",async()=>{
 await putLocalPages("owner","career",[page]);expect(await readCareerPage("owner","career",page)).toEqual(page);expect(mock.getUser).not.toHaveBeenCalled();
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open("futmanager-history-v1",1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 await new Promise<void>(resolve=>{const tx=db.transaction("pages","readwrite");tx.objectStore("pages").put({data:new Uint8Array([0,0])},JSON.stringify(["owner","career",page.id]));tx.oncomplete=()=>resolve();});db.close();
 expect(await readCareerPage("owner","career",page)).toEqual(page);expect(mock.single).toHaveBeenCalledOnce();expect(await readLocalPage("owner","career",page)).toEqual(page);
});
it("does not return foreign-account, missing or hash-corrupt remote history as an empty array",async()=>{
 mock.getUser.mockResolvedValueOnce({data:{user:{id:"other"}},error:null});await expect(readCareerPage("owner","career",page)).rejects.toThrow(/proprietária/);expect(mock.from).not.toHaveBeenCalled();
 mock.single.mockResolvedValueOnce({data:null,error:new Error("missing")});await expect(readCareerPage("owner","career",page)).rejects.toThrow(/indisponível/);
 mock.single.mockResolvedValueOnce({data:{payload:"[]"},error:null});await expect(readCareerPage("owner","career",page)).rejects.toThrow(/corrompida/);
});
it("bounds a non-responsive authentication request so the reader can retry",async()=>{
 vi.stubGlobal("indexedDB",undefined);vi.useFakeTimers();mock.getUser.mockReturnValue(new Promise(()=>{}));
 const result=expect(readCareerPage("owner","career",page)).rejects.toThrow(/Tempo de espera/);await vi.advanceTimersByTimeAsync(8000);await result;
});
