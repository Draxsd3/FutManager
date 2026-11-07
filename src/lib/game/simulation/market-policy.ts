import { advanceCareer, type AdvanceCommand } from "./advance";
import type { CareerSave, EditorDatabase } from "../editor-data";
import { marketContextKey, type MarketContext, type MarketSelection } from "./market-planning";

import { validateMarketReply, type MarketReply } from "./market-wire";
export interface MarketDecisionProvider { decide(careerId: string, context: MarketContext, signal: AbortSignal): Promise<unknown> }
/** Speculative calculation is never published. Only the final validated snapshot reaches CAS.
 * Exactly one CPU context per advance is eligible for the pilot; all others remain internal.
 */
export async function advanceCareerWithMarketPolicy(save: CareerSave, database: EditorDatabase, command: AdvanceCommand, provider?: MarketDecisionProvider, timeoutMs=6000): Promise<CareerSave> {
  if(save.progress?.engine?.operations.some(op=>op.id===command.operationId)) return advanceCareer(save,database,command);
  const preview=advanceCareer(save,database,command);
  const state=preview.progress?.worldMarket?.marketState, context=state?.pilotContext;
  if(!state || state.mode==="internal" || !context || save.progress?.worldMarket?.lastWeek===preview.progress?.worldMarket?.lastWeek) return preview;
  let fallback: string | undefined;
  let reply: MarketReply | undefined;
  const circuit=save.progress?.worldMarket?.marketState?.circuit;
  const controller=new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if(circuit && circuit.retryAfter>context.simulatedOn) fallback="circuit-open";
    else if(!provider) fallback="provider-unavailable";
    else {
      if(!Number.isFinite(timeoutMs) || timeoutMs<=0) throw new Error("Timeout inválido.");
      const raw=await Promise.race([provider.decide(save.id,structuredClone(context),controller.signal),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error("Timeout"));},timeoutMs);})]);
      reply=validateMarketReply(raw,context);
    }
  } catch { fallback=controller.signal.aborted ? "provider-timeout" : "provider-failed-or-invalid"; }
  finally { if(timer) clearTimeout(timer); controller.abort(); }
  const selection: MarketSelection={decisionId:context.decisionId,stateRevision:context.stateRevision,contextKey:marketContextKey(context),mode:state.mode,actionId:state.mode==="assisted" && reply ? reply.actionId : context.options[0].actionId,reason:state.mode==="assisted" && reply ? reply.reason : context.options[0].reason,fallback,...(state.mode==="comparison" && reply ? {comparedActionId:reply.actionId} : {})};
  const next=advanceCareer(save,database,{...command,marketSelection:selection});
  const result=next.progress!.worldMarket!.marketState!;
  if(fallback && fallback!=="circuit-open") {
    const failures=(circuit?.failures ?? 0)+1;
    result.circuit={failures,retryAfter:new Date(Date.parse(`${context.simulatedOn}T12:00:00Z`)+(failures>=3 ? 28 : 7)*86400000).toISOString().slice(0,10)};
  } else if(reply) delete result.circuit;
  return next;
}
