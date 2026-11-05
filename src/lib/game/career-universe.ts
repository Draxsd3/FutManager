import { reconcileEditorDatabase } from "./club-reconciliation";
import type { EditorClub, EditorDatabase, EditorPlayer } from "./editor-data";

export function isClubRosterPlayable(players: EditorPlayer[], clubId: string): boolean {
  const roster = players.filter((player) => player.clubId === clubId);
  return roster.length >= 11 && roster.some((player) => player.primaryPosition === "G");
}

export function createCareerUniverseSnapshot(database: EditorDatabase): EditorDatabase {
  return structuredClone(reconcileEditorDatabase(database).database);
}

/**
 * Isolates an already-created career's club & squad universe from non-structural edits or API syncs
 * in the Universe Editor, while allowing structural repairs to propagate safely:
 * - Duplicate/orphan Transfermarkt club deduplication (`reconcileEditorDatabase`)
 * - Missing structural club metadata backfills (`state`, empty `shortName`, missing `transfermarkt` link)
 * - Unplayable roster repair (only when a club in the career universe had < 11 players or 0 goalkeepers
 *   and the latest catalog now supplies a playable 11+ roster with a goalkeeper).
 *
 * Non-structural team changes (player signings/edits/deletions, overall/age/salary tweaks, API roster refreshes,
 * club renames, division moves, level/coach/stadium edits, or newly created/deleted clubs) NEVER alter an
 * existing career's universe.
 */
export function applyStructuralDatabaseUpdates(
  careerUniverse: EditorDatabase,
  latestCatalog: EditorDatabase,
): { database: EditorDatabase; changed: boolean } {
  const { database: reconciled, mergedDuplicateToCanonicalId } = reconcileEditorDatabase(careerUniverse);
  let changed =
    mergedDuplicateToCanonicalId.size > 0 ||
    reconciled.clubs.length !== careerUniverse.clubs.length ||
    reconciled.players.length !== careerUniverse.players.length ||
    reconciled.clubs.some((club, idx) => club.id !== careerUniverse.clubs[idx]?.id || club.name !== careerUniverse.clubs[idx]?.name);

  if (!latestCatalog.clubs.length) {
    return { database: changed ? reconciled : careerUniverse, changed };
  }

  const catalogById = new Map<string, EditorClub>();
  const catalogByTmId = new Map<string, EditorClub>();
  for (const club of latestCatalog.clubs) {
    catalogById.set(club.id, club);
    if (club.transfermarkt?.id) catalogByTmId.set(club.transfermarkt.id, club);
  }

  let clubsChanged = false;
  const repairedRosters = new Map<string, EditorPlayer[]>();

  const nextClubs = reconciled.clubs.map((club) => {
    const catalogClub =
      catalogById.get(club.id) ??
      (club.transfermarkt?.id ? catalogByTmId.get(club.transfermarkt.id) : undefined);
    if (!catalogClub) return club;

    let patched: EditorClub | null = null;
    if (!club.state && catalogClub.state) {
      patched = { ...(patched ?? club), state: catalogClub.state };
    }
    if (!club.shortName.trim() && catalogClub.shortName.trim()) {
      patched = { ...(patched ?? club), shortName: catalogClub.shortName };
    }
    if (!club.transfermarkt?.id && catalogClub.transfermarkt?.id) {
      patched = { ...(patched ?? club), transfermarkt: structuredClone(catalogClub.transfermarkt) };
    }

    if (
      !isClubRosterPlayable(reconciled.players, club.id) &&
      isClubRosterPlayable(latestCatalog.players, catalogClub.id)
    ) {
      const usedPlayerIds = new Set(
        reconciled.players.filter((player) => player.clubId !== club.id).map((player) => player.id),
      );
      const donorPlayers = latestCatalog.players
        .filter((player) => player.clubId === catalogClub.id)
        .map((player) => ({
          ...structuredClone(player),
          id: usedPlayerIds.has(player.id) ? `${club.id}:${player.id}` : player.id,
          clubId: club.id,
        }));
      repairedRosters.set(club.id, donorPlayers);
    }

    if (patched) clubsChanged = true;
    return patched ?? club;
  });

  if (!clubsChanged && repairedRosters.size === 0) {
    return { database: changed ? reconciled : careerUniverse, changed };
  }

  changed = true;
  const nextPlayers =
    repairedRosters.size > 0
      ? [
          ...reconciled.players.filter((player) => !repairedRosters.has(player.clubId)),
          ...[...repairedRosters.values()].flat(),
        ]
      : reconciled.players;

  return {
    database: { clubs: nextClubs, players: nextPlayers },
    changed,
  };
}
