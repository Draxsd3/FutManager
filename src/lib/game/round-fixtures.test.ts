import { expect, it } from "vitest";
import { createDefaultDatabase } from "./editor-data";
import { backgroundClubStrengths, roundFixtures } from "./round-fixtures";
import { backgroundFixtureScore, completeCareerFixture, type CareerSeason, type SeasonFixture } from "./season";

const database = createDefaultDatabase();
const teams = database.clubs.slice(0, 8);
const game = (id: string, index: number, overrides: Partial<SeasonFixture> = {}): SeasonFixture => ({
  id, season: 2026, competitionId: "league", competitionName: "Liga", type: "league", competitionRound: 1, calendarRound: 33,
  roundLabel: "1ª rodada", scheduledDate: "2026-02-02", homeClubId: teams[index].id, home: teams[index].name,
  awayClubId: teams[index + 1].id, away: teams[index + 1].name, status: "scheduled", ...overrides,
});
const human = game("human", 0);
const other = game("other", 2);
const late = game("late", 4, { scheduledDate: "2026-02-03", calendarRound: 34 });
const finished = game("finished", 6, { status: "played", homeScore: 3, awayScore: 1 });
const season: CareerSeason = { version: 1, season: 2026, clubId: human.homeClubId, clubName: human.home, division: "Série A", fixtures: [human, other, late, finished] };
const strengths = backgroundClubStrengths(database);
const input = { season, active: human, database, strengths, page: "matchOverview", minute: 0, userIsHome: true, homeScore: 1, awayScore: 2 };

it("advances simultaneous scores deterministically, without early results for other dates", () => {
  let previous = [0, 0];
  for (let minute = 0; minute <= 90; minute++) {
    const rows = roundFixtures({ ...input, minute });
    expect(rows[0]).toMatchObject({ homeScore: 1, awayScore: 2, live: true, managed: true });
    expect(rows[1]).toMatchObject({ live: true, managed: false, played: true });
    expect(rows[1].homeScore).toBeGreaterThanOrEqual(previous[0]);
    expect(rows[1].awayScore).toBeGreaterThanOrEqual(previous[1]);
    previous = [rows[1].homeScore, rows[1].awayScore];
    expect(rows[2]).toMatchObject({ live: false, played: false });
    expect(rows[3]).toMatchObject({ homeScore: 3, awayScore: 1, live: false, played: true });
    expect(roundFixtures({ ...input, minute })[1]).toEqual(rows[1]);
  }
  const complete = completeCareerFixture(season, human.id, { home: 1, away: 2 }, database);
  expect(complete.fixtures.find(f => f.id === other.id)).toMatchObject({ status: "played", homeScore: previous[0], awayScore: previous[1] });
  expect(complete.fixtures.find(f => f.id === late.id)?.status).toBe("scheduled");
  expect(backgroundFixtureScore(other, 90, strengths.get(other.homeClubId) ?? 65, strengths.get(other.awayClubId) ?? 65)).toEqual(previous);
  expect(roundFixtures({ ...input, season: complete, page: "result", minute: 90 })[1]).toMatchObject({ homeScore: previous[0], awayScore: previous[1], live: false });
});

it("keeps conditional games hidden as scheduled and maps the managed score correctly away", () => {
  const locked = { ...other, status: "locked" as const };
  const rows = roundFixtures({ ...input, season: { ...season, fixtures: [human, locked] }, userIsHome: false, minute: 45 });
  expect(rows[0]).toMatchObject({ homeScore: 2, awayScore: 1 });
  expect(rows[1]).toMatchObject({ live: false, played: false });
});
