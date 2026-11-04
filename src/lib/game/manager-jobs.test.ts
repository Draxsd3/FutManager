import { describe, expect, it } from "vitest";
import { createDefaultDatabase, buildSquadFromDatabase, type CareerSave } from "./editor-data";
import { buildStartingXI } from "./mock-data";
import { acceptManagerJob, applyForManagerJob, availableManagerJobs, declineManagerJob, initializeCareerMarket, refreshJobOffers, updateCareerMarket } from "./manager-jobs";
import { createCareerSeason } from "./season";
import { mergeConfidenceHistory } from "./confidence";
import type { CareerProgress } from "./progress";

function setup() {
  const database = createDefaultDatabase();
  const club = database.clubs[0], target = database.clubs[1];
  target.coachName = "";
  target.level = club.level;
  const season = createCareerSeason(database, club.id, 2026)!;
  const squad = buildSquadFromDatabase(database, club.name, true)!;
  const market = initializeCareerMarket(database, season, "Técnico", 9000);
  market.clubs[target.id].budget = 4500;
  const progress = { page: "agenda", activeSaveId: "career", coach: "Técnico", club: club.name, division: club.division, round: 4, budget: 9000, formation: "4-3-3", style: "Equilibrado", marking: "Leve", focus: "Pelo meio", careerSquad: squad, starters: buildStartingXI("4-3-3", squad), playerCareers: {}, manualPositions: {}, trainingSessions: [], minute: 0, homeScore: 0, awayScore: 0, events: [], matchSpeed: 1, substitutionsLeft: 5, detailOpen: false, halftimeWaiting: false, matchRunning: false, competitionSeason: season, managerMarket: market, championHistory: [], managerAppointments: [{ clubId: club.id, club: club.name, startedOn: "2026-01-11" }] } satisfies CareerProgress;
  const save = { id: "career", name: "Original", managerName: "Técnico", clubId: club.id, clubName: club.name, division: club.division, round: 4, budget: 9000, inGameDate: "2026-03-10", updatedAt: "2026-01-11T12:00:00Z", progress } as CareerSave;
  return { database, club, target, season, market, save };
}

