import { z } from "zod";
import type { EditorDatabase, EditorPlayer } from "@/lib/game/editor-data";
import { MAX_CLUB_SQUAD_SIZE } from "@/lib/game/editor-data";
import { normalizeName } from "./matching";

const numericId = z.string().regex(/^[1-9]\d*$/);
const playerSchema = z.object({
  id: numericId, name: z.string().trim().min(1).max(250),
  age: z.number().int().min(14).max(65), position: z.enum(["G", "L", "Z", "M", "A"]),
  shirtNumber: z.number().int().min(1).max(999).nullable(),
  foot: z.enum(["E", "D", "A"]).nullable(),
  contractEndsOn: z.iso.date().nullable(),
  marketValueEur: z.number().int().min(0).max(10_000_000_000).nullable(),
});
const clubSchema = z.object({
  source: z.string().min(1), id: numericId, name: z.string().trim().min(1).max(250),
  fetchedAt: z.iso.datetime({ offset: true }), updatedAt: z.string().nullable(),
  stadiumName: z.string().trim().min(1).max(250).nullable(),
  stadiumCapacity: z.number().int().min(0).max(500_000).nullable(),
  coachName: z.string().trim().min(1).max(250).nullable(),
  players: z.array(playerSchema).min(11).max(200),
});
export const transfermarktSnapshotSchema = z.object({
  version: z.literal(1), generatedAt: z.iso.datetime({ offset: true }).nullable(),
  seasonId: z.string().regex(/^\d{4}$/).nullable(), clubs: z.array(clubSchema).max(2000),
});
export type TransfermarktSnapshot = z.infer<typeof transfermarktSnapshotSchema>;
type CatalogClub = { source: string; name: string; state: string };
type Link = { transfermarktId: string | null; approved: boolean };

/** Pure allowlisted overlay. Caller must never apply this to an active career snapshot.
 * No new clubs, no currency guesses, no ratings presented as Transfermarkt measurements.
 */
export function applyTransfermarktSnapshot(
  database: EditorDatabase, input: unknown, catalog: CatalogClub[], links: Record<string, Link>,
): EditorDatabase {
  const snapshot = transfermarktSnapshotSchema.parse(input);
  if (!snapshot.clubs.length) return database;
  if (!snapshot.generatedAt) throw new Error("Missing snapshot collection date");
  const updates = new Map<string, z.infer<typeof clubSchema>>();
  const clubIds = new Set<string>(), playerIds = new Set<string>();
  for (const incoming of snapshot.clubs) {
    const registered = catalog.find((club) => club.source === incoming.source);
    const link = links[incoming.source];
    if (!registered || !link?.approved || link.transfermarktId !== incoming.id) {
      throw new Error(`Unapproved Transfermarkt link: ${incoming.source}`);
    }
    if (clubIds.has(incoming.id) || updates.has(incoming.source)) throw new Error("Duplicate club identity");
    clubIds.add(incoming.id);
    if (!incoming.players.some((player) => player.position === "G")) throw new Error("Roster has no goalkeeper");
    for (const player of incoming.players) {
      if (playerIds.has(player.id)) throw new Error("Duplicate Transfermarkt player identity");
      playerIds.add(player.id);
    }
    updates.set(incoming.source, incoming);
  }
  const playersByClub = new Map<string, EditorPlayer[]>();
  const clubs = database.clubs.map((club) => {
    const registered = catalog.find((entry) => entry.name === club.name && entry.state === club.state);
    const incoming = registered && updates.get(registered.source);
    if (!incoming || club.country.toLowerCase() !== "brasil") return club;
    const previous = database.players.filter((player) => player.clubId === club.id);
    const senior = [...incoming.players].sort((a, b) => Number(b.position === "G") - Number(a.position === "G")).slice(0, MAX_CLUB_SQUAD_SIZE);
    const reused = new Set<string>();
    const roster = senior.map((player, index): EditorPlayer => {
      // Name matching is only used for game defaults, never for approving a club/link.
      const matches = previous.filter((old) => normalizeName(old.name) === normalizeName(player.name));
      const old = matches.length === 1 && !reused.has(matches[0].id) ? matches[0] : undefined;
      if (old) reused.add(old.id);
      const overall = old?.overall ?? Math.min(95, Math.max(35, 40 + club.level * 2));
      return {
        id: old?.id ?? crypto.randomUUID(), clubId: club.id, name: player.name,
        shirtNumber: player.shirtNumber ?? old?.shirtNumber ?? index + 1,
        age: player.age, primaryPosition: player.position, secondaryPosition: null,
        preferredFoot: player.foot ?? old?.preferredFoot ?? "D", overall,
        starRating: old?.starRating ?? 2,
        qualityPrimary: old?.qualityPrimary ?? "Simulação", qualitySecondary: old?.qualitySecondary ?? "Simulação",
        energy: 100, salaryMonthlyBrl: old?.salaryMonthlyBrl ?? Math.round(overall * overall * 8),
        // Source values are EUR. Do not label or convert them to BRL without a dated FX rate.
        marketValueBrl: old?.marketValueBrl ?? Math.round(overall ** 3 * 5),
        goals: 0, assists: 0, ownGoals: 0, averageRating: null,
        contractEndsOn: player.contractEndsOn ?? old?.contractEndsOn ?? "2027-12-31", marketStatus: "normal",
      };
    });
    playersByClub.set(club.id, roster);
    return { ...club, stadiumName: incoming.stadiumName ?? club.stadiumName,
      stadiumCapacity: incoming.stadiumCapacity ?? club.stadiumCapacity,
      coachName: incoming.coachName ?? club.coachName };
  });
  return { clubs, players: [...database.players.filter((player) => !playersByClub.has(player.clubId)), ...Array.from(playersByClub.values()).flat()] };
}

/** Bundled, validated snapshot only; never scrape from a browser or during a match. */
export async function applyBundledTransfermarkt(database: EditorDatabase) {
  const [{ default: snapshot }, { default: catalog }, { default: links }] = await Promise.all([
    import("@/data/transfermarkt-snapshot.json"), import("@/data/brazil-clubs.json"),
    import("../../../scripts/transfermarkt/clubs.json"),
  ]);
  return applyTransfermarktSnapshot(database, snapshot, catalog, links);
}
