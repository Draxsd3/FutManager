import {expect,it} from "vitest";
import {archiveFinance,invoiceBalance,type ArchivedInvoice} from "./finance-archive";
import {accrueFinance,financeAvailability,type FinanceState} from "../simulation/finance";
import {makePages,verifyPage,PAGE_LIMIT,encodePage,decodePage} from "./pages";
export function financialFixture(people=5):FinanceState{
 return {version:1,rulesVersion:"finance-v1",adoptedOn:"2026-01-01",through:"2026-01-01",clubs:{c:{cashCents:73,projectedThousands:0}},contracts:Object.fromEntries(Array.from({length:people},(_,i)=>[`p${i}`,{id:`employment:p${i}:legacy`,playerId:`p${i}`,clubId:"c",startsOn:"2026-01-01",endsOn:null,monthlyCents:101+i,accruedThrough:"2026-01-01",origin:"legacy",status:"active"}])),history:[],registrations:{},loans:{},ledger:[],payables:{},reservations:{},settlements:{}};
}
it("bounded UTF-8 pages round trip, reject tampering and never split a record",()=>{
 const rows=Array.from({length:4000},(_,i)=>({id:i,text:"São Paulo ⚽ ".repeat(20)})),pages=makePages("ledger",rows);
 expect(pages.length).toBeGreaterThan(1);expect(pages.flatMap(p=>verifyPage(p,p.text))).toEqual(rows);
 for(const p of pages){expect(p.bytes).toBeLessThanOrEqual(PAGE_LIMIT);const encoded=encodePage(p);expect(decodePage(p,encoded.data)).toBe(p.text);expect(()=>verifyPage(p,p.text.replace("São","Sao"))).toThrow();}
 expect(()=>makePages("ledger",["x".repeat(PAGE_LIMIT)])).toThrow(/tamanho/);
});
it("retains every invoice, exact partial payment attribution, obligations and cents across 24 reopens",()=>{
 let legacy=financialFixture(17),compact=structuredClone(legacy);const invoices:ArchivedInvoice[]=[],ledger:unknown[]=[];
 const counters:number[]=[];
 for(let month=0;month<24;month++){
  const date=new Date(Date.UTC(2026,month+1,1)).toISOString().slice(0,10);
  // Alternate starvation and partial recovery; group/month priority must not drift.
  const cash=month%3===0?1007:month%3===1?11:0;
  legacy.clubs.c.cashCents+=cash;compact.clubs.c.cashCents+=cash;
  legacy=accrueFinance(legacy,date);compact=accrueFinance(compact,date);
  const posted=[...compact.ledger],archived=archiveFinance(compact);
  expect(archived.pages.filter(p=>p.kind==="ledger").flatMap(p=>verifyPage(p,p.text)).concat(archived.finance.ledger)).toEqual(posted);
  for(const p of archived.pages)if(p.kind==="invoices")invoices.push(...verifyPage(p,p.text) as ArchivedInvoice[]);else if(p.kind==="ledger")ledger.push(...verifyPage(p,p.text));
  compact=JSON.parse(JSON.stringify(archived.finance));
  expect(compact.clubs).toEqual(legacy.clubs);
  expect(financeAvailability(compact,"c")).toEqual(financeAvailability(legacy,"c"));
  expect(Object.fromEntries(invoices.map(row=>[row[0],invoiceBalance(row,compact)]))).toEqual(legacy.payables);
  expect(Object.keys(compact.payables).length).toBeLessThanOrEqual(17);counters.push(compact.archive!.invoiceCount);
 }
 expect(counters.at(-1)).toBe(17*24);expect(new Set(invoices.map(r=>r[0])).size).toBe(17*24);
 expect(ledger.length+compact.ledger.length).toBeGreaterThan(0);
 expect(archiveFinance(compact)).toEqual({finance:compact,pages:[]});
});
it("does not fold open competence, erase known employment history or mutate its input",()=>{
 const input=accrueFinance(financialFixture(),"2026-01-17"),before=structuredClone(input);
 expect(archiveFinance(input)).toEqual({finance:input,pages:[]});expect(input).toEqual(before);
 input.history.push({...input.contracts.p0,status:"expired"});
 const archived=archiveFinance(input);expect(archived.pages.filter(p=>p.kind==="contracts").flatMap(p=>verifyPage(p,p.text))).toEqual(input.history);expect(archived.finance.history).toEqual([]);
});
it("fully settled debt episodes retire without making a subsequent month's debt look paid",()=>{
 let s=financialFixture(1);s.clubs.c.cashCents=0;
 const jan=archiveFinance(accrueFinance(s,"2026-02-01"));s=jan.finance;
 const first=verifyPage(jan.pages.find(p=>p.kind==="invoices")!,jan.pages.find(p=>p.kind==="invoices")!.text)[0] as ArchivedInvoice;
 s.clubs.c.cashCents=101;s=archiveFinance(accrueFinance(s,"2026-02-02")).finance;
 expect(invoiceBalance(first,s).paidCents).toBe(101);
 const feb=archiveFinance(accrueFinance(s,"2026-03-01"));
 const second=verifyPage(feb.pages.find(p=>p.kind==="invoices")!,feb.pages.find(p=>p.kind==="invoices")!.text)[0] as ArchivedInvoice;
 expect(first[2]!.key).not.toBe(second[2]!.key);
 expect(invoiceBalance(first,feb.finance).paidCents).toBe(101);expect(invoiceBalance(second,feb.finance).paidCents).toBe(0);
});
