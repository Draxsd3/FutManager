import { describe, expect, it } from "vitest";
import { clubCrestAsset } from "./assets";
import { CANONICAL_TM_CLUB_TARGETS, NEW_2026_SERIE_D_SPECS, reconcileEditorDatabase } from "./club-reconciliation";
import { upgradeEditorDatabase, type CareerSave, type EditorClub, type EditorDatabase, type EditorPlayer } from "./editor-data";
import { createManagerMarket } from "./manager-market";
import { reconcileCareerSaveWithDatabase } from "./save-reconciliation";
import { createCareerSeason, getCompetitionStandings } from "./season";

function makeClub(partial: Partial<EditorClub> & Pick<EditorClub, "id" | "name" | "division">): EditorClub {
  return {
    shortName: partial.name.slice(0, 3).toUpperCase(),
    foundedYear: 1910,
    primaryColor: "#111111",
    secondaryColor: "#ffffff",
    stadiumName: "Estádio Base",
    stadiumCapacity: 20000,
    country: "Brasil",
    level: 16,
    coachName: "Técnico Base",
    kitStyle: "listrada",
    ...partial,
  };
}

function makePlayer(partial: Partial<EditorPlayer> & Pick<EditorPlayer, "id" | "clubId" | "name" | "primaryPosition">): EditorPlayer {
  return {
    marketStatus: "normal",
    shirtNumber: 1,
    secondaryPosition: null,
    overall: 76,
    age: 26,
    preferredFoot: "D",
    starRating: 3,
    qualityPrimary: "Passe",
    qualitySecondary: "Velocidade",
    energy: 100,
    salaryMonthlyBrl: 50000,
    marketValueBrl: 2000000,
    goals: 0,
    assists: 0,
    ownGoals: 0,
    averageRating: null,
    contractEndsOn: "2027-12-31",
    ...partial,
  };
}

