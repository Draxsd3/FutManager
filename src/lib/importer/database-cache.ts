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
export function cacheCareerSaves(saves: CareerSave[], userId: string): Promise<void> {
  return store(accountStorageKey("imported-saves", userId), saves);
}
export function readCachedCareerSaves(userId: string): Promise<CareerSave[] | null> {
  return read<CareerSave[]>(accountStorageKey("imported-saves", userId));
}
export async function readCachedDatabase(userId: string): Promise<EditorDatabase | null> {
  return (await readCache(userId))?.database ?? null;
}
export async function hasPendingDatabaseSync(userId: string): Promise<boolean> {
  return (await readCache(userId))?.pendingSync ?? false;
}
