import { clubConfidence, mergeConfidenceHistory, type ConfidenceMatch } from "./confidence";
import type { EditorDatabase } from "./editor-data";
import type { CareerSeason, SeasonFixture } from "./season";

/** Values are R$ thousands, matching the managed club's budget and player salaries. */
export type ManagerClub = {
  clubId: string;
  vacancyVersion?: number;
  coach: string | null;
  budget: number;
  startingBudget: number;
  payroll: number;
  history: ConfidenceMatch[];
  processedFixtures: string[];
};
export type ManagerApplication = { id: string; clubId: string; vacancyVersion: number; appliedOn: string; expiresOn: string; status: "offered" | "rejected" | "declined" | "accepted" | "expired" | "cancelled"; message: string };
export type ManagerMarket = { finance?: import("./simulation/finance").FinanceState; applications?: ManagerApplication[]; clubs: Record<string, ManagerClub>; dismissals: { clubId: string; coach: string; fixtureId: string; board: number; fans: number }[] };

/** Until a club economy exists, every AI club starts with the same cash as a new human career.
 * Existing results are marked processed: we cannot reconstruct previous managers or finances.
 */
export function createManagerMarket(database: EditorDatabase, season: CareerSeason): ManagerMarket {
  const clubs: Record<string, ManagerClub> = {};
  for (const club of database.clubs) {
    const payroll = database.players.filter((player) => player.clubId === club.id).reduce((sum, player) => sum + Math.max(0, player.salaryMonthlyBrl || 0) / 1000, 0);
    clubs[club.id] = { clubId: club.id, coach: club.coachName || null, budget: 12624, startingBudget: 12624, payroll, history: [], processedFixtures: season.fixtures.filter((f) => f.status === "played" && (f.homeClubId === club.id || f.awayClubId === club.id)).map((f) => f.id) };
  }
  return { clubs, dismissals: [] };
}

/** Process one completed fixture at a time, exactly once per club. Both human and AI use
 * clubConfidence and the same dismissal limits. AI cash is a simplified match credit of
 * R$151k minus one quarter of monthly payroll; actual human cash is supplied by the caller.
 * Managers need five games before being dismissed. */
export function applyManagerFixture(market: ManagerMarket, season: CareerSeason, fixture: SeasonFixture, human?: { clubId: string; budget: number; payroll: number; allowDismissal?: boolean }): ManagerMarket {
  if (fixture.status !== "played" || !Number.isInteger(fixture.homeScore) || !Number.isInteger(fixture.awayScore) || fixture.homeScore! < 0 || fixture.awayScore! < 0) return market;
  const clubs = { ...market.clubs };
  const dismissals = [...market.dismissals];
  for (const clubId of new Set([fixture.homeClubId, fixture.awayClubId])) {
    const old = clubs[clubId];
    if (!old || old.processedFixtures.includes(fixture.id)) continue;
    const isHuman = human?.clubId === clubId;
    const oneMatch = { ...season, clubId, fixtures: [fixture] };
    const history = old.coach ? mergeConfidenceHistory(old.history, oneMatch) : old.history;
    const budget = isHuman ? human.budget : old.budget + 151 - (market.finance ? 0 : old.payroll / 4);
    const payroll = isHuman ? human.payroll : old.payroll;
    const confidence = clubConfidence({ ...season, clubId, fixtures: [] }, history, budget, payroll, old.startingBudget);
    const fired = (!isHuman || human.allowDismissal !== false) && old.coach !== null && confidence !== null && confidence.matches >= 5 && (confidence.fans <= 30 || confidence.board <= 20);
    if (fired) dismissals.push({ clubId, coach: old.coach!, fixtureId: fixture.id, board: confidence!.board, fans: confidence!.fans });
    clubs[clubId] = { ...old, vacancyVersion: (old.vacancyVersion ?? 0) + Number(fired), coach: fired ? null : old.coach, budget, payroll, history, processedFixtures: [...old.processedFixtures, fixture.id] };
  }
  return { ...market, clubs, dismissals };
}

/** A new appointment starts a new tenure while retaining the club's simulated finances.
 * Reject occupied clubs to avoid silently firing another coach. */
export function appointManager(market: ManagerMarket, clubId: string, coach: string): ManagerMarket | null {
  const club = market.clubs[clubId];
  const name = coach.trim();
  if (!club || club.coach !== null || !name) return null;
  return { ...market, clubs: { ...market.clubs, [clubId]: { ...club, coach: name, startingBudget: club.budget, history: [] } } };
}
