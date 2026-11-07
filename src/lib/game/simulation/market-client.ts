import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { MarketDecisionProvider } from "./market-policy";
/** Relative URL through this app; server owns credentials, model and quota. */
export const browserMarketProvider: MarketDecisionProvider={
  async decide(careerId,context,signal) {
    const {data}=await createBrowserSupabaseClient().auth.getSession();
    const token=data.session?.access_token;
    if(!token) throw new Error("Authenticated pilot unavailable");
    const response=await fetch("/api/market/decision",{method:"POST",signal,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({careerId,context})});
    if(!response.ok) throw new Error("Market pilot unavailable");
    return response.json();
  },
};
