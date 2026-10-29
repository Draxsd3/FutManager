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
  matches?: PlayerMatchRecord[];
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

export type PlayerMatchRecord = {
  key: string; round: number; opponent: string; homeScore: number; awayScore: number;
  minutes: number; goals: number;
};
export type MatchParticipation = Record<number, { entered: number; left?: number }>;

/** Register only completed matches; the key makes retries and resumed saves idempotent. */
export function recordPlayerMatch(records: Record<number, PlayerCareerRecord>, squad: Player[], club: string, participation: MatchParticipation, match: Omit<PlayerMatchRecord, "minutes" | "goals">, goals: Record<number, number>): Record<number, PlayerCareerRecord> {
  const next = { ...records };
  for (const [idText, stint] of Object.entries(participation)) {
    const id = Number(idText);
    const player = squad.find((item) => item.id === id);
    const minutes = Math.max(0, (stint.left ?? 90) - stint.entered);
    if (!player || minutes === 0) continue;
    const current = next[id] ?? createPlayerCareer(player, club);
    if (current.matches?.some((item) => item.key === match.key)) continue;
    const playerGoals = goals[id] ?? 0;
    const seasons = [...current.seasons];
    const index = seasons.findIndex((item) => item.season === 2026 && item.club === club);
    if (index < 0) seasons.push({ season: 2026, club, games: 1, goals: playerGoals, assists: 0, average: null });
    else seasons[index] = { ...seasons[index], games: seasons[index].games + 1, goals: seasons[index].goals + playerGoals };
    next[id] = { ...current, seasons, matches: [...(current.matches ?? []), { ...match, minutes, goals: playerGoals }] };
  }
  return next;
}
