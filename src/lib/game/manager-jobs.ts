import { buildSquadFromDatabase, type CareerSave, type EditorDatabase } from "./editor-data";
import { buildStartingXI } from "./mock-data";
import { applyManagerFixture, appointManager, createManagerMarket, type ManagerMarket, type ManagerApplication } from "./manager-market";
import { advanceSeasonBeforeDate, createCareerSeason, nextCareerFixture, type CareerSeason } from "./season";
import type { CareerProgress } from "./progress";

/** Per-club state: numeric player IDs, money and tactics must not leak between teams. */
export type JobClubSnapshot = Pick<CareerProgress, "careerSquad" | "starters" | "playerCareers" | "manualPositions" | "trainingSessions" | "competitionSeason" | "formation" | "style" | "marking" | "focus" | "confidenceHistory" | "confidenceStartBudget">;
export type ManagerAppointment = { clubId: string; club: string; startedOn: string; endedOn?: string };

export function initializeCareerMarket(database: EditorDatabase, season: CareerSeason, coach: string, budget: number): ManagerMarket {
  const market = createManagerMarket(database, season);
  if (market.clubs[season.clubId]) market.clubs[season.clubId] = { ...market.clubs[season.clubId], coach, budget, startingBudget: budget };
  return market;
}

export function refreshJobOffers(market: ManagerMarket, date: string): ManagerMarket {
  let changed = false;
  const applications = (market.applications ?? []).map(application => {
    if (application.status !== "offered") return application;
    const club = market.clubs[application.clubId];
    const status: ManagerApplication["status"] | null = application.expiresOn < date ? "expired" : !club || club.coach !== null || (club.vacancyVersion ?? 0) !== application.vacancyVersion ? "cancelled" : null;
    if (!status) return application;
    changed = true;
    return { ...application, status, message: status === "expired" ? "O prazo da proposta terminou." : "A vaga não está mais disponível." };
  });
  return changed ? { ...market, applications } : market;
}

/** Only actual career results can create dismissals, never catalog rankings or fake vacancies.
 * Human dismissal/unemployment is not introduced here; the current career remains playable.
 */
export function updateCareerMarket(market: ManagerMarket, season: CareerSeason, human: { clubId: string; budget: number; payroll: number }, date: string): ManagerMarket {
  let next = market;
  for (const fixture of [...season.fixtures].filter(f => f.status === "played").sort((a, b) => a.calendarRound - b.calendarRound || a.id.localeCompare(b.id))) {
    next = applyManagerFixture(next, season, fixture, { ...human, allowDismissal: false });
  }
  return refreshJobOffers(next, date);
}

export function availableManagerJobs(database: EditorDatabase, market: ManagerMarket, currentClubId: string) {
  return database.clubs.filter(club => club.id !== currentClubId && club.country.toLocaleLowerCase("pt-BR") === "brasil" && club.division !== "Sem divisão nacional" && market.clubs[club.id]?.coach === null
    && (() => { const squad = buildSquadFromDatabase(database, club.name, true); return !!squad && squad.length >= 11 && squad.some(player => player.position === "G"); })())
    .sort((a, b) => a.division.localeCompare(b.division) || a.name.localeCompare(b.name, "pt-BR"));
}

export function applyForManagerJob(market: ManagerMarket, database: EditorDatabase, currentClubId: string, clubId: string, date: string): { market: ManagerMarket; error?: string } {
  const refreshed = refreshJobOffers(market, date);
  const target = availableManagerJobs(database, refreshed, currentClubId).find(club => club.id === clubId);
  const current = database.clubs.find(club => club.id === currentClubId);
  if (!target || !current) return { market: refreshed, error: "Esta vaga não está disponível." };
  const vacancyVersion = refreshed.clubs[clubId].vacancyVersion ?? 0;
  const id = `${clubId}:${vacancyVersion}`;
  if (refreshed.applications?.some(application => application.id === id)) return { market: refreshed, error: "Você já se candidatou a esta vaga." };
  const tenure = refreshed.clubs[currentClubId]?.history ?? [];
  const successful = tenure.length >= 5 && tenure.reduce((sum, game) => sum + game.points, 0) / tenure.length >= 2;
  const accepted = target.level <= current.level + (successful ? 4 : 2);
  const expiration = new Date(`${date}T12:00:00Z`); expiration.setUTCDate(expiration.getUTCDate() + 7);
  return { market: { ...refreshed, applications: [{ id, clubId, vacancyVersion, appliedOn: date, expiresOn: expiration.toISOString().slice(0, 10), status: accepted ? "offered" : "rejected",
    message: accepted ? "A diretoria aprovou sua candidatura. Confirme a mudança dentro do prazo." : "A diretoria procura mais experiência para o nível deste clube." }, ...(refreshed.applications ?? [])] } };
}

export function declineManagerJob(market: ManagerMarket, applicationId: string, date: string): ManagerMarket {
  const next = refreshJobOffers(market, date);
  return { ...next, applications: next.applications?.map(application => application.id === applicationId && application.status === "offered" ? { ...application, status: "declined", message: "Você recusou a proposta." } : application) };
}

/** Accept in the same save. Shared IDs preserve known results; other past results belong to AI.
 * Global catalog, other saves, and career honours remain untouched.
 */
