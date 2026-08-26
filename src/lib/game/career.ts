import type { Player } from "./mock-data";

export type PlayerMarketStatus = "normal" | "sale" | "loan" | "retiring";

export type SeasonStats = {
  season: number;
  club: string;
  games: number;
  goals: number;
  assists: number;
  average: number | null;
};

export type PlayerCareerRecord = {
  marketStatus: PlayerMarketStatus;
  contractUntil: string;
  salary: number;
  retirementYear: number | null;
  seasons: SeasonStats[];
};

export type ManualPosition = { left: number; top: number };

export function createPlayerCareer(player: Player, club: string): PlayerCareerRecord {
  return {
    marketStatus: "normal",
    contractUntil: player.contractUntil,
    salary: player.salary,
    retirementYear: null,
    seasons: [{ season: 2026, club, games: 0, goals: player.goals, assists: player.assists, average: player.avgRating }],
  };
}
