import type { ManagerMarket } from "./manager-market";
import type { JobClubSnapshot, ManagerAppointment } from "./manager-jobs";
import type { ChampionshipRecord } from "./honours";
import type { CareerLoans } from "./loans";
import type { ConfidenceMatch } from "./confidence";
import type { DivisionKey, Player } from "./mock-data";
import type { ManualPosition, PlayerCareerRecord, MatchParticipation } from "./career";
import type { MatchEvent, MatchWeather } from "@/lib/game/live-match";
import type { MatchRules } from "@/lib/game/match-rules";
import type { CareerSeason } from "./season";
import type { TransferNegotiation } from "./transfers";
import type { TrainingSessionRecord } from "./training";

export type MatchPreparation = {
  matchKey: string;
  rules: MatchRules;
  weather: MatchWeather;
  motivationHome: number;
  motivationAway: number;
};

export type CareerProgress = {
  managerMarket?: ManagerMarket;
  jobClubSnapshots?: Record<string, JobClubSnapshot>;
  managerAppointments?: ManagerAppointment[];
  championHistory?: ChampionshipRecord[];
  loanContracts?: CareerLoans;
  page: string;
  matchPreparation?: MatchPreparation;
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
  participation?: MatchParticipation;
  /** Reservas inscritos no início da partida; ausente em saves antigos. */
  matchBenchIds?: number[];
  substitutionsLeft: number;
  detailOpen: boolean;
  matchRunning: boolean;
  matchSpeed: 1 | 2 | 4;
  defaultMatchSpeed?: 1 | 2 | 4;
  halftimeWaiting: boolean;
  competitionSeason?: CareerSeason;
  confidenceHistory?: ConfidenceMatch[];
  confidenceStartBudget?: number;
  activeFixtureId?: string;
  transferNegotiations?: TransferNegotiation[];
  trainingSessions?: TrainingSessionRecord[];
};

