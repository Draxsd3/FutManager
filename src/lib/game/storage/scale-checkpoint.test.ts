// @vitest-environment jsdom
import {IDBFactory} from "fake-indexeddb";
import {afterEach,expect,it,vi} from "vitest";
import {marketFixture} from "../simulation/market-test-fixture";
import {accrueFinance,type FinanceState} from "../simulation/finance";
import {publishLocalCheckpoint} from "../simulation/local-checkpoint";
import {readLocalSaves,writeLocalSaves} from "../persistence";
import {careerPageRefs} from "./career-archive";
import {readLocalPage} from "./local-pages";
import {verifyPage} from "./pages";
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it("16,248 contracts / 714 clubs: 12 months of advance, atomic save, reload and bounded history query",async()=>{
 vi.stubGlobal("indexedDB",new IDBFactory());localStorage.clear();Object.defineProperty(navigator,"locks",{configurable:true,value:{request:async(_key:string,fn:()=>unknown)=>fn()}});
 const {save}=marketFixture();
 const finance:FinanceState={version:1,rulesVersion:"finance-v1",adoptedOn:"2026-01-01",through:"2026-01-01",clubs:Object.fromEntries(Array.from({length:714},(_,i)=>[`c${i}`,{cashCents:1000,projectedThousands:0}])),contracts:Object.fromEntries(Array.from({length:16248},(_,i)=>[`p${i}`,{id:`employment:p${i}:legacy`,playerId:`p${i}`,clubId:`c${i%714}`,startsOn:"2026-01-01",endsOn:null,monthlyCents:10001+i,accruedThrough:"2026-01-01",origin:"legacy",status:"active"}])),history:[],registrations:{},loans:{},ledger:[],payables:{},reservations:{},settlements:{}};
 save.progress!.managerMarket!.finance=finance;
 expect(writeLocalSaves([save],"scale-owner")).toBe(true);
 let current=save,peak=0,decoded=0;
 for(let month=1;month<=12;month++){
  const date=new Date(Date.UTC(2026,month,1)).toISOString().slice(0,10);
  const next=structuredClone(current);next.progress!.managerMarket!.finance=accrueFinance(next.progress!.managerMarket!.finance!,date);
  await publishLocalCheckpoint(next,"scale-owner",0);
  current=readLocalSaves("scale-owner")[0];expect(current).toBeDefined();
  const hot=current.progress!.managerMarket!.finance!,bytes=new TextEncoder().encode(JSON.stringify(hot)).length;
  decoded+=hot.archive!.pages.filter(p=>p.kind==="ledger").length;peak=Math.max(peak,bytes);
  expect(bytes).toBeLessThan(12_000_000);expect(hot.ledger.length).toBeLessThanOrEqual(256);expect(Object.keys(hot.payables).length).toBeLessThanOrEqual(16248);
  expect(hot.archive!.invoiceCount).toBe(16248*month);
 }
 const refs=careerPageRefs(current);let rows=0,bytes=0;
 // Query EVERY persisted page after reload: no dropped or unreadable historical record.
 for(const ref of refs){const page=await readLocalPage("scale-owner",current.id,ref);expect(page).not.toBeNull();expect(verifyPage(ref,page!.text)).toHaveLength(ref.count);rows+=ref.count;bytes+=ref.bytes;}
 const hot=current.progress!.managerMarket!.finance!;
 expect(hot.archive!.ledgerCount+hot.ledger.length).toBe(16248*12+714);
 expect(rows).toBe(hot.archive!.ledgerCount+hot.archive!.invoiceCount);
 expect(hot.archive!.invoiceCount).toBe(194976);
 console.log("STAGE1_SCALE",JSON.stringify({contracts:16248,clubs:714,months:12,archivedRows:rows,coldBytes:bytes,peakHotBytes:peak,pages:refs.length,ledgerEntries:hot.archive!.ledgerCount+hot.ledger.length,invoiceEntries:hot.archive!.invoiceCount,indexBytes:(localStorage.getItem("futmanager.saves.v1.scale-owner")?.length ?? 0)*2,decoded}));
},180000);
