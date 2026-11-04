import { describe, expect, it } from "vitest";
import { clubConfidence } from "./confidence";
import type { CareerSeason, SeasonFixture } from "./season";

const fixture = (round: number, homeScore: number, awayScore: number, overrides: Partial<SeasonFixture> = {}): SeasonFixture => ({
  id: `game-${round}`, competitionId: "league", competitionName: "Liga", type: "league", season: 2026,
  competitionRound: round, calendarRound: round, roundLabel: `${round}ª rodada`, homeClubId: "ours", home: "Clube", awayClubId: "other", away: "Rival", status: "played", homeScore, awayScore, ...overrides,
});
const season = (fixtures: SeasonFixture[]): CareerSeason => ({ version: 1, season: 2026, clubId: "ours", clubName: "Clube", division: "Sem divisão nacional", fixtures });

describe("club confidence", () => {
  it("starts neutral and reports unavailable if there is no season", () => {
    expect(clubConfidence(undefined)).toBeNull();
    expect(clubConfidence(season([]))).toEqual({ board: 50, fans: 50, matches: 0 });
  });
  it("uses actual played results and handles away matches and shootouts", () => {
    const games = [fixture(1, 2, 0), fixture(2, 1, 1), fixture(3, 1, 2, { homeClubId: "other", awayClubId: "ours" }), fixture(4, 0, 0, { type: "cup", winnerClubId: "other" })];
    expect(clubConfidence(season(games))).toEqual({ board: 65, fans: 69, matches: 4 });
  });
  it("ignores unrelated, incomplete and invalid scores, and fans use only five latest games", () => {
    const games = [fixture(1, 4, 0), ...[2, 3, 4, 5, 6].map((n) => fixture(n, 0, 1)), fixture(7, 7, 0, { status: "scheduled" }), fixture(8, 3, 0, { homeClubId: "third" }), fixture(9, -1, 0)];
    expect(clubConfidence(season(games.reverse()))).toEqual({ board: 40, fans: 25, matches: 6 });
  });
});
