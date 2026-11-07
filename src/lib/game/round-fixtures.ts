import type { EditorDatabase } from "./editor-data";
import type { RoundFixture } from "./mock-data";
import { backgroundFixtureScore, type CareerSeason, type SeasonFixture } from "./season";

/** Cache ratings once per catalog change, using the same average as the season engine. */
export function backgroundClubStrengths(database: EditorDatabase): Map<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const player of database.players) {
    if (player.registrationStatus === "pending") continue;
    const old = totals.get(player.clubId) ?? { sum: 0, count: 0 };
    totals.set(player.clubId, { sum: old.sum + player.overall, count: old.count + 1 });
  }
  return new Map([...totals].map(([id, value]) => [id, value.sum / value.count]));
}

/** Fixtures with a different/unknown day stay scheduled. Finished scores always come from the season. */
export function roundFixtures({ season, active, database, strengths, page, minute, userIsHome, homeScore, awayScore }: {
  season?: CareerSeason; active?: SeasonFixture | null; database: EditorDatabase | null;
  strengths: Map<string, number>; page: string; minute: number; userIsHome: boolean; homeScore: number; awayScore: number;
}): RoundFixture[] {
  if (!season || !active) return [];
  return season.fixtures
    .filter((fixture) => fixture.competitionId === active.competitionId && fixture.competitionRound === active.competitionRound && fixture.status !== "cancelled")
    .map((fixture) => {
      const current = fixture.id === active.id;
      const inMatch = page === "matchOverview";
      const sameDay = fixture.scheduledDate && active.scheduledDate
        ? fixture.scheduledDate === active.scheduledDate
        : !fixture.scheduledDate && !active.scheduledDate && fixture.calendarRound === active.calendarRound;
      const backgroundLive = !current && inMatch && fixture.status === "scheduled" && !!sameDay && !!database;
      const managedLive = current && inMatch;
      const hasManagedScore = current && (inMatch || page === "result");
      const [liveHome, liveAway] = backgroundLive
        ? backgroundFixtureScore(fixture, minute, strengths.get(fixture.homeClubId) ?? 65, strengths.get(fixture.awayClubId) ?? 65)
        : [fixture.homeScore ?? 0, fixture.awayScore ?? 0];
      return {
        stadium: database?.clubs.find((club) => club.id === fixture.homeClubId)?.stadiumName ?? "",
        attendance: 0, home: fixture.home, away: fixture.away,
        homeScore: hasManagedScore ? (userIsHome ? homeScore : awayScore) : liveHome,
        awayScore: hasManagedScore ? (userIsHome ? awayScore : homeScore) : liveAway,
        live: managedLive || backgroundLive, managed: current,
        played: fixture.status === "played" || hasManagedScore || backgroundLive,
      };
    });
}
