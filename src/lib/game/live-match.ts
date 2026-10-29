import type { Player } from "./mock-data";
import type { ManualPosition } from "./career";
import { formationSlots } from "./formations";

export type LiveAction = "pass" | "shot" | "goal" | "tackle" | "foul" | "discussion";
export type MatchScene = {
  action: LiveAction;
  team: "home" | "away";
  actorIndex: number;
  targetIndex: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
};
export type MatchEvent = { minute: number; half: 1 | 2; text: string; card?: "yellow" | "red"; scene?: MatchScene };

type Point = { x: number; y: number };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function fieldPoint(position: ManualPosition, away: boolean): Point {
  return { x: clamp(away ? position.top : 100 - position.top, 5, 95), y: clamp(away ? 100 - position.left : position.left, 5, 95) };
}

/** A single source for the commentary, score and visual action. */
export function simulateAction({ minute, starters, formation, positions, opponent, strength = 74, random = Math.random }: {
  minute: number; starters: Player[]; formation: string; positions: Record<number, ManualPosition>;
  opponent: string; strength?: number; random?: () => number;
}): MatchEvent {
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  const team = random() < clamp(.5 + (strength - 74) * .005, .35, .65) ? "home" : "away";
  const pick = (length: number) => Math.min(length - 1, Math.floor(random() * length));
  // Include all roles in circulation, but shots favour attackers and midfielders.
  const roll = random();
  const action: LiveAction = roll < .60 ? "pass" : roll < .79 ? "shot" : roll < .86 ? "tackle" : roll < .95 ? "foul" : "discussion";
  const available = Math.max(1, Math.min(starters.length, 11));
  const actorIndex = pick(action === "shot" ? Math.min(6, available) : available);
  const targetIndex = available > 1 ? (actorIndex + 1 + pick(available - 1)) % available : 0;
  const actor = starters[actorIndex];
  const actorName = team === "home" ? actor?.name ?? "Jogador" : `Jogador do ${opponent}`;
  const target = team === "home" ? starters[targetIndex]?.name ?? "companheiro" : `companheiro do ${opponent}`;
  const point = (index: number) => fieldPoint((team === "home" && starters[index] && positions[starters[index].id]) || slots[index] || { left: 50, top: 50 }, team === "away");
  const movedPoint = (index: number) => {
    const base = point(index);
    const distance = index === 10 ? .5 : 2;
    return { x: clamp(base.x + Math.sin(minute * .6 + index) * distance, 5, 95), y: clamp(base.y + Math.cos(minute * .5 + index) * distance, 5, 95) };
  };
  const from = movedPoint(actorIndex);
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
    text = `${actorName} toca para ${target}.`;
  }
  return { minute, half: minute <= 45 ? 1 : 2, text, scene: { action: finalAction, team, actorIndex, targetIndex, from, to } };
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
