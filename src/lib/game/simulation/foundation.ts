import type { CareerSave } from "../editor-data";
import { seededRandom } from "../live-match";

export const ENGINE_CONFIG = Object.freeze({
  schemaVersion: 1 as const,
  rulesVersion: "foundation-market-v3" as const,
  maxAdvanceDays: 3660,
  worldMarket: Object.freeze({ maxDeals: 6, minimumSellerRoster: 20, maximumBuyerRoster: 30, cooldownDays: 90, budgetFraction: 0.25 }),
});
export type EngineEvent = { id: string; operationId: string; date: string; type: "finance-committed" | "loan-returned" | "job-expired" | "market-processed" | "market-deal-completed" | "checkpoint"; entityIds: string[]; revision: number };
export type DecisionRecord = { id: string; sector: string; mode: "internal" | "assisted" | "comparison"; actionId: string; fallback?: string; comparedActionId?: string; rulesVersion: string; stateRevision: number; options: string[]; reason: string; eventIds: string[] };
export type EngineState = {
  schemaVersion: 1;
  rulesVersion: "foundation-v1" | "foundation-finance-v2" | "foundation-market-v3";
  revision: number;
  seed: string;
  date: string;
  streams: Record<string, number>;
  operations: { id: string; from: string; to: string; revision: number }[];
  events: EngineEvent[];
  decisions: DecisionRecord[];
};
export class EngineConflict extends Error { constructor() { super("A carreira mudou em outra aba ou dispositivo. Reabra o save antes de continuar."); this.name = "EngineConflict"; } }
export function civilDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) !== date) throw new Error("Data de simulação inválida.");
  return date;
}
export function engineState(saved: EngineState | undefined, careerId: string, date: string): EngineState {
  civilDate(date);
  if (!careerId) throw new Error("Carreira sem identidade.");
  if (!saved) return { schemaVersion: 1, rulesVersion: ENGINE_CONFIG.rulesVersion, revision: 0, seed: `career:${careerId}`, date, streams: {}, operations: [], events: [], decisions: [] };
  if (saved.schemaVersion !== 1 || (saved.rulesVersion !== "foundation-v1" && saved.rulesVersion !== "foundation-finance-v2" && saved.rulesVersion !== ENGINE_CONFIG.rulesVersion) || !Number.isSafeInteger(saved.revision) || saved.revision < 0 || !saved.seed || !Array.isArray(saved.operations) || !Array.isArray(saved.events) || !Array.isArray(saved.decisions) || !saved.streams || Object.values(saved.streams).some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error("Versão ou estado do motor incompatível. O save foi preservado.");
  civilDate(saved.date);
  if (saved.date !== date) throw new EngineConflict();
  return {...structuredClone(saved),rulesVersion:ENGINE_CONFIG.rulesVersion};
}
/** Additive, repeatable migration; no catalog refresh, ID changes or reset of careerRuleset. */
export function migrateEngineSave(save: CareerSave): CareerSave {
  if (!save.progress) return save;
  return { ...save, progress: { ...save.progress, engine: engineState(save.progress.engine, save.id, save.inGameDate) } };
}
/** Streams are isolated by domain and cursor is persisted, not wall-clock based. */
export function drawEngineRandom(state: EngineState, stream: string): { state: EngineState; value: number } {
  if (!/^[a-zA-Z][a-zA-Z0-9:_-]{0,99}$/.test(stream) || ["constructor","prototype","__proto__"].includes(stream)) throw new Error("Stream inválido.");
  const cursor = state.streams[stream] ?? 0;
  return { state: { ...state, streams: { ...state.streams, [stream]: cursor+1 } }, value: seededRandom(`${state.seed}:${stream}:${cursor}`)() };
}
export type ScheduledEvent = { id: string; date: string; priority: number; kind: "loan" | "job" | "target"; entityId: string };
export function orderedAgenda(events: ScheduledEvent[], from: string, to: string) {
  civilDate(from); civilDate(to);
  const unique = new Map<string, ScheduledEvent>();
  for (const event of events) {
    civilDate(event.date);
    if (event.date > from && event.date <= to) {
      const previous = unique.get(event.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(event)) throw new Error("Identidade de evento duplicada.");
      unique.set(event.id,event);
    }
  }
  return [...unique.values()].sort((a,b) => a.date.localeCompare(b.date) || a.priority-b.priority || a.id.localeCompare(b.id));
}

export type PolicyContext = { id: string; sector: string; allowedActionIds: string[]; internalActionId: string };
export interface DecisionPolicy { decide(context: PolicyContext): Promise<{ actionId: string }> }
/** No provider or network built in. Invalid/failed proposals fall back; comparison never executes twice. */
export async function chooseDecision(context: PolicyContext, mode: DecisionRecord["mode"], provider?: DecisionPolicy, timeoutMs = 1500): Promise<DecisionRecord> {
  if (!context.allowedActionIds.includes(context.internalActionId)) throw new Error("Política interna inválida.");
  const record: DecisionRecord = { id: context.id, sector: context.sector, mode, actionId: context.internalActionId, rulesVersion: ENGINE_CONFIG.rulesVersion, stateRevision: 0, options: [...context.allowedActionIds], reason: "Política interna validada; alternativas explícitas.", eventIds: [] };
  if (mode === "internal") return record;
  if (!provider) return { ...record, fallback: "provider-unavailable" };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("Timeout inválido.");
    const proposal = await Promise.race([provider.decide(structuredClone(context)), new Promise<never>((_,reject) => { timer = setTimeout(() => reject(new Error("Timeout")),timeoutMs); })]);
    if (!context.allowedActionIds.includes(proposal.actionId)) return { ...record, fallback: "invalid-action" };
    return mode === "comparison" ? { ...record, comparedActionId: proposal.actionId } : { ...record, actionId: proposal.actionId };
  } catch { return { ...record, fallback: "provider-failed" }; }
  finally { if (timer) clearTimeout(timer); }
}
