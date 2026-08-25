"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/ui/app-shell";
import { StandingsModal } from "@/components/ui/standings-modal";
import { PlayerProfileModal } from "@/components/ui/player-profile-modal";
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
import { ClubSectionScreen, type ClubSection } from "@/components/screens/club-section-screen";
import {
  squad as initialSquad,
  buildStartingXI,
  buildRoundFixtures,
  type DivisionKey,
  type Player,
  type TableRow,
  type TopScorer,
  type TopRating,
} from "@/lib/game/mock-data";
import { buildSquadFromDatabase, createDefaultDatabase, upgradeEditorDatabase, type CareerSave, type EditorDatabase } from "@/lib/game/editor-data";
import { createPlayerCareer, type ManualPosition, type PlayerCareerRecord } from "@/lib/game/career";
import { formationSlots, playerFitAtPosition } from "@/lib/game/formations";
import { canResumeSavedCareer, isMenuPage } from "@/lib/game/session";
import {
  deleteCloudSave,
  readCloudDatabase,
  readCloudCareer,
  readCloudSaves,
  readLocalDatabase,
  readLocalSaves,
  writeCloudDatabase,
  writeCloudCareer,
  writeCloudSave,
  writeLocalDatabase,
  writeLocalSaves,
} from "@/lib/game/persistence";

type Page = "menu" | "new" | "saves" | "editor" | "hub" | "lineup" | "matchOverview" | "result" | "agenda" | "stadium" | "juniors" | "teams" | "search" | "coaches" | "history" | "finances" | "trophies" | "training";

type SessionSnapshot = {
  page: Page;
  activeSaveId: string | null;
  coach: string;
  club: string;
  division: DivisionKey;
  round: number;
  budget: number;
  formation: string;
  style: string;
  marking: string;
  focus: string;
  starters: number[];
  careerSquad: Player[] | null;
  playerCareers: Record<number, PlayerCareerRecord>;
  manualPositions: Record<number, ManualPosition>;
  minute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  substitutionsLeft: number;
  detailOpen: boolean;
  matchRunning: boolean;
  matchSpeed: 1 | 2 | 4;
  halftimeWaiting: boolean;
};

const SESSION_KEY = "futmanager.session.v1";
const validPages = new Set<Page>(["menu", "new", "saves", "editor", "hub", "lineup", "matchOverview", "result", "agenda", "stadium", "juniors", "teams", "search", "coaches", "history", "finances", "trophies", "training"]);

function readSessionSnapshot(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionSnapshot;
    return validPages.has(parsed.page) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSessionSnapshot(snapshot: SessionSnapshot) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
}

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

