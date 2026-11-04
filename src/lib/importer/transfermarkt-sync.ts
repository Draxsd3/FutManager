import type { EditorDatabase } from "@/lib/game/editor-data";
import { applyTransfermarktSnapshot, transfermarktSnapshotSchema } from "./transfermarkt";

/** Fetch the latest published/approved collection, not an unreviewed live roster. */
export async function prepareTransfermarktSync(database: EditorDatabase) {
  const response = await fetch("/api/transfermarkt", { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error("Não foi possível consultar a coleta do Transfermarkt. Tente novamente.");
  const { snapshot: input } = await response.json();
  const snapshot = transfermarktSnapshotSchema.parse(input);
  if (!snapshot.clubs.length) {
    throw new Error("Nenhuma coleta do Transfermarkt foi publicada ainda. Os vínculos dos clubes precisam ser aprovados e a coleta executada pela administração. Seu catálogo não foi alterado.");
  }
  const [{ default: catalog }, { default: links }] = await Promise.all([
    import("@/data/brazil-clubs.json"), import("../../../scripts/transfermarkt/clubs.json"),
  ]);
  const eligible = snapshot.version === 2 ? snapshot.clubs : snapshot.clubs.filter(incoming => {
    const registered = catalog.find(club => club.source === incoming.source);
    return registered && database.clubs.some(club => club.name === registered.name && club.state === registered.state && club.country.toLowerCase() === "brasil");
  });
  if (!eligible.length) throw new Error("A coleta publicada não contém atualizações para os seus clubes cadastrados. Nada foi alterado.");
  // Full snapshot is validated first: a corrupt/foreign record cannot be silently hidden by filtering.
  const updated = applyTransfermarktSnapshot(database, snapshot, catalog, links);
  return { database: updated, clubs: eligible.length,
    players: eligible.reduce((total, club) => total + club.players.length, 0),
    collectedAt: snapshot.generatedAt! };
}

/** Live, resumable collection. Browser coordinates short same-origin authenticated requests. */
export async function prepareLiveTransfermarktSync(database: EditorDatabase, userId: string, progress: import("./transfermarkt-live").ImportProgress, signal?: AbortSignal) {
  const [{ collectNationalSnapshot }, { createBrowserSupabaseClient }, { readTransfermarktCheckpoint, saveTransfermarktCheckpoint }] = await Promise.all([
    import("./transfermarkt-live"), import("@/lib/supabase/client"), import("./database-cache"),
  ]);
  const snapshot = await collectNationalSnapshot({ progress, signal,
    seed: async () => {
      progress("Validando o arquivo brasileiro 2026 enviado…");
      const [{ readTransfermarktCorrections }, { fetchCorrectedSeed }] = await Promise.all([import("./database-cache"), import("./transfermarkt-corrections")]);
      const { checkpoint } = await fetchCorrectedSeed(await readTransfermarktCorrections(userId), signal);
      return { ...checkpoint, snapshot: transfermarktSnapshotSchema.parse(checkpoint.snapshot) };
    },
    load: () => readTransfermarktCheckpoint(userId), save: value => saveTransfermarktCheckpoint(userId, value),
    pause: () => new Promise(resolve => setTimeout(resolve, 1600)),
    request: async (body, signal) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        signal?.throwIfAborted();
        const client = createBrowserSupabaseClient();
        const { data } = await client.auth.getSession();
        if (!data.session || data.session.user.id !== userId) throw new Error("Sua sessão expirou. Entre novamente.");
        let response: Response;
        try {
          response = await fetch("/api/transfermarkt/live", { method: "POST", cache: "no-store",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
            body: JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(55_000)]) : AbortSignal.timeout(55_000) });
        } catch (error) {
          if (signal?.aborted || attempt === 2) throw error;
          await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1))); continue;
        }
        const result = await response.json().catch(() => ({ error: `Falha HTTP ${response.status} na coleta.` }));
        if (response.ok) return result;
        if (![429, 502, 503, 504].includes(response.status) || attempt === 2) throw new Error(result.error ?? "Não foi possível consultar o Transfermarkt.");
        progress(`Fonte temporariamente indisponível. Tentativa ${attempt + 2}/3…`);
        await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
      }
      throw new Error("Não foi possível consultar o Transfermarkt.");
    },
  });
  const [{ default: catalog }, { default: links }] = await Promise.all([import("@/data/brazil-clubs.json"), import("../../../scripts/transfermarkt/clubs.json")]);
  const updated = applyTransfermarktSnapshot(database, snapshot, catalog, links);
  return { database: updated, clubs: snapshot.clubs.length, players: snapshot.clubs.reduce((sum, club) => sum + club.players.length, 0), collectedAt: snapshot.generatedAt! };
}
