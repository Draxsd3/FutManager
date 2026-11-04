import { z } from "zod";
import type { EditorClub, EditorDatabase, EditorPlayer } from "@/lib/game/editor-data";
import { normalizeName } from "./matching";

const numericId = z.string().regex(/^[1-9]\d*$/);
const playerSchema = z.object({
  manualCorrection: z.object({ fields: z.array(z.string()), correctedAt: z.iso.datetime({ offset: true }) }).optional(),
  id: numericId, name: z.string().trim().min(1).max(250), dateOfBirth: z.iso.date().nullable().optional(),
  age: z.number().int().min(14).max(65), position: z.enum(["G", "L", "Z", "M", "A"]),
  shirtNumber: z.number().int().min(1).max(999).nullable(),
  foot: z.enum(["E", "D", "A"]).nullable(),
  contractEndsOn: z.iso.date().nullable(),
  marketValueEur: z.number().int().min(0).max(10_000_000_000).nullable(),
});
const divisionSchema = z.enum(["Série A", "Série B", "Série C", "Série D"]);
const clubSchema = z.object({
  competitionId: z.string().optional(), division: divisionSchema.optional(), country: z.literal("Brasil").optional(),
  state: z.string().min(1).max(100).optional(), shortName: z.string().optional(), colors: z.array(z.string().regex(/^#[a-f\d]{6}$/i)).optional(),
  source: z.string().min(1), id: numericId, name: z.string().trim().min(1).max(250),
  fetchedAt: z.iso.datetime({ offset: true }), updatedAt: z.string().nullable(),
  stadiumName: z.string().trim().min(1).max(250).nullable(),
  stadiumCapacity: z.number().int().min(0).max(500_000).nullable(),
  coachName: z.string().trim().min(1).max(250).nullable(),
  players: z.array(playerSchema).min(11).max(200),
});
export const transfermarktSnapshotSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  competitions: z.array(z.object({ id: z.string().regex(/^[A-Za-z0-9]+$/), name: z.string().min(1), division: divisionSchema, seasonId: z.string().min(1) })).optional(),
  generatedAt: z.iso.datetime({ offset: true }).nullable(),
  seasonId: z.string().regex(/^\d{4}$/).nullable(), clubs: z.array(clubSchema).max(2000),
});
export type TransfermarktSnapshot = z.infer<typeof transfermarktSnapshotSchema>;
type CatalogClub = { source: string; name: string; state: string };
type Link = { transfermarktId: string | null; approved: boolean };

