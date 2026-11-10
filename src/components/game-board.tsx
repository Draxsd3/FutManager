"use client";
import { MessagesScreen } from "./screens/messages-screen";
import { CareerHistoryBrowser } from "./ui/career-history-browser";
import { convertCareerMarketValues, convertDatabaseMarketValues, EUR_BRL_VERSION } from "@/lib/game/market-currency";
import { restartAfter } from "@/lib/game/simulation/restarts";
import { assertCpuState, coachMatchPlan, reviewCpu, startCpu, type CpuAthlete } from "@/lib/game/simulation/match-plans";
import { bannedForFixture, canMakeSubstitution, liveReport, substitutionAllowance } from "@/lib/game/simulation/matches";
import { migratePlayerSave, playerEligible, projectSquadCondition } from "@/lib/game/simulation/players";
import { trainCareerPlayers, promoteCareerYouth, playerCareAction, youthCohort } from "@/lib/game/simulation/player-commands";
import { coachCheckpoint, isUnemployed, migrateCoachSave } from "@/lib/game/simulation/coaches";
import { UnemploymentScreen } from "./screens/unemployment-screen";
import { reconcileContractSquad } from "@/lib/game/simulation/contract-squad";
import { applyCareerPlayerAction, extendCareerLoan, migrateFinanceSave, settleCareerTransfer, updateCareerNegotiation } from "@/lib/game/simulation/settlement";
import { advanceCareerWithMarketPolicy } from "@/lib/game/simulation/market-policy";
import { browserMarketProvider } from "@/lib/game/simulation/market-client";
import { setMarketMode } from "@/lib/game/simulation/market-settings";
import { EngineConflict, engineState as createEngineState, migrateEngineSave, type EngineState } from "@/lib/game/simulation/foundation";
import { publishLocalCheckpoint } from "@/lib/game/simulation/local-checkpoint";
import { worldDatabase, type WorldMarket } from "@/lib/game/world-market";

import { withTimeout } from "@/lib/with-timeout";
import { LoadingScreen } from "@/components/screens/loading-screen";
import { SettingsScreen } from "@/components/screens/settings-screen";
import { applyStructuralDatabaseUpdates, createCareerUniverseSnapshot } from "@/lib/game/career-universe";



import { newStadium, recordGate, setSectorPrice, startExpansion, type StadiumSector, type StadiumState } from "@/lib/game/stadium";
import { CURRENT_CAREER_RULESET, isCurrentCareerSave } from "@/lib/game/career-rules";
import { applyBrazilianCalendar, BRAZILIAN_REFERENCE_SEASON, careerCalendarDate, formatCalendarDate } from "@/lib/game/brazilian-calendar";
import { acceptManagerJob, applyForManagerJob, declineManagerJob, initializeCareerMarket, refreshJobOffers, updateCareerMarket, type JobClubSnapshot, type ManagerAppointment } from "@/lib/game/manager-jobs";
import type { ManagerMarket } from "@/lib/game/manager-market";
import { archiveChampionships, type ChampionshipRecord } from "@/lib/game/honours";
import { LoanManager } from "@/components/ui/loan-manager";
import { expireLoans, loanExpiryReminders, reconcileLoanSquad, recoverCareerLoans, type CareerLoans } from "@/lib/game/loans";

import { clubConfidence, mergeConfidenceHistory, type ConfidenceMatch } from "@/lib/game/confidence";


import { prepareLiveTransfermarktSync } from "@/lib/importer/transfermarkt-sync";

import { importBrazilDatabase } from "@/lib/importer/brazil-database";
import { readCachedDatabase, cacheDatabase, hasPendingDatabaseSync, readCachedCareerSaves, saveTransfermarktCheckpoint } from "@/lib/importer/database-cache";

import { useEffect, useMemo, useRef, useState } from "react";
import { CareerWorkspace } from "@/components/ui/career-workspace";
import { CompetitionCenter, type CareerCompetitionView } from "@/components/ui/competition-center";
import { buildCompetitionCatalog } from "@/lib/game/competitions";
import { competitionTrophyAsset } from "@/lib/game/competition-trophies";
import { CareerPlayerProfile } from "@/components/ui/career-player-profile";
import type { NavItem } from "@/components/ui/top-nav";
import { NewCareerScreen } from "@/components/screens/new-career-screen";
import { HubScreen } from "@/components/screens/hub-screen";
import { LineupScreen } from "@/components/screens/lineup-screen";
import { MatchOverviewScreen } from "@/components/screens/match-overview-screen";
import {
  MatchDetailScreen,
  type MatchEvent,
} from "@/components/screens/match-detail-screen";
import { ResultScreen } from "@/components/screens/result-screen";
import { StartMenuScreen } from "@/components/screens/start-menu-screen";
import { SavesScreen } from "@/components/screens/saves-screen";
import { EditorScreen } from "@/components/screens/editor-screen";
import { WorldScreens, historyOptions, type HistoryView } from "@/components/screens/world-screens";
import { proposeTransfer, type TransferNegotiation, type TransferNegotiationAction } from "@/lib/game/transfers";
import { ClubSectionScreen, type ClubSection } from "@/components/screens/club-section-screen";
import {
  squad as initialSquad,
  buildStartingXI,
  type DivisionKey,
  type TableRow,
  type TopScorer,
  type TopRating,
  type Player,
} from "@/lib/game/mock-data";
import { buildSquadFromDatabase, upgradeEditorDatabase, type CareerSave, type EditorDatabase } from "@/lib/game/editor-data";
import { createPlayerCareer, recordPlayerMatch, type MarketAction, type MatchParticipation, type ManualPosition, type PlayerCareerRecord } from "@/lib/game/career";
import { deployLineupPlayer } from "@/lib/game/lineup";
import { mergeCareerSaves } from "@/lib/game/save-utils";
import {
  isMenuPage,
  readActiveCareerSession,
  resumableCareerPage,
  writeActiveCareerSession,
} from "@/lib/game/session";
import { agendaOptions, type AgendaView } from "@/components/screens/agenda-screen";
import { type YouthTeam } from "@/lib/game/youth";

import type { CareerProgress, MatchPreparation } from "@/lib/game/progress";
import { type TrainingSessionInput, type TrainingSessionRecord } from "@/lib/game/training";
import { calculateMatchStatistics, calculatePlayerRatings, createMatchWeather, createMinuteRandom, matchEnergyAfter, resolveMatchPlayerRole, seededRandom, simulateAction } from "@/lib/game/live-match";
import { completeCareerFixture, createCareerSeason, upgradeUnplayedSeason, getCompetitionPlayerStats, getCompetitionStandings, nextCareerFixture, playerContributionsFromMatch, type CareerSeason } from "@/lib/game/season";
import { reconcileCareerSaveWithDatabase } from "@/lib/game/save-reconciliation";
import { backgroundClubStrengths, roundFixtures } from "@/lib/game/round-fixtures";
import { loadMatchRules, type MatchRules } from "@/lib/game/match-rules";
import { visualFormation } from "@/lib/game/live-positioning";
import {
  deleteCloudSave,
  readCloudDatabase,
  readCloudCareer,
  readCloudSaves,
  readLocalDatabase,
  readLocalSaves,
  writeCloudDatabase,
  writeCloudSave,
  writeLocalDatabase,
  writeLocalSaves,
} from "@/lib/game/persistence";

type Page = "menu" | "new" | "saves" | "editor" | "hub" | "lineup" | "matchOverview" | "result" | "agenda" | "stadium" | "juniors" | "teams" | "search" | "coaches" | "history" | "finances" | "trophies" | "training" | "settings" | "messages";

const sectionByPage: Partial<Record<Page, ClubSection>> = {
  agenda: "agenda",
  stadium: "stadium",
  juniors: "juniors",
  teams: "teams",
  search: "search",
  coaches: "coaches",
  history: "history",
  finances: "finances",
  trophies: "trophies",
  training: "training",
};

