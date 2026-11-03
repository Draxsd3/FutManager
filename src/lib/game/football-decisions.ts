import type { MatchSide, MatchTactics } from "./live-match";

type Point = { x: number; y: number };
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export function attackingProgress(point: Point, side: MatchSide) {
  return side === "home" ? point.x : 100 - point.x;
}

/** An original heuristic, not a model fitted to real match data or an official xG feed. */
export function chanceQuality(point: Point, side: MatchSide, pressure: number) {
  const distance = Math.hypot((100 - attackingProgress(point, side)) * 1.05, (point.y - 50) * .68);
  const angle = Math.atan2(7.32, Math.max(1, distance));
  return clamp(.50 * Math.exp(-(distance - 10) / 24) * clamp(angle / .35, .25, 1.25)
    * (1 - clamp(pressure, 0, 1) * .4), .008, .65);
}

export function localPressure(ball: Point, defenders: Point[]) {
  const nearest = defenders.reduce((distance, point) => Math.min(distance, Math.hypot(ball.x - point.x, ball.y - point.y)), 100);
  return clamp(1 - nearest / 18, 0, 1);
}

/** Score/time/manpower react to the saved match state; no randomness or paid service. */
export function opponentPlan(base: MatchTactics, minute: number, goalDifference: number, playersMissing: number): MatchTactics {
  if (minute < 60) return playersMissing > 0 ? { ...base, style: "Defensivo", marking: "Leve" } : { ...base };
  if (goalDifference < 0) return { ...base, style: "Ofensivo", marking: minute >= 75 ? "Pesada" : "Normal" };
  if (goalDifference > 0 && minute >= 75) return { ...base, style: "Defensivo", marking: "Leve" };
  return playersMissing > 0 ? { ...base, style: "Defensivo", marking: "Leve" } : { ...base };
}

/** Pass utility balances progression, open space, distance and the selected attacking channel. */
export function passUtility(from: Point, target: Point, side: MatchSide, pressure: number, tactics: MatchTactics) {
  const progress = attackingProgress(target, side) - attackingProgress(from, side);
  const distance = Math.hypot(target.x - from.x, target.y - from.y);
  const wide = Math.abs(target.y - 50) > 22;
  const preferred = tactics.focus.toLowerCase().includes("later") ? wide : !wide;
  const ambition = tactics.style === "Ofensivo" ? 1.25 : tactics.style === "Defensivo" ? .55 : .85;
  return Math.max(.1, 2 + progress / 24 * ambition - distance / 90 - pressure * 1.2 + (preferred ? .5 : 0));
}