describe("reconcileEditorDatabase & upgradeEditorDatabase", () => {
  it("merges crestless Transfermarkt duplicates into canonical clubs while keeping API rosters, loans and crests", () => {
    const canonicalGalo = makeClub({
      id: "canon-galo",
      name: "Atlético Mineiro",
      shortName: "CAM",
      division: "Série A",
      state: "Minas Gerais",
      primaryColor: "#000000",
      secondaryColor: "#ffffff",
      kitStyle: "listrada",
    });
    const duplicateGalo = makeClub({
      id: "dup-galo",
      name: "Clube Atlético Mineiro",
      shortName: "ATL",
      division: "Série A",
      state: "Minas Gerais",
      primaryColor: "#246e43",
      secondaryColor: "#ffffff",
      stadiumName: "Arena MRV",
      stadiumCapacity: 46000,
      coachName: "Cuca",
      kitStyle: "lisa",
      transfermarkt: { id: "330", collectedAt: "2026-11-04T15:48:14+00:00", season: "2026" },
    });
    const canonicalCeara = makeClub({
      id: "canon-ceara",
      name: "Ceará",
      shortName: "CSC",
      division: "Série B",
      state: "Ceará",
    });
    const duplicateCearaWrongState = makeClub({
      id: "dup-ceara",
      name: "Ceará Sporting Club",
      shortName: "CEA",
      division: "Série B",
      state: "Santa Catarina",
      coachName: "Léo Condé",
      transfermarkt: { id: "2029", collectedAt: "2026-11-04T15:48:14+00:00", season: "2026" },
    });

    const staleStaticPlayer = makePlayer({
      id: "stale-galo-1",
      clubId: "canon-galo",
      name: "Atleta Antigo 2025",
      primaryPosition: "G",
    });
    const apiGaloPlayer = makePlayer({
      id: "api-galo-1",
      clubId: "dup-galo",
      name: "Everson",
      primaryPosition: "G",
      transfermarkt: { id: "10001", collectedAt: "2026-11-04T15:48:14+00:00", season: "2026" },
    });
    const loanedPlayer = makePlayer({
      id: "api-ceara-1",
      clubId: "dup-ceara",
      name: "Atleta Emprestado",
      primaryPosition: "A",
      transfermarkt: { id: "10002", collectedAt: "2026-11-04T15:48:14+00:00", season: "2026" },
      loan: {
        owner: { externalId: "330", name: "Clube Atlético Mineiro", clubId: "dup-galo" },
        borrower: { externalId: "2029", name: "Ceará Sporting Club", clubId: "dup-ceara" },
        startsOn: "2026-01-01",
        endsOn: "2026-12-31",
        status: "active",
        source: "transfermarkt",
      },
    });

    const upgraded = upgradeEditorDatabase({
      clubs: [canonicalGalo, duplicateGalo, canonicalCeara, duplicateCearaWrongState],
      players: [staleStaticPlayer, apiGaloPlayer, loanedPlayer],
    });

    expect(upgraded.clubs).toHaveLength(2);
    const galo = upgraded.clubs.find((c) => c.id === "canon-galo")!;
    expect(galo).toMatchObject({
      name: "Atlético Mineiro",
      shortName: "CAM",
      primaryColor: "#000000",
      kitStyle: "listrada",
      stadiumName: "Arena MRV",
      stadiumCapacity: 46000,
      coachName: "Cuca",
      transfermarkt: { id: "330" },
    });
    expect(clubCrestAsset(galo.name)).toBeTruthy();

    const ceara = upgraded.clubs.find((c) => c.id === "canon-ceara")!;
    expect(ceara.state).toBe("Ceará");
    expect(ceara.transfermarkt?.id).toBe("2029");

    expect(upgraded.players.map((p) => p.id).sort()).toEqual(["api-ceara-1", "api-galo-1"]);
    expect(upgraded.players.find((p) => p.id === "api-galo-1")?.clubId).toBe("canon-galo");
    const loan = upgraded.players.find((p) => p.id === "api-ceara-1")?.loan;
    expect(loan?.owner.clubId).toBe("canon-galo");
    expect(loan?.borrower.clubId).toBe("canon-ceara");
  });

  it("normalizes all 8 new 2026 Série D clubs with distinct crests and states", () => {
    const rawClubs: EditorClub[] = Object.entries(NEW_2026_SERIE_D_SPECS).map(([tmId, spec]) =>
      makeClub({
        id: `new-${tmId}`,
        name: spec.rawNames[0],
        shortName: spec.rawNames[0].slice(0, 3).toUpperCase(),
        division: "Série D",
        state: undefined,
        primaryColor: "#246e43",
        secondaryColor: "#ffffff",
        transfermarkt: { id: tmId, collectedAt: "2026-11-04T15:48:14+00:00", season: "2026" },
      }),
    );

    const { database } = reconcileEditorDatabase({ clubs: rawClubs, players: [] });
    expect(database.clubs).toHaveLength(8);
    for (const club of database.clubs) {
      expect(club.state).toBeTruthy();
      expect(clubCrestAsset(club.name)).toBeTruthy();
    }
    // Primavera - MT must not collide with São Paulo's Primavera crest
    expect(clubCrestAsset("Primavera - MT")).not.toBe(clubCrestAsset("Primavera"));
    expect(Object.keys(CANONICAL_TM_CLUB_TARGETS)).toHaveLength(37);
  });
});

