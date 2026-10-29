import type { Player } from "./mock-data";
import type { ManualPosition } from "./career";
import { formationSlots } from "./formations";

export type LiveAction = "pass" | "shot" | "goal" | "tackle" | "foul" | "discussion" | "offside";
export type MatchScene = {
  action: LiveAction;
  team: "home" | "away";
  actorIndex: number;
  targetIndex: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
};
export type MatchEvent = { minute: number; half: 1 | 2; text: string; card?: "yellow" | "red"; scene?: MatchScene; scorer?: string; scorerId?: number };

type Point = { x: number; y: number };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function fieldPoint(position: ManualPosition, away: boolean): Point {
  return { x: clamp(away ? position.top : 100 - position.top, 5, 95), y: clamp(away ? 100 - position.left : position.left, 5, 95) };
}

/** Limit movement relative to the configured position, not the athlete's natural role. */
export function boundedPlayerPoint(base: Point, desired: Point, goalkeeperSlot: boolean, outfieldLimit = 12): Point {
  const xLimit = goalkeeperSlot ? 4 : outfieldLimit;
  const yLimit = goalkeeperSlot ? 7 : 15;
  return { x: clamp(desired.x, Math.max(5, base.x - xLimit), Math.min(95, base.x + xLimit)), y: clamp(desired.y, Math.max(5, base.y - yLimit), Math.min(95, base.y + yLimit)) };
}

/** Simplified Law 11: the pass recipient is involved, using 2D point positions at the kick. */
export function isOffsideAtPass(team: "home" | "away", receiver: Point, ball: Point, opponents: Point[], exempt = false): boolean {
  if (exempt || opponents.length < 2) return false;
  const xs = opponents.map((point) => point.x).sort((a, b) => team === "home" ? b - a : a - b);
  return team === "home"
    ? receiver.x > 50 && receiver.x > ball.x && receiver.x > xs[1]
    : receiver.x < 50 && receiver.x < ball.x && receiver.x < xs[1];
}

export type KickSnapshot = { home: Point[]; away: Point[] };

