import type { CareerSeason, SeasonFixture } from "./season";

/** CBF 2026 planning windows, NOT the official fixture list. Other years are projections. */
export const BRAZILIAN_CALENDAR_VERSION = 1;
export const BRAZILIAN_REFERENCE_SEASON = 2026;
export const BRAZILIAN_CALENDAR_SOURCES = [
  "https://www.cbf.com.br/a-cbf/noticias/informes/a/cbf-oficializa-datas-do-calendario-do-futebol-do-brasil-profissional-masculino-de-2026",
  "https://www.cbf.com.br/futebol-brasileiro/noticias/campeonato-brasileiro/a/cbf-divulga-documentos-tecnicos-do-brasileirao-da-serie-b-de-2026",
  "https://www.cbf.com.br/futebol-brasileiro/noticias/jogos/a/cbf-divulga-tabela-basica-plano-geral-de-acoes-e-regulamento-especifico-da-copa-do-brasil-2026",
] as const;

export function brazilianCalendarPeriods(year: number) {
  const date = (monthDay: string) => `${year}-${monthDay}`;
  return [
    { name: "Estaduais", start: date("01-11"), end: date("03-08") },
    { name: "Série A", start: date("01-28"), end: date("12-02") },
    { name: "Supercopa Rei", start: date("02-01"), end: date("02-01") },
    { name: "Copa do Brasil", start: date("02-18"), end: date("12-06") },
    { name: "Série B", start: date("03-21"), end: date("11-28") },
    { name: "Copa do Nordeste / Copa Verde / Copa Sul-Sudeste", start: date("03-25"), end: date("06-07") },
    { name: "Série C", start: date("04-05"), end: date("10-25") },
    { name: "Série D", start: date("04-04"), end: date("09-13") },
    { name: "1ª janela de transferências", start: date("01-05"), end: date("03-03") },
    { name: "2ª janela de transferências", start: date("07-20"), end: date("09-11") },
  ];
}

