import { describe, expect, it } from "vitest";
import { applyBrazilianCalendar, brazilianCalendarPeriods, careerCalendarDate, formatCalendarDate } from "./brazilian-calendar";
import { createDefaultDatabase } from "./editor-data";
import { buildRoundRobinGroups, completeCareerFixture, createCareerSeason, nextCareerFixture, type CareerSeason, type SeasonFixture } from "./season";

function league(division: "Série A" | "Série B" | "Série C" | "Série D", clubs = 20, year = 2026): CareerSeason {
  const teams = Array.from({ length: clubs }, (_, index) => ({ id: String(index), name: `Clube ${index}` }));
  return { version: 1, season: year, clubId: "0", clubName: "Clube 0", division, fixtures: buildRoundRobinGroups({ clubs: teams, season: year, competitionId: `league:Brasil:${division}`, competitionName: division, type: "league", division, doubleRoundRobin: true }).flatMap(group => group.fixtures) };
}
const dates = (season: CareerSeason) => [...new Set(season.fixtures.flatMap(f => f.scheduledDate ? [f.scheduledDate] : []))].sort();

describe("calendário brasileiro", () => {
  it("agenda as 38 rodadas da A em 2026 com pausa doméstica e retorno em 22/07", () => {
    const season = applyBrazilianCalendar(league("Série A"));
    expect(season.calendarIssues).toEqual([]);
    expect(dates(season)).toHaveLength(38);
    expect(dates(season)[0]).toBe("2026-01-28");
    expect(dates(season).at(-1)).toBe("2026-12-02");
    expect(dates(season).filter(date => date < "2026-06-01")).toHaveLength(18);
    expect(dates(season).filter(date => date >= "2026-06-01" && date < "2026-07-22")).toEqual([]);
    expect(dates(season)[18]).toBe("2026-07-22");
  });
  it("não aplica a pausa da A à B, C ou D e respeita suas janelas", () => {
    for (const [division, start, end, count] of [
      ["Série B", "2026-03-21", "2026-11-14", 20],
      ["Série C", "2026-04-05", "2026-10-25", 20],
      ["Série D", "2026-04-04", "2026-09-13", 6],
    ] as const) {
      const season = applyBrazilianCalendar(league(division, count));
      expect(season.calendarIssues).toEqual([]);
      expect(dates(season)[0]).toBe(start);
      expect(dates(season).at(-1)).toBe(end);
      expect(dates(season).some(date => date >= "2026-06-01" && date <= "2026-07-19")).toBe(true);
    }
  });
  it("intercala competições sem duplicar jogos do mesmo clube e mantém três dias de intervalo", () => {
    const db = createDefaultDatabase();
    const season = createCareerSeason(db, db.clubs.find(c => c.name === "Flamengo")!.id, 2026)!;
    expect(season.calendarIssues).toEqual([]);
    expect(nextCareerFixture(season)?.type).toBe("state");
    for (const id of new Set(season.fixtures.flatMap(f => [f.homeClubId, f.awayClubId]))) {
      const games = season.fixtures.filter(f => [f.homeClubId, f.awayClubId].includes(id) && f.scheduledDate).sort((a, b) => a.scheduledDate!.localeCompare(b.scheduledDate!));
      for (let i = 1; i < games.length; i++) expect((Date.parse(games[i].scheduledDate!) - Date.parse(games[i - 1].scheduledDate!)) / 86400000).toBeGreaterThanOrEqual(3);
    }
    const cupFinal = season.fixtures.filter(f => f.type === "cup").sort((a, b) => b.competitionRound - a.competitionRound)[0];
    expect(cupFinal.scheduledDate).toBe("2026-12-06");
  });
  it("migra saves sem reconstruir partidas, perder resultados ou retroceder a data", () => {
    const original = league("Série B", 4);
    original.fixtures[0] = { ...original.fixtures[0], status: "played", homeScore: 3, awayScore: 2, playerContributions: [] };
    const snapshot = structuredClone(original);
    const migrated = applyBrazilianCalendar(original, "2026-06-01");
    expect(original).toEqual(snapshot);
    expect(migrated.fixtures[0]).toEqual(original.fixtures[0]);
    expect(migrated.fixtures.map(f => f.id)).toEqual(original.fixtures.map(f => f.id));
    expect(dates(migrated).every(date => date >= "2026-06-01")).toBe(true);
    expect(applyBrazilianCalendar(migrated, "2026-08-01")).toBe(migrated);
    expect(careerCalendarDate("2026-08-01", migrated, migrated.fixtures[1]) >= "2026-08-01").toBe(true);
  });
  it("avança para a data do próximo jogo, não sete dias, e conserva a data após o último", () => {
    const db = createDefaultDatabase(), original = createCareerSeason(db, db.clubs[0].id, 2026)!;
    const first = nextCareerFixture(original)!;
    const completed = completeCareerFixture(original, first.id, { home: 1, away: 0 }, db);
    const next = nextCareerFixture(completed)!;
    expect(careerCalendarDate(first.scheduledDate!, completed, next)).toBe(next.scheduledDate);
    expect(careerCalendarDate("2026-12-06", { ...completed, fixtures: [] }, null)).toBe("2026-12-06");
    expect(completed.fixtures.filter(f => f.status === "played").every(f => !f.scheduledDate || f.scheduledDate <= first.scheduledDate!)).toBe(true);
  });
  it("não inventa datas fora da janela quando o formato antigo excede a capacidade", () => {
    const season = applyBrazilianCalendar(league("Série D", 96));
    expect(season.calendarIssues).toEqual(["Série D"]);
    expect(season.fixtures.some(f => !f.scheduledDate)).toBe(true);
    expect(dates(season).every(d => d >= "2026-04-04" && d <= "2026-09-13")).toBe(true);
  });
  it("marca anos futuros como projeção, sem repetir a interrupção excepcional de 2026", () => {
    const season = applyBrazilianCalendar(league("Série A", 20, 2027));
    expect(season.fixtures.every(f => f.dateSource === "projection")).toBe(true);
    expect(dates(season).some(d => d >= "2027-06-01" && d <= "2027-07-19")).toBe(true);
    expect(formatCalendarDate("2026-07-22")).toBe("22/07/2026");
    expect(formatCalendarDate()).toBe("A definir");
    expect(brazilianCalendarPeriods(2026).find(p => p.name === "2ª janela de transferências")).toMatchObject({ start: "2026-07-20", end: "2026-09-11" });
  });
  it("não altera partidas já datadas e jogadas ao atualizar o calendário", () => {
    const original = league("Série B", 4);
    const fixture: SeasonFixture = { ...original.fixtures[0], status: "played", scheduledDate: "2026-04-01", homeScore: 1, awayScore: 0 };
    original.fixtures[0] = fixture;
    const migrated = applyBrazilianCalendar(original, "2026-04-01");
    expect(migrated.fixtures[0]).toEqual(fixture);
    expect(migrated.fixtures.filter(f => f.status !== "played" && [fixture.homeClubId, fixture.awayClubId].some(id => [f.homeClubId, f.awayClubId].includes(id))).every(f => !f.scheduledDate || f.scheduledDate >= "2026-04-04")).toBe(true);
  });
});

it("reagenda rodadas pendentes de um save antigo após a pausa da A sem bloquear as rodadas seguintes", () => {
  const season = applyBrazilianCalendar(league("Série A"), "2026-06-01");
  expect(season.calendarIssues).toEqual([]);
  expect(dates(season)).toHaveLength(38);
  expect(dates(season).every(date => date >= "2026-07-22" && date <= "2026-12-02")).toBe(true);
});
