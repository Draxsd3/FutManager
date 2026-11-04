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
