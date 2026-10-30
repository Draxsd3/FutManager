import type { DivisionKey, Player } from "./mock-data";
import type { ManualPosition, PlayerCareerRecord, MatchParticipation } from "./career";
import type { MatchEvent } from "@/components/screens/match-detail-screen";

export type CareerProgress = {
  page: string;
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
  substitutionsLeft: number;
  detailOpen: boolean;
  matchRunning: boolean;
  matchSpeed: 1 | 2 | 4;
  defaultMatchSpeed?: 1 | 2 | 4;
  halftimeWaiting: boolean;
};

