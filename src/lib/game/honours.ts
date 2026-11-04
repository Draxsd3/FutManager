import { z } from "zod";
import type { EditorDatabase } from "./editor-data";
import { getCompetitionPlayerStats, getCompetitionStandings, type CareerSeason } from "./season";

const entity = z.object({ id: z.string().nullable().optional(), name: z.string().nullable().optional() });
export const historicalHonourSchema = z.object({ title: z.string().transform(title => title.trim() || "Título não identificado na fonte"), count: z.number().int().min(0), details: z.array(z.object({ season: entity, competition: entity.nullable().optional() })) });
export type HistoricalHonour = z.infer<typeof historicalHonourSchema>;
export function normalizeHonours(input: unknown, clubId: string) {
  const parsed = z.object({ id: z.string(), achievements: z.array(historicalHonourSchema).max(300) }).parse(input);
  if (parsed.id !== clubId) throw new Error("Galeria de outro clube retornada pela fonte.");
  return parsed.achievements;
}
export type ChampionshipRecord = {
  id: string; season: number; competitionId: string; competition: string; category: "national" | "state";
  championId: string; champion: string; runnerUpId: string; runnerUp: string; coach: string;
  scorers: { name: string; club: string; goals: number }[];
};
/** Archive only concluded competitions, never projected standings or a cancelled cup final. */
export function archiveChampionships(history: ChampionshipRecord[], season: CareerSeason | undefined, database: EditorDatabase, manager: string): ChampionshipRecord[] {
  if (!season) return history;
  const next = [...history];
  for (const competitionId of new Set(season.fixtures.map(f => f.competitionId))) {
    const id = `${season.season}:${competitionId}`;
    if (next.some(record => record.id === id)) continue;
    const fixtures = season.fixtures.filter(f => f.competitionId === competitionId);
    if (season.priorAppointmentFixtureIds && fixtures.every(f => season.priorAppointmentFixtureIds!.includes(f.id))) continue;
    const first = fixtures[0];
    let championId: string | undefined, runnerUpId: string | undefined;
    if (first.type === "cup") {
      const lastRound = Math.max(...fixtures.map(f => f.competitionRound));
      const finals = fixtures.filter(f => f.competitionRound === lastRound);
      if (finals.length !== 1 || finals[0].status !== "played") continue;
      const final = finals[0];
      championId = final.winnerClubId;
      if (!championId || ![final.homeClubId, final.awayClubId].includes(championId)) continue;
      runnerUpId = championId === final.homeClubId ? final.awayClubId : final.homeClubId;
    } else {
      if (!fixtures.length || fixtures.some(f => f.status !== "played" || f.homeScore === undefined || f.awayScore === undefined)) continue;
      const table = getCompetitionStandings(fixtures, competitionId);
      championId = table[0]?.clubId; runnerUpId = table[1]?.clubId;
    }
    if (!championId || !runnerUpId) continue;
    const names = new Map(fixtures.flatMap(f => [[f.homeClubId, f.home], [f.awayClubId, f.away]] as [string, string][]));
    const stats = getCompetitionPlayerStats(fixtures, competitionId), mostGoals = stats[0]?.goals ?? 0;
    next.push({ id, season: season.season, competitionId, competition: first.competitionName, category: first.type === "state" ? "state" : "national", championId, champion: names.get(championId) ?? "Não informado", runnerUpId, runnerUp: names.get(runnerUpId) ?? "Não informado", coach: championId === season.clubId ? manager : database.clubs.find(c => c.id === championId)?.coachName || "Não informado", scorers: stats.filter(p => mostGoals > 0 && p.goals === mostGoals).map(p => ({ name: p.playerName, club: p.club, goals: p.goals })) });
  }
  return next.length === history.length ? history : next;
}