/** A single source for the commentary, score and visual action. */
export function simulateAction({ minute, starters, formation, positions, opponent, opponentStarters, previous, snapshot, strength = 74, random = Math.random }: {
  minute: number; starters: Player[]; formation: string; positions: Record<number, ManualPosition>;
  opponent: string; opponentStarters?: Player[]; previous?: MatchScene; snapshot?: KickSnapshot; strength?: number; random?: () => number;
}): MatchEvent {
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  const randomTeam = random() < clamp(.5 + (strength - 74) * .005, .35, .65) ? "home" : "away";
  const team = previous?.action === "offside" ? (previous.team === "home" ? "away" : "home")
    : previous?.action === "pass" || previous?.action === "foul" ? previous.team : randomTeam;
  const pick = (length: number) => Math.min(length - 1, Math.floor(random() * length));
  // Include all roles in circulation, but shots favour attackers and midfielders.
  const roll = random();
  const action: LiveAction = previous?.action === "offside" || previous?.action === "foul" ? "pass" : roll < .60 ? "pass" : roll < .79 ? "shot" : roll < .86 ? "tackle" : roll < .95 ? "foul" : "discussion";
  const available = Math.max(1, Math.min(starters.length, 11));
  let actorIndex = pick(action === "shot" ? Math.min(6, available) : available);
  let targetIndex = available > 1 ? (actorIndex + 1 + pick(available - 1)) % available : 0;
  const point = (index: number) => fieldPoint((team === "home" && starters[index] && positions[starters[index].id]) || slots[index] || { left: 50, top: 50 }, team === "away");
  const restart = previous?.action === "goal";
  const previousBall = restart ? { x: 50, y: 50 } : previous?.to;
  if (previous && previousBall && available > 1) {
    // A completed pass is controlled by its receiver. On a turnover use the closest player.
    actorIndex = previous.action === "pass" && previous.team === team && previous.targetIndex < available
      ? previous.targetIndex
      : Array.from({ length: available }, (_, index) => index).reduce((best, index) => {
        const distance = (i: number) => Math.hypot(point(i).x - previousBall.x, point(i).y - previousBall.y);
        return distance(index) < distance(best) ? index : best;
      }, 0);
    // Pick from nearby teammates instead of sending the ball across the whole pitch.
    const candidates = Array.from({ length: available }, (_, index) => index)
      .filter((index) => index !== actorIndex)
      .sort((a, b) => Math.hypot(point(a).x - point(actorIndex).x, point(a).y - point(actorIndex).y) - Math.hypot(point(b).x - point(actorIndex).x, point(b).y - point(actorIndex).y))
      .slice(0, 3);
    targetIndex = candidates[pick(candidates.length)] ?? actorIndex;
  }
  const actor = team === "home" ? starters[actorIndex] : opponentStarters?.[actorIndex];
  const actorName = actor?.name ?? (team === "home" ? "Jogador" : `Jogador do ${opponent}`);
  const target = team === "home" ? starters[targetIndex]?.name ?? "companheiro" : opponentStarters?.[targetIndex]?.name ?? `companheiro do ${opponent}`;
  const movedPoint = (index: number) => {
    const base = point(index);
    const distance = index === 10 ? .5 : 2;
    return { x: clamp(base.x + Math.sin(minute * .6 + index) * distance, 5, 95), y: clamp(base.y + Math.cos(minute * .5 + index) * distance, 5, 95) };
  };
  const from = previousBall ?? movedPoint(actorIndex);
  let to = movedPoint(targetIndex);
  let finalAction: LiveAction = action;
  let text: string;
  if (action === "shot") {
    const goal = random() < clamp(.14 + (team === "home" ? 1 : -1) * (strength - 74) * .003, .06, .24);
    finalAction = goal ? "goal" : "shot";
    to = { x: team === "home" ? 95 : 5, y: goal ? 50 : 42 };
    text = goal ? `Gol de ${actorName}!` : `${actorName} finaliza para fora.`;
  } else if (action === "tackle") {
    to = { x: clamp(from.x + (team === "home" ? 2 : -2), 5, 95), y: clamp(from.y + 2, 5, 95) };
    text = `${actorName} desarma um adversário.`;
  } else if (action === "foul") {
    to = { x: clamp(from.x + (team === "home" ? 2 : -2), 5, 95), y: clamp(from.y + 2, 5, 95) };
    text = `Falta em ${actorName}.`;
  } else if (action === "discussion") {
    to = { x: clamp(from.x + (team === "home" ? 2 : -2), 5, 95), y: clamp(from.y + 1, 5, 95) };
    text = `${actorName} discute com um adversário; o árbitro intervém.`;
  } else {
    const receiver = snapshot?.[team]?.[targetIndex];
    const defenders = snapshot?.[team === "home" ? "away" : "home"];
    if (receiver && defenders && isOffsideAtPass(team, receiver, from, defenders)) {
      finalAction = "offside";
      to = receiver;
      text = `Impedimento de ${target}. Tiro livre indireto para o adversário.`;
    } else {
      text = `${actorName} toca para ${target}.`;
    }
  }
  return { minute, half: minute <= 45 ? 1 : 2, text, ...(finalAction === "goal" ? { scorer: actorName, ...(team === "home" && actor ? { scorerId: actor.id } : {}) } : {}), scene: { action: finalAction, team, actorIndex, targetIndex, from, to } };
}

/** Keep routine circulation out of commentary while retaining it for simulation and statistics. */
export function isHighlight(event: MatchEvent): boolean {
  return !!event.card || !event.scene || !["pass", "tackle"].includes(event.scene.action);
}

/** Results are stable across reloads and never include goals from future minutes. */
export function otherScore(home: string, away: string, round: number, minute: number): [number, number] {
  let hash = 2166136261;
  for (const char of `${round}|${home}|${away}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  let homeScore = 0, awayScore = 0;
  for (let m = 1; m <= Math.min(90, minute); m++) {
    hash = (Math.imul(hash, 1664525) + 1013904223) | 0;
    const value = (hash >>> 0) / 4294967296;
    if (value < .015) homeScore++;
    else if (value < .028) awayScore++;
  }
  return [homeScore, awayScore];
}
