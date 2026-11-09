// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {makePages,refOf} from "./pages";
import {marketFixture} from "../simulation/market-test-fixture";
import {writeCloudSave} from "../persistence";
const mock=vi.hoisted(()=>({getUser:vi.fn(),from:vi.fn(),upload:vi.fn(),rpc:vi.fn(),read:vi.fn(),lookup:vi.fn()}));
vi.mock("@/lib/supabase/client",()=>({createBrowserSupabaseClient:()=>({auth:{getUser:mock.getUser},from:mock.from,rpc:mock.rpc})}));
vi.mock("./cloud-pages",()=>({readCareerPage:mock.read}));
beforeEach(()=>{
 vi.clearAllMocks();localStorage.clear();mock.getUser.mockResolvedValue({data:{user:{id:"owner",is_anonymous:false}},error:null});
 mock.upload.mockResolvedValue({error:null});mock.rpc.mockResolvedValue({error:null});mock.lookup.mockResolvedValue({data:[],error:null});
 const chain={eq:()=>chain,in:mock.lookup};mock.from.mockReturnValue({select:()=>chain,upsert:mock.upload});
});
afterEach(()=>vi.restoreAllMocks());
function input(id:string){
 const {save}=marketFixture();save.id=id;
 const pages=Array.from({length:9},(_,i)=>makePages("ledger",[{id:`cold${i}`,date:"2026-01-01",reference:"immutable"}])[0]);
 save.progress!.managerMarket!.finance!.archive={version:1,pages:pages.map(refOf),ledgerCount:9,invoiceCount:0,contractCount:0};
 mock.read.mockImplementation(async(_owner:string,_career:string,ref:{id:string})=>pages.find(p=>p.id===ref.id));return {save,pages};
}
it("streams only missing cold pages in four-page batches, then publishes one CAS head",async()=>{
 const {save,pages}=input("stream");await writeCloudSave(save,"owner");
 expect(mock.upload.mock.calls.map(([batch])=>batch.length)).toEqual([4,4,1]);expect(mock.read).toHaveBeenCalledTimes(9);
 expect(mock.rpc).toHaveBeenCalledOnce();expect(mock.rpc.mock.calls[0][1].p_save.state.progress.managerMarket.finance.archive.pages).toEqual(pages.map(refOf));
 expect(save.syncToken).toBeTruthy();
 mock.lookup.mockResolvedValue({data:pages.map(p=>({id:p.id})),error:null});mock.read.mockClear();mock.upload.mockClear();
 await writeCloudSave(save,"owner");expect(mock.read).not.toHaveBeenCalled();expect(mock.upload).not.toHaveBeenCalled();
});
it("page upload failure never publishes a dangling head; stale CAS retains the supplied lineage",async()=>{
 const {save}=input("fail");save.syncToken="parent";mock.upload.mockResolvedValueOnce({error:new Error("network")});
 await expect(writeCloudSave(save,"owner")).rejects.toThrow(/network/);expect(mock.rpc).not.toHaveBeenCalled();expect(save.syncToken).toBe("parent");
 mock.rpc.mockResolvedValueOnce({error:{code:"40001"}});
 await expect(writeCloudSave(save,"owner")).rejects.toThrow(/mudou/);expect(save.syncToken).toBe("parent");
 await writeCloudSave(save,"owner");expect(save.syncToken).not.toBe("parent");
});