/** Pure allowlisted overlay. Caller must never apply this to an active career snapshot.
 * Version 2 imports competition members, including missing clubs. No currency/rating guesses.
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
    const competition = snapshot.competitions?.find(item => item.id === incoming.competitionId);
    const fromCompetition = snapshot.version === 2 && competition && competition.division === incoming.division && incoming.country === "Brasil";
    if (snapshot.version === 2 ? !fromCompetition : (!registered || !link?.approved || link.transfermarktId !== incoming.id)) {
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
  const targets = new Map<string, z.infer<typeof clubSchema>>();
  const baseClubs = [...database.clubs];
  const normalizedClub = (name: string) => normalizeName(name.replace(/[-()]/g, " "))
    .replace(/^(sociedade esportiva|esporte clube|sport club|clube de regatas do|clube de regatas|club|se|cr|sc|ec|aa|ad|ser) /, "")
    .replace(/ (de futebol e regatas|foot ball porto alegrense|futebol clube|fc|ec|fr|fbpa|sc)$/, "").trim();
  for (const incoming of updates.values()) {
    const registered = catalog.find(entry => entry.source === incoming.source || links[entry.source]?.approved && links[entry.source]?.transfermarktId === incoming.id);
    const linked = baseClubs.filter(club => club.transfermarkt?.id === incoming.id);
    const candidates = baseClubs.filter(club => !club.transfermarkt && club.country.toLowerCase() === "brasil" && (!incoming.state || !club.state || incoming.state === club.state));
    // Prefer an exact source short name (Botafogo-PB) to a generic official name (Botafogo FC).
    const shortMatches = incoming.shortName ? candidates.filter(club => normalizedClub(club.name) === normalizedClub(incoming.shortName!)) : [];
    const matches = linked.length ? linked : registered ? candidates.filter(club => club.name === registered.name && club.state === registered.state)
      : shortMatches.length ? shortMatches : candidates.filter(club => normalizedClub(club.name) === normalizedClub(incoming.name));
    if (matches.length > 1) throw new Error(`Clube ambíguo: ${incoming.name}. Confira o vínculo antes de importar.`);
    let club = matches[0];
    if (!club && snapshot.version === 2) {
      club = { id: crypto.randomUUID(), name: incoming.name, shortName: (incoming.shortName ?? incoming.name).slice(0, 3).toUpperCase(),
        division: incoming.division!, state: incoming.state, country: "Brasil", foundedYear: 0, primaryColor: incoming.colors?.[0] ?? "#246e43", secondaryColor: incoming.colors?.[1] ?? "#ffffff",
        stadiumName: incoming.stadiumName ?? "Não informado", stadiumCapacity: incoming.stadiumCapacity ?? 0,
        coachName: incoming.coachName ?? "Não informado", level: ({ "Série A": 16, "Série B": 12, "Série C": 8, "Série D": 5 } as const)[incoming.division!], kitStyle: "lisa" } satisfies EditorClub;
      baseClubs.push(club);
    }
    if (club) {
      if (targets.has(club.id)) throw new Error("Two Transfermarkt clubs matched the same local club");
      targets.set(club.id, incoming);
    }
  }
  const clubs = baseClubs.map((club) => {
    const incoming = targets.get(club.id);
    if (!incoming) return club;
    const previous = database.players.filter((player) => player.clubId === club.id);
    const senior = [...incoming.players].sort((a, b) => Number(b.position === "G") - Number(a.position === "G"));
    const reused = new Set<string>();
    const roster = senior.map((player, index): EditorPlayer => {
      // Name matching is only used for game defaults, never for approving a club/link.
      const linked = database.players.filter(old => old.transfermarkt?.id === player.id);
      if (linked.length > 1) throw new Error(`Identidade externa duplicada no catálogo: ${player.name}. Nada foi aplicado.`);
      const matches = linked.length ? linked : previous.filter((old) => !old.transfermarkt && normalizeName(old.name) === normalizeName(player.name));
      const old = matches.length === 1 && !reused.has(matches[0].id) ? matches[0] : undefined;
      if (old) reused.add(old.id);
      // Provisional, deterministic simulation. Missing market data is not zero value.
      const base = ({ "Série A": 74, "Série B": 64, "Série C": 54, "Série D": 46 } as const)[incoming.division ?? "Série C"];
      const identityOffset = Number(BigInt(player.id) % BigInt(13)) - 6;
      const ageOffset = player.age < 21 ? -4 : player.age > 35 ? -2 : 0;
      const valueOffset = player.marketValueEur && player.marketValueEur > 0 ? Math.max(-5, Math.min(9, Math.round(Math.log10(player.marketValueEur) * 4 - 20))) : 0;
      const overall = old?.overall ?? Math.max(35, Math.min(90, base + identityOffset + ageOffset + valueOffset));
      return {
        id: old?.id ?? crypto.randomUUID(), clubId: club.id, name: player.name,
        transfermarkt: { id: player.id, collectedAt: incoming.fetchedAt, season: snapshot.seasonId ?? "2026",
          manualCorrection: player.manualCorrection, marketValueEur: player.marketValueEur, dateOfBirth: player.dateOfBirth ?? null, modelVersion: "provisional-national-v1",
          estimatedFields: ["overall", "salaryMonthlyBrl", "marketValueBrl", ...(!player.foot ? ["preferredFoot"] : []), ...(!player.contractEndsOn ? ["contractEndsOn"] : []), ...(!player.shirtNumber ? ["shirtNumber"] : [])] },
        shirtNumber: player.shirtNumber ?? old?.shirtNumber ?? index + 1,
        age: player.age, primaryPosition: player.position, secondaryPosition: null,
        preferredFoot: player.foot ?? old?.preferredFoot ?? "D", overall,
        starRating: old?.starRating ?? Math.max(1, Math.min(5, Math.round((overall - 30) / 12))),
        qualityPrimary: old?.qualityPrimary ?? ({ G: "Colocação", L: "Cruzamento", Z: "Desarme", M: "Armação", A: "Finalização" } as const)[player.position], qualitySecondary: old?.qualitySecondary ?? "Simulação",
        energy: 100, salaryMonthlyBrl: old?.salaryMonthlyBrl ?? Math.round(overall * overall * 8),
        // Source values are EUR. Do not label or convert them to BRL without a dated FX rate.
        marketValueBrl: old?.marketValueBrl ?? Math.round(overall ** 3 * 5),
        goals: 0, assists: 0, ownGoals: 0, averageRating: null,
        contractEndsOn: player.contractEndsOn ?? old?.contractEndsOn ?? "2027-12-31", marketStatus: "normal",
      };
    });
    playersByClub.set(club.id, roster);
    return { ...club, state: club.state ?? incoming.state, transfermarkt: { id: incoming.id, collectedAt: incoming.fetchedAt, season: snapshot.seasonId ?? "2026" }, division: snapshot.version === 2 ? incoming.division! : club.division, stadiumName: incoming.stadiumName ?? club.stadiumName,
      stadiumCapacity: incoming.stadiumCapacity ?? club.stadiumCapacity,
      coachName: incoming.coachName ?? club.coachName };
  });
  const importedIds = new Set(Array.from(playersByClub.values()).flat().map(player => player.id));
  return { clubs, players: [...database.players.filter((player) => !playersByClub.has(player.clubId) && !importedIds.has(player.id)), ...Array.from(playersByClub.values()).flat()] };
}

/** Bundled, validated snapshot only; never scrape from a browser or during a match. */
export async function applyBundledTransfermarkt(database: EditorDatabase) {
  const [{ default: snapshot }, { default: catalog }, { default: links }] = await Promise.all([
    import("@/data/transfermarkt-snapshot.json"), import("@/data/brazil-clubs.json"),
    import("../../../scripts/transfermarkt/clubs.json"),
  ]);
  return applyTransfermarktSnapshot(database, snapshot, catalog, links);
}
