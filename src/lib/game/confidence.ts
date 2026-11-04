import type { CareerSeason } from "./season";

/** Compact, saved results of the manager's time at each club. */
export type ConfidenceMatch = { id: string; clubId: string; season: number; round: number; competitionRound: number; points: 0 | 1 | 3 };
export type ClubConfidence = { board: number; fans: number; matches: number };

/** Import only actual completed fixtures; current fixtures replace duplicate saved records. */
export function mergeConfidenceHistory(history: ConfidenceMatch[], season: CareerSeason | null | undefined): ConfidenceMatch[] {
  const results = new Map(history.map((match) => [`${match.clubId}|${match.id}`, match]));
  if (!season?.clubId || !Array.isArray(season.fixtures)) return [...results.values()];
  for (const f of season.fixtures) {
    if (season.priorAppointmentFixtureIds?.includes(f.id) || f.status !== "played" || (f.homeClubId !== season.clubId && f.awayClubId !== season.clubId)
      || !Number.isInteger(f.homeScore) || f.homeScore! < 0 || !Number.isInteger(f.awayScore) || f.awayScore! < 0) continue;
    const home = f.homeClubId === season.clubId;
    const scored = home ? f.homeScore! : f.awayScore!;
    const conceded = home ? f.awayScore! : f.homeScore!;
    const points = scored === conceded && f.type === "cup" && f.winnerClubId
      ? (f.winnerClubId === season.clubId ? 3 : 0) : scored > conceded ? 3 : scored < conceded ? 0 : 1;
    results.set(`${season.clubId}|${f.id}`, { id: f.id, clubId: season.clubId, season: f.season, round: f.calendarRound, competitionRound: f.competitionRound, points });
  }
  return [...results.values()];
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));
/** Fans: 40% career results + 60% latest five. Board: 60% financial health + 40% fan confidence.
 * Financial health estimates cash runway against monthly payroll and, where known, change in cash since arrival.
 * These are game approximations, not accounting profit or a job-security system.
 */
export function clubConfidence(season: CareerSeason | null | undefined, history: ConfidenceMatch[], budget: number, monthlyPayroll: number, startBudget?: number): ClubConfidence | null {
  if (!season?.clubId || !Array.isArray(season.fixtures)) return null;
  const matches = mergeConfidenceHistory(history, season).filter((match) => match.clubId === season.clubId && [0, 1, 3].includes(match.points))
    .sort((a, b) => a.season - b.season || a.round - b.round || a.competitionRound - b.competitionRound || a.id.localeCompare(b.id));
  const score = (results: ConfidenceMatch[]) => results.length ? clamp(50 + (results.reduce((sum, item) => sum + item.points, 0) / results.length - 1) * 25) : 50;
  const fans = Math.round(score(matches) * .4 + score(matches.slice(-5)) * .6);
  const runway = !Number.isFinite(budget) ? 50 : budget <= 0 ? 0 : !Number.isFinite(monthlyPayroll) || monthlyPayroll <= 0 ? 50 : clamp(budget / monthlyPayroll / 6 * 100);
  const validBaseline = typeof startBudget === "number" && Number.isFinite(startBudget) && startBudget > 0 && Number.isFinite(budget);
  const change = validBaseline ? clamp(50 + (budget - startBudget) / startBudget * 50) : null;
  const financial = change === null ? runway : runway * .6 + change * .4;
  return { board: Math.round(financial * .6 + fans * .4), fans, matches: matches.length };
}
