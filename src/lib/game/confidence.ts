import type { CareerSeason } from "./season";

export type ClubConfidence = { board: number; fans: number; matches: number };

/** A transparent, season-only estimate from completed fixtures, not a disciplinary/job-security system.
 * Both start at 50%. The board considers the whole season; fans consider the latest five matches.
 * A win, draw or defeat contributes 3, 1 or 0 points; cup shootouts decide a drawn tie.
 */
export function clubConfidence(season: CareerSeason | null | undefined): ClubConfidence | null {
  if (!season || !Array.isArray(season.fixtures) || !season.clubId) return null;
  const fixtures = season.fixtures.filter((fixture) => fixture.status === "played"
    && (fixture.homeClubId === season.clubId || fixture.awayClubId === season.clubId)
    && Number.isInteger(fixture.homeScore) && fixture.homeScore! >= 0
    && Number.isInteger(fixture.awayScore) && fixture.awayScore! >= 0)
    .sort((a, b) => a.calendarRound - b.calendarRound || a.competitionRound - b.competitionRound || a.id.localeCompare(b.id));
  const points = fixtures.map((fixture) => {
    const home = fixture.homeClubId === season.clubId;
    const forGoals = home ? fixture.homeScore! : fixture.awayScore!;
    const againstGoals = home ? fixture.awayScore! : fixture.homeScore!;
    if (forGoals === againstGoals && fixture.type === "cup" && fixture.winnerClubId) return fixture.winnerClubId === season.clubId ? 3 : 0;
    return forGoals > againstGoals ? 3 : forGoals < againstGoals ? 0 : 1;
  });
  const estimate = (results: number[], sensitivity: number) => results.length === 0 ? 50
    : Math.max(0, Math.min(100, Math.round(50 + (results.reduce((sum, value) => sum + value, 0) / results.length - 1) * sensitivity)));
  return { board: estimate(points, 20), fans: estimate(points.slice(-5), 25), matches: points.length };
}
