import type {FinanceState} from "../simulation/finance";
import {makePages,refOf,type ArchivePage,type PageRef} from "./pages";
export type FinanceArchive={version:1;pages:PageRef[];ledgerCount:number;invoiceCount:number;contractCount:number};
export type InvoiceAllocation={key:string;from:number;to:number};
export type ArchivedInvoice=[string,FinanceState["payables"][string],InvoiceAllocation?];
/** Fold only CLOSED wage competences, grouped by the exact employment+payer key.
 * Bucket sorts before its open competences: original lexicographic payment priority
 * is unchanged. Allocation intervals retain every person's/month's individual debt.
 * Never group by club (that changes which person receives a partial payment).
 */
export function archiveFinance(finance:FinanceState):{finance:FinanceState;pages:ArchivePage[]}{
 const pages:ArchivePage[]=[];
 const old=finance.archive ?? {version:1 as const,pages:[],ledgerCount:0,invoiceCount:0,contractCount:0};
 const ledger=finance.ledger.length>512?finance.ledger.slice(0,-256):[];
 const invoices=Object.entries(finance.payables).filter(([key,p])=>!key.includes(":!archive:")&&(/^wage:.+:\d{4}-\d{2}$/.test(key)||p.amountCents===p.paidCents)&&p.dueOn<=finance.through).sort(([a],[b])=>a.localeCompare(b));
 if(!ledger.length&&!invoices.length&&!finance.history.length)return {finance,pages};
 const payables={...finance.payables},archived:ArchivedInvoice[]=[];
 const buckets=new Map<string,string>();
 for(const [key,p] of Object.entries(payables))if(/:!archive:\d{4}-\d{2}$/.test(key)){
  if(p.paidCents===p.amountCents)delete payables[key];
  else buckets.set(key.replace(/:!archive:\d{4}-\d{2}$/, ""),key);
 }
 for(const [id,p] of invoices){
  delete payables[id];const outstanding=p.amountCents-p.paidCents;
  if(outstanding===0){archived.push([id,p]);continue;}
  const prefix=id.replace(/:\d{4}-\d{2}$/,"");
  const key=buckets.get(prefix) ?? `${prefix}:!archive:${id.slice(-7)}`;
  buckets.set(prefix,key);
  const previous=payables[key],from=previous?.amountCents ?? 0,to=from+outstanding;
  if(!Number.isSafeInteger(to)||outstanding<0)throw new Error("Obrigação histórica inválida.");
  payables[key]={clubId:p.clubId,dueOn:previous?.dueOn ?? p.dueOn,amountCents:to,paidCents:previous?.paidCents ?? 0};
  archived.push([id,p,{key,from,to}]);
 }
 pages.push(...makePages("ledger",ledger),...makePages("invoices",archived),...makePages("contracts",finance.history));
 return {finance:{...finance,ledger:ledger.length?finance.ledger.slice(-256):finance.ledger,payables,history:[],archive:{version:1,pages:[...old.pages,...pages.map(refOf)],ledgerCount:old.ledgerCount+ledger.length,invoiceCount:old.invoiceCount+archived.length,contractCount:old.contractCount+finance.history.length}},pages};
}
/** Exact individual attribution without expanding the entire debt book. */
export function invoiceBalance(invoice:ArchivedInvoice,finance:FinanceState){
 const [,p,allocation]=invoice;
 if(!allocation)return {...p};
 const bucket=finance.payables[allocation.key];
 // A retired episode is fully paid; a later month uses a DIFFERENT episode ID.
 if(!bucket)return {...p,paidCents:p.amountCents};
 const paid=p.paidCents+Math.max(0,Math.min(allocation.to-allocation.from,bucket.paidCents-allocation.from));
 return {...p,paidCents:paid};
}
