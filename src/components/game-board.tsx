"use client";
import { ManagementHeader } from "@/components/ui/management-header";
import surface from "@/components/ui/management-surface.module.css";


import { newStadium, recordGate, setSectorPrice, startExpansion, type StadiumSector, type StadiumState } from "@/lib/game/stadium";
import { CURRENT_CAREER_RULESET, currentCareerSaves, isCurrentCareerSave } from "@/lib/game/career-rules";
import { applyBrazilianCalendar, BRAZILIAN_REFERENCE_SEASON, careerCalendarDate, formatCalendarDate } from "@/lib/game/brazilian-calendar";
import { acceptManagerJob, applyForManagerJob, declineManagerJob, initializeCareerMarket, refreshJobOffers, updateCareerMarket, type JobClubSnapshot, type ManagerAppointment } from "@/lib/game/manager-jobs";
import type { ManagerMarket } from "@/lib/game/manager-market";
import { archiveChampionships, type ChampionshipRecord } from "@/lib/game/honours";
import { LoanManager } from "@/components/ui/loan-manager";
import { databaseWithLoans, expireLoans, loanExpiryReminders, proposeLoanExtension, reconcileLoanSquad, recoverCareerLoans, type CareerLoans } from "@/lib/game/loans";

import { clubConfidence, mergeConfidenceHistory, type ConfidenceMatch } from "@/lib/game/confidence";

import { TransfermarktSettings } from "@/components/screens/transfermarkt-settings";
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
import { recruitPlayer } from "@/lib/game/recruitment";
import { databaseWithCompletedTransfers, proposeTransfer, respondToTransferNegotiation, type TransferNegotiation, type TransferNegotiationAction } from "@/lib/game/transfers";
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
import { createPlayerCareer, recordPlayerMatch, applyNegotiation, type MarketAction, type MatchParticipation, type ManualPosition, type PlayerCareerRecord } from "@/lib/game/career";
import { deployLineupPlayer } from "@/lib/game/lineup";
import { mergeCareerSaves } from "@/lib/game/save-utils";
import {
  isMenuPage,
  readActiveCareerSession,
  resumableCareerPage,
  writeActiveCareerSession,
} from "@/lib/game/session";
import { agendaOptions, type AgendaView } from "@/components/screens/agenda-screen";
import type { CareerProgress, MatchPreparation } from "@/lib/game/progress";
import { applyTrainingSession, type TrainingSessionInput, type TrainingSessionRecord } from "@/lib/game/training";
import { calculateMatchStatistics, calculatePlayerRatings, createMatchWeather, createMinuteRandom, matchEnergyAfter, seededRandom, simulateAction } from "@/lib/game/live-match";
import { completeCareerFixture, createCareerSeason, getCompetitionPlayerStats, getCompetitionStandings, nextCareerFixture, playerContributionsFromMatch, type CareerSeason } from "@/lib/game/season";
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

