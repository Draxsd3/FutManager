import type { ManualPosition } from "./career";
import { formationSlots, formationSlotRoles } from "./formations";
import { fieldPoint, type MatchScene } from "./live-match";
import type { Player } from "./mock-data";

type Point = { x: number; y: number };
export type VisualPlayer = { key: string; base: Point; target: Point; goalkeeper: boolean; active: boolean };

type PositioningInput = {
  starters: Player[];
  formation: string;
  manualPositions: Record<number, ManualPosition>;
  scene?: MatchScene;
  minute: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * A formation/manual position describes the team's starting shape, not a movement radius.
 * Players adapt to the ball, possession and their line without rewriting the saved lineup; this
 * shared position snapshot also informs the next simplified action and offside check.
 */
export function visualFormation({ starters, formation, manualPositions, scene, minute }: PositioningInput): VisualPlayer[] {
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  const roles = formationSlotRoles[formation] ?? formationSlotRoles["4-3-3"];
  const ball = scene?.to ?? { x: 50, y: 50 };

  const teamPlayers = (away: boolean): VisualPlayer[] => {
    const team = away ? "away" : "home";
    const direction = away ? -1 : 1;
    const bases = away
      ? slots.map((slot) => fieldPoint(slot, true))
      : starters.slice(0, 11).map((player, index) => fieldPoint(manualPositions[player.id] ?? slots[index] ?? { left: 50, top: 50 }, false));
    const attacking = scene?.team === team;
    const lineShift = scene ? (ball.x - 50) * .34 : 0;
    const depthProgress = clamp(((ball.x - 50) * direction) / 50, -1, 1);
    const phaseDepth = !scene ? 0 : attacking ? direction * (6 + 7 * depthProgress) : -direction * 5;

    // The nearest outfielder reacts to the ball; the rest move as a covering/supporting unit.
    const pressIndex = scene && !attacking ? bases.reduce((best, base, index) => {
      if (index === 10 || (!away && starters[index]?.position === "G")) return best;
      const distance = Math.hypot(base.x - ball.x, base.y - ball.y);
      return distance < best.distance ? { index, distance } : best;
    }, { index: -1, distance: Number.POSITIVE_INFINITY }).index : -1;

    const result = bases.map((base, index) => {
      const player = away ? undefined : starters[index];
      const role = roles[index] ?? "M";
      const goalkeeper = role === "G" || (!away && player?.position === "G");
      const active = scene?.team === team && scene.actorIndex === index;
      const receiving = scene?.team === team && scene.action === "pass" && scene.targetIndex === index;
      const involved = scene?.team !== team && ["tackle", "foul", "discussion"].includes(scene?.action ?? "") && scene?.targetIndex === index;
      let desired = base;

      if (scene) {
        if (active) {
          desired = scene.from;
        } else if (receiving || involved || (scene.team === team && scene.action === "offside" && scene.targetIndex === index)) {
          desired = scene.to;
        } else if (goalkeeper) {
          // Keep the keeper goal-aware, but let them advance, sweep and move laterally by phase.
          // This is a soft response to the ball, not a hard lock around the lineup coordinate.
          desired = {
            x: base.x + clamp(ball.x - base.x, -32, 32) * .35 + lineShift * .12,
            y: base.y + (ball.y - base.y) * .45,
          };
        } else {
          const roleAdvance = role === "A" ? 10 : role === "M" ? 4 : role === "L" ? 2 : 0;
          const roleRetreat = role === "A" ? 6 : role === "M" ? 2 : 0;
          const lineMovement = attacking ? direction * roleAdvance : -direction * roleRetreat;
          const width = attacking ? 1.08 : .9;
          const phase = minute * .37 + index * 1.71 + (away ? 1.3 : 0);
          desired = {
            x: base.x + lineShift + phaseDepth + lineMovement + Math.sin(phase) * 1.1,
            y: 50 + (base.y - 50) * width + (ball.y - 50) * .25 + Math.cos(phase * .83) * .8,
          };
          if (index === pressIndex) {
            desired = { x: desired.x + (ball.x - desired.x) * .42, y: desired.y + (ball.y - desired.y) * .42 };
          }
        }
      }

      return {
        key: away ? `away-${index}` : `home-${player!.id}`,
        base,
        target: { x: clamp(desired.x, 5, 95), y: clamp(desired.y, 5, 95) },
        goalkeeper,
        active: !!(active || receiving || involved),
      };
    });

    // Light separation keeps teammates readable without pinning them to their starting coordinates.
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i], b = result[j];
        const dx = b.target.x - a.target.x, dy = b.target.y - a.target.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= 4 || distance === 0 || (a.active && b.active)) continue;
        const push = (4 - distance) / 2;
        const x = dx / distance * push, y = dy / distance * push;
        if (!a.active) a.target = { x: clamp(a.target.x - x, 5, 95), y: clamp(a.target.y - y, 5, 95) };
        if (!b.active) b.target = { x: clamp(b.target.x + x, 5, 95), y: clamp(b.target.y + y, 5, 95) };
      }
    }
    return result;
  };

  return [...teamPlayers(false), ...teamPlayers(true)];
}
