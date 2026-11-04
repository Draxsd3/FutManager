import { expect, it } from "vitest";
import { archiveChampionships, normalizeHonours } from "./honours";
import { createDefaultDatabase } from "./editor-data";
import { createCareerSeason, type CareerSeason } from "./season";
function setup() {
  const db = createDefaultDatabase(); db.clubs = db.clubs.slice(0, 2);
  const season = createCareerSeason(db, db.clubs[0].id, 2026)!;
  const league = season.fixtures.filter(f => f.type === "league").map(f => ({ ...f, status: "played" as const, homeScore: f.homeClubId === season.clubId ? 3 : 0, awayScore: f.awayClubId === season.clubId ? 3 : 0, playerContributions: [{ playerId: "scorer", playerName: "Artilheiro", clubId: season.clubId, goals: 3, assists: 0, minutes: 90, rating: 8 }] }));
  return { db, season: { ...season, fixtures: league } };
}
it("archives only concluded championships, stores coach, runner-up and scorers once, and preserves old years", () => {
  const { db, season } = setup();
  expect(archiveChampionships([], { ...season, fixtures: season.fixtures.map((f, i) => i ? f : { ...f, status: "scheduled" }) }, db, "Renan")).toEqual([]);
  const history = archiveChampionships([], season, db, "Renan");
  expect(history).toHaveLength(1); expect(history[0]).toMatchObject({ season: 2026, championId: season.clubId, coach: "Renan", runnerUpId: db.clubs[1].id });
  expect(history[0].scorers[0].name).toBe("Artilheiro");
  expect(archiveChampionships(history, season, db, "Outro técnico")).toBe(history);
  const later: CareerSeason = { ...season, season: 2027 };
  expect(archiveChampionships(history, later, db, "Renan")).toHaveLength(2);
  expect(JSON.parse(JSON.stringify(history))).toEqual(history);
});
it("requires an actual final and honors a shootout winner, never a projected/cancelled cup", () => {
  const { db, season } = setup(), base = season.fixtures[0];
  const final = { ...base, type: "cup" as const, competitionId: "cup", competitionName: "Copa do Brasil", homeScore: 1, awayScore: 1, winnerClubId: base.awayClubId };
  expect(archiveChampionships([], { ...season, fixtures: [{ ...final, status: "cancelled" }] }, db, "Renan")).toHaveLength(0);
  const result = archiveChampionships([], { ...season, fixtures: [final] }, db, "Renan");
  expect(result[0].championId).toBe(base.awayClubId);
  expect(result[0].runnerUpId).toBe(base.homeClubId);
});
it("preserves upstream counts/season labels and explicitly labels nameless achievements, without guessing dates", () => {
  const result = normalizeHonours({ id: "1023", achievements: [{ title: "", count: 2, details: [{ season: { id: "1950", name: null }, competition: null }] }] }, "1023");
  expect(result[0]).toMatchObject({ title: "Título não identificado na fonte", count: 2, details: [{ season: { id: "1950", name: null } }] });
  expect(() => normalizeHonours({ id: "other", achievements: [] }, "1023")).toThrow("outro clube");
});
