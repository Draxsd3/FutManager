"use client";
import {useEffect,useState} from "react";
import type {CareerSave} from "@/lib/game/editor-data";
import {readCareerPage} from "@/lib/game/storage/cloud-pages";
import {verifyPage,type PageKind} from "@/lib/game/storage/pages";
import {invoiceBalance,type ArchivedInvoice} from "@/lib/game/storage/finance-archive";
import surface from "./management-surface.module.css";
const labels={ledger:"Lançamentos",invoices:"Competências salariais",contracts:"Contratos anteriores",season:"Súmulas de temporadas encerradas"};
/** One physical page at a time, at most 50 visible rows. No full-career hydration. */
export function CareerHistoryBrowser({owner,save}:{owner:string;save:CareerSave}){
 const [kind,setKind]=useState<PageKind>("ledger"),[index,setIndex]=useState(0),[offset,setOffset]=useState(0);
 const [rows,setRows]=useState<unknown[]|null>(null),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 const finance=save.progress?.managerMarket?.finance;
 const refs=kind==="season"?Object.values(save.progress?.seasonHistory ?? {}).flatMap(a=>a.cold?.pages ?? []):(finance?.archive?.pages ?? []).filter(p=>p.kind===kind);
 const ref=refs[index];
 const hot:unknown[]=kind==="ledger"?(finance?.ledger ?? []):kind==="contracts"?(finance?.history ?? []):kind==="invoices"?Object.entries(finance?.payables ?? {}).filter(([id])=>!id.includes(":!archive:")):Object.values(save.progress?.seasonHistory ?? {}).filter(a=>!a.cold).flatMap(a=>a.season.fixtures);
 useEffect(()=>{
  let cancelled=false;
  if(!ref)return;
  readCareerPage(owner,save.id,ref).then(page=>{if(!cancelled)setRows(verifyPage(ref,page.text));}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"Falha ao consultar o histórico.");});
  return ()=>{cancelled=true;};
 },[owner,save.id,ref?.id,retry,ref]);
 const selected=ref?rows:hot,count=refs.length+(hot.length?1:0);
 function change(page:number,start=0){setRows(null);setError("");setIndex(page);setOffset(start);}
 return <section className={`${surface.panel} m-4`} aria-label="Arquivo da carreira">
  <h2 className={surface.panelTitle}>ARQUIVO DA CARREIRA</h2>
  <div className="flex flex-wrap items-center gap-3 border-b py-2 text-sm">
   <label>Consultar <select aria-label="Tipo de histórico" className="ml-2 border px-2 py-1" value={kind} onChange={e=>{setKind(e.target.value as PageKind);change(0);}}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <span>{count?`Página ${index+1} de ${count}`:"Nenhum registro"}</span>
  </div>
  {error?<div role="alert" className="p-3">{error} <button className="underline" onClick={()=>{setError("");setRetry(n=>n+1);}}>Tentar novamente</button></div>:selected===null?<p role="status">Consultando página…</p>:<div className="divide-y text-sm">{selected.slice(offset,offset+50).map((row,i)=>{
   let value=row;if(kind==="invoices"&&finance&&Array.isArray(row))value={id:row[0],...invoiceBalance(row as ArchivedInvoice,finance)};
   const obj=value && typeof value==="object"?value as Record<string,unknown>:{};
   const id=String(obj.id ?? offset+i+1),date=String(obj.date ?? obj.dueOn ?? obj.scheduledDate ?? obj.startsOn ?? "");
   const title=String(obj.reference ?? obj.kind ?? obj.playerId ?? obj.competitionName ?? id);
   return <details key={`${ref?.id ?? "active"}:${offset+i}`} className="py-2"><summary className="cursor-pointer">{date} · {title}{typeof obj.amountCents==="number"?` · ${(obj.amountCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`:""}{typeof obj.paidCents==="number"?` · Pago: ${(obj.paidCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`:""}</summary><pre className="overflow-auto whitespace-pre-wrap p-2 text-xs">{JSON.stringify(value,null,2)}</pre></details>;
  })}</div>}
  <div className="flex gap-4 border-t py-2 text-sm">
   <button disabled={index===0&&offset===0} onClick={()=>offset?setOffset(Math.max(0,offset-50)):change(index-1)}>← Anterior</button>
   <button disabled={!!error||selected===null||(offset+50>=selected.length&&index+1>=count)} onClick={()=>selected&&offset+50<selected.length?setOffset(offset+50):change(index+1)}>Próxima →</button>
  </div>
  <p className="text-xs text-[#68757b]">Registros integrais de todos os clubes. Competências preservam a atribuição por contrato; pagamentos agrupados seguem a ordem original. O arquivo não altera o caixa.</p>
 </section>;
}
