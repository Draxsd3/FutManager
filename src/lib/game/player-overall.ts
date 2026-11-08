import type { EditorClub, EditorDatabase, EditorPlayer } from "./editor-data";
import type { DivisionKey } from "./mock-data";

/** Simulation estimates, not a scouting rating or an official Transfermarkt assessment. */
const divisionBase: Record<DivisionKey, number> = {
  "Série A": 70, "Série B": 63, "Série C": 57, "Série D": 52, "Sem divisão nacional": 49,
};
const expectedLevel: Record<DivisionKey, number> = {
  "Série A": 16, "Série B": 12, "Série C": 8, "Série D": 5, "Sem divisão nacional": 5,
};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function estimatePlayerOverall(player: Pick<EditorPlayer, "age" | "starRating"> & { transfermarkt?: EditorPlayer["transfermarkt"] }, club: Pick<EditorClub, "division" | "level">): number {
  const value = player.transfermarkt?.marketValueEur;
  const hasValue = typeof value === "number" && Number.isFinite(value) && value > 0;
  const ageAdjustment = player.age < 20 ? -3 : player.age < 23 ? -1 : player.age > 36 ? -2 : 0;
  // EUR is a noisy proxy, especially for prospects; it is never presented as an ability measurement.
  // When available it dominates and is independent of the club, allowing exceptional players at smaller clubs.
  if (hasValue) return clamp(Math.round(68 + 12 * Math.log10(value / 1_000_000) + ageAdjustment), 35, 90);
  // No source price: use context and existing star indicator, never zero market value or arbitrary ID.
  const division = club.division in divisionBase ? club.division : "Sem divisão nacional";
  const levelAdjustment = clamp(Math.round((club.level - expectedLevel[division]) * 0.6), -3, 3);
  const starAdjustment = clamp((player.starRating || 2) - 2, -1, 2) * 2;
  return clamp(Math.round(divisionBase[division] + levelAdjustment + starAdjustment + ageAdjustment), 35, 90);
}

/** Explicit catalog operation; never called on a career snapshot. Does not mutate the source. */
export function recalibrateDatabaseOveralls(database: EditorDatabase) {
  const clubs = new Map(database.clubs.map(club => [club.id, club]));
  let updated = 0, skipped = 0, withMarketValue = 0;
  const players = database.players.map(player => {
    const club = clubs.get(player.clubId);
    if (!club) { skipped++; return player; }
    const value = player.transfermarkt?.marketValueEur;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) withMarketValue++;
    updated++;
    return { ...player, overall: estimatePlayerOverall(player, club) };
  });
  return { database: { ...database, players }, updated, skipped, withMarketValue };
}
