import {encodePage,decodePage,verifyPage,type ArchivePage,type PageRef} from "./pages";
const DB="futmanager-history-v1";
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 const request=indexedDB.open(DB,1);
 request.onupgradeneeded=()=>request.result.createObjectStore("pages");
 request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error("Feche a outra aba para atualizar o arquivo histórico."));request.onsuccess=()=>resolve(request.result);
});}
const key=(owner:string,career:string,id:string)=>JSON.stringify([owner,career,id]);
/** Immutable data is installed before the pointer is published. Failed pointer writes may
 * leave identical content-addressed pages, never a partially changed career. */
export async function putLocalPages(owner:string,career:string,pages:ArchivePage[]):Promise<void>{
 if(!pages.length)return;if(!owner||!career)throw new Error("Arquivo sem proprietário.");
 const encoded=pages.map(page=>encodePage(page)),db=await open();
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction("pages","readwrite"),store=tx.objectStore("pages");
 for(const page of encoded)store.put(page,key(owner,career,page.ref.id));
 tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error ?? new Error("Histórico não foi gravado; checkpoint preservado."));});}finally{db.close();}
}
export async function readLocalPage(owner:string,career:string,ref:PageRef):Promise<ArchivePage|null>{
 const db=await open();try{return await new Promise((resolve,reject)=>{const req=db.transaction("pages").objectStore("pages").get(key(owner,career,ref.id));req.onerror=()=>reject(req.error);req.onsuccess=()=>{
  if(!req.result){resolve(null);return;}try{const text=decodePage(ref,req.result.data);verifyPage(ref,text);resolve({...ref,text});}catch(error){reject(error);}
 };});}finally{db.close();}
}
