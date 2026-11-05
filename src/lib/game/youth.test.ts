import { expect, it } from "vitest";
import { createDefaultDatabase, buildSquadFromDatabase } from "./editor-data";
import { generateYouthTeam, promoteYouth } from "./youth";
it("generates a stable separate Brazilian squad with balanced roles for every club and career", () => {
  const database = createDefaultDatabase();
  for (const club of database.clubs) {
    const base = generateYouthTeam(club, "career-a");
    expect(base).toEqual(generateYouthTeam(club, "career-a"));
    expect(base.players).toHaveLength(20);
    expect(new Set(base.players.map(p => p.name)).size).toBe(20);
    expect(base.players.every(p => p.nationality === "Brasil" && p.origin === "simulado" && p.age >= 15 && p.age <= 19)).toBe(true);
    expect(new Set(base.players.map(p => p.position))).toEqual(new Set(["G", "L", "Z", "M", "A"]));
  }
  expect(generateYouthTeam(database.clubs[0], "career-a")).not.toEqual(generateYouthTeam(database.clubs[0], "career-b"));
});
it("promotes one player without source foreign keys or duplicate career identities", () => {
  const db = createDefaultDatabase(), club = db.clubs[0];
  const squad = buildSquadFromDatabase(db, club.name)!;
  const young = generateYouthTeam(club, "career").players[0];
  const result = promoteYouth(young, squad, [400])!;
  expect(result.id).toBeGreaterThan(400);
  expect(result.sourceId).toBeUndefined();
  expect(result.youthId).toBe(young.id);
  expect(promoteYouth(young, [...squad, result], [])).toBeNull();
});
