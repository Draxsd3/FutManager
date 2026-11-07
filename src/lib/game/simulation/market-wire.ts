import { z } from "zod";
import type { MarketContext } from "./market-planning";
const id = z.string().min(1).max(300);
export const marketContextSchema = z.object({
  decisionId:id, stateRevision:z.number().int().nonnegative().safe(),rulesVersion:z.literal("market-v1"),
  simulatedOn:z.iso.date(),actorId:id,spendingLimitCents:z.number().int().nonnegative().safe(),
  needs:z.array(z.object({position:z.enum(["G","L","Z","M","A"]),count:z.number().int().min(0).max(10000),target:z.number().int().min(1).max(10),priority:z.number().min(0).max(20)}).strict()).max(5),
  missingFacts:z.array(z.string().max(80)).max(4),
  options:z.array(z.object({actionId:id,kind:z.enum(["wait","approach"]),playerId:id.optional(),feeBrl:z.number().nonnegative().finite().optional(),salaryBrl:z.number().nonnegative().finite().optional(),role:z.enum(["titular","rotação","desenvolvimento"]).optional(),score:z.number().finite(),reason:z.string().max(500)}).strict()).min(1).max(4),
}).strict();
export const marketReplySchema = z.object({decisionId:id,stateRevision:z.number().int().nonnegative().safe(),actionId:id,reason:z.string().trim().min(1).max(400)}).strict();
export type MarketReply = z.infer<typeof marketReplySchema>;
export function validateMarketReply(raw: unknown, context: MarketContext): MarketReply {
  const reply=marketReplySchema.parse(raw);
  if(reply.decisionId!==context.decisionId || reply.stateRevision!==context.stateRevision || !context.options.some(o=>o.actionId===reply.actionId)) throw new Error("Resposta fora do contexto permitido.");
  return reply;
}
