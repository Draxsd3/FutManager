import { createClient } from "@supabase/supabase-js";
import { generateGeminiChoice, handleMarketAi, type AiAccount, type Claim } from "@/lib/server/market-ai";
export const runtime="nodejs";
export const maxDuration=10;
export async function POST(request: Request) {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY, key=process.env.GEMINI_API_KEY, model=process.env.GEMINI_MARKET_MODEL;
  const enabled=process.env.GEMINI_MARKET_ENABLED==="true" && !!(url && publicKey && serviceKey && key && model);
  return handleMarketAi(request,{
    enabled,
    async authenticate(token): Promise<AiAccount | null> {
      if(!enabled) return null;
      const auth=createClient(url!,publicKey!,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data,error}=await auth.auth.getUser(token);
      if(error || !data.user || data.user.is_anonymous || !data.user.email_confirmed_at) return null;
      const db=createClient(url!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});
      const userId=data.user.id;
      return {
        async claim(careerId,id,hash,revision) {
          const {data,error}=await db.rpc("claim_market_ai_request",{p_user_id:userId,p_save_id:careerId,p_decision_id:id,p_context_hash:hash,p_revision:revision});
          if(error || !data) throw new Error("Quota unavailable");
          return data as Claim;
        },
        async finish(careerId,id,hash,result) {
          const {error}=await db.rpc("finish_market_ai_request",{p_user_id:userId,p_save_id:careerId,p_decision_id:id,p_context_hash:hash,p_result:result});
          if(error) throw new Error("Cache unavailable");
        },
      };
    },
    generate:(context,signal)=>generateGeminiChoice(context,signal,{key:key!,model:model!}),
  });
}
