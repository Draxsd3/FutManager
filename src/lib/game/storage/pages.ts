import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { strToU8,strFromU8,zlibSync,unzlibSync } from "fflate";
export const PAGE_LIMIT=256_000;
export type PageKind="ledger"|"invoices"|"contracts"|"season";
export type PageRef={id:string;kind:PageKind;count:number;bytes:number};
export type ArchivePage=PageRef & {text:string};
export const digest=(text:string)=>bytesToHex(sha256(utf8ToBytes(text)));
export function makePages(kind:PageKind,rows:readonly unknown[]):ArchivePage[]{
 const pages:ArchivePage[]=[];let values:unknown[]=[],size=2;
 const flush=()=>{if(!values.length)return;const text=JSON.stringify(values),bytes=strToU8(text).length;if(bytes>PAGE_LIMIT)throw new Error("Registro histórico excede o tamanho seguro de página.");pages.push({id:digest(`${kind}:${text}`),kind,count:values.length,bytes,text});values=[];size=2;};
 for(const row of rows){const n=strToU8(JSON.stringify(row)).length+1;if(n+2>PAGE_LIMIT)throw new Error("Registro histórico excede o tamanho seguro de página.");if(size+n>PAGE_LIMIT)flush();values.push(row);size+=n;}
 flush();return pages;
}
export function assertPageRef(ref:PageRef){
 if(!/^[a-f0-9]{64}$/.test(ref.id)||!["ledger","invoices","contracts","season"].includes(ref.kind)||!Number.isSafeInteger(ref.count)||ref.count<1||!Number.isSafeInteger(ref.bytes)||ref.bytes>PAGE_LIMIT||ref.bytes<2)throw new Error("Referência histórica inválida.");
}
export function verifyPage(ref:PageRef,text:string):unknown[]{
 assertPageRef(ref);
 if(strToU8(text).length!==ref.bytes||digest(`${ref.kind}:${text}`)!==ref.id)throw new Error("Página histórica ausente ou corrompida; save preservado.");
 const rows:unknown=JSON.parse(text);if(!Array.isArray(rows)||rows.length!==ref.count)throw new Error("Página histórica incompleta.");return rows;
}
export function encodePage(page:ArchivePage){verifyPage(page,page.text);return {ref:{id:page.id,kind:page.kind,count:page.count,bytes:page.bytes},data:zlibSync(strToU8(page.text),{level:6})};}
export function decodePage(ref:PageRef,data:Uint8Array){assertPageRef(ref);if(data.length>PAGE_LIMIT+1024)throw new Error("Página comprimida inválida.");const text=strFromU8(unzlibSync(data,{out:new Uint8Array(ref.bytes)}));verifyPage(ref,text);return text;}
export const refOf=({id,kind,count,bytes}:PageRef):PageRef=>({id,kind,count,bytes});
