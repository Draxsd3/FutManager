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
  expect(result.clubs[0]).toEqual({ ...club, stadiumName: "Updated stadium", stadiumCapacity: 42000, coachName: "Updated coach" });
  expect(result.clubs.slice(1)).toEqual(database.clubs.slice(1));
  const roster = result.players.filter(p => p.clubId === club.id);
  expect(roster).toHaveLength(35);
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
