import type { CareerSave } from "./editor-data";

/** Prefer the newest revision, including offline changes belonging to this account. */
export function mergeCareerSaves(local: CareerSave[], cloud: CareerSave[]): CareerSave[] {
  const byId = new Map(cloud.map((save) => [save.id, save]));
  for (const save of local) {
    const remote = byId.get(save.id);
    if (!remote || Date.parse(save.updatedAt) > Date.parse(remote.updatedAt)) byId.set(save.id, save);
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function accountStorageKey(key: string, userId: string) {
  if (!userId) throw new Error("Conta obrigatória para acessar dados locais.");
  return `${key}.${userId}`;
}