export function GameBoard() {
  const [page, setPage] = useState<Page>("menu");
  const [database, setDatabase] = useState<EditorDatabase | null>(null);
  const [saves, setSaves] = useState<CareerSave[]>([]);
  const [activeSaveId, setActiveSaveId] = useState<string | null>(null);
  const [hydrationDone, setHydrationDone] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const sessionReady = useRef(false);
  const sessionRestored = useRef(false);
  const sessionRestoreVersion = useRef(0);
  const [syncLabel, setSyncLabel] = useState("Preparando banco de dados...");
  const [coach, setCoach] = useState("");
  const [division, setDivision] = useState<DivisionKey>("Série A");
  const [club, setClub] = useState<string>("Flamengo");
  const [round, setRound] = useState(1);
  const [budget, setBudget] = useState(12624);
  const [careerSquad, setCareerSquad] = useState<typeof initialSquad | null>(null);

  const [formation, setFormation] = useState("4-3-3");
  const [style, setStyle] = useState("Equilibrado");
  const [marking, setMarking] = useState("Leve");
  const [focus, setFocus] = useState("Pelo meio");

  useEffect(() => {
    async function hydrate() {
      await Promise.resolve();
      const localDatabase = upgradeEditorDatabase(readLocalDatabase() ?? createDefaultDatabase());
      const localSaves = readLocalSaves();
      setDatabase(localDatabase);
      setSaves(localSaves);
      writeLocalDatabase(localDatabase);
      setSyncLabel("Dados locais carregados");

      try {
        const [cloudDatabase, cloudSaves] = await Promise.all([readCloudDatabase(), readCloudSaves()]);
        if (cloudDatabase) {
          const upgradedCloudDatabase = upgradeEditorDatabase(cloudDatabase);
          setDatabase(upgradedCloudDatabase);
          writeLocalDatabase(upgradedCloudDatabase);
        } else {
          await writeCloudDatabase(localDatabase);
        }
        if (cloudSaves.length) {
          setSaves(cloudSaves);
          writeLocalSaves(cloudSaves);
        } else if (localSaves.length) {
          await Promise.all(localSaves.map((save) => writeCloudSave(save)));
        }
        setSyncLabel("Supabase conectado");
      } catch {
        setSyncLabel("Modo local — Supabase indisponível");
      } finally {
        setHydrationDone(true);
      }
    }
    void hydrate();
  }, []);

  const baseSquad = useMemo(() => {
    if (!database) return initialSquad;
    return buildSquadFromDatabase(database, club) ?? initialSquad;
  }, [database, club]);
  const squad = careerSquad ?? baseSquad;
  const [starters, setStarters] = useState<number[]>(() =>
    buildStartingXI("4-3-3", squad),
  );
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<number | null>(null);
  const [playerCareers, setPlayerCareers] = useState<Record<number, PlayerCareerRecord>>({});
  const [manualPositions, setManualPositions] = useState<Record<number, ManualPosition>>({});

  const [minute, setMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [substitutionsLeft, setSubstitutionsLeft] = useState(5);
  const [detailOpen, setDetailOpen] = useState(false);
  const [matchRunning, setMatchRunning] = useState(false);
  const [matchSpeed, setMatchSpeed] = useState<1 | 2 | 4>(1);
  const [halftimeWaiting, setHalftimeWaiting] = useState(false);
  const [substitutionOut, setSubstitutionOut] = useState<number | null>(null);
  const [standingsOpen, setStandingsOpen] = useState(false);

  useEffect(() => {
    if (!hydrationDone || !database || sessionRestored.current) return;
    sessionRestored.current = true;
    const snapshot = readSessionSnapshot();
    if (!snapshot) {
      sessionReady.current = true;
      queueMicrotask(() => setSessionResolved(true));
      return;
    }

    if (!canResumeSavedCareer(snapshot.page, snapshot.activeSaveId, saves.map((save) => save.id))) {
      sessionReady.current = true;
      if (isMenuPage(snapshot.page)) {
        queueMicrotask(() => setPage(snapshot.page));
      }
      queueMicrotask(() => setSessionResolved(true));
      return;
    }

    const session = snapshot;
    const activeSave = saves.find((save) => save.id === session.activeSaveId)!;
    const restoreVersion = sessionRestoreVersion.current;
    void loadCareer(activeSave, true).then((loadedFromBackend) => {
      if (sessionRestoreVersion.current !== restoreVersion) return;
      setCoach(session.coach || activeSave.managerName);
      setClub(session.club || activeSave.clubName);
      setDivision(session.division || activeSave.division);
      setRound(session.round || activeSave.round);
      setBudget(session.budget ?? activeSave.budget);
      setFormation(session.formation || "4-3-3");
      setStyle(session.style || "Equilibrado");
      setMarking(session.marking || "Leve");
      setFocus(session.focus || "Pelo meio");
      if (session.starters?.length === 11) setStarters(session.starters);
      if (!loadedFromBackend && session.careerSquad?.length) setCareerSquad(session.careerSquad);
      setPlayerCareers(session.playerCareers ?? activeSave.playerCareers ?? {});
      setManualPositions(session.manualPositions ?? activeSave.manualPositions ?? {});
      setMinute(session.minute ?? 0);
      setHomeScore(session.homeScore ?? 0);
      setAwayScore(session.awayScore ?? 0);
      setEvents(session.events ?? []);
      setSubstitutionsLeft(session.substitutionsLeft ?? 5);
      setDetailOpen(session.detailOpen ?? false);
      setMatchSpeed(session.matchSpeed ?? 1);
      setHalftimeWaiting(session.halftimeWaiting ?? false);
      setMatchRunning(session.page === "matchOverview" ? (session.matchRunning ?? false) : false);
      setPage(session.page);
      sessionReady.current = true;
      setSessionResolved(true);
    });
    // A restauração é executada uma única vez; depender de loadCareer recriaria a sessão a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database, hydrationDone, saves]);

  useEffect(() => {
    if (!hydrationDone || !database || !sessionReady.current) return;
    writeSessionSnapshot({
      page, activeSaveId, coach, club, division, round, budget, formation, style, marking, focus,
      starters, careerSquad, playerCareers, manualPositions, minute, homeScore, awayScore, events,
      substitutionsLeft, detailOpen, matchRunning, matchSpeed, halftimeWaiting,
    });
  }, [activeSaveId, awayScore, budget, careerSquad, club, coach, database, detailOpen, division, events, focus, formation, halftimeWaiting, homeScore, hydrationDone, manualPositions, marking, matchRunning, matchSpeed, minute, page, playerCareers, round, starters, style, substitutionsLeft]);

  const divisionClubNames = useMemo(() => database?.clubs.filter((item) => item.division === division).map((item) => item.name) ?? [], [database, division]);
  const opponent = divisionClubNames.find((name) => name !== club) ?? divisionClubNames[1] ?? "Adversário";
  const startersData = useMemo(
    () => starters.map((id) => squad.find((p) => p.id === id)!).filter(Boolean),
    [starters, squad],
  );
  const bench = useMemo(
    () => squad.filter((p) => !starters.includes(p.id)),
    [starters, squad],
  );
  const selectedPlayerData = squad.find((p) => p.id === selectedPlayer) ?? null;

  const strength = Math.round(
    startersData.reduce((sum, p, index) => {
      const position = manualPositions[p.id] ?? formationSlots[formation]?.[index] ?? { left: 50, top: 50 };
      const fit = playerFitAtPosition(p, formation, position, index);
      return sum + Math.max(1, p.overall - fit.penalty) * (p.energy / 100);
    }, 0) /
      (startersData.length || 1),
  );
  const possession = Math.min(78, Math.max(35, 50 + strength - 74));
  const shots = Math.max(1, Math.floor(minute / 10) + Math.floor(homeScore * 3));
  const onGoalStat = `${Math.max(1, Math.floor(shots * 0.6))}/${Math.max(0, shots - Math.floor(shots * 0.6))}`;
  const tackles = Math.max(2, Math.floor(minute / 8));
  const passErrors = Math.max(1, Math.floor((100 - strength) / 6));

  const fixtures = useMemo(
    () => buildRoundFixtures(division, club, opponent, homeScore, awayScore),
    [division, club, opponent, homeScore, awayScore],
  );

  useEffect(() => {
    if (page !== "matchOverview" || !matchRunning || detailOpen || minute >= 90) return;
    const timer = window.setTimeout(() => {
      const nextMinute = Math.min(90, minute + 1);
      const strengthFactor = (strength - 74) * 0.001;
      const homeGoal = Math.random() < Math.max(0.006, 0.016 + strengthFactor);
      const awayGoal = Math.random() < Math.max(0.006, 0.014 - strengthFactor / 2);
      const card = Math.random() < 0.018;
      const half: 1 | 2 = nextMinute <= 45 ? 1 : 2;

      setMinute(nextMinute);
      setEvents((current) => {
        const updated = [...current];
        if (homeGoal) {
          const attackingPlayers = startersData.filter((player) => player.position === "A" || player.position === "M");
          const scorerPool = attackingPlayers.length ? attackingPlayers : startersData;
          const scorer = scorerPool[Math.floor(Math.random() * scorerPool.length)]?.name ?? "Atacante";
          updated.push({ minute: nextMinute, half, text: `Gol de ${scorer}` });
        }
        if (awayGoal) updated.push({ minute: nextMinute, half, text: `Gol do ${opponent}` });
        if (card) {
          const player = startersData[Math.floor(Math.random() * startersData.length)];
          if (player) updated.push({ minute: nextMinute, half, text: player.name, card: "yellow" });
        }
        return updated;
      });
      if (homeGoal) setHomeScore((score) => score + 1);
      if (awayGoal) setAwayScore((score) => score + 1);
      if (nextMinute === 45) {
        setMatchRunning(false);
        setHalftimeWaiting(true);
      }
      if (nextMinute === 90) {
        setMatchRunning(false);
        setBudget((value) => value + 151);
      }
    }, 700 / matchSpeed);
    return () => window.clearTimeout(timer);
  }, [detailOpen, matchRunning, matchSpeed, minute, opponent, page, startersData, strength]);

  useEffect(() => {
    if (page !== "matchOverview" || minute !== 90 || detailOpen) return;
    const timer = window.setTimeout(() => setPage("result"), 1800);
    return () => window.clearTimeout(timer);
  }, [detailOpen, minute, page]);

  const table: TableRow[] = useMemo(() => {
    const played = page === "result" ? 1 : 0;
    return divisionClubNames
      .map((name) => {
        const isClub = name === club;
        const won = isClub ? homeScore > awayScore : name === opponent ? awayScore > homeScore : false;
        const draw = isClub ? homeScore === awayScore && played === 1 : false;
        return {
          club: name,
          played,
          wins: won ? played : 0,
          draws: draw ? played : 0,
          losses: played && !won && !draw ? played : 0,
          goalsFor: isClub ? homeScore : name === opponent ? awayScore : 0,
          goalsAgainst: isClub ? awayScore : name === opponent ? homeScore : 0,
          points: won ? 3 : draw ? 1 : 0,
        };
      })
      .sort((a, b) => b.points - a.points || a.club.localeCompare(b.club));
  }, [divisionClubNames, club, opponent, homeScore, awayScore, page]);

  const divisionClubIds = new Set(database?.clubs.filter((item) => item.division === division).map((item) => item.id) ?? []);
  const clubNamesById = Object.fromEntries(database?.clubs.map((item) => [item.id, item.name]) ?? []);
  const divisionPlayers = database?.players.filter((player) => divisionClubIds.has(player.clubId)) ?? [];
  const topScorers: TopScorer[] = [...divisionPlayers]
    .sort((a, b) => b.goals - a.goals || b.overall - a.overall)
    .slice(0, 5)
    .map((player) => ({ name: player.name, club: clubNamesById[player.clubId] ?? "-", goals: player.goals, played: round - 1 }));
  const topRatings: TopRating[] = [...divisionPlayers]
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0) || b.overall - a.overall)
    .slice(0, 5)
    .map((player) => ({ name: player.name, club: clubNamesById[player.clubId] ?? "-", rating: player.averageRating ?? 0, played: round - 1, role: player.primaryPosition }));

  const nav: NavItem[] = [
    { icon: "calendar", label: "Agenda", active: page === "agenda", onClick: () => navigate("agenda") },
    { icon: "data_table", label: "Tabelas", active: standingsOpen, onClick: () => setStandingsOpen(true) },
    { icon: "sport", label: "Estádio", active: page === "stadium", onClick: () => navigate("stadium") },
    { icon: "user_green", label: "Juniores", active: page === "juniors", onClick: () => navigate("juniors") },
    { icon: "t_shirt_print", label: "Times", active: page === "teams", onClick: () => navigate("teams") },
    { icon: "magnifier", label: "Procura", active: page === "search", onClick: () => navigate("search") },
    { icon: "user_suit", label: "Técnicos", active: page === "coaches", onClick: () => navigate("coaches") },
    { icon: "clock_history_frame", label: "História", active: page === "history", onClick: () => navigate("history") },
    { icon: "door_out", label: "Menu", onClick: () => { saveCurrentCareer(); leaveActiveCareer("menu"); } },
  ];

  function navigate(next: Page) {
    setStandingsOpen(false);
    setPage(next);
  }

  function leaveActiveCareer(nextPage: Extract<Page, "menu" | "new" | "saves" | "editor">) {
    sessionRestoreVersion.current += 1;
    setActiveSaveId(null);
    setPage(nextPage);
  }

  function openQuickAction(action: "roster" | "finances" | "trophies" | "training") {
    navigate(action === "roster" ? "hub" : action);
  }

  function trainPlayer(id: number, focusName: string) {
    const updatedSquad = squad.map((player) => {
      if (player.id !== id) return player;
      if (focusName === "Recuperação") return { ...player, energy: Math.min(100, player.energy + 15) };
      const improved = player.energy >= 20 && player.overall < 99 && Math.random() < 0.3;
      return { ...player, energy: Math.max(0, player.energy - 6), overall: player.overall + (improved ? 1 : 0) };
    });
    setCareerSquad(updatedSquad);
    if (!activeSaveId) return;
    setSyncLabel("Salvando sessão de treino...");
    writeCloudCareer(activeSaveId, updatedSquad, starters, playerCareers, manualPositions, club)
      .then(() => setSyncLabel("Treino salvo no Supabase"))
      .catch(() => setSyncLabel("Treino aplicado localmente — sincronização pendente"));
  }

  function changePlayerPhoto(id: number, photoDataUrl: string | null) {
    setCareerSquad((current) => (current ?? squad).map((player) => player.id === id ? { ...player, photoDataUrl } : player));
    setSyncLabel(photoDataUrl ? "Foto do jogador adicionada neste dispositivo" : "Foto do jogador removida");
  }

  function renderStandings() {
    if (!standingsOpen) return null;
    return <StandingsModal club={club} competition={division} table={table} topScorers={topScorers} topRatings={topRatings} onClose={() => setStandingsOpen(false)} />;
  }

  function changeDatabase(next: EditorDatabase) {
    const limited = upgradeEditorDatabase(next);
    setDatabase(limited);
    writeLocalDatabase(limited);
    setSyncLabel("Salvando alterações...");
    writeCloudDatabase(limited)
      .then(() => setSyncLabel("Alterações salvas no Supabase"))
      .catch(() => setSyncLabel("Salvo localmente — sincronização pendente"));
  }

  function persistSave(nextSave: CareerSave): Promise<void> {
    const nextSaves = [nextSave, ...saves.filter((item) => item.id !== nextSave.id)];
    setSaves(nextSaves);
    writeLocalSaves(nextSaves);
    return writeCloudSave(nextSave)
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
    }).then(() => writeCloudCareer(activeSaveId, squad, nextStarters, nextCareers, nextPositions, club))
      .then(() => setSyncLabel("Carreira e elenco sincronizados"))
      .catch(() => setSyncLabel("Carreira salva neste dispositivo"));
  }

  function beginCareer() {
    if (!coach.trim()) return;
    const selectedClub = database?.clubs.find((item) => item.name === club);
    const now = new Date().toISOString();
    const save: CareerSave = {
      id: crypto.randomUUID(),
      name: `${club} — ${coach.trim()}`,
      managerName: coach.trim(),
      clubId: selectedClub?.id ?? "",
      clubName: club,
      division,
      round: 1,
      budget,
      inGameDate: "2026-01-22",
      updatedAt: now,
      playerCareers: {},
      manualPositions: {},
    };
    setActiveSaveId(save.id);
    setRound(1);
    const initialStarters = buildStartingXI(formation, baseSquad);
    setCareerSquad(baseSquad);
    setStarters(initialStarters);
    setPlayerCareers({});
    setManualPositions({});
    void persistSave(save)
      .then(() => writeCloudCareer(save.id, baseSquad, initialStarters, {}, {}, club))
      .then(() => setSyncLabel("Nova carreira criada no Supabase"))
      .catch(() => setSyncLabel("Carreira criada localmente"));
    setPage("hub");
  }

  async function loadCareer(save: CareerSave, restoring = false): Promise<boolean> {
    if (!restoring) sessionRestoreVersion.current += 1;
    const restoreVersion = sessionRestoreVersion.current;
    const canApply = () => !restoring || sessionRestoreVersion.current === restoreVersion;
    if (!canApply()) return false;
    setActiveSaveId(save.id);
    setCoach(save.managerName);
    setClub(save.clubName);
    setDivision(save.division);
    setRound(save.round);
    setBudget(save.budget);
    setPlayerCareers(save.playerCareers ?? {});
    setManualPositions(save.manualPositions ?? {});
    setHomeScore(0);
    setAwayScore(0);
    setPage("hub");
    try {
      const cloud = await readCloudCareer(save.id);
      if (!canApply()) return false;
      if (cloud) {
        setCareerSquad(cloud.squad);
        const savedPlayers = cloud.starters.map((id) => cloud.squad.find((player) => player.id === id)!).filter(Boolean);
        setStarters(savedPlayers.length === 11 ? buildStartingXI(formation, savedPlayers) : buildStartingXI(formation, cloud.squad));
        setPlayerCareers(cloud.playerCareers);
        setManualPositions(cloud.manualPositions);
        setSyncLabel("Carreira carregada do Supabase");
        return true;
      } else {
        const snapshot = (database ? buildSquadFromDatabase(database, save.clubName) : null) ?? initialSquad;
        const initialStarters = buildStartingXI(formation, snapshot);
        setCareerSquad(snapshot);
        setStarters(initialStarters);
        await writeCloudCareer(save.id, snapshot, initialStarters, save.playerCareers ?? {}, save.manualPositions ?? {}, save.clubName);
        setSyncLabel("Carreira migrada para o banco de dados");
        return true;
      }
    } catch {
      if (!canApply()) return false;
      setCareerSquad(null);
      setSyncLabel("Carreira local — sincronização pendente");
      return false;
    }
  }

  function removeCareer(id: string) {
    if (!window.confirm("Excluir esta carreira definitivamente?")) return;
    const next = saves.filter((save) => save.id !== id);
    setSaves(next);
    writeLocalSaves(next);
    deleteCloudSave(id).catch(() => undefined);
  }

  function saveCurrentCareer(nextRound = round) {
    if (!activeSaveId) return;
    const current = saves.find((save) => save.id === activeSaveId);
    const selectedClub = database?.clubs.find((item) => item.name === club);
    persistSave({
      id: activeSaveId,
      name: current?.name ?? `${club} — ${coach}`,
      managerName: coach,
      clubId: selectedClub?.id ?? current?.clubId ?? "",
      clubName: club,
      division,
      round: nextRound,
      budget,
      inGameDate: current?.inGameDate ?? "2026-01-22",
      updatedAt: new Date().toISOString(),
      playerCareers,
      manualPositions,
    });
  }

  function changeFormation(next: string) {
    setFormation(next);
    const nextStarters = buildStartingXI(next, squad);
    setStarters(nextStarters);
    setManualPositions({});
    void persistCareerExtras(playerCareers, {}, nextStarters);
    setSelectedPlayer(null);
  }

  function swap(id: number) {
    if (selectedPlayer === null) return setSelectedPlayer(id);
    const selectedIsStarter = starters.includes(selectedPlayer);
    const targetIsStarter = starters.includes(id);
    if (selectedIsStarter === targetIsStarter) return setSelectedPlayer(id);
    setStarters((current) =>
      current.map((playerId) =>
        playerId === selectedPlayer ? id : playerId,
      ),
    );
    setSelectedPlayer(null);
  }

  function openLineup() {
    const arranged = buildStartingXI(formation, squad);
    setStarters(arranged);
    setManualPositions({});
    setSelectedPlayer(null);
    void persistCareerExtras(playerCareers, {}, arranged);
    setPage("lineup");
  }

  function openPlayerProfile(id: number) {
    const player = squad.find((item) => item.id === id);
    if (!player) return;
    setSelectedPlayer(id);
    setPlayerCareers((current) => current[id] ? current : { ...current, [id]: createPlayerCareer(player, club) });
    setProfilePlayer(id);
  }

  function updatePlayerCareer(id: number, record: PlayerCareerRecord) {
    const next = { ...playerCareers, [id]: record };
    setPlayerCareers(next);
    void persistCareerExtras(next, manualPositions);
  }

  function movePlayers(positions: Record<number, ManualPosition>) {
    const next = { ...manualPositions, ...positions };
    setManualPositions(next);
    void persistCareerExtras(playerCareers, next);
  }

  function resetManualPositions() {
    setManualPositions({});
    void persistCareerExtras(playerCareers, {});
  }

  function startMatch() {
    setMinute(0);
    setHomeScore(0);
    setAwayScore(0);
    setEvents([]);
    setSubstitutionsLeft(5);
    setSubstitutionOut(null);
    setDetailOpen(false);
    setHalftimeWaiting(false);
    setMatchSpeed(1);
    setMatchRunning(true);
    setPage("matchOverview");
  }

  function openMatchTactics() {
    setMatchRunning(false);
    setDetailOpen(true);
    setSelectedPlayer(null);
    setSubstitutionOut(null);
  }

  function closeMatchTactics() {
    setDetailOpen(false);
    if (minute < 90) {
      setHalftimeWaiting(false);
      setMatchRunning(true);
    }
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
      { minute, half: minute <= 45 ? 1 : 2, text: `Formação alterada para ${next}` },
    ]);
    void persistCareerExtras(playerCareers, {}, arranged);
  }

  function selectMatchPlayer(id: number) {
    if (starters.includes(id)) {
      setSubstitutionOut(id);
      setSelectedPlayer(id);
      return;
    }
    setSelectedPlayer(id);
  }

  function substitute(id: number) {
    if (substitutionOut === null || substitutionsLeft === 0 || starters.includes(id)) return;
    const outgoing = squad.find((player) => player.id === substitutionOut)?.name ?? "Jogador";
    const incoming = squad.find((player) => player.id === id)?.name ?? "Jogador";
    setStarters((current) =>
      current.map((playerId) => (playerId === substitutionOut ? id : playerId)),
    );
    setSubstitutionsLeft((value) => value - 1);
    setEvents((current) => [
      ...current,
      { minute, half: minute <= 45 ? 1 : 2, text: `${incoming} entrou no lugar de ${outgoing}` },
    ]);
    setSelectedPlayer(null);
    setSubstitutionOut(null);
  }

  if (!database || !sessionResolved) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f7f2] bg-[linear-gradient(rgba(247,247,242,.88),rgba(247,247,242,.92)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-center font-[Arial] text-sm text-[#29402f]">
        <div className="flex items-center gap-3 rounded-lg border border-[#c8d8ca] bg-white/90 px-5 py-4 shadow-lg">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#16c864]" aria-hidden="true" />
          Restaurando sua carreira...
        </div>
      </div>
    );
  }

  if (page === "menu") {
    return (
      <StartMenuScreen
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
    return <EditorScreen database={database} syncLabel={syncLabel} onChange={changeDatabase} onBack={() => leaveActiveCareer("menu")} />;
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

  if (page === "hub")
    return (
      <>
        <AppShell nav={nav} teamName={club} date="22/01/2026">
          <HubScreen
            club={club}
            coach={coach}
            budget={budget}
            opponent={opponent}
            round={round}
            competition="Campeonato Estadual"
            squad={squad}
            starters={starters}
            selectedPlayer={selectedPlayerData}
            onSelectPlayer={setSelectedPlayer}
            onOpenPlayer={openPlayerProfile}
            onEscalar={openLineup}
            onQuickAction={openQuickAction}
          />
        </AppShell>
        {renderStandings()}
        {profilePlayer !== null && (() => {
          const player = squad.find((item) => item.id === profilePlayer);
          if (!player) return null;
          const record = playerCareers[profilePlayer] ?? createPlayerCareer(player, club);
          return <PlayerProfileModal player={player} club={club} record={record} onChange={(next) => updatePlayerCareer(profilePlayer, next)} onClose={() => setProfilePlayer(null)} />;
        })()}
      </>
    );

  const managementSection = sectionByPage[page];
  if (managementSection)
    return (
      <>
        <AppShell nav={nav} teamName={club} date="22/01/2026">
          <ClubSectionScreen
            section={managementSection}
            database={database}
            club={club}
            coach={coach}
            round={round}
            budget={budget}
            squad={squad}
            fixtures={fixtures}
            onBack={() => navigate("hub")}
            onOpenPlayer={openPlayerProfile}
            onTrainPlayer={trainPlayer}
          />
        </AppShell>
        {renderStandings()}
        {profilePlayer !== null && (() => {
          const player = squad.find((item) => item.id === profilePlayer);
          if (!player) return null;
          const record = playerCareers[profilePlayer] ?? createPlayerCareer(player, club);
          return <PlayerProfileModal player={player} club={club} record={record} onChange={(next) => updatePlayerCareer(profilePlayer, next)} onClose={() => setProfilePlayer(null)} />;
        })()}
      </>
    );

  if (page === "lineup")
    return (
      <>
        <AppShell nav={nav} teamName={club} date="22/01/2026" hideNav>
          <LineupScreen
          club={club}
          coach={coach}
          budget={budget}
          opponent={opponent}
          round={round}
          competition="Campeonato Estadual"
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
          selectedPlayer={selectedPlayerData}
          onSwap={swap}
          onPlay={startMatch}
          onBack={() => setPage("hub")}
          manualPositions={manualPositions}
          onMovePlayer={movePlayers}
          onResetPositions={resetManualPositions}
          onQuickAction={openQuickAction}
          onPhotoChange={changePlayerPhoto}
          />
        </AppShell>
        {renderStandings()}
      </>
    );

  if (page === "matchOverview")
    return (
      <>
        <MatchOverviewScreen
          competition="Campeonato Estadual"
          round={round}
          minute={minute}
          half={minute <= 45 ? "1º tempo" : minute < 90 ? "2º tempo" : "fim"}
          club={club}
          opponent={opponent}
          homeScore={homeScore}
          awayScore={awayScore}
          possession={possession}
          shots={shots}
          onGoal={onGoalStat}
          tackles={tackles}
          passErrors={passErrors}
          fixtures={fixtures}
          events={events}
          running={matchRunning}
          speed={matchSpeed}
          halftimeWaiting={halftimeWaiting}
          onToggleRunning={() => {
            if (halftimeWaiting) setHalftimeWaiting(false);
            setMatchRunning((running) => !running);
          }}
          onSpeedChange={setMatchSpeed}
          onOpenDetail={openMatchTactics}
        />
        {detailOpen && (
          <MatchDetailScreen
            club={club}
            opponent={opponent}
            homeScore={homeScore}
            awayScore={awayScore}
            minute={minute}
            formation={formation}
            setFormation={changeMatchFormation}
            startersData={startersData}
            bench={bench}
            events={events}
            possession={possession}
            shots={shots}
            onGoal={onGoalStat}
            tackles={tackles}
            passErrors={passErrors}
            style={style}
            setStyle={setStyle}
            marking={marking}
            setMarking={setMarking}
            focus={focus}
            setFocus={setFocus}
            substitutionsLeft={substitutionsLeft}
            selectedPlayer={selectedPlayer}
            substitutionOut={substitutionOut}
            onSelectPlayer={selectMatchPlayer}
            onSubstitute={substitute}
            onClose={closeMatchTactics}
            isHalftime={halftimeWaiting}
            manualPositions={manualPositions}
            onMovePlayers={movePlayers}
            onResetPositions={resetManualPositions}
          />
        )}
      </>
    );

  return (
    <ResultScreen
      round={round}
      fixtures={fixtures}
      club={club}
      opponent={opponent}
      homeScore={homeScore}
      awayScore={awayScore}
      startersData={startersData}
      events={events}
      possession={possession}
      shots={shots}
      onGoal={onGoalStat}
      tackles={tackles}
      passErrors={passErrors}
      onContinue={() => {
        const nextRound = round + 1;
        setRound(nextRound);
        saveCurrentCareer(nextRound);
        setPage("hub");
      }}
    />
  );
}
