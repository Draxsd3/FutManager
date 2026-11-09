import {createBrowserSupabaseClient} from "@/lib/supabase/client";
import {readLocalPage,putLocalPages} from "./local-pages";
import {verifyPage,type PageRef,type ArchivePage} from "./pages";
/** A remote miss is an error, never an empty history. Auth and owner are checked
 * again by RLS; a career UUID alone does not authorize access to its archive. */
export async function readCareerPage(owner:string,career:string,ref:PageRef):Promise<ArchivePage>{
 if(typeof indexedDB!=="undefined") {const local=await readLocalPage(owner,career,ref);if(local)return local;}
 const client=createBrowserSupabaseClient(),{data:auth,error:authError}=await client.auth.getUser();
 if(authError||auth.user?.id!==owner||auth.user?.is_anonymous)throw new Error("Entre na conta proprietária para consultar o histórico.");
 const {data,error}=await client.from("career_archive_pages").select("payload").eq("owner_id",owner).eq("save_id",career).eq("id",ref.id).single();
 if(error||!data)throw new Error("Página histórica indisponível; tente novamente sem substituir o save.");
 verifyPage(ref,data.payload);const page={...ref,text:data.payload};
 if(typeof indexedDB!=="undefined")await putLocalPages(owner,career,[page]);return page;
}