const DAY = 86_400_000;
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / DAY);
const isoDay = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
export function formatCalendarDate(date?: string): string {
  if (!date) return "A definir";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/** No match times exist yet: three full calendar days is a conservative recovery interval. */
export const MIN_CALENDAR_REST_DAYS = 3;

type Window = { start: number; end: number; target: number };
function windowFor(fixture: SeasonFixture, roundIndex: number, count: number): Window {
  const year = fixture.season;
  const day = (md: string) => dayNumber(`${year}-${md}`);
  const interpolate = (start: number, end: number, index: number, total: number) =>
    total <= 1 ? start : Math.round(start + (end - start) * index / (total - 1));
  let start: number, end: number, target: number;
  if (fixture.type === "cup") {
    // Align the existing simplified bracket from the final backwards, without inventing entries/legs.
    const phases = ["02-18", "02-25", "03-11", "03-18", "04-22", "08-01", "08-26", "11-01", "12-06"];
    const phase = Math.max(0, phases.length - count + roundIndex);
    start = day(phases[Math.min(phase, 8)]);
    end = day(phase < 4 ? ["02-19", "03-05", "03-12", "03-19"][phase] : phase === 4 ? "05-14" : phase === 5 ? "08-06" : phase === 6 ? "09-03" : phase === 7 ? "11-08" : "12-06");
    target = start;
  } else if (fixture.type === "state") {
    start = day("01-11"); end = day("03-08");
    target = interpolate(start, end, roundIndex, count);
  } else if (fixture.division === "Série A") {
    start = day("01-28"); end = day("12-02");
    // Reserve the domestic Série A interruption only in the World Cup year 2026.
    if (year === BRAZILIAN_REFERENCE_SEASON) {
      const before = Math.max(1, Math.round(count * 18 / 38));
      if (roundIndex < before) {
        end = day("05-31");
        target = interpolate(start, end, roundIndex, before);
      } else {
        start = day("07-22");
        target = interpolate(start, end, roundIndex - before, count - before);
      }
    } else target = interpolate(start, end, roundIndex, count);
  } else {
    const division = fixture.division;
    start = day(division === "Série B" ? "03-21" : division === "Série D" ? "04-04" : "04-05");
    end = day(division === "Série B" ? "11-14" : division === "Série D" ? "09-13" : "10-25");
    target = interpolate(start, end, roundIndex, count);
  }
  return { start, end, target };
}

/** Adds dates without rebuilding fixtures, modifying results, or granting entry to any tournament.
 * If a simplified/edited format cannot fit, keep it explicitly undated rather than inventing
 * matches outside the CBF period or scheduling the same club twice on one day.
 */
export function applyBrazilianCalendar(season: CareerSeason, notBefore?: string): CareerSeason {
  if (season.calendarVersion === BRAZILIAN_CALENDAR_VERSION) return season;
  const competitions = new Map<string, Map<number, SeasonFixture[]>>();
  for (const fixture of season.fixtures) {
    const rounds = competitions.get(fixture.competitionId) ?? new Map<number, SeasonFixture[]>();
    const group = rounds.get(fixture.competitionRound) ?? [];
    group.push(fixture);
    rounds.set(fixture.competitionRound, group);
    competitions.set(fixture.competitionId, rounds);
  }
  const groups = [...competitions.values()].flatMap(rounds => {
    const ordered = [...rounds.entries()].sort(([a], [b]) => a - b);
    return ordered.map(([, fixtures], index) => {
      const window = windowFor(fixtures[0], index, ordered.length);
      // An old save may reach the interruption with unplayed first-half rounds.
      // Reflow those rounds after the domestic restart instead of stranding the entire league.
      if (notBefore && fixtures[0].type === "league" && fixtures[0].division === "Série A" && season.season === 2026 && notBefore > "2026-05-31" && window.end <= dayNumber("2026-05-31")) {
        window.start = dayNumber("2026-07-22");
        window.end = dayNumber("2026-12-02");
        window.target = Math.max(window.start, dayNumber(notBefore));
      }
      return { fixtures, ...window };
    });
  }).sort((a, b) => a.target - b.target || a.fixtures[0].competitionId.localeCompare(b.fixtures[0].competitionId));
  const occupied = new Map<string, number[]>();
  const lastRound = new Map<string, number>();
  const dated = new Map<string, SeasonFixture>();
  const issues = new Set<string>();
  const yearStart = dayNumber(`${season.season}-01-01`);
  // Already played dates (when available) are immutable, including after a future version upgrade.
  for (const fixture of season.fixtures) {
    if (fixture.status !== "played" || !fixture.scheduledDate) continue;
    const day = dayNumber(fixture.scheduledDate);
    for (const id of [fixture.homeClubId, fixture.awayClubId]) occupied.set(id, [...(occupied.get(id) ?? []), day]);
  }
  for (const group of groups) {
    const pending = group.fixtures.filter(f => f.status !== "played" && f.status !== "cancelled");
    if (!pending.length) continue;
    const competitionId = pending[0].competitionId;
    const min = Math.max(group.start, notBefore ? dayNumber(notBefore) : group.start, (lastRound.get(competitionId) ?? -Infinity) + MIN_CALENDAR_REST_DAYS);
    const desired = Math.max(min, group.target);
    // Prefer the planned day; search closest alternatives inside the same competition window.
    const candidates = Array.from({ length: Math.max(0, group.end - min + 1) }, (_, i) => min + i)
      .sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired) || a - b);
    const clubs = new Set(pending.flatMap(f => [f.homeClubId, f.awayClubId]));
    const chosen = candidates.find(day => [...clubs].every(id => (occupied.get(id) ?? []).every(other => Math.abs(other - day) >= MIN_CALENDAR_REST_DAYS)));
    if (chosen === undefined) {
      issues.add(pending[0].competitionName);
      // Undated rounds must not be overtaken by later rounds of the same tournament.
      lastRound.set(competitionId, Infinity);
      continue;
    }
    lastRound.set(competitionId, chosen);
    for (const id of clubs) occupied.set(id, [...(occupied.get(id) ?? []), chosen]);
    for (const fixture of pending) dated.set(fixture.id, {
      ...fixture, scheduledDate: isoDay(chosen), calendarRound: chosen - yearStart + 1,
      dateSource: season.season === BRAZILIAN_REFERENCE_SEASON ? "cbf-window" : "projection",
    });
  }
  return {
    ...season, calendarVersion: BRAZILIAN_CALENDAR_VERSION,
    calendarIssues: [...issues],
    fixtures: season.fixtures.map(f => dated.get(f.id) ?? (f.status === "played" || f.status === "cancelled" ? f : {
      ...f, scheduledDate: undefined, dateSource: undefined, calendarRound: 1000 + f.calendarRound,
    })),
  };
}

/** Calendar progression is tied to fixtures, never to a fixed +7 days. Never rewind a legacy save. */
export function careerCalendarDate(current: string, season?: CareerSeason, next?: SeasonFixture | null): string {
  return [current, next?.scheduledDate, ...(season?.fixtures ?? []).filter(f => f.status === "played").map(f => f.scheduledDate)]
    .filter((value): value is string => Boolean(value)).sort().at(-1) ?? current;
}