describe("central de empregos na carreira", () => {
  it("oferece só vagas brasileiras jogáveis e não substitui treinadores ocupados", () => {
    const { database, market, club, target } = setup();
    expect(availableManagerJobs(database, market, club.id).map(c => c.id)).toContain(target.id);
    market.clubs[target.id].coach = "Ocupado";
    expect(applyForManagerJob(market, database, club.id, target.id, "2026-03-10").error).toBeTruthy();
    market.clubs[target.id].coach = null;
    target.country = "Argentina";
    expect(availableManagerJobs(database, market, club.id)).not.toContain(target);
    target.country = "Brasil"; target.division = "Sem divisão nacional";
    expect(availableManagerJobs(database, market, club.id)).not.toContain(target);
  });
  it("gera resposta determinística, impede duplicatas e mantém o emprego até a confirmação", () => {
    const { database, market, club, target } = setup();
    const result = applyForManagerJob(market, database, club.id, target.id, "2026-03-10");
    expect(result.market.applications?.[0]).toMatchObject({ status: "offered", expiresOn: "2026-03-17" });
    expect(result.market.clubs[club.id].coach).toBe("Técnico");
    expect(result.market.clubs[target.id].coach).toBeNull();
    expect(market.applications).toBeUndefined();
    expect(applyForManagerJob(result.market, database, club.id, target.id, "2026-03-10").error).toBeTruthy();
    target.level = club.level + 8;
    expect(applyForManagerJob(market, database, club.id, target.id, "2026-03-10").market.applications?.[0].status).toBe("rejected");
  });
  it("recusa, expira e cancela propostas obsoletas sem trocar o clube", () => {
    const { database, market, club, target, save } = setup();
    const applied = applyForManagerJob(market, database, club.id, target.id, save.inGameDate).market;
    const id = applied.applications![0].id;
    expect(declineManagerJob(applied, id, save.inGameDate).applications?.[0].status).toBe("declined");
    expect(refreshJobOffers(applied, "2026-03-17").applications?.[0].status).toBe("offered");
    expect(refreshJobOffers(applied, "2026-03-18").applications?.[0].status).toBe("expired");
    const occupied = { ...applied, clubs: { ...applied.clubs, [target.id]: { ...applied.clubs[target.id], coach: "Outro" } } };
    expect(refreshJobOffers(occupied, save.inGameDate).applications?.[0].status).toBe("cancelled");
    expect(acceptManagerJob({ ...save, progress: { ...save.progress!, managerMarket: occupied } }, database, id).error).toBeTruthy();
  });
  it("troca no mesmo save sem levar dinheiro, jogadores, IDs pessoais ou resultados do antigo treinador", () => {
    const { database, market, club, target, save } = setup();
    const original = structuredClone(database);
    const applied = applyForManagerJob(market, database, club.id, target.id, save.inGameDate).market;
    save.progress!.managerMarket = applied;
    const result = acceptManagerJob(save, database, applied.applications![0].id).save!;
    expect(result.id).toBe(save.id);
    expect(result.clubId).toBe(target.id);
    expect(result.budget).toBe(4500);
    expect(result.inGameDate).toBe(save.inGameDate);
    expect(result.progress?.careerSquad?.every(p => database.players.find(source => source.id === p.sourceId)?.clubId === target.id)).toBe(true);
    expect(result.progress?.managerMarket?.clubs[club.id].coach).toBeNull();
    expect(result.progress?.managerMarket?.clubs[target.id].coach).toBe("Técnico");
    expect(result.progress?.managerMarket?.applications?.[0].status).toBe("accepted");
    expect(result.progress?.jobClubSnapshots?.[club.id].careerSquad).toEqual(save.progress!.careerSquad);
    expect(result.progress?.managerAppointments).toHaveLength(2);
    expect(result.progress?.championHistory).toEqual(save.progress!.championHistory);
    expect(mergeConfidenceHistory([], result.progress?.competitionSeason)).toEqual([]);
    expect(result.progress?.competitionSeason?.fixtures.filter(f => f.status === "scheduled" && f.scheduledDate).every(f => f.scheduledDate! >= save.inGameDate)).toBe(true);
    expect(database).toEqual(original);
    expect(save.clubId).toBe(club.id);
    expect(acceptManagerJob(result, database, applied.applications![0].id).error).toBeTruthy();
  });
  it("preserva resultados conhecidos e permite retorno ao clube com a economia e elenco daquele clube", () => {
    const { database, market, club, target, save } = setup();
    const known = save.progress!.competitionSeason!.fixtures.find(f => f.type === "league")!;
    Object.assign(known, { status: "played", homeScore: 4, awayScore: 2 });
    save.progress!.managerMarket = applyForManagerJob(market, database, club.id, target.id, save.inGameDate).market;
    const switched = acceptManagerJob(save, database, save.progress!.managerMarket.applications![0].id).save!;
    expect(switched.progress!.competitionSeason!.fixtures.find(f => f.id === known.id)).toEqual(known);
    const returnedOffer = applyForManagerJob(switched.progress!.managerMarket!, database, target.id, club.id, save.inGameDate).market;
    switched.progress!.managerMarket = returnedOffer;
    const returned = acceptManagerJob(switched, database, returnedOffer.applications![0].id).save!;
    expect(returned.clubId).toBe(club.id);
    expect(returned.budget).toBe(9000);
    expect(returned.progress!.careerSquad).toEqual(save.progress!.careerSquad);
    expect(returned.progress!.managerAppointments).toHaveLength(3);
  });
  it("não permite troca no meio da partida e rejeita elenco incompleto", () => {
    const { database, market, club, target, save } = setup();
    save.progress!.managerMarket = applyForManagerJob(market, database, club.id, target.id, save.inGameDate).market;
    const id = save.progress!.managerMarket.applications![0].id;
    save.progress!.page = "matchOverview";
    expect(acceptManagerJob(save, database, id).error).toMatch(/partida/);
    save.progress!.page = "agenda";
    database.players = database.players.filter(p => p.clubId !== target.id);
    expect(acceptManagerJob(save, database, id).error).toBeTruthy();
  });
  it("usa resultados concluídos para demissões da IA, uma vez só, sem demitir o usuário", () => {
    const { market, season, club, target } = setup();
    market.clubs[target.id].coach = "IA";
    const fixtures = Array.from({ length: 5 }, (_, i) => ({ ...season.fixtures[0], id: `defeat-${i}`, homeClubId: club.id, awayClubId: target.id, calendarRound: i + 1, competitionRound: i + 1, status: "played" as const, homeScore: 1, awayScore: 0 }));
    const playedSeason = { ...season, fixtures };
    const updated = updateCareerMarket(market, playedSeason, { clubId: club.id, budget: 8000, payroll: 300 }, "2026-03-10");
    expect(updated.clubs[target.id].coach).toBeNull();
    expect(updated.dismissals).toHaveLength(1);
    expect(updated.clubs[club.id].coach).toBe("Técnico");
    expect(updateCareerMarket(updated, playedSeason, { clubId: club.id, budget: 8000, payroll: 300 }, "2026-03-10")).toEqual(updated);
  });
});