export function acceptManagerJob(save: CareerSave, database: EditorDatabase, applicationId: string): { save?: CareerSave; error?: string } {
  const progress = save.progress;
  if (!progress?.managerMarket || !progress.competitionSeason || ["matchOverview", "result"].includes(progress.page)) return { error: "Conclua a partida antes de mudar de clube." };
  const market = refreshJobOffers(progress.managerMarket, save.inGameDate);
  if (!market.clubs[save.clubId]) return { error: "O mercado desta carreira precisa ser carregado novamente." };
  const offer = market.applications?.find(application => application.id === applicationId && application.status === "offered");
  if (!offer) return { error: "A proposta expirou ou não está mais disponível." };
  const target = availableManagerJobs(database, market, save.clubId).find(club => club.id === offer.clubId);
  if (!target) return { error: "O clube não possui uma vaga e um elenco disponíveis." };
  const appointment = appointManager(market, target.id, save.managerName);
  if (!appointment) return { error: "Não foi possível confirmar a contratação." };
  const oldSeason = progress.competitionSeason;
  const cached = progress.jobClubSnapshots?.[target.id];
  let season = cached?.competitionSeason?.season === oldSeason.season ? cached.competitionSeason : createCareerSeason(database, target.id, oldSeason.season);
  if (!season) return { error: "O clube não tem calendário jogável." };
  const results = new Map(Object.values(progress.jobClubSnapshots ?? {}).flatMap(snapshot => snapshot.competitionSeason?.fixtures ?? []).concat(oldSeason.fixtures).filter(f => f.status === "played").map(f => [f.id, f]));
  season = { ...season, fixtures: season.fixtures.map(f => results.get(f.id) ?? f) };
  season = advanceSeasonBeforeDate(season, save.inGameDate, database);
  season = { ...season, priorAppointmentFixtureIds: season.fixtures.filter(f => f.status === "played").map(f => f.id) };
  const squad = cached?.careerSquad ?? buildSquadFromDatabase(database, target.name, true);
  if (!squad || squad.length < 11 || !squad.some(player => player.position === "G")) return { error: "O elenco do clube está incompleto." };
  // Copy only club-scoped fields, never recursively nest full progress snapshots.
  const previous: JobClubSnapshot = { careerSquad: progress.careerSquad, starters: progress.starters, playerCareers: progress.playerCareers, manualPositions: progress.manualPositions, trainingSessions: progress.trainingSessions,
    competitionSeason: oldSeason, formation: progress.formation, style: progress.style, marking: progress.marking, focus: progress.focus, confidenceHistory: progress.confidenceHistory, confidenceStartBudget: progress.confidenceStartBudget };
  const oldClub = appointment.clubs[save.clubId];
  const clubs = { ...appointment.clubs, [save.clubId]: { ...oldClub, coach: null, budget: save.budget, vacancyVersion: (oldClub.vacancyVersion ?? 0) + 1 }, [target.id]: { ...appointment.clubs[target.id], processedFixtures: season.fixtures.filter(f => f.status === "played" && [f.homeClubId, f.awayClubId].includes(target.id)).map(f => f.id) } };
  const nextMarket: ManagerMarket = { ...appointment, clubs, applications: appointment.applications?.map(application => application.id === applicationId ? { ...application, status: "accepted", message: "Contratação confirmada." } : application.status === "offered" ? { ...application, status: "cancelled", message: "Você aceitou outra proposta." } : application) };
  const appointments = progress.managerAppointments ?? [{ clubId: save.clubId, club: save.clubName, startedOn: "Data não registrada" }];
  const nextProgress: CareerProgress = { ...progress, ...(cached ?? {}), managerMarket: nextMarket, jobClubSnapshots: { ...progress.jobClubSnapshots, [save.clubId]: previous },
    managerAppointments: [...appointments.map((item, index) => index === appointments.length - 1 ? { ...item, endedOn: save.inGameDate } : item), { clubId: target.id, club: target.name, startedOn: save.inGameDate }],
    club: target.name, division: target.division, budget: clubs[target.id].budget, careerSquad: squad, starters: cached?.starters ?? buildStartingXI("4-3-3", squad), playerCareers: cached?.playerCareers ?? {}, manualPositions: cached?.manualPositions ?? {}, trainingSessions: cached?.trainingSessions ?? [],
    formation: cached?.formation ?? "4-3-3", style: cached?.style ?? "Equilibrado", marking: cached?.marking ?? "Leve", focus: cached?.focus ?? "Pelo meio",
    competitionSeason: season, confidenceHistory: [], confidenceStartBudget: clubs[target.id].budget, activeFixtureId: nextCareerFixture(season)?.id,
    transferNegotiations: progress.transferNegotiations?.map(deal => deal.buyerClubId === save.clubId && (deal.status === "countered" || deal.status === "agreed") ? { ...deal, status: "rejected", message: "Negociação encerrada com a saída do treinador." } : deal),
    page: "hub", minute: 0, homeScore: 0, awayScore: 0, events: [], participation: {}, matchBenchIds: undefined, matchPreparation: undefined, detailOpen: false, matchRunning: false, halftimeWaiting: false, substitutionsLeft: 5 };
  return { save: { ...save, name: `${target.name} — ${save.managerName}`, clubId: target.id, clubName: target.name, division: target.division, budget: clubs[target.id].budget, playerCareers: nextProgress.playerCareers, manualPositions: nextProgress.manualPositions, progress: nextProgress, updatedAt: new Date().toISOString() } };
}