describe("reconcileCareerSaveWithDatabase", () => {
  it("rebuilds an unplayed round-1 season polluted by duplicate clubs into a clean 20-club table", () => {
    const serieANames = [
      "Athlético Paranaense", "Atlético Mineiro", "Bahia", "Botafogo", "Chapecoense",
      "Corinthians", "Coritiba", "Cruzeiro", "Flamengo", "Fluminense",
      "Grêmio", "Internacional", "Mirassol", "Palmeiras", "Red Bull Bragantino",
      "Remo", "Santos", "São Paulo", "Vasco da Gama", "Vitória",
    ];
    const cleanClubs = serieANames.map((name, i) =>
      makeClub({
        id: `canon-${i}`,
        name,
        division: "Série A",
        state: name === "Corinthians" || name === "Mirassol" || name === "Palmeiras" || name === "Santos" || name === "São Paulo" || name === "Red Bull Bragantino" ? "São Paulo" : "Minas Gerais",
      }),
    );
    const pollutedClubs = [
      ...cleanClubs,
      makeClub({ id: "dup-galo", name: "Clube Atlético Mineiro", division: "Série A", state: "Minas Gerais" }),
      makeClub({ id: "dup-mirassol", name: "Mirassol Futebol Clube (SP)", division: "Série A", state: "São Paulo" }),
    ];
    const players = pollutedClubs.flatMap((club) =>
      Array.from({ length: 11 }, (_, idx) =>
        makePlayer({
          id: `${club.id}-p-${idx}`,
          clubId: club.id,
          name: `Atleta ${idx}`,
          primaryPosition: idx === 0 ? "G" : "M",
        }),
      ),
    );

    const pollutedDb: EditorDatabase = { clubs: pollutedClubs, players };
    const cleanDb: EditorDatabase = {
      clubs: cleanClubs,
      players: players.filter((p) => cleanClubs.some((c) => c.id === p.clubId)),
    };

    const corinthians = cleanClubs.find((c) => c.name === "Corinthians")!;
    const pollutedSeason = createCareerSeason(pollutedDb, corinthians.id, 2026)!;
    expect(getCompetitionStandings(pollutedSeason.fixtures, "league:Brasil:Série A")).toHaveLength(22);

    const pollutedSave: CareerSave = {
      id: "save-renan-2",
      name: "Corinthians — Renan 2",
      managerName: "Renan",
      careerRuleset: "cbf-2026-reset-20261104",
      clubId: corinthians.id,
      clubName: "Corinthians",
      division: "Série A",
      round: 1,
      budget: 12624,
      inGameDate: "2026-01-11",
      updatedAt: "2026-11-05T15:14:22.528Z",
      progress: {
        page: "hub",
        activeSaveId: "save-renan-2",
        coach: "Renan",
        club: "Corinthians",
        division: "Série A",
        round: 1,
        budget: 12624,
        formation: "4-4-2",
        style: "Equilibrado",
        marking: "Zona",
        focus: "Centro",
        starters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        careerSquad: null,
        playerCareers: {},
        manualPositions: {},
        minute: 0,
        homeScore: 0,
        awayScore: 0,
        events: [],
        substitutionsLeft: 5,
        detailOpen: false,
        matchRunning: false,
        matchSpeed: 1,
        halftimeWaiting: false,
        competitionSeason: pollutedSeason,
        managerMarket: createManagerMarket(pollutedDb, pollutedSeason),
      },
    };

    const { save: repaired, changed } = reconcileCareerSaveWithDatabase(pollutedSave, cleanDb);
    expect(changed).toBe(true);
    const standings = getCompetitionStandings(
      repaired.progress!.competitionSeason!.fixtures,
      "league:Brasil:Série A",
    );
    expect(standings).toHaveLength(20);
    expect(standings.some((row) => row.club === "Clube Atlético Mineiro")).toBe(false);
    expect(standings.some((row) => row.club === "Mirassol Futebol Clube (SP)")).toBe(false);
    expect(standings.every((row) => Boolean(clubCrestAsset(row.club)))).toBe(true);
    expect(Object.keys(repaired.progress!.managerMarket!.clubs)).toHaveLength(20);

    // Regenerated database UUIDs (e.g. fresh importBrazilDatabase fallback) must not treat canonical club names as duplicates
    const regeneratedDb: EditorDatabase = {
      clubs: cleanClubs.map((club, index) => ({ ...club, id: `regen-${index}` })),
      players: [],
    };
    const rechecked = reconcileCareerSaveWithDatabase(repaired, regeneratedDb);
    expect(rechecked.changed).toBe(false);
    expect(
      getCompetitionStandings(rechecked.save.progress!.competitionSeason!.fixtures, "league:Brasil:Série A"),
    ).toHaveLength(20);
  });
});
