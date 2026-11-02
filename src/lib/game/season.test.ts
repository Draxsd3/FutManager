import { describe, expect, it } from "vitest";
import { buildSquadFromDatabase, createDefaultDatabase } from "./editor-data";
import { buildRoundRobinGroups, completeCareerFixture, createCareerSeason, getCompetitionPlayerStats, getCompetitionStandings, nextCareerFixture, playerContributionsFromMatch } from "./season";

describe("calendário persistente de competições", () => {
  it("gera ida e volta sem repetição no mesmo mando e suporta Séries A–D", () => {
    const groups = buildRoundRobinGroups({
      clubs: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }, { id: "d", name: "D" }],
      season: 2026, competitionId: "league:test", competitionName: "Liga", type: "league", doubleRoundRobin: true,
    });
    const fixtures = groups.flatMap((group) => group.fixtures);
    expect(fixtures).toHaveLength(12);
    expect(new Set(fixtures.map((fixture) => fixture.id)).size).toBe(12);
    for (const left of ["a", "b", "c", "d"]) for (const right of ["a", "b", "c", "d"]) {
      if (left === right) continue;
      expect(fixtures.filter((fixture) => fixture.homeClubId === left && fixture.awayClubId === right)).toHaveLength(1);
    }
    const database = createDefaultDatabase();
    expect(new Set(database.clubs.map((club) => club.division))).toEqual(new Set(["Série A", "Série B", "Série C", "Série D"]));
  });

  it("acumula resultados reais e simulados de uma rodada, com classificação idempotente", () => {
    const database = createDefaultDatabase();
    const club = database.clubs.find((item) => item.name === "Flamengo")!;
    const season = createCareerSeason(database, club.id, 2026)!;
    const first = nextCareerFixture(season)!;
    expect(first.type).toBe("league");
    const completed = completeCareerFixture(season, first.id, { home: 2, away: 1 }, database);
    const repeated = completeCareerFixture(completed, first.id, { home: 2, away: 1 }, database);
    expect(repeated).toEqual(completed);
    const rows = getCompetitionStandings(completed.fixtures, first.competitionId);
    expect(rows.reduce((total, row) => total + row.played, 0)).toBe(4);
    expect(rows.find((row) => row.clubId === first.homeClubId)?.goalsFor).toBeGreaterThanOrEqual(2);
    expect(rows.reduce((total, row) => total + row.points, 0)).toBeGreaterThan(0);
    expect(completed.fixtures.filter((fixture) => fixture.competitionId === first.competitionId && fixture.competitionRound === first.competitionRound && fixture.status === "played")).toHaveLength(2);
  });

  it("registra estaduais, Copa do Brasil e autores de gols/assistências a partir das partidas concluídas", () => {
    const database = createDefaultDatabase();
    const club = database.clubs.find((item) => item.name === "Flamengo")!;
    const season = createCareerSeason(database, club.id, 2026)!;
    expect(season.state).toBe("Rio de Janeiro");
    expect(season.fixtures.some((fixture) => fixture.competitionId === "state:Rio de Janeiro")).toBe(true);
    expect(season.fixtures.some((fixture) => fixture.competitionId === "national:Copa do Brasil")).toBe(true);
    const leagueFixture = nextCareerFixture(season)!;
    const scorer = database.players.find((player) => player.clubId === club.id)!;
    const contribution = { playerId: scorer.id, playerName: scorer.name, clubId: club.id, goals: 1, assists: 1, rating: 8.1, minutes: 90 };
    const played = completeCareerFixture(season, leagueFixture.id, { home: 1, away: 0, playerContributions: [contribution] }, database);
    const stats = getCompetitionPlayerStats(played.fixtures, leagueFixture.competitionId);
    expect(stats.find((item) => item.playerId === scorer.id)).toMatchObject({ goals: 1, assists: 1, rating: 8.1, played: 1 });
    expect(played.fixtures.some((fixture) => fixture.type === "cup" && fixture.status === "scheduled")).toBe(true);
  });

  it("avança a chave da Copa só após vitória e cancela o caminho do clube após derrota", () => {
    const database = createDefaultDatabase();
    const club = database.clubs.find((item) => item.name === "Flamengo")!;
    const season = createCareerSeason(database, club.id, 2026)!;
    const firstTie = season.fixtures.find((fixture) => fixture.type === "cup" && fixture.status === "scheduled" && (fixture.homeClubId === club.id || fixture.awayClubId === club.id))!;
    const projectedNext = season.fixtures.find((fixture) => fixture.type === "cup" && fixture.competitionRound > firstTie.competitionRound && (fixture.homeClubId === club.id || fixture.awayClubId === club.id))!;
    expect(projectedNext.status).toBe("locked");
    const win = firstTie.homeClubId === club.id
      ? completeCareerFixture(season, firstTie.id, { home: 2, away: 0 }, database)
      : completeCareerFixture(season, firstTie.id, { home: 0, away: 2 }, database);
    expect(win.fixtures.find((fixture) => fixture.id === projectedNext.id)?.status).toBe("scheduled");
    const loss = firstTie.homeClubId === club.id
      ? completeCareerFixture(season, firstTie.id, { home: 0, away: 2 }, database)
      : completeCareerFixture(season, firstTie.id, { home: 2, away: 0 }, database);
    expect(loss.fixtures.find((fixture) => fixture.id === projectedNext.id)?.status).toBe("cancelled");
  });

  it("converts scorer and assister event IDs into stable database player records", () => {
    const database = createDefaultDatabase();
    const club = database.clubs.find((item) => item.name === "Flamengo")!;
    const squad = buildSquadFromDatabase(database, club.name)!;
    const scorer = squad[10], assister = squad[9];
    const contributions = playerContributionsFromMatch({
      database,
      clubId: club.id,
      squad,
      events: [{ scorerId: scorer.id, assistId: assister.id, scene: { team: "home" } }],
      participation: { [scorer.id]: { entered: 0 }, [assister.id]: { entered: 30 } },
      ratings: { [scorer.id]: 8.4, [assister.id]: 7.6 },
    });
    expect(contributions.find((item) => item.playerId === scorer.sourceId)).toMatchObject({ goals: 1, assists: 0, minutes: 90, rating: 8.4 });
    expect(contributions.find((item) => item.playerId === assister.sourceId)).toMatchObject({ goals: 0, assists: 1, minutes: 60, rating: 7.6 });
  });
});

it("does not manufacture a national league or cup entry for imported state-only clubs", async () => {
  const database = createDefaultDatabase();
  const extra = {...database.clubs[0],id:"state-only",name:"Clube só estadual",division:"Sem divisão nacional" as const};
  database.clubs.push(extra);
  const season = createCareerSeason(database,database.clubs[0].id,2026)!;
  expect(season.fixtures.some(f=>f.homeClubId===extra.id || f.awayClubId===extra.id)).toBe(false);
});
it("does not start an artificial 558-club national league for a state-only import",()=>{
 const database=createDefaultDatabase();
 database.clubs[0].division="Sem divisão nacional";
 expect(createCareerSeason(database,database.clubs[0].id,2026)).toBeNull();
});
