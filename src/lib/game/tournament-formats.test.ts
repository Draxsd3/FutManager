import { archiveChampionships } from "./honours";
import { describe, expect, it } from "vitest";
import { createDefaultDatabase, type EditorDatabase } from "./editor-data";
import { buildRegisteredTournament } from "./tournament-schedule";
import { SERIE_D_GROUPS_2026, STATE_FORMATS_2026 } from "./tournament-formats";
import { advanceTournaments, knockoutWinner } from "./tournament-progression";
import { createCareerSeason, completeCareerFixture, nextCareerFixture, getCompetitionStandings, upgradeUnplayedSeason, type CareerSeason } from "./season";

function databaseFor(groups: string[][], state?: string): EditorDatabase {
  const db = createDefaultDatabase(), template = db.clubs[0];
  return { ...db, clubs: groups.flat().map((name,i) => ({ ...template, id: `club-${i}`, name, state: state ?? "São Paulo", division: state ? "Sem divisão nacional" : "Série D" })) };
}

describe("regulamentos brasileiros 2026", () => {
  it("Série D: 16 grupos oficiais, 480 jogos, dez por clube, sem adversários de outro grupo", () => {
    const db = databaseFor(SERIE_D_GROUPS_2026);
    const built = buildRegisteredTournament(db, 2026, "league:Brasil:Série D", "Série D")!;
    expect(built.registration.incomplete).toEqual([]);
    expect(built.registration.groups).toHaveLength(16);
    const fixtures = built.fixtures.filter(f => f.stage === "groups");
    expect(fixtures).toHaveLength(480);
    expect(new Set(built.fixtures.map(f => f.id)).size).toBe(built.fixtures.length);
    for (const g of built.registration.groups) for (const id of g.clubIds) {
      expect(fixtures.filter(f => f.homeClubId === id)).toHaveLength(5);
      expect(fixtures.filter(f => f.awayClubId === id)).toHaveLength(5);
      expect(fixtures.filter(f => f.homeClubId === id || f.awayClubId === id).every(f => g.clubIds.includes(f.homeClubId) && g.clubIds.includes(f.awayClubId))).toBe(true);
    }
    expect(built.fixtures.filter(f => f.stage === "knockout" && f.knockoutStage === 0)).toHaveLength(64);
    expect(built.fixtures.filter(f => f.stage === "access-playoff")).toHaveLength(4);
  });

  for (const [state, rules] of Object.entries(STATE_FORMATS_2026)) it(`${state}: adversários e número de partidas da primeira fase`, () => {
    const db = databaseFor(rules.groups, state);
    const built = buildRegisteredTournament(db, 2026, `state:${state}`, state, state)!;
    expect(built).not.toBeNull();
    expect(built.registration.incomplete).toEqual([]);
    const fixtures = built.fixtures.filter(f => f.stage === "groups");
    const count = rules.pairing === "paulista" ? 8 : rules.pairing === "within" ? 4 : rules.groups.flat().length - rules.groups[0].length;
    expect(new Set(fixtures.map(f => f.competitionRound)).size).toBe(rules.pairing === "within" ? 5 : count);
    for (const club of db.clubs) {
      const games = fixtures.filter(f => [f.homeClubId,f.awayClubId].includes(club.id));
      expect(games).toHaveLength(count);
      expect(games.filter(f => f.homeClubId === club.id)).toHaveLength(count/2);
      expect(new Set(games.map(f => f.homeClubId === club.id ? f.awayClubId : f.homeClubId)).size).toBe(count);
      const group = built.registration.groups.find(g => g.clubIds.includes(club.id))!;
      if (rules.pairing !== "paulista") expect(games.every(f => group.clubIds.includes(f.homeClubId) && group.clubIds.includes(f.awayClubId))).toBe(rules.pairing === "within");
    }
  });

  it("apura os classificados reais, não soma mata-mata na tabela e só dá vencedor no agregado", () => {
    const db = databaseFor(SERIE_D_GROUPS_2026);
    const built = buildRegisteredTournament(db, 2026, "league:Brasil:Série D", "Série D")!;
    const season: CareerSeason = { version: 1, season: 2026, clubId: db.clubs[0].id, clubName: db.clubs[0].name, division: "Série D", tournaments: [built.registration], fixtures: built.fixtures.map(f => f.stage === "groups" ? { ...f, status: "played", homeScore: 1, awayScore: 0 } : f) };
    const advanced = advanceTournaments(season, db);
    const firstRound = advanced.fixtures.filter(f => f.knockoutStage === 0);
    expect(firstRound.every(f => f.status === "scheduled" && !f.homeClubId.startsWith("pending:"))).toBe(true);
    expect(getCompetitionStandings(advanced.fixtures, "league:Brasil:Série D")).toHaveLength(96);
    const [a,b] = firstRound.filter(f => f.tieIndex === 0);
    expect(knockoutWinner([{ ...a, status: "played", homeScore: 3, awayScore: 0 }, b])).toBeUndefined();
    expect(knockoutWinner([{ ...a, status: "played", homeScore: 3, awayScore: 0 }, { ...b, status: "played", homeScore: 1, awayScore: 0 }])).toBe(a.homeClubId);
  });
});

