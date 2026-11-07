import type { CareerSave } from "../editor-data";
import { readLocalSaves, writeLocalSaves } from "../persistence";
import { EngineConflict } from "./foundation";

/** The lock covers compare + one localStorage snapshot publication, not network requests. */
export async function publishLocalCheckpoint(save: CareerSave, owner: string, expectedRevision: number) {
  const commit = () => {
    const saves = readLocalSaves(owner);
    const previous = saves.find(item => item.id === save.id);
    if (!previous || (previous.progress?.engine?.revision ?? 0) !== expectedRevision) throw new EngineConflict();
    if (!writeLocalSaves([save,...saves.filter(item => item.id !== save.id)],owner)) throw new Error("Sem espaço para salvar o checkpoint. A carreira não avançou.");
  };
  if (typeof navigator !== "undefined" && navigator.locks) return navigator.locks.request(`futmanager:${owner}:${save.id}`,commit);
  throw new Error("Este navegador não oferece bloqueio seguro de saves. Atualize-o para continuar sem risco de conflito entre abas.");
}
