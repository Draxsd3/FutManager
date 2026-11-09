import { playerEligible } from "./simulation/players";
import { tacticalFixture } from "./simulation/tactical-fixture";
import { copyDiscipline } from "./simulation/matches";
import type { EditorDatabase } from "./editor-data";
import type { RoundFixture } from "./mock-data";
import { type CareerSeason, type SeasonFixture } from "./season";

/** Cache ratings once per catalog change, using the same average as the season engine. */
export function backgroundClubStrengths(database: EditorDatabase,date?:string,bans?:Map<string,number>): Map<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const player of database.players) {
    if (!playerEligible(player,date) || bans?.has(player.id)) continue;
    const old = totals.get(player.clubId) ?? { sum: 0, count: 0 };
    totals.set(player.clubId, { sum: old.sum + player.overall + (player.condition ? (player.energy-80)*.04+(player.condition.morale-50)*.03 : 0), count: old.count + 1 });
  }
  return new Map([...totals].map(([id, value]) => [id, value.sum / value.count]));
}

const forecasts=new WeakMap<EditorDatabase,WeakMap<CareerSeason,Map<string,SeasonFixture>>>();
function forecast(db:EditorDatabase,season:CareerSeason,f:SeasonFixture,minute:number):[number,number] {
 let seasons=forecasts.get(db);if(!seasons){seasons=new WeakMap();forecasts.set(db,seasons);}
 let fixtures=seasons.get(season);if(!fixtures){fixtures=new Map();seasons.set(season,fixtures);}
 let result=fixtures.get(f.id);if(!result){result=tacticalFixture(db,f,copyDiscipline(season));fixtures.set(f.id,result);}
 const goals=result.report!.goals.filter(g=>(g.minute ?? 90)<=minute);
 return [goals.filter(g=>g.clubId===f.homeClubId).length,goals.filter(g=>g.clubId===f.awayClubId).length];
}

/** Fixtures with a different/unknown day stay scheduled. Finished scores always come from the season. */
export function roundFixtures({ season, active, database, page, minute, userIsHome, homeScore, awayScore }: {
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
        ? forecast(database!,season,fixture,minute)
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