it("conclui a Série D sem campeão de tabela e registra seis acessos, inclusive depois da eliminação humana", () => {
  const db = databaseFor(SERIE_D_GROUPS_2026);
  let season = createCareerSeason(db, db.clubs[0].id, 2026)!;
  expect(season.tournaments?.find(t => t.competitionId === "league:Brasil:Série D")).toBeDefined();
  expect(season.fixtures.filter(f => f.competitionId === "league:Brasil:Série D").every(f => f.scheduledDate)).toBe(true);
  expect(archiveChampionships([], season, db, "Treinador")).toEqual([]);
  for (let safety = 0; safety < 100; safety++) {
    const next = nextCareerFixture(season) ?? season.fixtures.filter(f => f.status === "scheduled" && f.scheduledDate).sort((a,b) => a.calendarRound-b.calendarRound)[0];
    if (!next) break;
    // Lose the human club's fixtures, then let the remaining CPU stages finish.
    season = completeCareerFixture(season, next.id, { home: next.homeClubId === season.clubId ? 0 : 5, away: next.homeClubId === season.clubId ? 5 : 0 }, db);
  }
  const finals = season.fixtures.filter(f => f.competitionId === "league:Brasil:Série D" && f.knockoutStage === 5);
  expect(finals.every(f => f.status === "played")).toBe(true);
  expect(season.promotedClubIds).toHaveLength(6);
  expect(archiveChampionships([], season, db, "Treinador").find(h => h.competitionId === "league:Brasil:Série D")?.championId).toBe(knockoutWinner(finals));
});

for (const [state, rules] of Object.entries(STATE_FORMATS_2026)) it(`${state}: conclui todas as fases e arquiva apenas o campeão da final`, () => {
  const db = databaseFor(rules.groups, state);
  const built = buildRegisteredTournament(db, 2026, `state:${state}`, state, state)!;
  let season: CareerSeason = { version: 1, season: 2026, clubId: db.clubs[0].id, clubName: db.clubs[0].name, division: "Série A", tournaments: [built.registration], fixtures: built.fixtures };
  for (let pass = 0; pass < 10; pass++) {
    season = advanceTournaments({ ...season, fixtures: season.fixtures.map(f => f.status === "scheduled" ? { ...f, status: "played", homeScore: 1, awayScore: 0 } : f) }, db);
  }
  expect(season.fixtures.every(f => f.status === "played")).toBe(true);
  const archives = archiveChampionships([], season, db, "Treinador");
  expect(archives).toHaveLength(1);
  const final = season.fixtures.filter(f => f.knockoutStage === rules.legs.length - 1);
  expect(archives[0].championId).toBe(knockoutWinner(final));
  expect(archiveChampionships(archives, season, db, "Treinador")).toEqual(archives);
});

it("preserva resultados e universo de uma carreira antiga; migra somente antes da primeira partida", () => {
  const db = databaseFor(SERIE_D_GROUPS_2026);
  const fresh = createCareerSeason(db, db.clubs[0].id, 2026)!;
  const legacy = { ...fresh, tournaments: undefined };
  expect(upgradeUnplayedSeason(legacy, db).tournaments).toBeDefined();
  const played: CareerSeason = { ...legacy, fixtures: legacy.fixtures.map((f,i) => i ? f : { ...f, status: "played", homeScore: 2, awayScore: 1 }) };
  expect(upgradeUnplayedSeason(played, db)).toBe(played);
});

it("não inventa inscritos ausentes nem inclui automaticamente todos os clubes do estado", () => {
  const db = databaseFor(SERIE_D_GROUPS_2026);
  const absent = db.clubs.shift()!;
  const built = buildRegisteredTournament(db, 2026, "league:Brasil:Série D", "Série D")!;
  expect(built.registration.incomplete).toContain(absent.name);
  expect(built.fixtures.some(f => f.homeClubId === absent.id || f.awayClubId === absent.id)).toBe(false);
  const state = "São Paulo", rules = STATE_FORMATS_2026[state];
  const paulista = databaseFor(rules.groups, state);
  paulista.clubs.push({ ...paulista.clubs[0], id: "not-registered", name: "Clube Não Inscrito" });
  const stateGames = buildRegisteredTournament(paulista, 2026, `state:${state}`, state, state)!;
  expect(stateGames.fixtures.some(f => f.homeClubId === "not-registered" || f.awayClubId === "not-registered")).toBe(false);
});

it("Cearense: segunda fase zera os pontos e concede dois mandos aos líderes e ao melhor segundo", () => {
  const state = "Ceará", db = databaseFor(STATE_FORMATS_2026[state].groups,state);
  const built = buildRegisteredTournament(db,2026,`state:${state}`,state,state)!;
  const season: CareerSeason = { version: 1, season: 2026, clubId: db.clubs[0].id, clubName: db.clubs[0].name, division: "Série B", tournaments: [built.registration], fixtures: built.fixtures.map(f => f.stage === "groups" ? { ...f, status: "played", homeScore: 2, awayScore: 0 } : f) };
  const next = advanceTournaments(season,db);
  const games = next.fixtures.filter(f => f.stage === "second-groups");
  expect(games).toHaveLength(9);
  const ids = [...new Set(games.flatMap(f => [f.homeClubId,f.awayClubId]))];
  expect(ids.map(id => games.filter(f => f.homeClubId === id).length).sort()).toEqual([1,1,1,2,2,2]);
  expect(getCompetitionStandings(next.fixtures,`state:${state}`,undefined,"second-groups").every(r => r.points === 0 && r.played === 0)).toBe(true);
});
