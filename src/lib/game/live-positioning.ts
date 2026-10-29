import type { ManualPosition } from "./career";
import { formationSlots, formationSlotRoles } from "./formations";
import { boundedPlayerPoint, fieldPoint, type MatchScene } from "./live-match";
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

/** Visual positioning only; it never changes the match engine or saved tactics. */
export function visualFormation({ starters, formation, manualPositions, scene, minute }: PositioningInput): VisualPlayer[] {
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  const teamPlayers = (away: boolean): VisualPlayer[] => {
    const team = away ? "away" : "home";
    const bases = away ? slots.map((slot) => fieldPoint(slot, true)) : starters.slice(0, 11).map((player, index) => fieldPoint(manualPositions[player.id] ?? slots[index] ?? { left: 50, top: 50 }, false));
    const ball = scene?.to ?? { x: 50, y: 50 };
    const defending = !!scene && scene.team !== team;
    // Only a nearby outfield player presses; others maintain their shape.
    const pressIndex = defending ? bases.reduce((best, base, index) => {
      if (index === 10 || (!away && starters[index]?.position === "G")) return best;
      const distance = Math.hypot(base.x - ball.x, base.y - ball.y);
      return distance < best.distance ? { index, distance } : best;
    }, { index: -1, distance: 25 }).index : -1;

    const result = bases.map((base, index) => {
      const player = away ? undefined : starters[index];
      const goalkeeper = index === 10 || player?.position === "G";
      const active = scene?.team === team && scene.actorIndex === index;
      const receiving = scene?.team === team && scene.action === "pass" && scene.targetIndex === index;
      const involved = (scene?.team !== team && ["tackle", "foul", "discussion"].includes(scene?.action ?? "") && scene?.targetIndex === index);
      let desired = base;
      if (scene) {
        if (active) desired = scene.from;
        else if (receiving || involved || (scene.team === team && scene.action === "offside" && scene.targetIndex === index)) desired = scene.to;
        else if (goalkeeper) {
          // Track the ball laterally while remaining near the configured position.
          desired = { x: base.x + (ball.x - 50) * .018, y: base.y + (ball.y - 50) * .10 };
        } else {
          const attacking = scene.team === team;
          const phase = minute * .37 + index * 1.71 + (away ? 1.3 : 0);
          const role = (formationSlotRoles[formation] ?? formationSlotRoles["4-3-3"])[index];
          // Forwards and midfielders regroup towards their own goal without possession.
          const retreat = !attacking ? (role === "A" ? 17 : role === "M" ? 8 : 3) * (away ? 1 : -1) : 0;
          desired = {
            x: base.x + retreat + (ball.x - 50) * (attacking ? .13 : .10) + Math.sin(phase) * 1.25,
            y: base.y + (ball.y - 50) * .12 + Math.cos(phase * .83) * 1.1,
          };
          if (index === pressIndex) {
            desired = { x: desired.x + (ball.x - desired.x) * .32, y: desired.y + (ball.y - desired.y) * .32 };
          }
        }
      }
      return { key: away ? `away-${index}` : `home-${player!.id}`, base, target: boundedPlayerPoint(base, desired, goalkeeper, defending ? 25 : 12), goalkeeper, active: !!(active || involved) };
    });
    // Soft separation preserves space without changing persisted positions or displacing the ball carrier.
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i], b = result[j];
        const dx = b.target.x - a.target.x, dy = b.target.y - a.target.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= 4 || distance === 0 || (a.active && b.active)) continue;
        const push = (4 - distance) / 2;
        const x = dx / distance * push, y = dy / distance * push;
        if (!a.active) a.target = boundedPlayerPoint(a.base, { x: a.target.x - x, y: a.target.y - y }, a.goalkeeper, defending ? 25 : 12);
        if (!b.active) b.target = boundedPlayerPoint(b.base, { x: b.target.x + x, y: b.target.y + y }, b.goalkeeper, defending ? 25 : 12);
      }
    }
    return result;
  };
  return [...teamPlayers(false), ...teamPlayers(true)];
}
