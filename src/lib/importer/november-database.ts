import type { EditorDatabase } from "@/lib/game/editor-data";
import { applyTransfermarktSnapshot, transfermarktSnapshotSchema } from "./transfermarkt";
import { normalizeLiveClub } from "./transfermarkt-live";
import { recalibrateDatabaseOveralls } from "@/lib/game/player-overall";

/** Full source identities; missing positions are provisional and never presented as source facts. */
export async function applyNovemberDatabase(database: EditorDatabase, options: { recalibrateOveralls?: boolean } = {}) {
  const [{ default: file }, { default: catalog }, { default: links }] = await Promise.all([
    import("@/data/transfermarkt/brasileirao-2026-novembro.json"),
    import("@/data/brazil-clubs.json"), import("../../../scripts/transfermarkt/clubs.json"),
  ]);
  const divisions = { BRA1: "Série A", BRA2: "Série B", BRA3: "Série C", BRA4: "Série D" } as const;
  const english: Record<string, string> = { G: "Goalkeeper", L: "Left-Back", Z: "Centre-Back", M: "Central Midfield", A: "Centre-Forward" };
  const positions: Record<string, string> = { Goalkeeper: "G", "Centre-Back": "Z", Sweeper: "Z", "Left-Back": "L", "Right-Back": "L", "Left Wing-Back": "L", "Right Wing-Back": "L", "Defensive Midfield": "M", "Central Midfield": "M", "Attacking Midfield": "M", "Left Midfield": "M", "Right Midfield": "M", "Left Winger": "A", "Right Winger": "A", "Second Striker": "A", "Centre-Forward": "A" };
  const goals = { G: 2, L: 4, Z: 4, M: 6, A: 4 } as const;
  let provisional = 0;
  const clubs = file.competitions.flatMap(comp => comp.clubs.map(club => {
    const counts = { G: 0, L: 0, Z: 0, M: 0, A: 0 };
    for (const player of club.players) { const role = positions[player.position ?? ""] as keyof typeof counts | undefined; if (role) counts[role]++; }
    const estimated = new Set<string>();
    const players = club.players.map(player => {
      if (positions[player.position ?? ""]) return player;
      const role = (Object.keys(goals) as (keyof typeof goals)[]).sort((a, b) => counts[a] / goals[a] - counts[b] / goals[b])[0];
      counts[role]++; provisional++; estimated.add(player.id);
      return { ...player, position: english[role] };
    });
    const parsed = normalizeLiveClub(club.profile, { id: club.id, players }, club.id, file.sourceMetadata.generatedAt, { allowIncompleteRosters: true });
    return { ...parsed, honours: club.honours, competitionId: comp.id, division: divisions[comp.id as keyof typeof divisions], country: "Brasil" as const,
      players: parsed.players.map(player => ({ ...player, ...(estimated.has(player.id) ? { positionEstimated: true } : {}) })) };
  }));
  const snapshot = transfermarktSnapshotSchema.parse({ version: 2, generatedAt: file.sourceMetadata.generatedAt, seasonId: "2026",
    competitions: file.competitions.map(comp => ({ id: comp.id, name: comp.name, seasonId: comp.seasonId, division: divisions[comp.id as keyof typeof divisions] })), clubs });
  const imported = applyTransfermarktSnapshot(database, snapshot, catalog, links, { allowIncompleteRosters: true });
  return { database: options.recalibrateOveralls ? recalibrateDatabaseOveralls(imported).database : imported, clubs: clubs.length,
    players: clubs.reduce((sum, club) => sum + club.players.length, 0), provisional, shortRosters: clubs.filter(club => club.players.length < 11 || !club.players.some(player => player.position === "G")).length };
}
