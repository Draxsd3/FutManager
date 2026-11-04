import { describe, expect, it } from "vitest";
import { clubConfidence, mergeConfidenceHistory } from "./confidence";
import type { CareerSeason, SeasonFixture } from "./season";

const fixture = (round: number, homeScore: number, awayScore: number, overrides: Partial<SeasonFixture> = {}): SeasonFixture => ({
  id: `game-${round}`, competitionId: "league", competitionName: "Liga", type: "league", season: 2026,
  competitionRound: round, calendarRound: round, roundLabel: `${round}ª rodada`, homeClubId: "ours", home: "Clube", awayClubId: "other", away: "Rival", status: "played", homeScore, awayScore, ...overrides,
});
const season = (fixtures: SeasonFixture[]): CareerSeason => ({ version: 1, season: 2026, clubId: "ours", clubName: "Clube", division: "Sem divisão nacional", fixtures });

describe("club confidence", () => {
  it("handles missing history and starts supporters neutral", () => {
    expect(clubConfidence(undefined, [], 1000, 200)).toBeNull();
    expect(clubConfidence(season([]), [], 600, 200)!.fans).toBe(50);
  });
  it("weighs recent games more while preserving past seasons, without duplicates or other clubs", () => {
    const old = season([fixture(1, 3, 0, { id: "old", season: 2025 })]);
    const games = [2, 3, 4, 5, 6].map((n) => fixture(n, 0, 1));
    const history = mergeConfidenceHistory([], old);
    const result = clubConfidence(season(games), [...history, { ...history[0], id: "other", clubId: "other" }], 1000, 200)!;
    expect(result.matches).toBe(6);
    expect(result.fans).toBe(30);
    expect(mergeConfidenceHistory(history, old)).toHaveLength(1);
  });
  it("uses actual completed results, including away wins and cup shootouts", () => {
    const games = [fixture(1, 1, 2, { homeClubId: "other", awayClubId: "ours" }), fixture(2, 0, 0, { type: "cup", winnerClubId: "ours" }), fixture(3, 1, 0, { status: "scheduled" }), fixture(4, -1, 0)];
    const result = clubConfidence(season(games), [], 1000, 200)!;
    expect(result.matches).toBe(2); expect(result.fans).toBe(100);
  });
  it("changes board confidence with finances, but never changes supporter confidence", () => {
    const games = season([fixture(1, 1, 0)]);
    const strong = clubConfidence(games, [], 2400, 200, 1000)!;
    const weak = clubConfidence(games, [], 100, 200, 1000)!;
    expect(strong.fans).toBe(weak.fans);
    expect(strong.board).toBeGreaterThan(weak.board);
    expect(clubConfidence(games, [], 1000, 200)).not.toBeNull(); // old saves lack an opening balance
  });
});
