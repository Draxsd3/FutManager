import { expect, it } from "vitest";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import { applyTransfermarktSnapshot, transfermarktSnapshotSchema } from "./transfermarkt";

function fixture() {
  const database = createDefaultDatabase();
  const club = database.clubs[0];
  const catalog = [{ source: "registered", name: club.name, state: club.state! }];
  const links = { registered: { approved: true, transfermarktId: "123" } };
  const snapshot = {
    version: 1, generatedAt: "2026-11-03T12:00:00Z", seasonId: null,
    clubs: [{ source: "registered", id: "123", name: "Upstream display name",
      fetchedAt: "2026-11-03T12:00:00Z", updatedAt: null, stadiumName: "Updated stadium",
      stadiumCapacity: 42000, coachName: "Updated coach",
      players: Array.from({ length: 40 }, (_, i) => ({ id: String(i + 1), name: `Fixture player ${i}`,
        position: i === 39 ? "G" : "M", age: 24, shirtNumber: null, foot: null,
        contractEndsOn: null, marketValueEur: 10_000_000 })),
    }],
  };
  return { database, club, catalog, links, snapshot };
}

it("updates only a registered club, preserving local ID, identity, division, assets and other teams", () => {
  const { database, club, catalog, links, snapshot } = fixture();
  const before = structuredClone(database);
  const result = applyTransfermarktSnapshot(database, snapshot, catalog, links);
  expect(database).toEqual(before);
  expect(result.clubs).toHaveLength(database.clubs.length);
  expect(result.clubs[0]).toEqual({ ...club, transfermarkt: { id: "123", collectedAt: "2026-11-03T12:00:00Z", season: "2026" }, stadiumName: "Updated stadium", stadiumCapacity: 42000, coachName: "Updated coach" });
  expect(result.clubs.slice(1)).toEqual(database.clubs.slice(1));
  const roster = result.players.filter(p => p.clubId === club.id);
  expect(roster).toHaveLength(40);
  expect(roster[0].primaryPosition).toBe("G");
  expect(roster.every(p => p.marketValueBrl !== 10_000_000)).toBe(true);
  expect(result.players.filter(p => p.clubId !== club.id)).toEqual(database.players.filter(p => p.clubId !== club.id));
});

it("does not create clubs missing in an account and leaves an empty snapshot unchanged", () => {
  const { database, catalog, links, snapshot } = fixture();
  expect(applyTransfermarktSnapshot(database, { version: 1, generatedAt: null, seasonId: null, clubs: [] }, catalog, links)).toBe(database);
  const result = applyTransfermarktSnapshot({ clubs: [], players: [] }, snapshot, catalog, links);
  expect(result).toEqual({ clubs: [], players: [] });
});

it("fails closed for unknown, unapproved or mismatched club links", () => {
  const { database, catalog, snapshot } = fixture();
  const cases: Array<Record<string, { approved: boolean; transfermarktId: string | null }>> = [{}, { registered: { approved: false, transfermarktId: "123" } }, { registered: { approved: true, transfermarktId: "999" } }];
  for (const links of cases) {
    expect(() => applyTransfermarktSnapshot(database, snapshot, catalog, links)).toThrow(/Unapproved/);
  }
  expect(() => applyTransfermarktSnapshot(database, snapshot, [], { registered: { approved: true, transfermarktId: "123" } })).toThrow(/Unapproved/);
});

it("rejects duplicate players, broken contracts and incomplete rosters without mutating the database", () => {
  const { database, catalog, links, snapshot } = fixture();
  snapshot.clubs[0].players[1].id = snapshot.clubs[0].players[0].id;
  expect(() => applyTransfermarktSnapshot(database, snapshot, catalog, links)).toThrow(/Duplicate/);
  snapshot.clubs[0].players = [];
  expect(() => applyTransfermarktSnapshot(database, snapshot, catalog, links)).toThrow();
  expect(transfermarktSnapshotSchema.safeParse({ version: 4 }).success).toBe(false);
});

it("bundled snapshot validates and mapping covers only the existing catalog", async () => {
  const { default: snapshot } = await import("@/data/transfermarkt-snapshot.json");
  const { default: catalog } = await import("@/data/brazil-clubs.json");
  const { default: mapping } = await import("../../../scripts/transfermarkt/clubs.json");
  expect(transfermarktSnapshotSchema.safeParse(snapshot).success).toBe(true);
  expect(new Set(Object.keys(mapping))).toEqual(new Set(catalog.map(c => c.source)));
  expect(() => applyTransfermarktSnapshot(createDefaultDatabase(), snapshot, catalog, mapping)).not.toThrow();
});

it("imports missing competition clubs and their complete 40-player rosters idempotently", () => {
  const { snapshot } = fixture();
  const incoming = { ...snapshot, version: 2, competitions: [{ id: "TEST", name: "Campeonato Brasileiro Série A", division: "Série A", seasonId: "2026" }],
    clubs: [{ ...snapshot.clubs[0], source: "tm-123", competitionId: "TEST", country: "Brasil", division: "Série A" }] };
  const first = applyTransfermarktSnapshot({ clubs: [], players: [] }, incoming, [], {});
  expect(first.clubs).toHaveLength(1);
  expect(first.players).toHaveLength(40);
  const second = applyTransfermarktSnapshot(first, incoming, [], {});
  expect(second.clubs).toHaveLength(1);
  expect(second.clubs[0].id).toBe(first.clubs[0].id);
  expect(second.players.map(p => p.id)).toEqual(first.players.map(p => p.id));
});

