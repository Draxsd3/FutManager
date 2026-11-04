import { describe, expect, it } from "vitest";
import { applyManagerFixture, appointManager, createManagerMarket } from "./manager-market";
import type { EditorDatabase } from "./editor-data";
import type { CareerSeason, SeasonFixture } from "./season";

const database = { clubs: [{ id: "a", coachName: "Ana" }, { id: "b", coachName: "Bia" }], players: [{ clubId: "a", salaryMonthlyBrl: 800000 }, { clubId: "b", salaryMonthlyBrl: 400000 }] } as EditorDatabase;
const season = { clubId: "a", season: 2026, fixtures: [] } as unknown as CareerSeason;
const game = (n: number, score = 0): SeasonFixture => ({ id: `match-${n}`, season: 2026, calendarRound: n, competitionRound: n, homeClubId: "a", awayClubId: "b", status: "played", homeScore: score, awayScore: 1, type: "league" } as SeasonFixture);

describe("manager market foundation", () => {
  it("simulates club finances and does not process a game twice", () => {
    const original = createManagerMarket(database, season);
    const next = applyManagerFixture(original, season, game(1));
    expect(next.clubs.a.budget).toBe(12575);
    expect(next.clubs.b.budget).toBe(12675);
    expect(applyManagerFixture(next, season, game(1))).toEqual(next);
    expect(original.clubs.a.history).toHaveLength(0);
  });
  it("dismisses either manager under the same low-confidence rules after five games", () => {
    let market = createManagerMarket(database, season);
    for (let i = 1; i <= 5; i++) market = applyManagerFixture(market, season, game(i));
    expect(market.clubs.a.coach).toBeNull();
    expect(market.clubs.b.coach).toBe("Bia");
    expect(market.dismissals).toHaveLength(1);
    expect(market.dismissals[0].fans).toBe(25);
    expect(appointManager(market, "b", "Outro")).toBeNull();
    const appointed = appointManager(market, "a", "Novo")!;
    expect(appointed.clubs.a.coach).toBe("Novo");
    expect(appointed.clubs.a.history).toHaveLength(0);
    expect(appointed.clubs.a.budget).toBe(market.clubs.a.budget);
  });
  it("uses the human club's real balance and payroll rather than simulated cash", () => {
    const market = applyManagerFixture(createManagerMarket(database, season), season, game(1), { clubId: "a", budget: 750, payroll: 123 });
    expect(market.clubs.a.budget).toBe(750);
    expect(market.clubs.a.payroll).toBe(123);
  });
  it("does not invent results from old saves", () => {
    const existing = { ...season, fixtures: [game(1)] };
    const market = createManagerMarket(database, existing);
    expect(applyManagerFixture(market, existing, game(1)).clubs.a.history).toHaveLength(0);
  });
});