export function GameBoard({ userId, email, onSignOut, initialPage = "menu" }: { userId: string; email: string; onSignOut: () => Promise<void>; initialPage?: "menu" | "new" | "saves" | "editor" }) {
  const [agendaView, setAgendaView] = useState<AgendaView>("matches");
  const [page, setPage] = useState<Page>(initialPage);
  const [database, setDatabase] = useState<EditorDatabase | null>(null);
  const [saves, setSaves] = useState<CareerSave[]>([]);
  const [activeSaveId, setActiveSaveId] = useState<string | null>(null);
  const [hydrationError, setHydrationError] = useState(false);
  const [hydrationDone, setHydrationDone] = useState(false);
  const [careerLoaded, setCareerLoaded] = useState(false);
  const savesRef = useRef(saves);
  const pendingCloudSave = useRef<CareerSave | null>(null);
  useEffect(() => { savesRef.current = saves; }, [saves]);
  const sessionRestoreVersion = useRef(0);
  const sessionRestoreAttempted = useRef(false);
  const [syncLabel, setSyncLabel] = useState("Preparando banco de dados...");
  const [coach, setCoach] = useState("");
  const [division, setDivision] = useState<DivisionKey>("Série A");
  const [club, setClub] = useState<string>("Flamengo");
  const databaseRevision = useRef(0);
  const synchronizedCatalog = useRef<EditorDatabase | null>(null);
  const transfermarktSyncRunning = useRef(false);
  const universeSnapshot = useRef<EditorDatabase | undefined>(undefined);
  const [round, setRound] = useState(1);
  const [budget, setBudget] = useState(12624);
  const [stadiums, setStadiums] = useState<Record<string, StadiumState>>({});
  const stadiumsRef = useRef(stadiums);
  const budgetRef = useRef(budget);
  useEffect(() => { stadiumsRef.current = stadiums; }, [stadiums]);
  useEffect(() => { budgetRef.current = budget; }, [budget]);
  const [careerSquad, setCareerSquad] = useState<typeof initialSquad | null>(null);

  const [kit, setKit] = useState<1 | 2 | 3>(1);
  const [formation, setFormation] = useState("4-3-3");
  const [style, setStyle] = useState("Equilibrado");
  const [marking, setMarking] = useState("Leve");
  const [focus, setFocus] = useState("Pelo meio");

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      await Promise.resolve();
      if (cancelled) return;
      const pendingDatabaseSync = await withTimeout(hasPendingDatabaseSync(userId), 2500).catch(() => false);
      const localDatabase = convertDatabaseMarketValues(upgradeEditorDatabase(await withTimeout(readCachedDatabase(userId), 2500).catch(() => null) ?? readLocalDatabase(userId) ?? (await (await import("@/lib/importer/november-database")).applyNovemberDatabase(await importBrazilDatabase(), { recalibrateOveralls: true })).database));
      if (cancelled) return;
      const cachedSaves = await withTimeout(readCachedCareerSaves(userId), 2500).catch(() => null) ?? [];
      const localSaves = mergeCareerSaves(readLocalSaves(userId),cachedSaves)
        .map((save) => {
          const originalSnapshot = save.progress?.universeSnapshot ?? cachedSaves.find(old=>old.id===save.id)?.progress?.universeSnapshot ?? createCareerUniverseSnapshot(localDatabase);
          const converted = convertCareerMarketValues(save, originalSnapshot);
          const snapshot = converted.progress?.universeSnapshot ?? originalSnapshot;
          const reconciled = reconcileCareerSaveWithDatabase(converted, snapshot).save;
          return reconciled.progress ? { ...reconciled, progress: { ...reconciled.progress, universeSnapshot: snapshot } } : reconciled;
        });
      // Replace both account-local stores even offline; the reset is not a recurring wipe.
      writeLocalSaves(localSaves, userId);
      const sessionId = readActiveCareerSession(userId);
      if (sessionId && !localSaves.some(save => save.id === sessionId)) writeActiveCareerSession(userId, null);
      if (cancelled) return;
      savesRef.current = localSaves;
      setDatabase(localDatabase);
      setSaves(localSaves);
      writeLocalDatabase(localDatabase, userId);
      await withTimeout(cacheDatabase(localDatabase, userId), 2500).catch(() => undefined);
      setSyncLabel("Dados locais carregados");

      try {
        const [cloudDatabase, cloudSaves] = await withTimeout(Promise.all([readCloudDatabase(userId), readCloudSaves(userId)]), 12000);
        if (cancelled) return;
        let effectiveDatabase = localDatabase;
        let catalogUpload: Promise<boolean> | undefined;
        if (databaseRevision.current > 0) {
          // A deliberate editor import/edit supersedes the hydration snapshot. Its own write is queued.
        } else if (cloudDatabase && !pendingDatabaseSync) {
          const upgraded = upgradeEditorDatabase(cloudDatabase);
          const upgradedCloudDatabase = convertDatabaseMarketValues(upgraded);
          effectiveDatabase = upgradedCloudDatabase;
          setDatabase(upgradedCloudDatabase);
          writeLocalDatabase(upgradedCloudDatabase, userId);
          await withTimeout(cacheDatabase(upgradedCloudDatabase, userId, false), 2500).catch(() => undefined);
          if (upgradedCloudDatabase !== upgraded || upgradedCloudDatabase.clubs.length !== cloudDatabase.clubs.length) {
            catalogUpload = withTimeout(writeCloudDatabase(upgradedCloudDatabase, userId), 8000).then(() => true, () => false);
          }
        } else {
          catalogUpload = withTimeout(writeCloudDatabase(localDatabase, userId), 8000).then(() => true, () => false);
        }
        const reconciledSaveIds = new Set<string>();
        const merged = mergeCareerSaves(localSaves, cloudSaves).map((save) => {
          const originalSnapshot = save.progress?.universeSnapshot ?? createCareerUniverseSnapshot(effectiveDatabase);
          const converted = convertCareerMarketValues(save, originalSnapshot);
          const snapshot = converted.progress?.universeSnapshot ?? originalSnapshot;
          const reconciled = reconcileCareerSaveWithDatabase(converted, snapshot);
          if (reconciled.save.progress) reconciled.save = { ...reconciled.save, progress: { ...reconciled.save.progress, universeSnapshot: snapshot } };
          if (converted !== save || reconciled.changed || (save.progress && !save.progress.universeSnapshot) || (save.progress?.marketValueFxVersion === EUR_BRL_VERSION && cloudSaves.some(cloud => cloud.id === save.id && cloud.progress?.marketValueFxVersion !== EUR_BRL_VERSION))) {
            reconciledSaveIds.add(save.id);
            return { ...reconciled.save, updatedAt: new Date().toISOString() };
          }
          return save;
        });
        if (cancelled) return;
        savesRef.current = merged;
        setSaves(merged);
        writeLocalSaves(merged, userId);
        if (!cancelled) setHydrationDone(true);
        if (catalogUpload) {
          const uploaded = await catalogUpload;
          if (cancelled) return;
          if (!uploaded) throw new Error("Catálogo salvo localmente; sincronização pendente.");
          await withTimeout(cacheDatabase(effectiveDatabase, userId, false), 2500).catch(() => undefined);
        }
        await Promise.all(merged.filter((save) => reconciledSaveIds.has(save.id) || !cloudSaves.some((cloud) => cloud.id === save.id && cloud.updatedAt >= save.updatedAt))
          .map((save) => writeCloudSave(save, userId)));
        setSyncLabel("Supabase conectado");
      } catch {
        setSyncLabel("Modo local — Supabase indisponível");
      } finally {
        if (!cancelled) setHydrationDone(true);
      }
    }
    void hydrate().catch(() => {
      if (!cancelled) setHydrationError(true);
    });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!hydrationDone || sessionRestoreAttempted.current) return;
    sessionRestoreAttempted.current = true;
    const resumeId = readActiveCareerSession(userId);
    const resumeSave = resumeId ? savesRef.current.find((save) => save.id === resumeId) : undefined;
    if (resumeSave?.progress) void loadCareer(resumeSave);
    else if (resumeId) writeActiveCareerSession(userId, null);
    // Restoration is intentionally one-shot per mount; hydration triggers it after the latest save list is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrationDone, userId]);

  const baseSquad = useMemo(() => {
    if (!database) return initialSquad;
    return buildSquadFromDatabase(database, club, true) ?? initialSquad;
  }, [database, club]);
  const squad = careerSquad ?? baseSquad;
  const [starters, setStarters] = useState<number[]>(() =>
    buildStartingXI("4-3-3", squad),
  );
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<number | null>(null);
  const [playerCareers, setPlayerCareers] = useState<Record<number, PlayerCareerRecord>>({});
  const [messageReadIds, setMessageReadIds] = useState<string[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSessionRecord[]>([]);
  const [manualPositions, setManualPositions] = useState<Record<number, ManualPosition>>({});
  const [championHistory, setChampionHistory] = useState<ChampionshipRecord[]>([]);
  const [competitionSeason, setCompetitionSeason] = useState<CareerSeason | undefined>();
  const [managerMarket, setManagerMarket] = useState<ManagerMarket | undefined>();
  const [jobClubSnapshots, setJobClubSnapshots] = useState<Record<string, JobClubSnapshot>>({});
  const [managerAppointments, setManagerAppointments] = useState<ManagerAppointment[]>([]);
  const [confidenceHistory, setConfidenceHistory] = useState<ConfidenceMatch[]>([]);
  const [confidenceStartBudget, setConfidenceStartBudget] = useState<number | undefined>();
  const [activeFixtureId, setActiveFixtureId] = useState<string>();
  const advancing = useRef(false);
  const [engine, setEngine] = useState<EngineState | undefined>();
  const [advanceError, setAdvanceError] = useState("");
  const [worldMarket, setWorldMarket] = useState<WorldMarket | undefined>();
  const [transferNegotiations, setTransferNegotiations] = useState<TransferNegotiation[]>([]);
  const [loanContracts, setLoanContracts] = useState<CareerLoans>({});
  const [youthTeams, setYouthTeams] = useState<Record<string, YouthTeam>>({});
  const [loansOpen, setLoansOpen] = useState(false);
  const careerDatabase = useMemo(() => database ? worldDatabase(database, transferNegotiations, loanContracts, worldMarket, managerMarket?.finance,managerMarket?.staff) : null, [database, transferNegotiations, loanContracts, worldMarket, managerMarket?.finance,managerMarket?.staff]);

  const [minute, setMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [matchBenchIds, setMatchBenchIds] = useState<number[] | undefined>();
  const [participation, setParticipation] = useState<MatchParticipation>({});
  const [substitutionsLeft, setSubstitutionsLeft] = useState(5);
  const [detailOpen, setDetailOpen] = useState(false);
  const [matchRunning, setMatchRunning] = useState(false);
  const [defaultMatchSpeed, setDefaultMatchSpeed] = useState<1 | 2 | 4>(1);
  const [historyView, setHistoryView] = useState<HistoryView>("players");
  const [matchSpeed, setMatchSpeed] = useState<1 | 2 | 4>(1);
  const [halftimeWaiting, setHalftimeWaiting] = useState(false);
  const [matchPreparation, setMatchPreparation] = useState<MatchPreparation | null>(null);
  const [matchRulesLoading, setMatchRulesLoading] = useState(false);
  const [matchRulesError, setMatchRulesError] = useState<string | null>(null);
  const matchRulesLoadInProgress = useRef(false);
  const [substitutionOut, setSubstitutionOut] = useState<number | null>(null);
  const [standingsOpen, setStandingsOpen] = useState(false);

  const progress: CareerProgress = {
    // Preserve additive archive/migration metadata not owned by a React control.
    ...saves.find(save=>save.id===activeSaveId)?.progress,
    messageReadIds, universeSnapshot: universeSnapshot.current, page, matchPreparation: matchPreparation ?? undefined, activeSaveId, coach, club, division, round, budget, kit, formation, style, marking, focus,
    starters, careerSquad: squad, playerCareers, trainingSessions, manualPositions, minute, homeScore, awayScore,
    events, participation, matchBenchIds, substitutionsLeft, detailOpen, matchRunning: false, matchSpeed, defaultMatchSpeed, halftimeWaiting,
    stadiums, managerMarket, engine, worldMarket, jobClubSnapshots, managerAppointments, youthTeams, competitionSeason, confidenceHistory: mergeConfidenceHistory(confidenceHistory, competitionSeason), confidenceStartBudget, activeFixtureId, transferNegotiations, loanContracts, championHistory,

  };
  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; });

  // Persist each career independently. Never use a global session to reopen the game.
  useEffect(() => {
    if (!hydrationDone || !careerLoaded || !activeSaveId || isMenuPage(page)) return;
    const current = savesRef.current.find((save) => save.id === activeSaveId);
    if (!current) return;
    const next = { ...current, round, budget, playerCareers, manualPositions,
      progress: progressRef.current, updatedAt: new Date().toISOString() };
    const nextSaves = [next, ...savesRef.current.filter((save) => save.id !== activeSaveId)];
    savesRef.current = nextSaves;
    writeLocalSaves(nextSaves, userId);
    setSaves(nextSaves);
    pendingCloudSave.current = next;
  }, [hydrationDone, careerLoaded, activeSaveId, page, round, budget, kit, formation, style, marking, focus,
    starters, careerSquad, playerCareers, trainingSessions, manualPositions, minute, homeScore, awayScore, events,
    participation, matchBenchIds, substitutionsLeft, detailOpen, matchSpeed, defaultMatchSpeed, halftimeWaiting, matchPreparation, competitionSeason, confidenceHistory, confidenceStartBudget, activeFixtureId, transferNegotiations, loanContracts, championHistory, managerMarket, engine, jobClubSnapshots, managerAppointments, youthTeams, stadiums, messageReadIds, userId]);


  useEffect(() => {
    if (!hydrationDone) return;
    if (careerLoaded && activeSaveId && !isMenuPage(page)) {
      writeActiveCareerSession(userId, activeSaveId);
    }
  }, [hydrationDone, careerLoaded, activeSaveId, page, userId]);

  useEffect(() => {
    // Throttle rather than debounce: a running match changes faster than one second.
    const timer = window.setInterval(() => {
      const next = pendingCloudSave.current;
      if (!next) return;
      pendingCloudSave.current = null;
      void writeCloudSave(next, userId).then(() => setSyncLabel("Carreira salva na sua conta"))
        .catch((error) => {
          if (error instanceof EngineConflict) { setSyncLabel(error.message); return; }
          const latest = savesRef.current.find((save) => save.id === next.id);
          if (latest?.updatedAt === next.updatedAt) pendingCloudSave.current ??= next;
          setSyncLabel("Sincronização pendente — verifique sua conexão");
        });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [userId]);

  const divisionClubNames = useMemo(() => database?.clubs.filter((item) => item.country.toLocaleLowerCase("pt-BR") === "brasil" && item.division === division).map((item) => item.name) ?? [], [database, division]);
  const managementDatabase = useMemo(() => careerDatabase ? { ...careerDatabase, clubs: careerDatabase.clubs.map(item => ({ ...item, coachName: managerMarket?.clubs[item.id] ? managerMarket.clubs[item.id].coach ?? "" : item.coachName })) } : null, [careerDatabase, managerMarket]);
  const managedClubRecord = database?.clubs.find((item) => item.name === club);
  useEffect(() => {
    if (page !== "juniors" || !careerLoaded || !activeSaveId || !managedClubRecord || youthTeams[managedClubRecord.id]) return;
    let cancelled = false;
    const team = managedClubRecord;
    async function loadYouth() {
      const result = youthCohort(team,activeSaveId!,Number(savesRef.current.find(s=>s.id===activeSaveId)?.inGameDate.slice(0,4) ?? 2026));
      if (!cancelled) {
        setYouthTeams(current => {
          const previous = current[team.id];
          const promoted = previous?.promoted ?? [];
          // Keep saved imported rosters and never resurrect promoted identities.
          const next = previous?.origin === "transfermarkt" && result.origin === "simulado" ? previous : { ...result, promoted, players: result.players.filter(player => !promoted.includes(player.id)) };
          return { ...current, [team.id]: next };
        });
      }
    }
    void loadYouth();
    return () => { cancelled = true; };
  }, [page, careerLoaded, activeSaveId, managedClubRecord, youthTeams, database]);
  const scheduledFixture = nextCareerFixture(competitionSeason);
  const activeFixture = competitionSeason?.fixtures.find((item) => item.id === activeFixtureId) ?? scheduledFixture;
  const userIsHome = !activeFixture || activeFixture.homeClubId === managedClubRecord?.id;
  const homeTeamName = activeFixture?.home ?? club;
  const awayTeamName = activeFixture?.away ?? (divisionClubNames.find((name) => name !== club) ?? "Adversário");
  const opponent = activeFixture ? (userIsHome ? activeFixture.away : activeFixture.home) : awayTeamName;
  const opponentFormation = matchPreparation?.cpu?.plan.formation ?? "4-3-3";
  const opponentSquad = useMemo(
    () => (careerDatabase ? buildSquadFromDatabase(careerDatabase, opponent) : null) ?? initialSquad,
    [careerDatabase, opponent],
  );
  const lineupDate=matchPreparation && !matchPreparation.contractVersion ? undefined : activeFixture?.scheduledDate;
  const opponentStarters = useMemo(
    () => (matchPreparation?.cpu ? matchPreparation.cpu.active.map(Number) : buildStartingXI(opponentFormation, opponentSquad.filter(p=>playerEligible(p,lineupDate) && !bannedForFixture(competitionSeason,activeFixture,p.sourceId)))).map((id) => opponentSquad.find((player) => player.id === id)!).filter(Boolean),
    [opponentSquad, opponentFormation, competitionSeason, activeFixture, lineupDate,matchPreparation?.cpu],
  );
  const startersData = useMemo(
    () => starters.map((id) => squad.find((p) => p.id === id)!).filter(p=>p && playerEligible(p)),
    [starters, squad],
  );
  const bench = useMemo(
    () => squad.filter((p) => !starters.includes(p.id) && playerEligible(p,lineupDate) && !bannedForFixture(competitionSeason,activeFixture,p.sourceId)),
    [starters, squad, competitionSeason, activeFixture, lineupDate],
  );
  // Old saves have no nominated bench; recover the first eligible reserves deterministically.
  const eligibleMatchBench = (matchBenchIds ?? bench.filter((p) => !participation[p.id]).slice(0, 12).map((p) => p.id))
    .map((id) => squad.find((p) => p.id === id))
    .filter((p): p is Player => !!p && playerEligible(p,lineupDate) && !starters.includes(p.id) && !participation[p.id]);
  const sentOffHomeMinuteById = Object.fromEntries(
    events
      .filter((item) => item.card === "red" && item.scene?.team === "home" && item.actorId !== undefined)
      .map((item) => [item.actorId!, item.minute]),
  );
  const rolesByPlayerId = Object.fromEntries(Object.entries(participation).map(([id, stint]) => [Number(id), stint.role]));
  const matchFatigueContext = { formation, positions: manualPositions, starterIds: starters, rolesByPlayerId, style, focus };
  const matchStarters = matchPreparation ? matchEnergyAfter(
    startersData,
    Object.fromEntries(startersData.map((p) => {
      const capMinute = sentOffHomeMinuteById[p.id] !== undefined ? Math.min(minute, sentOffHomeMinuteById[p.id]) : minute;
      return [p.id, Math.max(0, capMinute - (participation[p.id]?.entered ?? 0))];
    })),
    minute,
    matchPreparation.weather,
    marking,
    matchPreparation.rules,
    matchFatigueContext,
  ) : startersData;
  const activeFieldStarters = matchStarters.filter((p) => sentOffHomeMinuteById[p.id] === undefined);
  const liveSquadCondition = activeFieldStarters.length
    ? {
        averageEnergy: Math.round(activeFieldStarters.reduce((sum, p) => sum + p.energy, 0) / activeFieldStarters.length),
        tiredCount: activeFieldStarters.filter((p) => p.energy < 75).length,
      }
    : undefined;
  const selectedPlayerData = squad.find((p) => p.id === selectedPlayer) ?? null;

  const matchKey = `${activeSaveId ?? "career"}|${activeFixture?.id ?? `${round}|${club}|${opponent}`}`;
  const cpuRoster=useMemo<CpuAthlete[]>(()=>opponentSquad.map(p=>({id:String(p.id),role:p.position,overall:p.overall,energy:p.energy,age:p.age})),[opponentSquad]);
  const createPreparation = (rules: MatchRules, key = matchKey): MatchPreparation => {
    const eligibleOpponent=opponentSquad.filter(p=>playerEligible(p,lineupDate) && !bannedForFixture(competitionSeason,activeFixture,p.sourceId));
    const strength=(players:Player[])=>[...players].sort((a,b)=>b.overall-a.overall).slice(0,11).reduce((n,p)=>n+p.overall,0)/Math.max(1,Math.min(11,players.length));
    const motivation=(players:Player[])=>Math.max(40,Math.min(92,Math.round(players.reduce((n,p)=>n+64+(p.energy-70)*.08+((p.condition?.morale ?? 50)-50)*.1,0)/Math.max(1,players.length))));
    const plan=coachMatchPlan(Object.values(managerMarket?.staff?.coaches ?? {}).find(c=>c.clubId===(userIsHome ? activeFixture?.awayClubId:activeFixture?.homeClubId)),strength(eligibleOpponent),strength(startersData));
    return {matchKey:key,contractVersion:2,cpu:startCpu(plan,cpuRoster.filter(p=>eligibleOpponent.some(v=>String(v.id)===p.id)),buildStartingXI(plan.formation,eligibleOpponent).map(String)),rules,weather:createMatchWeather(key,rules),motivationHome:motivation(startersData),motivationAway:motivation(eligibleOpponent)};
  };
  const matchStats = calculateMatchStatistics(events);
  const backgroundStrengths = useMemo(() => careerDatabase ? backgroundClubStrengths(careerDatabase) : new Map<string, number>(), [careerDatabase]);
  const fixtures = useMemo(() => roundFixtures({ season: competitionSeason, active: activeFixture, database: careerDatabase,
    strengths: backgroundStrengths, page, minute, userIsHome, homeScore, awayScore }),
  [competitionSeason, activeFixture, careerDatabase, backgroundStrengths, page, minute, userIsHome, homeScore, awayScore]);

  useEffect(() => {
    if (page !== "matchOverview" || !matchRunning || detailOpen || minute >= 90 || !matchPreparation) return;
    const timer = window.setTimeout(() => {
      const nextMinute = Math.min(matchPreparation.rules.durationMinutes, minute + 1);
      const previousEvent = [...events].reverse().find((item) => item.scene);
      const previous = previousEvent?.scene;
      // Tactical positions remain an internal model input for passing and offside; no field is rendered.
      const visual = visualFormation({ starters: startersData, formation, opponentFormation, manualPositions, scene: previous, minute: previousEvent?.minute ?? 0 });
      const snapshot = { home: visual.filter((player) => player.key.startsWith("home-")).map((player) => player.target), away: visual.filter((player) => player.key.startsWith("away-")).map((player) => player.target) };
      const event = simulateAction({
        minute: nextMinute,
        score: { home: homeScore, away: awayScore },
        managedIsHome: userIsHome,
        kickoffSide: seededRandom(`${matchPreparation.matchKey}|kickoff`)() < .5 ? "home" : "away",
        minutesPlayedHome: Object.fromEntries(startersData.map((player) => [player.id, Math.max(0, nextMinute - (participation[player.id]?.entered ?? 0))])),
        starters: startersData,
        formation,
        positions: manualPositions,
        opponent,
        opponentStarters,
        opponentFormation,
        previous,
        snapshot,
        rules: matchPreparation.rules,
        weather: matchPreparation.weather,
        tactics: { style, marking, focus },
        opponentTactics: matchPreparation.cpu?.plan.tactics ?? { style: "Equilibrado", marking: "Normal", focus: "Pelo meio" },
        ...(matchPreparation.contractVersion===2 ? {lawVersion:2,restart:restartAfter(events,nextMinute,seededRandom(`${matchPreparation.matchKey}|kickoff`)()<.5?"home":"away")}:{}),
        minutesPlayedAway:matchPreparation.cpu ? Object.fromEntries(Object.entries(matchPreparation.cpu.stints).map(([id,p])=>[id,nextMinute-p.entered])):undefined,
        motivationHome: matchPreparation.motivationHome,
        motivationAway: matchPreparation.motivationAway,
        sentOffHomeIds: events.filter((item) => item.card === "red" && item.scene?.team === "home" && item.actorId !== undefined).map((item) => item.actorId!),
        sentOffAwayIds: events.filter((item) => item.card === "red" && item.scene?.team === "away" && item.actorId !== undefined).map((item) => item.actorId!),
        yellowCardIds: events.filter((item) => item.card === "yellow" && item.actorId !== undefined).map((item) => item.actorId!),
        ...(!!matchPreparation.contractVersion ? {yellowCardIdsBySide:{home:events.filter(e=>e.card==="yellow" && e.scene?.team==="home" && e.actorId!==undefined).map(e=>e.actorId!),away:events.filter(e=>e.card==="yellow" && e.scene?.team==="away" && e.actorId!==undefined).map(e=>e.actorId!)}} : {}),
        random: createMinuteRandom(matchPreparation.matchKey, nextMinute),
      });
      const cpuAfter=matchPreparation.cpu ? reviewCpu(matchPreparation.cpu,cpuRoster,nextMinute,awayScore-homeScore+(event.scene?.action==="goal" ? event.scene.team==="away" ? 1:-1:0),[...events,event].filter(e=>e.card==="yellow" && e.scene?.team==="away").map(e=>String(e.actorId)),[...events,event].filter(e=>e.card==="red" && e.scene?.team==="away").map(e=>String(e.actorId)),opponentSquad.filter(p=>!playerEligible(p,lineupDate) || bannedForFixture(competitionSeason,activeFixture,p.sourceId)).map(p=>String(p.id))) : undefined;
      const cpuEvents:MatchEvent[]=cpuAfter ? cpuAfter.changes.filter(c=>c.minute===nextMinute && !matchPreparation.cpu!.changes.some(old=>old.in===c.in)).map(c=>({minute:nextMinute,half:nextMinute<=45?1:2,team:"away",substitution:{outId:Number(c.out),inId:Number(c.in),interval:c.interval},text:`${opponentSquad.find(p=>p.id===Number(c.in))?.name} entrou no lugar de ${opponentSquad.find(p=>p.id===Number(c.out))?.name} (${c.reason}).`})) : [];
      if(cpuAfter)setMatchPreparation(current=>current ? {...current,cpu:cpuAfter}:current);
      setMinute(nextMinute);
      setEvents((current) => [...current, event,...cpuEvents]);
      if(event.card==="red" && event.scene?.team==="home" && event.actorId!==undefined) {
        const id=event.actorId;setParticipation(current=>current[id] ? {...current,[id]:{...current[id],left:nextMinute}} : current);
      }
      if (event.scene?.action === "goal") {
        if (event.scene.team === "home") setHomeScore((score) => score + 1);
        else setAwayScore((score) => score + 1);
      }
      if (nextMinute === 45) {
        setMatchRunning(false);
        setHalftimeWaiting(true);
        setDetailOpen(true);
      }
      if (nextMinute >= matchPreparation.rules.durationMinutes) {
        setMatchRunning(false);
        let gateNet = 0;
        const awardMatch=()=>{
        if (userIsHome && activeFixture && managedClubRecord) {
          const id = managedClubRecord.id;
          const currentStadium = stadiumsRef.current[id] ?? newStadium();
          const date = savesRef.current.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11";
          const result = recordGate(currentStadium, managedClubRecord.stadiumCapacity, date, activeFixture.id, opponent);
          if (result.receipt) {
            gateNet = result.receipt.net / 1000;
            const nextStadiums = { ...stadiumsRef.current, [id]: result.state };
            stadiumsRef.current = nextStadiums;
            setStadiums(nextStadiums);
          }
        }
        setBudget((value) => value + 151 + gateNet);
        };
        const finalEvents = [...events, event,...cpuEvents];
        const goals: Record<number, number> = {};
        const assists: Record<number, number> = {};
        const yellowCards: Record<number, number> = {};
        const redCards: Record<number, number> = {};
        for (const item of finalEvents) {
          if (item.scene?.team !== "home") continue;
          if (item.scene.action === "goal" && item.scorerId !== undefined) goals[item.scorerId] = (goals[item.scorerId] ?? 0) + 1;
          if (item.scene.action === "goal" && item.assistId !== undefined) assists[item.assistId] = (assists[item.assistId] ?? 0) + 1;
          if (item.actorId !== undefined && item.card === "yellow") yellowCards[item.actorId] = (yellowCards[item.actorId] ?? 0) + 1;
          if (item.actorId !== undefined && item.card === "red") redCards[item.actorId] = (redCards[item.actorId] ?? 0) + 1;
        }
        const home = homeScore + (event.scene?.action === "goal" && event.scene.team === "home" ? 1 : 0);
        const away = awayScore + (event.scene?.action === "goal" && event.scene.team === "away" ? 1 : 0);
        const played: MatchParticipation = Object.keys(participation).length
          ? participation
          : Object.fromEntries(starters.map((id, slotIndex) => {
              const starterPlayer = squad.find((item) => item.id === id);
              return [id, { entered: 0, role: starterPlayer ? resolveMatchPlayerRole(starterPlayer, slotIndex, formation, manualPositions).role : undefined }];
            }));
        const finalParticipation: MatchParticipation = { ...played };
        for (const item of finalEvents.filter((entry) => entry.card === "red" && entry.scene?.team === "home" && entry.actorId !== undefined)) {
          const playerId = item.actorId!;
          const stint = finalParticipation[playerId] ?? { entered: 0 };
          finalParticipation[playerId] = { ...stint, left: Math.min(stint.left ?? nextMinute, item.minute) };
        }
        setParticipation(finalParticipation);
        const playedMinutes = Object.fromEntries(Object.entries(finalParticipation).map(([id, stint]) => [id, Math.max(0, (stint.left ?? 90) - stint.entered)]));
        const finalRolesById = Object.fromEntries(Object.entries(finalParticipation).map(([id, stint]) => [Number(id), stint.role]));
        setCareerSquad(matchEnergyAfter(squad, playedMinutes, nextMinute, matchPreparation.weather, marking, matchPreparation.rules, {
          formation,
          positions: manualPositions,
          starterIds: starters,
          rolesByPlayerId: finalRolesById,
          style,
          focus,
        }));
        const reportPlayers = squad.filter((player) => finalParticipation[player.id]);
        const ratings = calculatePlayerRatings(reportPlayers, finalEvents, "home");
        const ratingById = Object.fromEntries(ratings.map((item) => [item.playerId, item.rating]));
        const performance = Object.fromEntries(reportPlayers.map((player) => [player.id, {
          goals: goals[player.id] ?? 0,
          assists: assists[player.id] ?? 0,
          rating: ratingById[player.id] ?? null,
          yellowCards: yellowCards[player.id] ?? 0,
          redCards: redCards[player.id] ?? 0,
          shots: ratings.find((item) => item.playerId === player.id)?.shots ?? 0,
          tackles: ratings.find((item) => item.playerId === player.id)?.tackles ?? 0,
          passes: ratings.find((item) => item.playerId === player.id)?.passes ?? 0,
          saves: ratings.find((item) => item.playerId === player.id)?.saves ?? 0,
          errors: ratings.find((item) => item.playerId === player.id)?.errors ?? 0,
        }]));
        const actualHome = userIsHome ? home : away;
        const actualAway = userIsHome ? away : home;
        const contributions = careerDatabase && managedClubRecord ? playerContributionsFromMatch({ database: careerDatabase, clubId: managedClubRecord.id, squad, events: finalEvents, participation: finalParticipation, ratings: ratingById }) : [];
        if (competitionSeason && activeFixture) {
          const winnerClubId = activeFixture.type === "cup" && actualHome === actualAway
            ? (seededRandom(`${activeFixture.id}|penalties`)() < 0.5 ? activeFixture.homeClubId : activeFixture.awayClubId)
            : undefined;
          let report:import("@/lib/game/simulation/matches").MatchReport|undefined;
          if(!!matchPreparation.contractVersion) {
            const opponentClubId=userIsHome ? activeFixture.awayClubId : activeFixture.homeClubId;
            const opponentParticipation=cpuAfter ? Object.fromEntries(Object.entries(cpuAfter.stints).map(([id,stint])=>[Number(id),stint])) : Object.fromEntries(opponentStarters.map(p=>[p.id,{entered:0,left:Math.min(90,...finalEvents.filter(e=>e.card==="red" && e.scene?.team==="away" && e.actorId===p.id).map(e=>e.minute))}]));
            const opponentRatings=Object.fromEntries(calculatePlayerRatings(opponentSquad.filter(p=>opponentParticipation[p.id]),finalEvents,"away").map(r=>[r.playerId,r.rating]));
            contributions.push(...playerContributionsFromMatch({database:careerDatabase!,clubId:opponentClubId,squad:opponentSquad,events:finalEvents,side:"away",participation:opponentParticipation,ratings:opponentRatings}));
            report=liveReport({...activeFixture,status:"played",homeScore:actualHome,awayScore:actualAway,playerContributions:contributions},finalEvents,{home:squad,away:opponentSquad},userIsHome,matchPreparation.matchKey,matchPreparation.contractVersion===2);
            if(matchPreparation.cpu)report.plans=[matchPreparation.cpu.plan];
          }
          const completedSeason = completeCareerFixture(competitionSeason, activeFixture.id, { home: actualHome, away: actualAway, winnerClubId, playerContributions: contributions,report }, careerDatabase!);
          awardMatch();
          setCompetitionSeason(completedSeason);
          setManagerMarket(current => updateCareerMarket(current ?? initializeCareerMarket(careerDatabase!, competitionSeason, coach, budget), completedSeason, { clubId: managedClubRecord!.id, budget: budget + 151 + gateNet, payroll: squad.reduce((total, player) => total + (playerCareers[player.id]?.salary ?? player.salary), 0) }, savesRef.current.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11"));
          setChampionHistory(history => archiveChampionships(history, completedSeason, careerDatabase!, coach));
          setConfidenceHistory((current) => mergeConfidenceHistory(current, completedSeason));
        }
        setPlayerCareers((current) => recordPlayerMatch(current, squad, club, finalParticipation, {
          key: activeFixture?.id ?? matchPreparation.matchKey,
          round,
          opponent,
          homeScore: home,
          awayScore: away,
          season: activeFixture?.season ?? 2026,
          competitionId: activeFixture?.competitionId,
          competition: activeFixture?.competitionName,
          competitionRound: activeFixture?.competitionRound,
          isHome: userIsHome,
        }, performance));
      }
    }, 700 / matchSpeed);
    return () => window.clearTimeout(timer);
  }, [lineupDate,cpuRoster,opponentSquad,detailOpen, matchRunning, matchSpeed, minute, opponent, opponentFormation, opponentStarters, page, startersData, formation, manualPositions, style, marking, focus, matchPreparation, events, participation, starters, squad, club, round, homeScore, awayScore, userIsHome, activeFixture, competitionSeason, database, careerDatabase, managedClubRecord, matchKey, coach, budget, activeSaveId, playerCareers]);

  useEffect(() => {
    if (page !== "matchOverview" || minute !== 90 || detailOpen) return;
    const finalGoal = events.some((event) => event.minute === 90 && event.scene?.action === "goal");
    const timer = window.setTimeout(() => setPage("result"), finalGoal ? 3000 : 1800);
    return () => window.clearTimeout(timer);
  }, [detailOpen, minute, page, events]);

  const activeLeagueId = `league:${managedClubRecord?.country ?? "Brasil"}:${division}`;
  const competitionName = activeFixture?.competitionName ?? "Temporada encerrada";
  const trophyEntry = database && activeFixture ? buildCompetitionCatalog(database).find((entry) => entry.id === activeFixture.competitionId) : undefined;
  const matchTrophy = trophyEntry ? competitionTrophyAsset(trophyEntry) : null;
  const competitionRoundLabel = activeFixture?.roundLabel ?? `${round}ª rodada`;
  const competitionRound = activeFixture?.competitionRound ?? round;
  const displayedHomeScore = userIsHome ? homeScore : awayScore;
  const displayedAwayScore = userIsHome ? awayScore : homeScore;
  const displayedStatistics = userIsHome ? matchStats : { home: matchStats.away, away: matchStats.home };
  const displaySide = (side: "home" | "away") => userIsHome ? side : side === "home" ? "away" : "home";
  const displayedEvents = userIsHome ? events : events.map((item) => ({
    ...item,
    ...(item.team ? { team: displaySide(item.team) } : {}),
    ...(item.scene ? { scene: { ...item.scene, team: displaySide(item.scene.team), ...(item.scene.possessionAfter ? { possessionAfter: displaySide(item.scene.possessionAfter) } : {}) } } : {}),
  }));
  const centerCompetitionId = activeFixture?.competitionId ?? activeLeagueId;
  const centerCompetitionType = activeFixture?.type ?? "league";
  // The complete national calendar is expensive. Build these views only for the open
  // competition dialog, not on every match tick, autosave or result-screen interaction.
  const standingsData = useMemo(() => {
    if (!standingsOpen) return null;
    const centerTable: TableRow[] = centerCompetitionType === "cup" ? [] : getCompetitionStandings(competitionSeason?.fixtures ?? [], centerCompetitionId)
      .map(({ club, played, wins, draws, losses, goalsFor, goalsAgainst, points }) => ({ club, played, wins, draws, losses, goalsFor, goalsAgainst, points }));
    const playersById = new Map(careerDatabase?.players.map(item => [item.id, item]) ?? []);
    const centerPlayerStats = getCompetitionPlayerStats(competitionSeason?.fixtures ?? [], centerCompetitionId);
    const centerTopScorers: TopScorer[] = centerPlayerStats.filter((player) => player.goals > 0 && player.played > 0).slice(0, 5)
      .map((player) => ({ name: player.playerName, club: player.club, goals: player.goals, played: player.played }));
    const centerTopRatings: TopRating[] = centerPlayerStats.filter((player) => player.rating !== null && player.played > 0)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5)
      .map((player) => ({ name: player.playerName, club: player.club, rating: player.rating ?? 0, played: player.played, role: playersById.get(player.playerId)?.primaryPosition ?? "M" }));
    const careerCompetitionData: Record<string, CareerCompetitionView> = {};
    const clubsById = new Map(database?.clubs.map(item => [item.id, item]) ?? []);
    for (const competitionId of new Set((competitionSeason?.fixtures ?? []).map((fixture) => fixture.competitionId))) {
      const competitionFixtures = (competitionSeason?.fixtures ?? []).filter((fixture) => fixture.competitionId === competitionId && fixture.status !== "cancelled");
      const metadata = competitionFixtures[0];
      if (!metadata) continue;
      const standings = metadata.type === "cup" ? [] : getCompetitionStandings(competitionSeason?.fixtures ?? [], competitionId)
        .map(({ club, played, wins, draws, losses, goalsFor, goalsAgainst, points }) => ({ club, played, wins, draws, losses, goalsFor, goalsAgainst, points }));
      const playerStats = getCompetitionPlayerStats(competitionSeason?.fixtures ?? [], competitionId);
      const scored = competitionFixtures.filter((fixture) => fixture.status === "played");
      careerCompetitionData[competitionId] = {
        type: metadata.type,
        hasKnockout: competitionFixtures.some(f => f.stage === "knockout"),
        qualifiesOverall: competitionSeason?.tournaments?.find(t => t.competitionId === competitionId)?.format.qualify === "top-eight",
        groups: (() => {
          const registration = competitionSeason?.tournaments?.find(t => t.competitionId === competitionId);
          if (!registration) return undefined;
          const groups = registration.format.pairing === "paulista" ? [] : registration.groups.map(g => ({ name: g.name, table: getCompetitionStandings(competitionFixtures, competitionId, g.clubIds) }));
          if (registration.format.qualify === "cearense" && competitionFixtures.some(f => f.stage === "second-groups" && f.status !== "locked")) {
            groups.push(...registration.groups.map((g,i) => ({ name: `2ª fase · Grupo ${i === 0 ? "C" : "D"}`, table: getCompetitionStandings(competitionFixtures, competitionId, getCompetitionStandings(competitionFixtures, competitionId, g.clubIds).slice(0,3).map(r => r.clubId), "second-groups") })));
          }
          if (competitionFixtures.some(f => f.stage === "relegation" && f.status !== "locked" && !f.leg)) {
            const table = getCompetitionStandings(competitionFixtures, competitionId, undefined, "relegation");
            if (metadata.state === "Santa Catarina") {
              const fifths = registration.groups.flatMap(g => getCompetitionStandings(competitionFixtures, competitionId, g.clubIds).slice(4,5).map(r => r.clubId));
              const bonus = getCompetitionStandings(competitionFixtures, competitionId, fifths)[0]?.clubId;
              const row = table.find(r => r.clubId === bonus);
              if (row) row.points += 1;
              table.sort((a,b) => b.points-a.points || b.wins-a.wins || (b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst) || b.goalsFor-a.goalsFor);
            }
            groups.push({ name: "Permanência", table });
          }
          return groups.length ? groups : undefined;
        })(),
        formatNote: (() => {
          const registration = competitionSeason?.tournaments?.find(t => t.competitionId === competitionId);
          if (!registration) return metadata.type === "state" || metadata.division === "Série D" ? "Formato legado/simplificado. Resultados já disputados foram preservados." : undefined;
          return registration.format.description + (metadata.season !== 2026 ? " · Projeção baseada em 2026" : "") + (registration.incomplete.length ? ` · Inscrição incompleta neste universo: ${registration.incomplete.join(", ")}.` : "");
        })(),
        seasonYear: metadata.season,
        table: standings,
        fixtures: [...competitionFixtures].sort((a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "") || a.competitionRound - b.competitionRound).map((fixture) => ({
          stadium: clubsById.get(fixture.homeClubId)?.stadiumName ?? "",
          attendance: 0,
          home: fixture.home,
          away: fixture.away,
          homeScore: fixture.homeScore ?? 0,
          awayScore: fixture.awayScore ?? 0,
          played: fixture.status === "played",
          roundLabel: fixture.roundLabel,
          competitionRound: fixture.competitionRound,
          scheduledDate: fixture.scheduledDate,
          participantsPending: fixture.status === "locked",
          winner: fixture.winnerClubId === fixture.homeClubId ? fixture.home : fixture.winnerClubId === fixture.awayClubId ? fixture.away : undefined,
        })),
        topScorers: playerStats.filter((player) => player.goals > 0 && player.played > 0).slice(0, 5)
          .map((player) => ({ name: player.playerName, club: player.club, goals: player.goals, played: player.played })),
        topRatings: playerStats.filter((player) => player.rating !== null && player.played > 0)
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5)
          .map((player) => ({ name: player.playerName, club: player.club, rating: player.rating ?? 0, played: player.played, role: playersById.get(player.playerId)?.primaryPosition ?? "M" })),
        matchesPlayed: scored.length,
        goals: scored.reduce((sum, fixture) => sum + (fixture.homeScore ?? 0) + (fixture.awayScore ?? 0), 0),
      };
    }

    return { centerTable, centerTopScorers, centerTopRatings, careerCompetitionData };
  }, [standingsOpen, competitionSeason, centerCompetitionId, centerCompetitionType, database, careerDatabase]);

  const nav: NavItem[] = [
    { icon: "house", label: "Principal", image: "/icons/navigation/tela-inicial.webp", active: page === "hub", onClick: () => navigate("hub") },
    { icon: "calendar", label: "Agenda", image: "/icons/navigation/agenda.webp", active: page === "agenda", onClick: () => navigate("agenda"), children: agendaOptions.map((option) => ({ label: option.label, description: option.description, onClick: () => { setAgendaView(option.id); navigate("agenda"); } })) },
    { icon: "data_table", label: "Tabelas", image: "/icons/navigation/tabela.webp", active: standingsOpen, onClick: () => setStandingsOpen(true) },
    { icon: "sport", label: "Estádio", image: "/icons/navigation/estadio.webp", active: page === "stadium", onClick: () => navigate("stadium") },
    { icon: "user_green", label: "Juniores", image: "/icons/navigation/juniores.webp", active: page === "juniors", onClick: () => navigate("juniors") },
    { icon: "t_shirt_print", label: "Times", image: "/icons/navigation/times.webp", active: page === "teams", onClick: () => navigate("teams") },
    { icon: "magnifier", label: "Mercado", image: "/icons/navigation/mercado.webp", active: page === "search", onClick: () => navigate("search") },
    { icon: "user_suit", label: "Técnicos", image: "/icons/navigation/tecnicos.webp", active: page === "coaches", onClick: () => navigate("coaches") },
    { icon: "clock_history_frame", label: "História", image: "/icons/navigation/historia.webp", active: page === "history", onClick: () => navigate("history"), children: historyOptions.map((option) => ({ label: option.label, description: option.description, onClick: () => { setHistoryView(option.id); navigate("history"); } })) },
    { icon: "book", label: "Mensagens", active: page === "messages", onClick: () => navigate("messages") },
    { icon: "door_out", label: "Configurações", active: page === "settings", onClick: () => navigate("settings") },
  ];

  function navigate(next: Page) {
    setStandingsOpen(false);
    setPage(isUnemployed(managerMarket) && !["coaches","settings","messages","hub"].includes(next) ? "hub" : next);
  }

  function leaveActiveCareer(nextPage: Extract<Page, "menu" | "new" | "saves" | "editor">) {
    databaseRevision.current += 1;
    sessionRestoreVersion.current += 1;
    writeActiveCareerSession(userId, null);
    pendingCloudSave.current = null;
    if (activeSaveId && careerLoaded) saveCurrentCareer();
    setMatchRunning(false);
    setDetailOpen(false);
    setStandingsOpen(false);
    setProfilePlayer(null);
    setSelectedPlayer(null);
    setCareerLoaded(false);
    setActiveSaveId(null);
    if (synchronizedCatalog.current) {
      setDatabase(synchronizedCatalog.current);
      synchronizedCatalog.current = null;
    }
    universeSnapshot.current = undefined;
    setPage(nextPage);
  }


  async function commitFinancialChange(calculate: (save: CareerSave, database: EditorDatabase) => {save: CareerSave; message: string}): Promise<string> {
    if (advancing.current || jobActionInProgress.current) return "Aguarde a confirmação em andamento.";
    const current = savesRef.current.find(save => save.id === activeSaveId);
    if (!current || !database) return "Carreira indisponível.";
    advancing.current = true;
    try {
      const snapshot = {...current,budget,playerCareers,manualPositions,progress:progressRef.current};
      const result = calculate(snapshot,database);
      if (result.save === snapshot) return result.message;
      const next = {...result.save,updatedAt:new Date().toISOString()}, p = next.progress!;
      await publishLocalCheckpoint(next,userId,snapshot.progress?.engine?.revision ?? 0);
      progressRef.current = p;
      savesRef.current = [next,...savesRef.current.filter(save=>save.id!==next.id)];
      setEngine(p.engine); setBudget(next.budget); budgetRef.current = next.budget;
      setManagerMarket(p.managerMarket); setWorldMarket(p.worldMarket); setTransferNegotiations(p.transferNegotiations ?? []);
      setCareerSquad(p.careerSquad); setTrainingSessions(p.trainingSessions ?? []); setYouthTeams(p.youthTeams ?? {}); setPlayerCareers(p.playerCareers); setLoanContracts(p.loanContracts ?? {});
      setStarters(p.starters); setMatchBenchIds(p.matchBenchIds); setManualPositions(p.manualPositions);
      if (profilePlayer !== null && !p.careerSquad?.some(player=>player.id===profilePlayer)) { setProfilePlayer(null); setSelectedPlayer(null); }
      void persistSave(next);
      return result.message;
    } catch (error) { return error instanceof Error ? error.message : "Não foi possível concluir. O save anterior foi preservado."; }
    finally { advancing.current = false; }
  }
  async function makeTransferOffer(playerId: string, feeBrl: number, wageSharePercent: number, monthlyWageBrl?: number): Promise<string> {
    const id = crypto.randomUUID();
    return commitFinancialChange((save,db)=>{
      const p=save.progress!;
      const effective=worldDatabase(db,p.transferNegotiations ?? [],p.loanContracts ?? {},p.worldMarket,p.managerMarket?.finance);
      const result=proposeTransfer(effective,p.transferNegotiations ?? [],{id,playerId,buyerClubId:save.clubId,feeBrl,wageSharePercent,date:save.inGameDate,monthlyWageBrl,twoStage:true});
      return {save:result.negotiation ? updateCareerNegotiation(save,db,result.negotiation) : save,message:result.message};
    });
  }
  async function handleTransferAction(id: string, action: TransferNegotiationAction): Promise<string> {
    return commitFinancialChange((save,db)=>{
      const deal=save.progress?.transferNegotiations?.find(d=>d.id===id);
      if(!deal || deal.buyerClubId!==save.clubId) throw new Error("Negociação indisponível para este clube.");
      const next=action.type === "complete" ? settleCareerTransfer(save,db,id) : updateCareerNegotiation(save,db,deal,action);
      return {save:next,message:next.progress?.transferNegotiations?.find(d=>d.id===id)?.message ?? deal.message};
    });
  }

  function openQuickAction(action: "roster" | "finances" | "trophies" | "training") {
    navigate(action === "roster" ? "hub" : action);
  }

  async function trainPlayers(input: Omit<TrainingSessionInput,"season"|"week">) {
    let record: import("@/lib/game/training").TrainingSessionRecord | undefined;
    const ok="Treino aplicado e salvo.";
    const message=await commitFinancialChange((save,db)=>{
      const result=trainCareerPlayers(save,db,{...input,season:Number(save.inGameDate.slice(0,4)),week:round});record=result.record;
      return {save:result.save,message:result.error ?? ok};
    });
    return message===ok && record ? {record} : {error:message};
  }
  async function promoteJunior(youthId:string) {
    return commitFinancialChange((save,db)=>promoteCareerYouth(save,db,youthId));
  }
  async function carePlayer(id:number,action:"rest"|"rehabilitation"|"promise") {
    return commitFinancialChange((save,db)=>playerCareAction(save,db,id,action));
  }

  function renderStandings() {
    if (!standingsOpen || !database || !standingsData) return null;
    const { centerTable, centerTopScorers, centerTopRatings, careerCompetitionData } = standingsData;
    return <CompetitionCenter database={database} fixtures={fixtures} club={club} competition={division} activeCompetitionId={centerCompetitionId} roundLabel={competitionRoundLabel} careerCompetitionData={careerCompetitionData} table={centerTable} topScorers={centerTopScorers} topRatings={centerTopRatings} round={competitionRound} date={saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11"} onClose={() => setStandingsOpen(false)} />;
  }

  async function synchronizeTransfermarkt(progress: (message: string) => void, signal: AbortSignal, resume = false) {
    if (page !== "editor" || careerLoaded || !database || transfermarktSyncRunning.current) throw new Error("Sincronização indisponível. Aguarde e tente novamente.");
    transfermarktSyncRunning.current = true;
    const startedRevision = databaseRevision.current;
    try {
      const result = await prepareLiveTransfermarktSync(synchronizedCatalog.current ?? database, userId, progress, signal, resume);
      signal.throwIfAborted();
      if (!window.confirm(`Coleta concluída: ${result.clubs} clubes das Séries A/B/C/D de 2026 e ${result.players} jogadores. Aplicar ao catálogo para novas carreiras? A carreira atual será preservada. Força, salário e valores BRL são estimativas de simulação; não são dados oficiais do Transfermarkt.`)) throw new Error("Aplicação cancelada. Coleta preservada para retomar; catálogo não alterado.");
      progress("Salvando catálogo completo neste dispositivo e tentando sincronizar com a nuvem…");
      if (startedRevision !== databaseRevision.current) throw new Error("O catálogo mudou durante a sincronização. Tente novamente.");
      ++databaseRevision.current;
      const localSaved = writeLocalDatabase(result.database, userId);
      // Stage before the asynchronous cache write so returning to the menu cannot miss it.
      synchronizedCatalog.current = result.database;
      await cacheDatabase(result.database, userId).catch(() => {
        if (!localSaved) {
          synchronizedCatalog.current = null;
          throw new Error("Não foi possível salvar o catálogo neste dispositivo. Tente novamente.");
        }
      });
      // Do not replace the database feeding the running career, opponents or negotiations.
      let cloudPending = false;
      try {
        await writeCloudDatabase(result.database, userId);
        await cacheDatabase(result.database, userId, false).catch(() => undefined);
      } catch { cloudPending = true; }
      await saveTransfermarktCheckpoint(userId, null).catch(() => undefined);
      if (page === "editor") { setDatabase(result.database); synchronizedCatalog.current = null; }
      setSyncLabel(cloudPending ? "Transfermarkt salvo localmente — nuvem pendente" : "Catálogo Transfermarkt sincronizado");
      return { clubs: result.clubs, players: result.players, collectedAt: result.collectedAt, cloudPending };
    } finally { transfermarktSyncRunning.current = false; }
  }

  async function changeDatabase(next: EditorDatabase): Promise<boolean> {
    synchronizedCatalog.current = null;
    const revision = ++databaseRevision.current;
    const limited = upgradeEditorDatabase(next);
    setDatabase(limited);
    const smallCacheSaved = writeLocalDatabase(limited, userId);
    const largeCache = cacheDatabase(limited, userId);
    setSyncLabel("Salvando e sincronizando...");
    // Always observe the cache promise, including if the cloud fails first.
    const localSaved = await largeCache.then(() => true, () => smallCacheSaved);
    try {
      for (let attempt = 0; ; attempt++) {
        try { await writeCloudDatabase(limited, userId); break; }
        catch (error) {
          const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
          const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
          const message = typeof error === "object" && error !== null && "message" in error ? String(error.message) : "";
          const transient = error instanceof TypeError || status === 429 || status >= 500 || code.startsWith("08") || /failed to fetch|network|load failed/i.test(message);
          if (!transient || attempt >= 2 || revision !== databaseRevision.current) throw error;
          setSyncLabel("Reconectando e tentando sincronizar...");
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
      if (revision !== databaseRevision.current) return false;
      await cacheDatabase(limited, userId, false).catch(() => undefined);
      setSyncLabel("Atualizado e sincronizado");
      return true;
    } catch (error) {
      if (revision !== databaseRevision.current) return false;
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      const reason = code === "23514" || code === "23505" || code === "PGRST204"
        ? "A nuvem recusou os dados. Verifique se o banco recebeu as atualizações necessárias."
        : "Verifique sua conexão e sessão.";
      setSyncLabel(localSaved ? `Salvo neste dispositivo, mas não sincronizado. ${reason} Clique em Atualizar para tentar novamente.` : `Não foi possível salvar. ${reason}`);
      return false;
    }
  }

  function persistSave(nextSave: CareerSave): Promise<void> {
    if (pendingCloudSave.current?.id === nextSave.id) pendingCloudSave.current = null;
    const previous = savesRef.current.find((item) => item.id === nextSave.id);
    nextSave = { ...previous, ...nextSave, progress: nextSave.progress ?? previous?.progress };
    const nextSaves = [nextSave, ...savesRef.current.filter((item) => item.id !== nextSave.id)];
    savesRef.current = nextSaves;
    setSaves(nextSaves);
    writeLocalSaves(nextSaves, userId);
    return writeCloudSave(nextSave, userId)
      .then(() => setSyncLabel("Carreira salva no Supabase"))
      .catch((error) => setSyncLabel(error instanceof EngineConflict ? error.message : "Carreira salva neste dispositivo"));
  }

  function persistCareerExtras(nextCareers: Record<number, PlayerCareerRecord>, nextPositions: Record<number, ManualPosition>, nextStarters = starters) {
    if (!activeSaveId) return Promise.resolve();
    const current = saves.find((save) => save.id === activeSaveId);
    const selectedClub = database?.clubs.find((item) => item.name === club);
    return persistSave({
      id: activeSaveId,
      name: current?.name ?? `${club} — ${coach}`,
      managerName: coach,
      clubId: selectedClub?.id ?? current?.clubId ?? "",
      clubName: club,
      division,
      round,
      budget,
      inGameDate: current?.inGameDate ?? "2026-01-22",
      updatedAt: new Date().toISOString(),
      playerCareers: nextCareers,
      manualPositions: nextPositions,
      progress: { ...progressRef.current, playerCareers: nextCareers, manualPositions: nextPositions, starters: nextStarters },
    })
      .then(() => setSyncLabel("Carreira e elenco sincronizados"))
      .catch((error) => setSyncLabel(error instanceof EngineConflict ? error.message : "Carreira salva neste dispositivo"));
  }

  function beginCareer() {
    if (!coach.trim()) return;
    const selectedClub = database?.clubs.find((item) => item.name === club);
    if (!selectedClub || !database) return;
    universeSnapshot.current = createCareerUniverseSnapshot(database);
    synchronizedCatalog.current = database;
    const newSeason = createCareerSeason(database, selectedClub.id, BRAZILIAN_REFERENCE_SEASON) ?? undefined;
    const firstFixture = nextCareerFixture(newSeason);
    if (!newSeason || !firstFixture) {
      setSyncLabel("Cadastre ao menos dois clubes na divisão, Copa ou estadual para iniciar uma temporada jogável.");
      return;
    }
    const now = new Date().toISOString();
    const save: CareerSave = {
      careerRuleset: CURRENT_CAREER_RULESET,
      id: crypto.randomUUID(),
      name: `${club} — ${coach.trim()}`,
      managerName: coach.trim(),
      clubId: selectedClub?.id ?? "",
      clubName: club,
      division,
      round: 1,
      budget: 12624,
      inGameDate: firstFixture.scheduledDate ?? "2026-01-11",
      updatedAt: now,
      playerCareers: {},
      manualPositions: {},
    };
    stadiumsRef.current = {};
    setStadiums({});
    const initialLoans = Object.fromEntries((database?.players ?? []).filter(player => player.loan).map(player => [player.id, player.loan!]));
    setMessageReadIds([]);
    setLoanContracts(initialLoans);
    setLoansOpen(false);
    const initialStarters = buildStartingXI("4-3-3", baseSquad);
    save.progress = { ...progressRef.current, messageReadIds:[],seasonHistory:undefined,marketValueFxVersion:EUR_BRL_VERSION, engine: createEngineState(undefined,save.id,save.inGameDate), universeSnapshot: universeSnapshot.current, page: "hub", matchPreparation: undefined, activeSaveId: save.id, coach: coach.trim(),
      round: 1, budget: 12624, stadiums: {}, kit: 1, formation: "4-3-3", style: "Equilibrado", marking: "Leve", focus: "Pelo meio",
      worldMarket:undefined, careerSquad: baseSquad, starters: initialStarters, playerCareers: {}, trainingSessions: [], manualPositions: {},
      minute: 0, homeScore: 0, awayScore: 0, events: [], substitutionsLeft: 5,
      detailOpen: false, halftimeWaiting: false, matchRunning: false, matchSpeed: 1, defaultMatchSpeed: 1, competitionSeason: newSeason, confidenceHistory: [], confidenceStartBudget: 12624, managerMarket: initializeCareerMarket(database, newSeason, coach.trim(), 12624), jobClubSnapshots: {}, managerAppointments: [{ clubId: selectedClub.id, club: selectedClub.name, startedOn: save.inGameDate }], youthTeams: {}, activeFixtureId: firstFixture?.id, transferNegotiations: [], loanContracts: initialLoans, championHistory: [] };
    setActiveSaveId(save.id);
    setCompetitionSeason(newSeason);
    save.progress = migratePlayerSave(migrateCoachSave(migrateFinanceSave(save,database),database),worldDatabase(database,save.progress?.transferNegotiations ?? [],save.progress?.loanContracts ?? {},save.progress?.worldMarket,save.progress?.managerMarket?.finance)).progress!;
    setManagerMarket(save.progress.managerMarket); setJobClubSnapshots({}); setManagerAppointments(save.progress.managerAppointments ?? []);
    setChampionHistory([]);
    setYouthTeams({});
    setConfidenceHistory([]);
    setConfidenceStartBudget(12624);
    setActiveFixtureId(firstFixture?.id);
    setTransferNegotiations([]);
    setWorldMarket(save.progress.worldMarket);
    setEngine(save.progress.engine); setAdvanceError("");
    setRound(1);
    setDefaultMatchSpeed(1);
    setBudget(12624);
    setKit(1);
    setFormation("4-3-3");
    setStyle("Equilibrado");
    setMarking("Leve");
    setFocus("Pelo meio");
    setMinute(0);
    setHomeScore(0);
    setAwayScore(0);
    setEvents([]);
    setMatchRunning(false);
    setMatchPreparation(null);
    setMatchRulesError(null);
    setHalftimeWaiting(false);
    setSubstitutionsLeft(5);
    setCareerLoaded(true);
    setCareerSquad(save.progress.careerSquad ?? baseSquad);
    setStarters(initialStarters);
    setPlayerCareers({});
    setTrainingSessions([]);
    setManualPositions({});
    void persistSave(save);
    setPage("hub");
  }

  function currentCatalog() { return database; }

  async function loadCareer(save: CareerSave): Promise<boolean> {
    if (!isCurrentCareerSave(save)) return false;
    // Compact readable legacy careers BEFORE finance/player migrations copy their
    // active state. Pages are durable before this revision-neutral publication.
    if(typeof indexedDB!=="undefined"){
      try {await publishLocalCheckpoint(save,userId,save.progress?.engine?.revision ?? 0);}
      catch(error){setSyncLabel(error instanceof Error?error.message:"Não foi possível preservar o arquivo histórico.");return false;}
    }
    const catalog = synchronizedCatalog.current ?? currentCatalog();
    const database = catalog ? applyStructuralDatabaseUpdates(save.progress?.universeSnapshot ?? createCareerUniverseSnapshot(catalog), catalog).database : null;
    if (database) {
      synchronizedCatalog.current = catalog;
      universeSnapshot.current = database;
      setDatabase(database);
      save = reconcileCareerSaveWithDatabase(save, database).save;
      if (save.progress) save = { ...save, progress: { ...save.progress, universeSnapshot: database } };
    }
    const clubId = database?.clubs.find((item) => item.name === save.clubName)?.id ?? save.clubId;
    const storedSeason = save.progress?.competitionSeason ?? (database && clubId ? createCareerSeason(database, clubId, Number(save.inGameDate.slice(0, 4)) || 2026) ?? undefined : undefined);
    const formatSeason = storedSeason && database ? upgradeUnplayedSeason(storedSeason, database) : storedSeason;
    const restoredSeason = formatSeason ? applyBrazilianCalendar(save.progress?.competitionSeason ? formatSeason : { ...formatSeason, calendarVersion: undefined }, save.inGameDate) : undefined;
    const resumingMatch = save.progress?.page === "result" || save.progress?.page === "matchOverview";
    const loadingFixture = resumingMatch ? restoredSeason?.fixtures.find(f => f.id === save.progress?.activeFixtureId) : nextCareerFixture(restoredSeason);
    save = { ...save, inGameDate: save.progress?.engine ? save.inGameDate : careerCalendarDate(save.inGameDate, undefined, loadingFixture),
      ...(save.progress ? { progress: { ...save.progress, competitionSeason: restoredSeason } } : {}) };
    try { save = migrateEngineSave(save); if (database) save = migratePlayerSave(migrateCoachSave(migrateFinanceSave(save,database),database),worldDatabase(database,save.progress?.transferNegotiations ?? [],save.progress?.loanContracts ?? {},save.progress?.worldMarket,save.progress?.managerMarket?.finance)); } catch (error) { setSyncLabel(error instanceof Error ? error.message : "Save incompatível; preservado."); return false; }
    // Keep the civil date in the same account-local snapshot used by autosave and loan expiry.
    const normalizedSaves = savesRef.current.map(item => item.id === save.id ? save : item);
    savesRef.current = normalizedSaves;
    setSaves(normalizedSaves);
    if (save.progress?.careerSquad && database) {
      const loans = expireLoans(recoverCareerLoans(save.progress.careerSquad ?? [], save.progress.transferNegotiations ?? [], database, save.progress.loanContracts), save.inGameDate);
      const ownClubId = database.clubs.find(item => item.name === save.clubName)?.id ?? save.clubId;
      const restoredDatabase = worldDatabase(database,save.progress.transferNegotiations ?? [],loans,save.progress.worldMarket,save.progress.managerMarket?.finance);
      const restoredSquad = projectSquadCondition(reconcileContractSquad(reconcileLoanSquad(save.progress.careerSquad ?? [], buildSquadFromDatabase(restoredDatabase, save.clubName, true) ?? [], loans, ownClubId, Object.keys(save.progress.playerCareers).map(Number)),buildSquadFromDatabase(restoredDatabase,save.clubName,true) ?? [],new Set(restoredDatabase.players.map(p=>p.id)),Object.keys(save.progress.playerCareers).map(Number)),save.progress.worldMarket?.population);
      const remaining = new Set(restoredSquad.filter(player=>playerEligible(player)).map(player => player.id));
      save = { ...save, progress: { ...save.progress, loanContracts: loans, careerSquad: restoredSquad, starters: save.progress.starters.filter(id => remaining.has(id)), matchBenchIds: save.progress.matchBenchIds?.filter(id => remaining.has(id)), manualPositions: Object.fromEntries(Object.entries(save.progress.manualPositions).filter(([id]) => remaining.has(Number(id)))) } };
    }
    sessionRestoreVersion.current += 1;
    const restoreVersion = sessionRestoreVersion.current;
    const canApply = () => sessionRestoreVersion.current === restoreVersion;
    if (!canApply()) return false;
    setCareerLoaded(false);
    setSelectedPlayer(null);
    setProfilePlayer(null);
    setSubstitutionOut(null);
    setActiveSaveId(save.id);
    setCoach(save.managerName);
    setClub(save.clubName);
    setDivision(save.division);
    setRound(save.round);
    setBudget(save.budget);
    budgetRef.current = save.budget;
    stadiumsRef.current = save.progress?.stadiums ?? {};
    setStadiums(stadiumsRef.current);
    setPlayerCareers(save.playerCareers ?? {});
    setKit(save.progress?.kit === 2 || save.progress?.kit === 3 ? save.progress.kit : 1);
    setMessageReadIds(save.progress?.messageReadIds ?? []);
    setTrainingSessions(save.progress?.trainingSessions ?? []);
    setYouthTeams(save.progress?.youthTeams ?? {});
    setManualPositions(save.manualPositions ?? {});
    setTransferNegotiations(save.progress?.transferNegotiations ?? []);
    setWorldMarket(save.progress?.worldMarket);
    setEngine(save.progress?.engine); setAdvanceError("");
    setLoanContracts(save.progress?.loanContracts ?? Object.fromEntries((save.progress?.careerSquad ?? []).filter(player => player.sourceId && player.loan).map(player => [player.sourceId!, player.loan!])));
    setLoansOpen(false);
    setHomeScore(0);
    setAwayScore(0);
    setMatchRunning(false);
    setMatchPreparation(null);
    setMatchRulesError(null);
    setCompetitionSeason(restoredSeason);
    setManagerMarket(restoredSeason && database ? refreshJobOffers(save.progress?.managerMarket ?? initializeCareerMarket(database, restoredSeason, save.managerName, save.budget), save.inGameDate) : undefined);
    setJobClubSnapshots(save.progress?.jobClubSnapshots ?? {});
    setManagerAppointments(save.progress?.managerAppointments ?? []);
    setChampionHistory(database ? archiveChampionships(save.progress?.championHistory ?? [], restoredSeason, database, save.managerName) : save.progress?.championHistory ?? []);
    setConfidenceHistory(mergeConfidenceHistory(save.progress?.confidenceHistory ?? [], restoredSeason));
    setConfidenceStartBudget(save.progress?.confidenceStartBudget);
    setActiveFixtureId(save.progress?.activeFixtureId ?? nextCareerFixture(restoredSeason)?.id);
    setPage("hub");
    if (save.progress) {
      const state = save.progress;
      setFormation(state.formation);
      setStyle(state.style);
      setMarking(state.marking);
      setFocus(state.focus);
      setCareerSquad(state.careerSquad);
      setStarters(state.starters);
      setPlayerCareers(state.playerCareers);
      setManualPositions(state.manualPositions);
      setMinute(state.minute);
      setHomeScore(state.homeScore);
      setAwayScore(state.awayScore);
      setEvents(state.events);
      setParticipation(state.participation ?? {});
      setMatchBenchIds(state.matchBenchIds);
      setSubstitutionsLeft(state.substitutionsLeft);
      setHalftimeWaiting(state.halftimeWaiting);
      setMatchSpeed(state.matchSpeed);
      setDefaultMatchSpeed(state.defaultMatchSpeed ?? 1);
      setMatchPreparation(state.matchPreparation ?? null);
      setMatchRulesError(null);
      setDetailOpen(false);
      setPage(resumableCareerPage(state.page) as Page);
      if (!state.matchPreparation && (state.page === "matchOverview" || state.page === "result")) {
        const savedOpponent = database?.clubs.filter((item) => item.division === save.division).map((item) => item.name).find((name) => name !== save.clubName) ?? "Adversário";
        const savedKey = `${save.id}|${save.round}|${save.clubName}|${savedOpponent}`;
        void loadMatchRules().then((rules) => {
          if (canApply()) setMatchPreparation({ matchKey: savedKey, rules, weather: createMatchWeather(savedKey, rules), motivationHome: 64, motivationAway: 64 });
        }).catch((error: unknown) => {
          if (canApply()) setMatchRulesError(error instanceof Error ? error.message : "Não foi possível ler as regras da partida.");
        });
      }
      setCareerLoaded(true);
      return true;
    }
    setKit(1);
    setFormation("4-3-3");
    setStyle("Equilibrado");
    setMarking("Leve");
    setFocus("Pelo meio");
    setDefaultMatchSpeed(1);
    setMinute(0);
    setEvents([]);
    setHalftimeWaiting(false);
    setSubstitutionsLeft(5);
    try {
      const cloud = await readCloudCareer(save.id, userId);
      if (!canApply()) return false;
      if (cloud) {
        setCareerSquad(cloud.squad);
        const savedPlayers = cloud.starters.map((id) => cloud.squad.find((player) => player.id === id)!).filter(Boolean);
        setStarters(savedPlayers.length === 11 ? cloud.starters : buildStartingXI("4-3-3", cloud.squad));
        setPlayerCareers(cloud.playerCareers);
        setManualPositions(cloud.manualPositions);
        setSyncLabel("Carreira carregada do Supabase");
        return true;
      } else {
        const snapshot = (database ? buildSquadFromDatabase(database, save.clubName) : null) ?? initialSquad;
        const initialStarters = buildStartingXI("4-3-3", snapshot);
        setCareerSquad(snapshot);
        setStarters(initialStarters);

        setSyncLabel("Carreira migrada para o banco de dados");
        return true;
      }
    } catch {
      if (!canApply()) return false;
      const fallback = (database ? buildSquadFromDatabase(database, save.clubName) : null) ?? initialSquad;
      setCareerSquad(fallback);
      setStarters(buildStartingXI("4-3-3", fallback));
      setSyncLabel("Carreira local — sincronização pendente");
      return false;
    } finally {
      if (canApply()) setCareerLoaded(true);
    }
  }

  async function removeCareer(id: string) {
    if (!window.confirm("Excluir esta carreira definitivamente?")) return;
    try {
      await deleteCloudSave(id, userId);
      const next = savesRef.current.filter((save) => save.id !== id);
      savesRef.current = next;
      setSaves(next);
      writeLocalSaves(next, userId);
    } catch {
      window.alert("Não foi possível excluir da sua conta. Verifique a conexão e tente novamente.");
    }
  }

  function saveCurrentCareer(nextRound = round, progressPatch: Partial<CareerProgress> = {}, date?: string) {
    if (!activeSaveId) return;
    const current = saves.find((save) => save.id === activeSaveId);
    const selectedClub = database?.clubs.find((item) => item.name === club);
    void persistSave({
      id: activeSaveId,
      name: current?.name ?? `${club} — ${coach}`,
      managerName: coach,
      clubId: selectedClub?.id ?? current?.clubId ?? "",
      clubName: club,
      division,
      round: nextRound,
      budget,
      inGameDate: date ?? current?.inGameDate ?? "2026-01-22",
      updatedAt: new Date().toISOString(),
      playerCareers: progressPatch.playerCareers ?? playerCareers,
      manualPositions,
      progress: { ...progressRef.current, ...progressPatch, round: nextRound, page: page === "result" && nextRound !== round ? "hub" : page },
    });
  }

  const beforeUnloadSave = useRef<() => void>(() => {});
  useEffect(() => { beforeUnloadSave.current = saveCurrentCareer; });

  useEffect(() => {
    if (page !== "matchOverview" || minute >= 90 || !activeSaveId || !careerLoaded) return;
    const warnBeforeLeavingMatch = (event: BeforeUnloadEvent) => {
      beforeUnloadSave.current();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeavingMatch);
    return () => window.removeEventListener("beforeunload", warnBeforeLeavingMatch);
  }, [page, minute, activeSaveId, careerLoaded]);

  function changeFormation(next: string) {
    setFormation(next);
    const nextStarters = buildStartingXI(next, squad);
    setStarters(nextStarters);
    setManualPositions({});
    void persistCareerExtras(playerCareers, {}, nextStarters);
    setSelectedPlayer(null);
  }

  function placeLineupPlayer(id: number, slotIndex: number, point?: ManualPosition) {
    const result = deployLineupPlayer(starters, squad, formation, manualPositions, id, slotIndex, point);
    if (!result) return;
    setStarters(result.starters);
    setManualPositions(result.positions);
    setSelectedPlayer(id);
    void persistCareerExtras(playerCareers, result.positions, result.starters);
  }

  function reorderBench(id: number, targetId: number) {
    const reserves = squad.filter((player) => !starters.includes(player.id));
    const from = reserves.findIndex((player) => player.id === id);
    const to = reserves.findIndex((player) => player.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const reordered = [...reserves];
    const [player] = reordered.splice(from, 1);
    reordered.splice(to, 0, player);
    let index = 0;
    const nextSquad = squad.map((player) => starters.includes(player.id) ? player : reordered[index++]);
    setCareerSquad(nextSquad);
  }

  function saveStadiumChanges(nextStadiums: Record<string, StadiumState>, nextBudget: number) {
    stadiumsRef.current = nextStadiums;
    budgetRef.current = nextBudget;
    setStadiums(nextStadiums);
    setBudget(nextBudget);
    const current = savesRef.current.find(save => save.id === activeSaveId);
    if (current) {
      const nextProgress = { ...progressRef.current, stadiums: nextStadiums, budget: nextBudget };
      progressRef.current = nextProgress;
      void persistSave({ ...current, budget: nextBudget, progress: nextProgress, updatedAt: new Date().toISOString() });
    }
  }
  function changeStadiumPrice(sector: StadiumSector, price: number) {
    if (!managedClubRecord) return;
    const id = managedClubRecord.id;
    const state = stadiumsRef.current[id] ?? newStadium();
    const next = setSectorPrice(state, sector, price);
    if (next !== state) saveStadiumChanges({ ...stadiumsRef.current, [id]: next }, budgetRef.current);
  }
  function expandStadium(seats: number): string | undefined {
    if (!managedClubRecord) return "Clube indisponível.";
    const id = managedClubRecord.id;
    const date = savesRef.current.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11";
    const result = startExpansion(stadiumsRef.current[id] ?? newStadium(), seats, date, budgetRef.current);
    if (result.error) return result.error;
    saveStadiumChanges({ ...stadiumsRef.current, [id]: result.state }, result.budget);
  }

  const jobActionInProgress = useRef(false);
  async function applyToManagerJob(clubId: string): Promise<string> {
    return commitFinancialChange((save,db)=>{
      const market=save.progress?.managerMarket;
      if(!market) throw new Error("Mercado indisponível.");
      const result=applyForManagerJob(market,db,save.clubId,clubId,save.inGameDate);
      return {save:result.market===market ? save : coachCheckpoint(save,result.market,`coach-apply:${clubId}:${result.market.clubs[clubId]?.vacancyVersion ?? 0}`),message:result.error ?? "Candidatura analisada. Confira a resposta da diretoria."};
    });
  }
  async function declineJob(id: string) {
    await commitFinancialChange((save)=>{
      const market=save.progress!.managerMarket!;
      return {save:coachCheckpoint(save,declineManagerJob(market,id,save.inGameDate),`coach-decline:${id}`),message:"Proposta recusada."};
    });
  }
  async function advanceUnemployed(): Promise<string | undefined> {
    if(advancing.current || jobActionInProgress.current) return "Aguarde a confirmação em andamento.";
    const current=savesRef.current.find(save=>save.id===activeSaveId);
    if(!current || !careerDatabase || !isUnemployed(managerMarket)) return "Carreira indisponível.";
    advancing.current=true;
    try {
      const snapshot={...current,progress:progressRef.current};
      const next=await advanceCareerWithMarketPolicy(snapshot,careerDatabase,{operationId:`unemployed:${current.inGameDate}:${engine?.revision ?? 0}`,expectedRevision:engine?.revision ?? 0,fromDate:current.inGameDate},browserMarketProvider);
      await publishLocalCheckpoint(next,userId,engine?.revision ?? 0);
      savesRef.current=[next,...savesRef.current.filter(s=>s.id!==next.id)];
      progressRef.current=next.progress!;
      await loadCareer(next); void persistSave(next);
    } catch(error) { return error instanceof Error ? error.message : "Não foi possível avançar."; }
    finally { advancing.current=false; }
  }
  async function acceptJob(id: string): Promise<string | undefined> {
    if (jobActionInProgress.current || advancing.current) return "Aguarde a confirmação em andamento.";
    const current = savesRef.current.find(save => save.id === activeSaveId);
    if (!current || !careerDatabase) return "Carreira indisponível.";
    jobActionInProgress.current = true;
    try {
      const result = acceptManagerJob({ ...current, budget, playerCareers, manualPositions, progress: { ...progressRef.current, managerMarket } }, careerDatabase, id);
      if (!result.save) return result.error;
      await publishLocalCheckpoint(result.save,userId,current.progress?.engine?.revision ?? 0);
      savesRef.current=[result.save,...savesRef.current.filter(s=>s.id!==result.save!.id)];
      // Write the account-local snapshot first and prevent autosave of the outgoing club.
      setCareerLoaded(false);
      void persistSave(result.save);
      const loaded = await loadCareer(result.save);
      if (!loaded) return "Não foi possível carregar o clube.";

    } finally { jobActionInProgress.current = false; }
  }

  function openLineup() {
    if(isUnemployed(managerMarket)) { setPage("hub"); return; }
    if (!scheduledFixture) {
      setSyncLabel("Temporada encerrada — não há partidas pendentes nesta carreira.");
      return;
    }
    if (starters.length!==11 || starters.some(id=>!squad.some(p=>p.id===id && playerEligible(p,scheduledFixture.scheduledDate) && !bannedForFixture(competitionSeason,scheduledFixture,p.sourceId)))) { setMatchRulesError("Escalação incompleta ou com atleta inelegível (inscrição, lesão, suspensão ou aposentadoria)."); return; }
    if(starters.length!==11 || starters.some(id=>!squad.some(p=>p.id===id && playerEligible(p,scheduledFixture.scheduledDate) && !bannedForFixture(competitionSeason,scheduledFixture,p.sourceId)))){setMatchRulesError("Escalação incompleta ou com atleta inelegível. Revise lesões, suspensões e inscrições.");return;}
    setActiveFixtureId(scheduledFixture.id);
    // Revisiting tactics must not discard the user's XI or manually placed players.
    if (starters.length !== 11) {
      const arranged = buildStartingXI(formation, squad);
      setStarters(arranged);
      setManualPositions({});
      void persistCareerExtras(playerCareers, {}, arranged);
    }
    setSelectedPlayer(null);
    setPage("lineup");
  }

  function openPlayerProfile(id: number) {
    const player = squad.find((item) => item.id === id);
    if (!player) return;
    setSelectedPlayer(id);
    setPlayerCareers((current) => current[id] ? current : { ...current, [id]: createPlayerCareer(player, club) });
    setProfilePlayer(id);
  }

  async function applyPlayerMarketAction(id: number, action: MarketAction): Promise<string> {
    return commitFinancialChange((save,db)=>applyCareerPlayerAction(save,db,id,action));
  }

  function resetManualPositions() {
    setManualPositions({});
    void persistCareerExtras(playerCareers, {});
  }

  async function readMatchRules(): Promise<MatchRules | null> {
    if (matchRulesLoadInProgress.current) return null;
    matchRulesLoadInProgress.current = true;
    setMatchRulesLoading(true);
    setMatchRulesError(null);
    try {
      return await loadMatchRules();
    } catch (error) {
      setMatchRulesError(error instanceof Error ? error.message : "Não foi possível ler as regras da partida.");
      return null;
    } finally {
      matchRulesLoadInProgress.current = false;
      setMatchRulesLoading(false);
    }
  }

  async function startMatch() {
    if (!scheduledFixture) {
      setMatchRulesError("A temporada não possui partidas pendentes.");
      return;
    }
    setActiveFixtureId(scheduledFixture.id);
    const rules = await readMatchRules();
    if (!rules) return;
    setMatchPreparation(createPreparation(rules));
    setParticipation(Object.fromEntries(starters.map((id, slotIndex) => {
      const starterPlayer = squad.find((item) => item.id === id);
      return [id, { entered: 0, role: starterPlayer ? resolveMatchPlayerRole(starterPlayer, slotIndex, formation, manualPositions).role : undefined }];
    })));
    setMatchBenchIds(bench.slice(0, 12).map((player) => player.id));
    setMinute(0);
    setHomeScore(0);
    setAwayScore(0);
    setEvents([]);
    setSubstitutionsLeft(5);
    setSubstitutionOut(null);
    setDetailOpen(false);
    setHalftimeWaiting(false);
    setMatchSpeed(defaultMatchSpeed);
    setMatchRunning(true);
    setPage("matchOverview");
  }

  async function resumeMatch() {
    // Always consult the canonical Markdown before resuming. An existing match keeps its
    // serialized rules/weather snapshot so a mid-match deploy cannot reroll its conditions.
    const canonicalRules = await readMatchRules();
    if (!canonicalRules) return;
    const preparation = matchPreparation?.matchKey === matchKey
      ? (matchPreparation.rules.baseFatiguePerMinute < 0.05 ? { ...matchPreparation, rules: canonicalRules } : matchPreparation)
      : createPreparation(canonicalRules);
    try {if(preparation.cpu)assertCpuState(preparation.cpu,cpuRoster);}catch(error){setMatchRulesError(error instanceof Error?error.message:"Partida incompatível; preservada.");return;}
    setMatchPreparation(preparation);
    setHalftimeWaiting(false);
    setMatchRunning(true);
  }

  function toggleMatchRunning() {
    if (matchRunning) {
      setMatchRunning(false);
      return;
    }
    void resumeMatch();
  }

  const matchTacticsTrigger = useRef<HTMLElement | null>(null);

  function openMatchTactics() {
    matchTacticsTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMatchRunning(false);
    setDetailOpen(true);
    setSelectedPlayer(null);
    setSubstitutionOut(null);
  }

  function moveMatchPlayers(changes: Record<number, ManualPosition>) {
    const nextPositions = { ...manualPositions, ...changes };
    delete nextPositions[starters[10]];
    setManualPositions(nextPositions);
    void persistCareerExtras(playerCareers, nextPositions);
  }

  function closeMatchTactics() {
    setDetailOpen(false);
    if (minute < 90 && !halftimeWaiting) void resumeMatch();
  }

  function startSecondHalf() {
    setDetailOpen(false);
    void resumeMatch();
  }

  function changeMatchFormation(next: string) {
    const arranged = buildStartingXI(next, startersData);
    setFormation(next);
    setStarters(arranged);
    setManualPositions({});
    setParticipation((current) => {
      const updated = { ...current };
      arranged.forEach((id, slotIndex) => {
        const player = squad.find((item) => item.id === id);
        if (player && updated[id]) {
          updated[id] = { ...updated[id], role: resolveMatchPlayerRole(player, slotIndex, next, {}).role };
        }
      });
      return updated;
    });
    setSelectedPlayer(null);
    setSubstitutionOut(null);
    setEvents((current) => [
      ...current,
      { minute, half: minute <= 45 ? 1 : 2, team: "home", text: `Formação alterada para ${next}` },
    ]);
    void persistCareerExtras(playerCareers, {}, arranged);
  }

  function selectMatchPlayer(id: number | null) {
    if (id === null) {
      setSelectedPlayer(null);
      setSubstitutionOut(null);
      return;
    }
    if (starters.includes(id)) {
      setSubstitutionOut(id);
      setSelectedPlayer((current) => current !== null && !starters.includes(current) ? current : id);
      return;
    }
    setSelectedPlayer(id);
  }

  function substitute(id: number, point?: ManualPosition) {
    if (substitutionOut === null || substitutionsLeft <= 0 || !eligibleMatchBench.some((player) => player.id === id) || !starters.includes(substitutionOut)) return;
    if(!!matchPreparation?.contractVersion && !canMakeSubstitution(events,"home",substitutionOut,id,minute,halftimeWaiting))return;
    const outgoingPlayer = squad.find((player) => player.id === substitutionOut);
    const incomingPlayer = squad.find((player) => player.id === id);
    const outgoing = outgoingPlayer?.name ?? "Jogador";
    const incoming = incomingPlayer?.name ?? "Jogador";
    const outSlotIndex = starters.indexOf(substitutionOut);
    const result = deployLineupPlayer(starters, squad, formation, manualPositions, id, outSlotIndex, point);
    if (!result) return;
    const newSlotIndex = result.starters.indexOf(id);
    const outgoingRole = outgoingPlayer ? resolveMatchPlayerRole(outgoingPlayer, outSlotIndex, formation, manualPositions).role : undefined;
    const incomingRole = incomingPlayer ? resolveMatchPlayerRole(incomingPlayer, newSlotIndex >= 0 ? newSlotIndex : outSlotIndex, formation, result.positions).role : undefined;
    setParticipation((current) => ({
      ...current,
      [substitutionOut]: { ...(current[substitutionOut] ?? { entered: 0 }), role: current[substitutionOut]?.role ?? outgoingRole, left: minute },
      [id]: { entered: minute, role: incomingRole },
    }));
    setStarters(result.starters);
    setManualPositions(result.positions);
    setSubstitutionsLeft((value) => value - 1);
    setEvents((current) => [
      ...current,
      { minute, half: minute <= 45 ? 1 : 2, team: "home", substitution:{outId:substitutionOut,inId:id,interval:halftimeWaiting}, text: `${incoming} entrou no lugar de ${outgoing}` },
    ]);
    setSelectedPlayer(null);
    setSubstitutionOut(null);
  }

  if (hydrationError) return <div className="grid min-h-dvh place-content-center gap-4 bg-[#07120e] p-8 text-white"><p role="alert">Não foi possível preparar os dados do jogo. Suas carreiras salvas não foram apagadas.</p><button type="button" onClick={() => window.location.reload()} className="rounded border border-white/30 px-4 py-3">Tentar novamente</button></div>;

  if (!database || !hydrationDone) return <LoadingScreen phase="careers" />;

  if (activeSaveId && !careerLoaded) return <LoadingScreen phase="career" />;

  if (page === "menu") {
    const latestSave =
      saves.length > 0
        ? [...saves].sort(
            (a, b) => (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0),
          )[0]
        : null;
    const latestClubColor = latestSave
      ? database.clubs.find((item) => item.name === latestSave.clubName)?.primaryColor
      : undefined;
    return (
      <StartMenuScreen
        email={email}
        onSignOut={onSignOut}
        saveCount={saves.length}
        latestSave={latestSave}
        latestClubColor={latestClubColor}
        clubCount={database.clubs.length}
        playerCount={database.players.length}
        onContinueLatest={loadCareer}
        onNewGame={() => {
          const first = database.clubs.find((item) => item.division === "Série A") ?? database.clubs[0];
          if (first) {
            setDivision(first.division);
            setClub(first.name);
          }
          setCoach("");
          leaveActiveCareer("new");
        }}
        onSaves={() => leaveActiveCareer("saves")}
        onEdit={() => leaveActiveCareer("editor")}
      />
    );
  }

  if (page === "saves") {
    return <SavesScreen saves={saves} onLoad={loadCareer} onDelete={removeCareer} onBack={() => leaveActiveCareer("menu")} />;
  }

  if (page === "editor") {
    return <EditorScreen userId={userId} database={database} syncLabel={syncLabel} onSynchronize={synchronizeTransfermarkt} onChange={changeDatabase} onBack={() => leaveActiveCareer("menu")} />;
  }

  if (page === "new")
    return (
      <NewCareerScreen
        coach={coach}
        setCoach={setCoach}
        division={division}
        setDivision={setDivision}
        club={club}
        setClub={setClub}
        onStart={beginCareer}
        onBack={() => leaveActiveCareer("menu")}
        availableClubs={database.clubs}
      />
    );

  const workspace = {
    nav, teamName: club, clubColors: database.clubs.find((item) => item.name === club),
    date: formatCalendarDate(saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11"), onClose: () => navigate("hub"),
    background: (
          isUnemployed(managerMarket) && managerMarket && careerDatabase && managedClubRecord ? <UnemploymentScreen coach={coach} jobs={{market:managerMarket,database:careerDatabase,currentClubId:managedClubRecord.id,date:saves.find(s=>s.id===activeSaveId)?.inGameDate ?? "2026-01-11",appointments:managerAppointments,onApply:applyToManagerJob,onDecline:declineJob,onAccept:acceptJob}} onAdvance={advanceUnemployed}/> : <HubScreen
            kit={kit}
            club={club}
            clubColors={database.clubs.find((item) => item.name === club)}
            coach={coach}
            budget={budget}
            opponent={opponent}
            round={competitionRound}
            competition={competitionName}
            playerCareers={playerCareers}
            confidence={clubConfidence(competitionSeason, confidenceHistory, budget, squad.reduce((sum, player) => sum + (playerCareers[player.id]?.salary ?? player.salary), 0), confidenceStartBudget)}
            trainingSessions={trainingSessions}
            trainingWeek={round}
            season={competitionSeason?.season ?? 2026}
            isHome={userIsHome}
            hasNextMatch={!!scheduledFixture}
            roundLabel={competitionRoundLabel}
            squad={squad}
            starters={starters}
            selectedPlayer={selectedPlayerData}
            onSelectPlayer={setSelectedPlayer}
            onOpenPlayer={openPlayerProfile}
            loanReminder={loanExpiryReminders(loanContracts, database?.clubs.find(item => item.name === club)?.id ?? "", saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-22")}
            onLoans={() => setLoansOpen(true)}
            onEscalar={openLineup}
            onQuickAction={openQuickAction}
          />
    ),
  };

  if (isUnemployed(managerMarket) && !["coaches","settings","messages"].includes(page)) return <CareerWorkspace {...workspace}/>;

  if (page === "hub")
    return (
      <>
        <CareerWorkspace {...workspace} />
        {renderStandings()}
        {loansOpen && careerDatabase && <LoanManager players={careerDatabase.players.filter(player => player.loan && [player.loan.owner.clubId, player.loan.borrower.clubId].includes(database?.clubs.find(item => item.name === club)?.id))} clubId={database?.clubs.find(item => item.name === club)?.id ?? ""} date={saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-22"} onClose={() => setLoansOpen(false)} onPropose={(id, months, fee, share) => commitFinancialChange((save,db)=>extendCareerLoan(save,db,id,months,fee,share))}/>}
        {profilePlayer !== null && (() => {
          const player = squad.find((item) => item.id === profilePlayer);
          if (!player) return null;
          const record = playerCareers[profilePlayer] ?? createPlayerCareer(player, club);
          return <CareerPlayerProfile competitionSuspension={bannedForFixture(competitionSeason,scheduledFixture,player.sourceId) ? `Suspenso para ${scheduledFixture?.competitionName} — expulsão registrada` : undefined} onCare={(action)=>carePlayer(player.id,action)} key={player.id} player={player} kit={kit} clubColors={database?.clubs.find((item) => item.name === club)} club={club} record={record} clubs={database?.clubs.map((item) => item.name) ?? []} date={saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11"} onMarketAction={(action) => applyPlayerMarketAction(profilePlayer, action)} onClose={() => setProfilePlayer(null)} />;
        })()}
      </>
    );

  if(page === "messages") {
    const active=saves.find(save=>save.id===activeSaveId);
    return <CareerWorkspace {...workspace} title="Mensagens">{active&&<MessagesScreen key={active.id} save={{...active,progress}} database={careerDatabase ?? database} readIds={messageReadIds} onRead={ids=>setMessageReadIds(previous=>[...new Set([...previous,...ids])])}/>}</CareerWorkspace>;
  }

  if (page === "settings") return <CareerWorkspace {...workspace} title="Configurações"><SettingsScreen club={club} coach={coach} speed={defaultMatchSpeed} onSpeedChange={setDefaultMatchSpeed} onBackToClub={() => navigate("hub")} onMenu={() => leaveActiveCareer("menu")} /></CareerWorkspace>;

  const windowTitles: Partial<Record<Page, string>> = {
    agenda: "Agenda", stadium: "Estádio", juniors: "Juniores", teams: "Times",
    search: "Mercado", coaches: "Técnicos", history: "História", finances: "Finanças",
    trophies: "Troféus", training: "Treino",
  };
  const managementSection = sectionByPage[page];
  if (managementSection)
    return (
      <>
        <CareerWorkspace {...workspace} title={windowTitles[page]} titleIcon={managementSection === "teams" ? "group" : undefined}>
          {(["juniors", "teams", "search", "coaches", "history"] as string[]).includes(managementSection) ? <WorldScreens competitionSeason={competitionSeason} allTransfers={transferNegotiations} marketState={worldMarket?.marketState} onMarketMode={(mode)=>commitFinancialChange(save=>({save:setMarketMode(save,mode),message:"Política de mercado salva nesta carreira."}))} managerMarket={managerMarket} gameDate={saves.find(save => save.id === activeSaveId)?.inGameDate} youthTeam={managedClubRecord ? youthTeams[managedClubRecord.id] : undefined} youthLoading={!!managedClubRecord && !youthTeams[managedClubRecord.id]}  onPromoteYouth={promoteJunior} embedded championHistory={championHistory} worldEvents={worldMarket?.events} section={managementSection as "juniors" | "teams" | "search" | "coaches" | "history"} database={managementDatabase ?? database} club={club} coach={coach} budget={budget} squad={squad} records={playerCareers} negotiations={transferNegotiations.filter(deal => deal.buyerClubId === managedClubRecord?.id)} historyView={historyView} onHistoryView={setHistoryView} onOpenPlayer={openPlayerProfile} onTransferOffer={makeTransferOffer} onTransferAction={handleTransferAction} onBack={() => navigate("hub")} /> : <ClubSectionScreen
            jobs={managerMarket && careerDatabase && managedClubRecord ? { market: managerMarket, database: careerDatabase, currentClubId: managedClubRecord.id, date: saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11", appointments: managerAppointments, onApply: applyToManagerJob, onDecline: declineJob, onAccept: acceptJob } : undefined}
            championHistory={championHistory}
            stadium={managedClubRecord ? stadiums[managedClubRecord.id] : undefined}
            onStadiumPriceChange={changeStadiumPrice}
            onStadiumExpand={expandStadium}
            finance={managerMarket?.finance}
            section={managementSection}
            agendaView={agendaView}
            onAgendaViewChange={setAgendaView}
            onPrepare={openLineup}
            onAgenda={() => { setAgendaView("matches"); navigate("agenda"); }}
            database={database}
            club={club}
            coach={coach}
            round={competitionRound}
            budget={budget}
            squad={squad}
            kit={kit}
            fixtures={fixtures}
            season={competitionSeason}
            competition={competitionName}
            inGameDate={saves.find((save) => save.id === activeSaveId)?.inGameDate ?? "2026-01-22"}
            starters={starters}
            onBack={() => navigate("hub")}
            onOpenPlayer={openPlayerProfile}
            trainingSessions={trainingSessions}
            trainingWeek={round}
            trainingSeason={competitionSeason?.season ?? 2026}
            onTrainPlayers={trainPlayers}
          />}
          {(["finances","history"].includes(managementSection)) && saves.find(s=>s.id===activeSaveId) && <CareerHistoryBrowser key={activeSaveId} owner={userId} save={saves.find(s=>s.id===activeSaveId)!}/>}
        </CareerWorkspace>
        {renderStandings()}
        {profilePlayer !== null && (() => {
          const player = squad.find((item) => item.id === profilePlayer);
          if (!player) return null;
          const record = playerCareers[profilePlayer] ?? createPlayerCareer(player, club);
          return <CareerPlayerProfile competitionSuspension={bannedForFixture(competitionSeason,scheduledFixture,player.sourceId) ? `Suspenso para ${scheduledFixture?.competitionName} — expulsão registrada` : undefined} onCare={(action)=>carePlayer(player.id,action)} key={player.id} player={player} kit={kit} clubColors={database?.clubs.find((item) => item.name === club)} club={club} record={record} clubs={database?.clubs.map((item) => item.name) ?? []} date={saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11"} onMarketAction={(action) => applyPlayerMarketAction(profilePlayer, action)} onClose={() => setProfilePlayer(null)} />;
        })()}
      </>
    );

  if (page === "lineup")
    return (
      <>
        <CareerWorkspace {...workspace} title="Escalação" classicContent>
          <LineupScreen
          kit={kit}
          onKitChange={setKit}
          club={club}
          clubColors={database.clubs.find((item) => item.name === club)}
          coach={coach}
          opponent={opponent}
          round={competitionRound}
          competition={competitionName}
          formation={formation}
          setFormation={changeFormation}
          style={style}
          setStyle={setStyle}
          marking={marking}
          setMarking={setMarking}
          focus={focus}
          setFocus={setFocus}
          startersData={startersData}
          bench={bench}
          onReorderBench={reorderBench}
          selectedPlayer={selectedPlayerData}
          onSelectPlayer={setSelectedPlayer}
          onPlacePlayer={placeLineupPlayer}
          onPlay={startMatch}
          isStartingMatch={matchRulesLoading}
          matchStartError={matchRulesError}
          onBack={() => setPage("hub")}
          manualPositions={manualPositions}
          onResetPositions={resetManualPositions}
          />
        </CareerWorkspace>
        {renderStandings()}
      </>
    );

  if (page === "matchOverview")
    return (
      <>
        <div inert={detailOpen}>
        <MatchOverviewScreen
          weather={matchPreparation?.weather}
          motivationHome={userIsHome ? matchPreparation?.motivationHome : matchPreparation?.motivationAway}
          motivationAway={userIsHome ? matchPreparation?.motivationAway : matchPreparation?.motivationHome}
          squadCondition={liveSquadCondition}
          rulesLoading={matchRulesLoading}
          rulesError={matchRulesError}
          competition={competitionName}
          trophyAsset={matchTrophy}
          round={competitionRound}
          roundLabel={competitionRoundLabel}
          minute={minute}
          half={minute <= 45 ? "1º tempo" : minute < 90 ? "2º tempo" : "fim"}
          club={homeTeamName}
          opponent={awayTeamName}
          clubColors={database.clubs.find((item) => item.name === club)}
          homeScore={displayedHomeScore}
          awayScore={displayedAwayScore}
          statistics={displayedStatistics}
          fixtures={fixtures}
          events={displayedEvents}
          running={matchRunning}
          speed={matchSpeed}
          halftimeWaiting={halftimeWaiting}
          onToggleRunning={toggleMatchRunning}
          onSpeedChange={setMatchSpeed}
          onOpenDetail={openMatchTactics}
        />
        </div>
        {detailOpen && (
          <MatchDetailScreen
            kit={kit}
            club={club}
            clubColors={database.clubs.find((item) => item.name === club)}
            opponent={opponent}
            homeScore={homeScore}
            awayScore={awayScore}
            minute={minute}
            formation={formation}
            setFormation={changeMatchFormation}
            style={style}
            setStyle={setStyle}
            marking={marking}
            setMarking={setMarking}
            focus={focus}
            setFocus={setFocus}
            statistics={matchStats}
            manualPositions={manualPositions}
            onMovePlayers={moveMatchPlayers}
            startersData={matchStarters}
            bench={eligibleMatchBench}
            substitutionsLeft={!!matchPreparation?.contractVersion ? Math.min(substitutionsLeft,substitutionAllowance(events,"home",minute,halftimeWaiting)) : substitutionsLeft}
            selectedPlayer={selectedPlayer}
            substitutionOut={substitutionOut}
            onSelectPlayer={selectMatchPlayer}
            onSubstitute={substitute}
            onClose={closeMatchTactics}
            onStartSecondHalf={startSecondHalf}
            returnFocusTo={matchTacticsTrigger.current}
            isHalftime={halftimeWaiting}
            coach={coach}
            competition={competitionName}
            round={competitionRound}
            date={saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11"}
            onResetPositions={resetManualPositions}
            onPlacePlayer={(id, slot, point) => {
              if (!starters.includes(id)) {
                if (substitutionsLeft <= 0 || !eligibleMatchBench.some((player) => player.id === id)) return;
                setSubstitutionOut(starters[slot]);
                setSelectedPlayer(id);
                return;
              }
              const result = deployLineupPlayer(starters, squad, formation, manualPositions, id, slot, point);
              if (!result) return;
              setStarters(result.starters);
              setManualPositions(result.positions);
              void persistCareerExtras(playerCareers, result.positions, result.starters);
            }}
          />
        )}
      </>
    );

  const reportPlayers = squad.filter((player) => participation[player.id] || starters.includes(player.id));
  const playerRatings = calculatePlayerRatings(reportPlayers, events, "home");
  const opponentRatings = calculatePlayerRatings(opponentStarters, events, "away");
  return (
    <>
      {advanceError && <p role="alert" className="p-3 text-sm text-red-300">{advanceError}</p>}
      <ResultScreen
      trophyAsset={matchTrophy}
      competition={competitionName}
      round={competitionRound}
      roundLabel={competitionRoundLabel}
      fixtures={fixtures}
      club={homeTeamName}
      opponent={awayTeamName}
      clubColors={database.clubs.find((item) => item.name === club)}
      homeScore={displayedHomeScore}
      awayScore={displayedAwayScore}
      homeFormation={userIsHome ? formation : opponentFormation}
      awayFormation={userIsHome ? opponentFormation : formation}
      homeFormationPlayers={userIsHome ? startersData : opponentStarters}
      awayFormationPlayers={userIsHome ? opponentStarters : startersData}
      ratingPlayers={reportPlayers}
      events={displayedEvents}
      weather={matchPreparation?.weather}
      motivationHome={userIsHome ? matchPreparation?.motivationHome : matchPreparation?.motivationAway}
      motivationAway={userIsHome ? matchPreparation?.motivationAway : matchPreparation?.motivationHome}
      homePlayerRatings={userIsHome ? playerRatings : opponentRatings}
      awayPlayerRatings={userIsHome ? opponentRatings : playerRatings}
      statistics={displayedStatistics}
      onOpenStandings={() => setStandingsOpen(true)}
      onContinue={async () => {
        if (advancing.current || !activeSaveId || !database) return;
        advancing.current = true; setAdvanceError("");
        try {
          const current = savesRef.current.find(save => save.id === activeSaveId);
          if (!current) throw new Error("Carreira não encontrada.");
          const snapshot = { ...current, round, budget, playerCareers, manualPositions, progress: progressRef.current };
          const next = await advanceCareerWithMarketPolicy(snapshot,database, { operationId: `after-match:${activeFixture?.id ?? `round-${round}`}`, expectedRevision: engine?.revision ?? 0, fromDate: current.inGameDate, fixtureId: activeFixture?.id },browserMarketProvider);
          if (next === snapshot) return;
          await publishLocalCheckpoint(next,userId,engine?.revision ?? 0);
          const p = next.progress!;
          // Publish the already validated checkpoint, not a succession of business rules in the UI.
          progressRef.current = p;
          savesRef.current = [next,...savesRef.current.filter(save => save.id !== next.id)];
          setStandingsOpen(false); setBudget(next.budget); budgetRef.current = next.budget; setRound(next.round); setActiveFixtureId(p.activeFixtureId);
          setEngine(p.engine); setWorldMarket(p.worldMarket); setTransferNegotiations(p.transferNegotiations ?? []); setManagerMarket(p.managerMarket); setManagerAppointments(p.managerAppointments ?? []); setYouthTeams(p.youthTeams ?? {});
          setLoanContracts(p.loanContracts ?? {}); setCareerSquad(p.careerSquad); setStarters(p.starters); setMatchBenchIds(p.matchBenchIds); setManualPositions(p.manualPositions); setPlayerCareers(p.playerCareers);
          setProfilePlayer(null); setSelectedPlayer(null); setPage("hub");
          void persistSave({ ...next,updatedAt:new Date().toISOString() });
        } catch (error) { setAdvanceError(error instanceof Error ? error.message : "Não foi possível avançar. O checkpoint anterior foi preservado."); }
        finally { advancing.current = false; }
      }}
    />
      {renderStandings()}
    </>
  );
}