it("keeps existing club identity and colors when competition names have common prefixes", () => {
  const { database, snapshot, club } = fixture();
  const incoming = { ...snapshot, version: 2, competitions: [{ id: "TEST", name: "Campeonato Brasileiro Série A", division: "Série A", seasonId: "2026" }],
    clubs: [{ ...snapshot.clubs[0], name: `CR ${club.name}`, source: "tm-123", competitionId: "TEST", country: "Brasil", division: "Série A" }] };
  const result = applyTransfermarktSnapshot(database, incoming, [], {});
  expect(result.clubs).toHaveLength(database.clubs.length);
  expect(result.clubs[0].id).toBe(club.id);
  expect(result.clubs[0].primaryColor).toBe(club.primaryColor);
  expect(result.players.filter(p => p.clubId === club.id)).toHaveLength(40);
});

it("refuses competition imports without matching competition provenance", () => {
  const { snapshot } = fixture();
  expect(() => applyTransfermarktSnapshot({ clubs: [], players: [] }, { ...snapshot, version: 2 }, [], {})).toThrow(/Unapproved/);
});

it("replaces old rosters and removes duplicate linked players even across clubs, without merging namesakes", () => {
  const { database, club, catalog, links, snapshot } = fixture();
  const other = database.clubs[1];
  const oldAtClub = database.players.find(player => player.clubId === club.id)!;
  const otherPlayer = database.players.find(player => player.clubId === other.id)!;
  const source = snapshot.clubs[0].players[0];
  const origin = { id: source.id, collectedAt: "2026-01-01T00:00:00Z", season: "2026" };
  const localCanonical = { ...oldAtClub, id: "canonical", name: source.name, transfermarkt: origin };
  const duplicate = { ...otherPlayer, id: "duplicate", name: source.name, transfermarkt: origin };
  const namesake = { ...otherPlayer, id: "namesake", name: source.name };
  const base = { ...database, players: [...database.players, localCanonical, duplicate, namesake] };
  const result = applyTransfermarktSnapshot(base, snapshot, catalog, links);
  expect(result.players.filter(player => player.clubId === club.id)).toHaveLength(40);
  expect(result.players.some(player => player.id === oldAtClub.id)).toBe(false);
  expect(result.players.filter(player => player.transfermarkt?.id === source.id)).toHaveLength(1);
  expect(result.players.find(player => player.transfermarkt?.id === source.id)?.id).toBe("canonical");
  expect(result.players.some(player => player.id === "duplicate")).toBe(false);
  expect(result.players.some(player => player.id === "namesake")).toBe(true);
  expect(base.players.some(player => player.id === "duplicate")).toBe(true);
  const repeat = applyTransfermarktSnapshot(result, snapshot, catalog, links);
  expect(repeat.players).toEqual(result.players);
});

it("does not remove linked players when the source club is absent in a version 1 catalog", () => {
  const { database, catalog, links, snapshot, club } = fixture();
  const player = database.players.find(item => item.clubId !== club.id)!;
  const base = { clubs: database.clubs.filter(item => item.id !== club.id), players: [{ ...player, transfermarkt: { id: "1", collectedAt: "2026-01-01T00:00:00Z", season: "2026" } }] };
  expect(applyTransfermarktSnapshot(base, snapshot, catalog, links)).toEqual(base);
});

it("carries source nationality arrays into the editor without using club country", () => {
  const { database, snapshot, catalog, links, club } = fixture();
  Object.assign(snapshot.clubs[0].players[0], { nationalities: ["Argentina", "Italy"] });
  const imported = applyTransfermarktSnapshot(database,snapshot,catalog,links);
  expect(imported.players.find(p => p.transfermarkt?.id === "1" && p.clubId === club.id)?.nationalities).toEqual(["Argentina","Italy"]);
});

it("preserva a foto confiável da API no catálogo e em atualizações sem foto", async () => {
  const { normalizeLivePlayer } = await import("./transfermarkt-live");
  const { database, catalog, links, snapshot } = fixture();
  const imageUrl = "https://img.a.transfermarkt.technology/portrait/big/1-123.jpg";
  const normalized = normalizeLivePlayer({ id: "1", name: "Fixture player 0", age: 24, position: "Central Midfield", imageUrl }, "Clube", "2026-11-04T00:00:00Z");
  const incoming = structuredClone(snapshot);
  Object.assign(incoming.clubs[0].players[0], normalized);
  const first = applyTransfermarktSnapshot(database, incoming, catalog, links);
  expect(first.players.find(p => p.transfermarkt?.id === "1")?.transfermarkt?.photoUrl).toBe(imageUrl);
  const second = applyTransfermarktSnapshot(first, snapshot, catalog, links);
  expect(second.players.find(p => p.transfermarkt?.id === "1")?.transfermarkt?.photoUrl).toBe(imageUrl);
  expect(normalizeLivePlayer({ id: "1", name: "Atleta", age: 24, position: "Central Midfield", imageUrl: "https://evil.example/portrait/x" }, "Clube", "2026-11-04T00:00:00Z").photoUrl).toBeUndefined();
});
