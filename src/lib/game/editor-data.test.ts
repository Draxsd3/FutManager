import { describe, expect, it } from "vitest";
import { createDefaultDatabase, buildSquadFromDatabase, enforceEditorSquadLimit, MAX_CLUB_SQUAD_SIZE } from "./editor-data";

describe("editor database", () => {
  it("creates complete squads for all default clubs", () => {
    const database = createDefaultDatabase();
    expect(database.clubs).toHaveLength(8);
    for (const club of database.clubs) {
      const players = database.players.filter((player) => player.clubId === club.id);
      expect(players.length).toBeGreaterThanOrEqual(18);
      expect(new Set(players.map((player) => player.shirtNumber)).size).toBe(players.length);
    }
  });

  it("gives outfield players a second position", () => {
    const database = createDefaultDatabase();
    const outfield = database.players.filter((player) => player.primaryPosition !== "G");
    expect(outfield.every((player) => player.secondaryPosition)).toBe(true);
  });

  it("caps every club squad at the FIFA competition limit", () => {
    const database = createDefaultDatabase();
    const clubId = database.clubs[0].id;
    const template = database.players.find((player) => player.clubId === clubId)!;
    const oversized = [...database.players, ...Array.from({ length: 30 }, (_, index) => ({ ...template, id: `extra-${index}`, shirtNumber: 50 + index }))];
    const limited = enforceEditorSquadLimit(oversized);
    expect(limited.filter((player) => player.clubId === clubId)).toHaveLength(MAX_CLUB_SQUAD_SIZE);
  });
});

it("preserves editor shirt numbers independently of internal player ids", () => {
  const database = createDefaultDatabase();
  const club = database.clubs[0];
  const player = database.players.find((p) => p.clubId === club.id)!;
  player.shirtNumber = 99;
  const converted = buildSquadFromDatabase(database, club.name)!.find((p) => p.sourceId === player.id)!;
  expect(converted.shirtNumber).toBe(99);
  expect(converted.id).not.toBe(99);
});