type Page = "menu" | "new" | "saves" | "editor" | "hub" | "lineup" | "matchOverview" | "result" | "agenda" | "stadium" | "juniors" | "teams" | "search" | "coaches" | "history" | "finances" | "trophies" | "training" | "settings";

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
      const pendingDatabaseSync = await hasPendingDatabaseSync(userId).catch(() => false);
      const localDatabase = upgradeEditorDatabase(await readCachedDatabase(userId).catch(() => null) ?? readLocalDatabase(userId) ?? await importBrazilDatabase());
      if (cancelled) return;
      const localSaves = currentCareerSaves(await readCachedCareerSaves(userId).catch(() => null) ?? readLocalSaves(userId));
      // Replace both account-local stores even offline; the reset is not a recurring wipe.
      writeLocalSaves(localSaves, userId);
      const sessionId = readActiveCareerSession(userId);
      if (sessionId && !localSaves.some(save => save.id === sessionId)) writeActiveCareerSession(userId, null);
      if (cancelled) return;
      savesRef.current = localSaves;
      setDatabase(localDatabase);
      setSaves(localSaves);
      writeLocalDatabase(localDatabase, userId);
      await cacheDatabase(localDatabase, userId).catch(() => undefined);
      setSyncLabel("Dados locais carregados");

      try {
        const [cloudDatabase, cloudSaves] = await Promise.all([readCloudDatabase(userId), readCloudSaves(userId)]);
        if (cancelled) return;
        if (databaseRevision.current > 0) {
          // A deliberate editor import/edit supersedes the hydration snapshot. Its own write is queued.
        } else if (cloudDatabase && !pendingDatabaseSync) {
          const upgradedCloudDatabase = upgradeEditorDatabase(cloudDatabase);
          setDatabase(upgradedCloudDatabase);
          writeLocalDatabase(upgradedCloudDatabase, userId);
          await cacheDatabase(upgradedCloudDatabase, userId, false).catch(() => undefined);
        } else {
          await writeCloudDatabase(localDatabase, userId);
          await cacheDatabase(localDatabase, userId, false).catch(() => undefined);
        }
        const merged = mergeCareerSaves(localSaves, cloudSaves);
        if (cancelled) return;
        savesRef.current = merged;
        setSaves(merged);
        writeLocalSaves(merged, userId);
        await Promise.all(merged.filter((save) => !cloudSaves.some((cloud) => cloud.id === save.id && cloud.updatedAt >= save.updatedAt))
          .map((save) => writeCloudSave(save, userId)));
        setSyncLabel("Supabase conectado");
      } catch {
        setSyncLabel("Modo local — Supabase indisponível");
      } finally {
        if (!cancelled) setHydrationDone(true);
      }
    }
    void hydrate();
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
  const [transferNegotiations, setTransferNegotiations] = useState<TransferNegotiation[]>([]);
  const [loanContracts, setLoanContracts] = useState<CareerLoans>({});
  const [loansOpen, setLoansOpen] = useState(false);
  const careerDatabase = useMemo(() => database ? databaseWithLoans(databaseWithCompletedTransfers({ ...database, players: database.players.map(player => ({ ...player, loan: undefined })) }, transferNegotiations), loanContracts) : null, [database, transferNegotiations, loanContracts]);

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
    page, matchPreparation: matchPreparation ?? undefined, activeSaveId, coach, club, division, round, budget, kit, formation, style, marking, focus,
    starters, careerSquad: squad, playerCareers, trainingSessions, manualPositions, minute, homeScore, awayScore,
    events, participation, matchBenchIds, substitutionsLeft, detailOpen, matchRunning: false, matchSpeed, defaultMatchSpeed, halftimeWaiting,
    stadiums, managerMarket, jobClubSnapshots, managerAppointments, competitionSeason, confidenceHistory: mergeConfidenceHistory(confidenceHistory, competitionSeason), confidenceStartBudget, activeFixtureId, transferNegotiations, loanContracts, championHistory,

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
    participation, matchBenchIds, substitutionsLeft, detailOpen, matchSpeed, defaultMatchSpeed, halftimeWaiting, matchPreparation, competitionSeason, confidenceHistory, confidenceStartBudget, activeFixtureId, transferNegotiations, loanContracts, championHistory, managerMarket, jobClubSnapshots, managerAppointments, stadiums, userId]);


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
        .catch(() => {
          const latest = savesRef.current.find((save) => save.id === next.id);
          if (latest?.updatedAt === next.updatedAt) pendingCloudSave.current ??= next;
          setSyncLabel("Sincronização pendente — verifique sua conexão");
        });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [userId]);

  const divisionClubNames = useMemo(() => database?.clubs.filter((item) => item.country.toLocaleLowerCase("pt-BR") === "brasil" && item.division === division).map((item) => item.name) ?? [], [database, division]);
  const managementDatabase = useMemo(() => database ? { ...database, clubs: database.clubs.map(item => ({ ...item, coachName: managerMarket?.clubs[item.id] ? managerMarket.clubs[item.id].coach ?? "" : item.coachName })) } : null, [database, managerMarket]);
  const managedClubRecord = database?.clubs.find((item) => item.name === club);
  const scheduledFixture = nextCareerFixture(competitionSeason);
  const activeFixture = competitionSeason?.fixtures.find((item) => item.id === activeFixtureId) ?? scheduledFixture;
  const userIsHome = !activeFixture || activeFixture.homeClubId === managedClubRecord?.id;
  const homeTeamName = activeFixture?.home ?? club;
  const awayTeamName = activeFixture?.away ?? (divisionClubNames.find((name) => name !== club) ?? "Adversário");
  const opponent = activeFixture ? (userIsHome ? activeFixture.away : activeFixture.home) : awayTeamName;
  const opponentFormation = "4-3-3";
  const opponentSquad = useMemo(
    () => (careerDatabase ? buildSquadFromDatabase(careerDatabase, opponent) : null) ?? initialSquad,
    [careerDatabase, opponent],
  );
  const opponentStarters = useMemo(
    () => buildStartingXI(opponentFormation, opponentSquad).map((id) => opponentSquad.find((player) => player.id === id)!).filter(Boolean),
    [opponentSquad, opponentFormation],
  );
  const startersData = useMemo(
    () => starters.map((id) => squad.find((p) => p.id === id)!).filter(Boolean),
    [starters, squad],
  );
  const bench = useMemo(
    () => squad.filter((p) => !starters.includes(p.id)),
    [starters, squad],
  );
  // Old saves have no nominated bench; recover the first eligible reserves deterministically.
  const eligibleMatchBench = (matchBenchIds ?? bench.filter((p) => !participation[p.id]).slice(0, 12).map((p) => p.id))
    .map((id) => squad.find((p) => p.id === id))
    .filter((p): p is Player => !!p && !starters.includes(p.id) && !participation[p.id]);
  const matchStarters = matchPreparation ? matchEnergyAfter(startersData,
    Object.fromEntries(startersData.map((p) => [p.id, Math.max(0, minute - (participation[p.id]?.entered ?? 0))])),
    minute, matchPreparation.weather, marking, matchPreparation.rules) : startersData;
  const selectedPlayerData = squad.find((p) => p.id === selectedPlayer) ?? null;

  const matchKey = `${activeSaveId ?? "career"}|${activeFixture?.id ?? `${round}|${club}|${opponent}`}`;
  const recentForm = [...new Map(Object.values(playerCareers)
    .flatMap((record) => record.matches ?? [])
    .filter((match) => match.minutes > 0)
    .map((match) => [match.key, match] as const)).values()]
    .sort((a, b) => b.round - a.round).slice(0, 5);
  const pointsPerMatch = recentForm.length
    ? recentForm.reduce((sum, match) => sum + (match.homeScore > match.awayScore ? 3 : match.homeScore === match.awayScore ? 1 : 0), 0) / recentForm.length
    : 1.2;
  const averageEnergy = startersData.length ? startersData.reduce((sum, player) => sum + player.energy, 0) / startersData.length : 70;
  const homeMotivation = Math.max(40, Math.min(92, Math.round(64 + (pointsPerMatch - 1.2) * 6 + (averageEnergy - 70) * .08)));
  const awayMotivation = Math.round(58 + (seededRandom(`${matchKey}|away-motivation`)() - .5) * 16);
  const createPreparation = (rules: MatchRules, key = matchKey): MatchPreparation => ({
    matchKey: key,
    rules,
    weather: createMatchWeather(key, rules),
    motivationHome: homeMotivation,
    motivationAway: awayMotivation,
  });
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
        opponentTactics: { style: "Equilibrado", marking: "Normal", focus: "Pelo meio" },
        motivationHome: matchPreparation.motivationHome,
        motivationAway: matchPreparation.motivationAway,
        sentOffHomeIds: events.filter((item) => item.card === "red" && item.scene?.team === "home" && item.actorId !== undefined).map((item) => item.actorId!),
        sentOffAwayIds: events.filter((item) => item.card === "red" && item.scene?.team === "away" && item.actorId !== undefined).map((item) => item.actorId!),
        yellowCardIds: events.filter((item) => item.card === "yellow" && item.actorId !== undefined).map((item) => item.actorId!),
        random: createMinuteRandom(matchPreparation.matchKey, nextMinute),
      });
      setMinute(nextMinute);
      setEvents((current) => [...current, event]);
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
        const finalEvents = [...events, event];
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
        const played: MatchParticipation = Object.keys(participation).length ? participation : Object.fromEntries(starters.map((id) => [id, { entered: 0 }]));
        const finalParticipation: MatchParticipation = { ...played };
        for (const item of finalEvents.filter((entry) => entry.card === "red" && entry.actorId !== undefined)) {
          const playerId = item.actorId!;
          const stint = finalParticipation[playerId] ?? { entered: 0 };
          finalParticipation[playerId] = { ...stint, left: Math.min(stint.left ?? nextMinute, item.minute) };
        }
        const playedMinutes = Object.fromEntries(Object.entries(finalParticipation).map(([id, stint]) => [id, Math.max(0, (stint.left ?? 90) - stint.entered)]));
        setCareerSquad(matchEnergyAfter(squad, playedMinutes, nextMinute, matchPreparation.weather, marking, matchPreparation.rules));
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
          const completedSeason = completeCareerFixture(competitionSeason, activeFixture.id, { home: actualHome, away: actualAway, winnerClubId, playerContributions: contributions }, careerDatabase!);
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
  }, [detailOpen, matchRunning, matchSpeed, minute, opponent, opponentFormation, opponentStarters, page, startersData, formation, manualPositions, style, marking, focus, matchPreparation, events, participation, starters, squad, club, round, homeScore, awayScore, userIsHome, activeFixture, competitionSeason, database, careerDatabase, managedClubRecord, matchKey, coach, budget, activeSaveId, playerCareers]);

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
  const centerTable: TableRow[] = centerCompetitionType === "cup" ? [] : getCompetitionStandings(competitionSeason?.fixtures ?? [], centerCompetitionId)
    .map(({ club, played, wins, draws, losses, goalsFor, goalsAgainst, points }) => ({ club, played, wins, draws, losses, goalsFor, goalsAgainst, points }));
  const centerPlayerStats = getCompetitionPlayerStats(competitionSeason?.fixtures ?? [], centerCompetitionId);
  const centerTopScorers: TopScorer[] = centerPlayerStats.filter((player) => player.goals > 0 && player.played > 0).slice(0, 5)
    .map((player) => ({ name: player.playerName, club: player.club, goals: player.goals, played: player.played }));
  const centerTopRatings: TopRating[] = centerPlayerStats.filter((player) => player.rating !== null && player.played > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5)
    .map((player) => ({ name: player.playerName, club: player.club, rating: player.rating ?? 0, played: player.played, role: careerDatabase?.players.find((item) => item.id === player.playerId)?.primaryPosition ?? "M" }));
  const careerCompetitionData: Record<string, CareerCompetitionView> = {};
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
      seasonYear: metadata.season,
      table: standings,
      fixtures: [...competitionFixtures].sort((a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "") || a.competitionRound - b.competitionRound).map((fixture) => ({
        stadium: database?.clubs.find((item) => item.id === fixture.homeClubId)?.stadiumName ?? "",
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
        .map((player) => ({ name: player.playerName, club: player.club, rating: player.rating ?? 0, played: player.played, role: careerDatabase?.players.find((item) => item.id === player.playerId)?.primaryPosition ?? "M" })),
      matchesPlayed: scored.length,
      goals: scored.reduce((sum, fixture) => sum + (fixture.homeScore ?? 0) + (fixture.awayScore ?? 0), 0),
    };
  }

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
    { icon: "door_out", label: "Configurações", active: page === "settings", onClick: () => navigate("settings") },
  ];

  function navigate(next: Page) {
    setStandingsOpen(false);
    setPage(next);
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
    setPage(nextPage);
  }


  function makeTransferOffer(playerId: string, feeBrl: number, wageSharePercent: number): string {
    if (!database) return "Banco de dados indisponível.";
    const buyer = database.clubs.find((item) => item.name === club);
    if (!buyer) return "Clube comprador não encontrado.";
    const result = proposeTransfer(database, transferNegotiations, {
      id: crypto.randomUUID(), playerId, buyerClubId: buyer.id, feeBrl, wageSharePercent,
    });
    if (!result.negotiation) return result.message;
    setTransferNegotiations((current) => [result.negotiation!, ...current]);
    return result.message;
  }

  function handleTransferAction(id: string, action: TransferNegotiationAction): string {
    const negotiation = transferNegotiations.find((item) => item.id === id);
    if (!negotiation) return "Negociação não encontrada.";
    if (negotiation.buyerClubId !== managedClubRecord?.id) return "Esta negociação pertence a outro clube.";
    if (action.type !== "complete") {
      const result = respondToTransferNegotiation(negotiation, action);
      setTransferNegotiations((current) => current.map((item) => item.id === id ? result.negotiation : item));
      return result.message;
    }
    if (!database || negotiation.status !== "agreed" || negotiation.agreedFeeBrl === undefined) return "A proposta ainda não foi acordada.";
    const gameDate = saves.find((save) => save.id === activeSaveId)?.inGameDate ?? new Date().toISOString().slice(0, 10);
    const result = recruitPlayer(careerDatabase ?? database, squad, club, budget, negotiation.playerId, Object.keys(playerCareers).map(Number), {
      feeBrl: negotiation.agreedFeeBrl,
      kind: negotiation.kind,
      wageSharePercent: negotiation.agreedWageSharePercent ?? 0,
      loanMonths: 6,
      gameDate,
    });
    if (result.squad === squad) return result.message;
    const completed = respondToTransferNegotiation(negotiation, action);
    const nextNegotiations = transferNegotiations.map((item) => item.id === id ? completed.negotiation : item);
    setCareerSquad(result.squad);
    setBudget(result.budget);
    setTransferNegotiations(nextNegotiations);
    const acquired = result.squad.at(-1);
    const nextLoans = { ...loanContracts };
    if (acquired?.sourceId) { if (acquired.loan) nextLoans[acquired.sourceId] = acquired.loan; else delete nextLoans[acquired.sourceId]; }
    setLoanContracts(nextLoans);
    if (activeSaveId) {
      const current = saves.find((save) => save.id === activeSaveId);
      if (current) void persistSave({ ...current, budget: result.budget, updatedAt: new Date().toISOString(), playerCareers, manualPositions,
        progress: { ...progressRef.current, careerSquad: result.squad, budget: result.budget, transferNegotiations: nextNegotiations, loanContracts: nextLoans, playerCareers, manualPositions } });
    }
    return `${result.message} ${completed.message}`;
  }

  function openQuickAction(action: "roster" | "finances" | "trophies" | "training") {
    navigate(action === "roster" ? "hub" : action);
  }

  function trainPlayers(input: Omit<TrainingSessionInput, "season" | "week">) {
    const season = competitionSeason?.season ?? 2026;
    if (trainingSessions.some((session) => session.season === season && session.week === round && session.day === input.day)) {
      return { error: `A sessão de ${input.day.toLocaleLowerCase("pt-BR")} já foi concluída nesta semana.` };
    }
    const result = applyTrainingSession(squad, { ...input, season, week: round });
    if (!result.record) return { error: result.error ?? "Não foi possível aplicar o treino." };
    setCareerSquad(result.squad);
    setTrainingSessions((current) => [...current, result.record!].slice(-240));
    setSyncLabel("Treino aplicado — salvando carreira...");
    return { record: result.record };
  }

  function renderStandings() {
    if (!standingsOpen || !database) return null;
    return <CompetitionCenter database={database} fixtures={fixtures} club={club} competition={division} activeCompetitionId={centerCompetitionId} roundLabel={competitionRoundLabel} careerCompetitionData={careerCompetitionData} table={centerTable} topScorers={centerTopScorers} topRatings={centerTopRatings} round={competitionRound} date={saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11"} onClose={() => setStandingsOpen(false)} />;
  }

  async function synchronizeTransfermarkt(progress: (message: string) => void, signal: AbortSignal, resume = false) {
    if (!database || transfermarktSyncRunning.current) throw new Error("Sincronização indisponível. Aguarde e tente novamente.");
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
      setSyncLabel(cloudPending ? "Transfermarkt salvo localmente — nuvem pendente" : "Catálogo Transfermarkt sincronizado");
      return { clubs: result.clubs, players: result.players, collectedAt: result.collectedAt, cloudPending };
    } finally { transfermarktSyncRunning.current = false; }
  }

  function changeDatabase(next: EditorDatabase) {
    synchronizedCatalog.current = null;
    const revision = ++databaseRevision.current;
    const limited = upgradeEditorDatabase(next);
    setDatabase(limited);
    const smallCacheSaved = writeLocalDatabase(limited, userId);
    const largeCache = cacheDatabase(limited, userId);
    setSyncLabel("Salvando alterações...");
    void largeCache.catch(() => { if (!smallCacheSaved) setSyncLabel("Falha no armazenamento local — não feche a página"); });
    writeCloudDatabase(limited, userId)
      .then(async () => {
        if (revision !== databaseRevision.current) return;
        await cacheDatabase(limited, userId, false).catch(() => undefined);
        setSyncLabel("Alterações salvas no Supabase");
      })
      .catch(async () => {
        if (revision !== databaseRevision.current) return;
        try { await largeCache; setSyncLabel("Salvo localmente — sincronização pendente"); }
        catch { setSyncLabel(smallCacheSaved ? "Salvo localmente — sincronização pendente" : "Falha ao salvar — mantenha a página aberta"); }
      });
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
      .catch(() => setSyncLabel("Carreira salva neste dispositivo"));
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
      .catch(() => setSyncLabel("Carreira salva neste dispositivo"));
  }

  function beginCareer() {
    if (!coach.trim()) return;
    const selectedClub = database?.clubs.find((item) => item.name === club);
    if (!selectedClub || !database) return;
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
    setLoanContracts(initialLoans);
    setLoansOpen(false);
    const initialStarters = buildStartingXI("4-3-3", baseSquad);
    save.progress = { ...progressRef.current, page: "hub", matchPreparation: undefined, activeSaveId: save.id, coach: coach.trim(),
      round: 1, budget: 12624, stadiums: {}, kit: 1, formation: "4-3-3", style: "Equilibrado", marking: "Leve", focus: "Pelo meio",
      careerSquad: baseSquad, starters: initialStarters, playerCareers: {}, trainingSessions: [], manualPositions: {},
      minute: 0, homeScore: 0, awayScore: 0, events: [], substitutionsLeft: 5,
      detailOpen: false, halftimeWaiting: false, matchRunning: false, matchSpeed: 1, defaultMatchSpeed: 1, competitionSeason: newSeason, confidenceHistory: [], confidenceStartBudget: 12624, managerMarket: initializeCareerMarket(database, newSeason, coach.trim(), 12624), jobClubSnapshots: {}, managerAppointments: [{ clubId: selectedClub.id, club: selectedClub.name, startedOn: save.inGameDate }], activeFixtureId: firstFixture?.id, transferNegotiations: [], loanContracts: initialLoans, championHistory: [] };
    setActiveSaveId(save.id);
    setCompetitionSeason(newSeason);
    setManagerMarket(save.progress.managerMarket); setJobClubSnapshots({}); setManagerAppointments(save.progress.managerAppointments ?? []);
    setChampionHistory([]);
    setConfidenceHistory([]);
    setConfidenceStartBudget(12624);
    setActiveFixtureId(firstFixture?.id);
    setTransferNegotiations([]);
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
    setCareerSquad(baseSquad);
    setStarters(initialStarters);
    setPlayerCareers({});
    setTrainingSessions([]);
    setManualPositions({});
    void persistSave(save);
    setPage("hub");
  }

  async function loadCareer(save: CareerSave): Promise<boolean> {
    if (!isCurrentCareerSave(save)) return false;
    const clubId = database?.clubs.find((item) => item.name === save.clubName)?.id ?? save.clubId;
    const storedSeason = save.progress?.competitionSeason ?? (database && clubId ? createCareerSeason(database, clubId, Number(save.inGameDate.slice(0, 4)) || 2026) ?? undefined : undefined);
    const restoredSeason = storedSeason ? applyBrazilianCalendar(save.progress?.competitionSeason ? storedSeason : { ...storedSeason, calendarVersion: undefined }, save.inGameDate) : undefined;
    const resumingMatch = save.progress?.page === "result" || save.progress?.page === "matchOverview";
    const loadingFixture = resumingMatch ? restoredSeason?.fixtures.find(f => f.id === save.progress?.activeFixtureId) : nextCareerFixture(restoredSeason);
    save = { ...save, inGameDate: careerCalendarDate(save.inGameDate, undefined, loadingFixture),
      ...(save.progress ? { progress: { ...save.progress, competitionSeason: restoredSeason } } : {}) };
    // Keep the civil date in the same account-local snapshot used by autosave and loan expiry.
    const normalizedSaves = savesRef.current.map(item => item.id === save.id ? save : item);
    savesRef.current = normalizedSaves;
    setSaves(normalizedSaves);
    if (save.progress?.careerSquad && database) {
      const loans = expireLoans(recoverCareerLoans(save.progress.careerSquad ?? [], save.progress.transferNegotiations ?? [], database, save.progress.loanContracts), save.inGameDate);
      const ownClubId = database.clubs.find(item => item.name === save.clubName)?.id ?? save.clubId;
      const restoredDatabase = databaseWithLoans(databaseWithCompletedTransfers({ ...database, players: database.players.map(player => ({ ...player, loan: undefined })) }, save.progress.transferNegotiations ?? []), loans);
      const restoredSquad = reconcileLoanSquad(save.progress.careerSquad ?? [], buildSquadFromDatabase(restoredDatabase, save.clubName, true) ?? [], loans, ownClubId, Object.keys(save.progress.playerCareers).map(Number));
      const remaining = new Set(restoredSquad.map(player => player.id));
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
    setTrainingSessions(save.progress?.trainingSessions ?? []);
    setManualPositions(save.manualPositions ?? {});
    setTransferNegotiations(save.progress?.transferNegotiations ?? []);
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
      playerCareers,
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
  function storeManagerMarket(next: ManagerMarket) {
    setManagerMarket(next);
    const current = savesRef.current.find(save => save.id === activeSaveId);
    if (current) void persistSave({ ...current, progress: { ...progressRef.current, managerMarket: next }, updatedAt: new Date().toISOString() });
  }
  function applyToManagerJob(clubId: string): string | undefined {
    if (!managerMarket || !careerDatabase || !managedClubRecord) return "Mercado indisponível.";
    const date = savesRef.current.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11";
    const result = applyForManagerJob(managerMarket, careerDatabase, managedClubRecord.id, clubId, date);
    storeManagerMarket(result.market);
    return result.error;
  }
  function declineJob(id: string) {
    if (!managerMarket) return;
    storeManagerMarket(declineManagerJob(managerMarket, id, savesRef.current.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11"));
  }
  async function acceptJob(id: string): Promise<string | undefined> {
    if (jobActionInProgress.current) return "Aguarde a confirmação em andamento.";
    const current = savesRef.current.find(save => save.id === activeSaveId);
    if (!current || !careerDatabase) return "Carreira indisponível.";
    jobActionInProgress.current = true;
    try {
      const result = acceptManagerJob({ ...current, budget, playerCareers, manualPositions, progress: { ...progressRef.current, managerMarket } }, careerDatabase, id);
      if (!result.save) return result.error;
      // Write the account-local snapshot first and prevent autosave of the outgoing club.
      setCareerLoaded(false);
      void persistSave(result.save);
      const loaded = await loadCareer(result.save);
      if (!loaded) return "Não foi possível carregar o clube.";

    } finally { jobActionInProgress.current = false; }
  }

  function openLineup() {
    if (!scheduledFixture) {
      setSyncLabel("Temporada encerrada — não há partidas pendentes nesta carreira.");
      return;
    }
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

  function setPlayerPhoto(id: number, photo: string | null) {
    if (!squad.some((player) => player.id === id)) return;
    const nextSquad = squad.map((player) => player.id === id ? { ...player, photoDataUrl: photo } : player);
    setCareerSquad(nextSquad);
    const current = savesRef.current.find((save) => save.id === activeSaveId);
    if (current) void persistSave({ ...current, updatedAt: new Date().toISOString(), progress: { ...progressRef.current, careerSquad: nextSquad } });
  }

  function applyPlayerMarketAction(id: number, action: MarketAction): string {
    const player = squad.find((item) => item.id === id);
    if (!player) return "Atleta não encontrado.";
    if (player.loan?.status === "active" || player.acquisitionType === "loan") return "Atleta emprestado: use Plantel → Empréstimos para negociar com o proprietário. Venda e renovação definitiva não são permitidas.";
    if (action.type === "offer" && !database?.clubs.some((item) => item.name === action.club && item.name !== club)) return "Clube inválido.";
    const current = playerCareers[id] ?? createPlayerCareer(player, club);
    const gameDate = saves.find((save) => save.id === activeSaveId)?.inGameDate ?? "2026-01-22";
    const result = applyNegotiation(current, action, gameDate, club);
    if (result.record === current) return result.message;
    const nextCareers = { ...playerCareers, [id]: result.record };
    setPlayerCareers(nextCareers);
    if (!result.transfer) {
      void persistCareerExtras(nextCareers, manualPositions);
      return result.message;
    }
    const nextSquad = squad.filter((item) => item.id !== id);
    const nextStarters = starters.filter((starterId) => starterId !== id);
    const nextBudget = budget + Math.round(result.transfer.fee * 1000);
    const nextLoans = { ...loanContracts };
    if (player.sourceId) delete nextLoans[player.sourceId];
    setLoanContracts(nextLoans);
    const nextPositions = { ...manualPositions };
    delete nextPositions[id];
    setCareerSquad(nextSquad);
    setStarters(nextStarters);
    setManualPositions(nextPositions);
    setBudget(nextBudget);
    setSelectedPlayer(null);
    setProfilePlayer(null);
    setSyncLabel(result.message);
    if (activeSaveId) {
      const currentSave = saves.find((save) => save.id === activeSaveId);
      const selectedClub = database?.clubs.find((item) => item.name === club);
      void persistSave({
        id: activeSaveId, name: currentSave?.name ?? `${club} — ${coach}`, managerName: coach,
        clubId: selectedClub?.id ?? currentSave?.clubId ?? "", clubName: club, division, round, budget: nextBudget,
        inGameDate: currentSave?.inGameDate ?? "2026-01-22", updatedAt: new Date().toISOString(),
        playerCareers: nextCareers, manualPositions: nextPositions,
        progress: { ...progressRef.current, careerSquad: nextSquad, starters: nextStarters, playerCareers: nextCareers, manualPositions: nextPositions, budget: nextBudget, loanContracts: nextLoans },
      });
    }
    return result.message;
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
    setParticipation(Object.fromEntries(starters.map((id) => [id, { entered: 0 }])));
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
      ? matchPreparation
      : createPreparation(canonicalRules);
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
    const outgoing = squad.find((player) => player.id === substitutionOut)?.name ?? "Jogador";
    const incoming = squad.find((player) => player.id === id)?.name ?? "Jogador";
    const result = deployLineupPlayer(starters, squad, formation, manualPositions, id, starters.indexOf(substitutionOut), point);
    if (!result) return;
    setParticipation((current) => ({ ...current, [substitutionOut]: { ...(current[substitutionOut] ?? { entered: 0 }), left: minute }, [id]: { entered: minute } }));
    setStarters(result.starters);
    setManualPositions(result.positions);
    setSubstitutionsLeft((value) => value - 1);
    setEvents((current) => [
      ...current,
      { minute, half: minute <= 45 ? 1 : 2, team: "home", text: `${incoming} entrou no lugar de ${outgoing}` },
    ]);
    setSelectedPlayer(null);
    setSubstitutionOut(null);
  }

  if (!database || !hydrationDone) {
    return (
      <div className="grid h-dvh overflow-hidden place-items-center bg-[#090a0f] bg-[radial-gradient(ellipse_at_top,#202129,#090a0f_70%)] font-[Arial] text-sm text-[#eef0f4]">
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#15161d] px-5 py-4 text-[#eef0f4] shadow-2xl">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#d4ad64] shadow-[0_0_14px_#d4ad6480]" aria-hidden="true" />
          Carregando suas carreiras...
        </div>
      </div>
    );
  }

  if (activeSaveId && !careerLoaded) {
    return <div className="grid min-h-svh place-items-center bg-[#0a100e] text-white" role="status">Carregando a carreira selecionada...</div>;
  }

  if (page === "menu") {
    return (
      <StartMenuScreen
        email={email}
        onSignOut={onSignOut}
        saveCount={saves.length}
        syncLabel={syncLabel}
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
    return <EditorScreen userId={userId} database={database} syncLabel={syncLabel} onChange={changeDatabase} onBack={() => leaveActiveCareer("menu")} />;
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
          <HubScreen
            kit={kit}
            club={club}
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

  if (page === "hub")
    return (
      <>
        <CareerWorkspace {...workspace} />
        {renderStandings()}
        {loansOpen && careerDatabase && <LoanManager players={careerDatabase.players.filter(player => player.loan && [player.loan.owner.clubId, player.loan.borrower.clubId].includes(database?.clubs.find(item => item.name === club)?.id))} clubId={database?.clubs.find(item => item.name === club)?.id ?? ""} date={saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-22"} onClose={() => setLoansOpen(false)} onPropose={(id, months, fee, share) => {
          const player = careerDatabase.players.find(item => item.id === id);
          if (!player?.loan) return "Empréstimo não encontrado.";
          const date = saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-22";
          const result = proposeLoanExtension(player.loan, date, budget, player.salaryMonthlyBrl, database?.clubs.find(item => item.name === club)?.id ?? "", months, fee, share);
          if (result.loan === player.loan) return result.message;
          const nextLoans = { ...loanContracts, [id]: result.loan };
          const nextSquad = squad.map(item => item.sourceId === id ? { ...item, loan: result.loan, loanExpiresOn: result.loan.endsOn ?? undefined } : item);
          setLoanContracts(nextLoans); setCareerSquad(nextSquad); setBudget(result.budget);
          const current = savesRef.current.find(save => save.id === activeSaveId);
          if (current) void persistSave({ ...current, budget: result.budget, updatedAt: new Date().toISOString(), progress: { ...progressRef.current, loanContracts: nextLoans, careerSquad: nextSquad, budget: result.budget } });
          return result.message;
        }}/>}
        {profilePlayer !== null && (() => {
          const player = squad.find((item) => item.id === profilePlayer);
          if (!player) return null;
          const record = playerCareers[profilePlayer] ?? createPlayerCareer(player, club);
          return <CareerPlayerProfile key={player.id} player={player} club={club} record={record} clubs={database?.clubs.map((item) => item.name) ?? []} date={saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11"} onMarketAction={(action) => applyPlayerMarketAction(profilePlayer, action)} onPhotoChange={(photo) => setPlayerPhoto(player.id, photo)} onClose={() => setProfilePlayer(null)} />;
        })()}
      </>
    );

  if (page === "settings") return <CareerWorkspace {...workspace} title="Configurações"><section className={surface.screen} data-management-surface="settings"><div className={`${surface.content} space-y-4`}><ManagementHeader title="Configurações" eyebrow="Carreira / preferências" icon="pencil" description="Personalize sua experiência ou volte ao menu inicial." /><div className={surface.panel}><h2 className="text-lg font-black">Partida</h2><label className="mt-4 block text-sm font-bold">Velocidade padrão para novas partidas <select value={defaultMatchSpeed} onChange={(e) => setDefaultMatchSpeed(Number(e.target.value) as 1 | 2 | 4)} className="ml-3 rounded-lg border border-[#d5e0d8] bg-white p-2"><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label><p className="mt-2 text-xs text-[#718477]">Salva na carreira; pode ser alterada durante cada jogo.</p></div><TransfermarktSettings userId={userId} onSynchronize={synchronizeTransfermarkt} /><div className={surface.panel}><h2 className="text-lg font-black">Sessão</h2><p className="mt-1 text-sm text-[#718477]">A carreira é salva antes de voltar ao menu inicial.</p><button onClick={() => leaveActiveCareer("menu")} className="mt-4 rounded-lg bg-[#246e43] px-4 py-2 text-xs font-bold text-white">Voltar ao menu inicial</button></div></div></section></CareerWorkspace>;

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
          {(["juniors", "teams", "search", "coaches", "history"] as string[]).includes(managementSection) ? <WorldScreens embedded championHistory={championHistory} section={managementSection as "juniors" | "teams" | "search" | "coaches" | "history"} database={managementDatabase ?? database} club={club} coach={coach} budget={budget} squad={squad} records={playerCareers} negotiations={transferNegotiations.filter(deal => deal.buyerClubId === managedClubRecord?.id)} historyView={historyView} onHistoryView={setHistoryView} onOpenPlayer={openPlayerProfile} onTransferOffer={makeTransferOffer} onTransferAction={handleTransferAction} onBack={() => navigate("hub")} /> : <ClubSectionScreen
            jobs={managerMarket && careerDatabase && managedClubRecord ? { market: managerMarket, database: careerDatabase, currentClubId: managedClubRecord.id, date: saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11", appointments: managerAppointments, onApply: applyToManagerJob, onDecline: declineJob, onAccept: acceptJob } : undefined}
            championHistory={championHistory}
            stadium={managedClubRecord ? stadiums[managedClubRecord.id] : undefined}
            onStadiumPriceChange={changeStadiumPrice}
            onStadiumExpand={expandStadium}
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
        </CareerWorkspace>
        {renderStandings()}
        {profilePlayer !== null && (() => {
          const player = squad.find((item) => item.id === profilePlayer);
          if (!player) return null;
          const record = playerCareers[profilePlayer] ?? createPlayerCareer(player, club);
          return <CareerPlayerProfile key={player.id} player={player} club={club} record={record} clubs={database?.clubs.map((item) => item.name) ?? []} date={saves.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11"} onMarketAction={(action) => applyPlayerMarketAction(profilePlayer, action)} onPhotoChange={(photo) => setPlayerPhoto(player.id, photo)} onClose={() => setProfilePlayer(null)} />;
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
            substitutionsLeft={substitutionsLeft}
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
      onContinue={() => {
        const nextRound = round + 1;
        const nextFixture = nextCareerFixture(competitionSeason);
        setRound(nextRound);
        setActiveFixtureId(nextFixture?.id);
        const date = careerCalendarDate(savesRef.current.find(save => save.id === activeSaveId)?.inGameDate ?? "2026-01-11", competitionSeason, nextFixture);
        const nextManagerMarket = managerMarket ? refreshJobOffers(managerMarket, date) : undefined;
        setManagerMarket(nextManagerMarket);
        const nextLoans = expireLoans(loanContracts, date);
        const ownClubId = database?.clubs.find(item => item.name === club)?.id ?? "";
        const nextDatabase = careerDatabase ? databaseWithLoans(careerDatabase, nextLoans) : null;
        const nextSquad = reconcileLoanSquad(squad, nextDatabase ? buildSquadFromDatabase(nextDatabase, club, true) ?? [] : [], nextLoans, ownClubId, Object.keys(playerCareers).map(Number));
        const remaining = new Set(nextSquad.map(player => player.id));
        const nextStarters = starters.filter(id => remaining.has(id));
        const nextBench = matchBenchIds?.filter(id => remaining.has(id));
        const nextPositions = Object.fromEntries(Object.entries(manualPositions).filter(([id]) => remaining.has(Number(id))));
        setLoanContracts(nextLoans); setCareerSquad(nextSquad); setStarters(nextStarters); setMatchBenchIds(nextBench); setManualPositions(nextPositions);
        setProfilePlayer(null); setSelectedPlayer(null);
        saveCurrentCareer(nextRound, { managerMarket: nextManagerMarket, activeFixtureId: nextFixture?.id, loanContracts: nextLoans, careerSquad: nextSquad, starters: nextStarters, matchBenchIds: nextBench, manualPositions: nextPositions }, date);
        setPage("hub");
      }}
    />
    </>
  );
}
