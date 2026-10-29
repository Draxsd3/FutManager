import { emptyKitProject, type KitProject } from "./design";

function key(userId: string, clubId: string) {
  if (!userId || !clubId) throw new Error("Conta e clube são obrigatórios.");
  return [userId, clubId];
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("futmanager-kit-studio-v1", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Não foi possível abrir a biblioteca local."));
    request.onblocked = () =>
      reject(new Error("Feche outras abas para atualizar a biblioteca."));
  });
}
export async function readKitProject(
  userId: string,
  clubId: string,
): Promise<KitProject> {
  const id = key(userId, clubId),
    db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction("projects")
        .objectStore("projects")
        .get(id);
      request.onsuccess = () => resolve(request.result ?? emptyKitProject());
      request.onerror = () =>
        reject(new Error("Não foi possível ler os modelos deste clube."));
    });
  } finally {
    db.close();
  }
}
export async function writeKitProject(
  userId: string,
  clubId: string,
  project: KitProject,
) {
  const id = key(userId, clubId),
    db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("projects", "readwrite");
      transaction.objectStore("projects").put(project, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () =>
        reject(new Error("Biblioteca não salva: espaço local indisponível."));
    });
  } finally {
    db.close();
  }
}
