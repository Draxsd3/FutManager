import {digest} from "@/lib/game/storage/pages";
import type { EditorDatabase, CareerSave } from "@/lib/game/editor-data";
import { accountStorageKey } from "@/lib/game/save-utils";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("futmanager-editor-cache-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("databases");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Biblioteca bloqueada por outra aba."));
  });
}
const pending = new Map<string, Promise<void>>();
function store(key: string, value: unknown): Promise<void> {
  const job = (pending.get(key) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    const db = await open();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("databases", "readwrite");
        transaction.objectStore("databases").put(value, key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = transaction.onabort = () => reject(transaction.error ?? new Error("Banco local não salvo."));
      });
    } finally { db.close(); }
  });
  pending.set(key, job);
  void job.finally(() => { if (pending.get(key) === job) pending.delete(key); }).catch(() => undefined);
  return job;
}
async function read<T>(key: string): Promise<T | null> {
  await pending.get(key)?.catch(() => undefined);
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("databases").objectStore("databases").get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

export function cacheDatabase(database: EditorDatabase, userId: string, pendingSync = true): Promise<void> {
  return store(accountStorageKey("imported-database", userId), {database, pendingSync});
}
function readCache(userId: string) {
  return read<{database: EditorDatabase; pendingSync: boolean}>(accountStorageKey("imported-database", userId));
}
const universeIds=new WeakMap<EditorDatabase,string>();
const installedUniverses=new Set<string>();
type CachedCareer=CareerSave & {cachedUniverseId?:string};
const pendingCareerSnapshots = new Map<string,{latest: CareerSave[] | null; job: Promise<void>}>();
/** Cache is a projection, not a journal: coalesce queued renders to the latest full snapshot. */
export function cacheCareerSaves(saves: CareerSave[], userId: string): Promise<void> {
  const key=accountStorageKey("imported-saves",userId), previous=pendingCareerSnapshots.get(key);
  if(previous) {previous.latest=saves;return previous.job;}
  const pending={latest:saves as CareerSave[] | null,job:Promise.resolve()};
  pending.job=Promise.resolve().then(async()=>{
    while(pending.latest) {
      const latest=pending.latest;pending.latest=null;const heads:CachedCareer[]=[];
      for(const save of latest){
        const universe=save.progress?.universeSnapshot;
        if(!universe){heads.push(save);continue;}
        let id=universeIds.get(universe);
        if(!id){id=digest(JSON.stringify(universe));universeIds.set(universe,id);}
        const universeKey=accountStorageKey(`career-universe:${save.id}:${id}`,userId);
        if(!installedUniverses.has(universeKey)){if(!await read(universeKey))await store(universeKey,universe);installedUniverses.add(universeKey);}
        heads.push({...save,cachedUniverseId:id,progress:{...save.progress!,universeSnapshot:undefined}});
      }
      await store(key,heads);
    }
  }).finally(()=>{if(pendingCareerSnapshots.get(key)===pending) pendingCareerSnapshots.delete(key);});
  pendingCareerSnapshots.set(key,pending);
  return pending.job;
}
export async function readCachedCareerSaves(userId: string): Promise<CareerSave[] | null> {
  const key=accountStorageKey("imported-saves",userId);
  await pendingCareerSnapshots.get(key)?.job.catch(()=>undefined);
  const saves=await read<CachedCareer[]>(key);
  if(!saves)return null;
  return Promise.all(saves.map(async({cachedUniverseId,...save})=>{
    if(!cachedUniverseId)return save;
    const universe=await read<EditorDatabase>(accountStorageKey(`career-universe:${save.id}:${cachedUniverseId}`,userId));
    if(!universe)throw new Error("Universo congelado ausente; checkpoint preservado.");
    universeIds.set(universe,cachedUniverseId);
    installedUniverses.add(accountStorageKey(`career-universe:${save.id}:${cachedUniverseId}`,userId));
    return {...save,progress:{...save.progress!,universeSnapshot:universe}};
  }));
}
export async function readCachedDatabase(userId: string): Promise<EditorDatabase | null> {
  return (await readCache(userId))?.database ?? null;
}
export async function hasPendingDatabaseSync(userId: string): Promise<boolean> {
  return (await readCache(userId))?.pendingSync ?? false;
}

/** Staging only: never read as the active catalog or career. */
export function saveTransfermarktCheckpoint(userId: string, value: import("./transfermarkt-live").LiveCheckpoint | null) {
  return store(accountStorageKey("transfermarkt-2026-staging-v1", userId), value);
}
export function readTransfermarktCheckpoint(userId: string) {
  return read<import("./transfermarkt-live").LiveCheckpoint>(accountStorageKey("transfermarkt-2026-staging-v1", userId));
}

/** Manual overlays are isolated by account and never written back to the source API. */
export async function readTransfermarktCorrections(userId: string) {
  const { manualCorrectionsSchema } = await import("./transfermarkt-corrections");
  return manualCorrectionsSchema.parse(await read(accountStorageKey("transfermarkt-manual-v1", userId)) ?? []);
}
export async function saveTransfermarktCorrections(userId: string, value: import("./transfermarkt-corrections").ManualCorrection[]) {
  const { manualCorrectionsSchema } = await import("./transfermarkt-corrections");
  return store(accountStorageKey("transfermarkt-manual-v1", userId), manualCorrectionsSchema.parse(value));
}
