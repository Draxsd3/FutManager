import type { ManualPosition } from "./career";
import type { Player, PositionCode } from "./mock-data";

// Coordenadas percentuais (left/top) dos 11 titulares em campo, do gol (índice 10) ao ataque (índice 0).
// A ordem segue: ataque -> meio -> defesa -> goleiro, para casar com "startersData" (atacantes primeiro).
export const formationSlots: Record<string, Array<{ left: number; top: number }>> = {
  "4-3-3": [
    { left: 25, top: 17 },
    { left: 50, top: 14 },
    { left: 75, top: 17 },
    { left: 27, top: 39 },
    { left: 50, top: 35 },
    { left: 73, top: 39 },
    { left: 16, top: 64 },
    { left: 38, top: 67 },
    { left: 62, top: 67 },
    { left: 84, top: 64 },
    { left: 50, top: 85 },
  ],
  "4-4-2": [
    { left: 38, top: 16 },
    { left: 62, top: 16 },
    { left: 16, top: 40 },
    { left: 38, top: 40 },
    { left: 62, top: 40 },
    { left: 84, top: 40 },
    { left: 16, top: 65 },
    { left: 38, top: 67 },
    { left: 62, top: 67 },
    { left: 84, top: 65 },
    { left: 50, top: 85 },
  ],
  "3-5-2": [
    { left: 38, top: 16 },
    { left: 62, top: 16 },
    { left: 16, top: 40 },
    { left: 30, top: 35 },
    { left: 50, top: 32 },
    { left: 70, top: 35 },
    { left: 84, top: 40 },
    { left: 30, top: 67 },
    { left: 50, top: 64 },
    { left: 70, top: 67 },
    { left: 50, top: 85 },
  ],
  "5-3-2": [
    { left: 38, top: 16 },
    { left: 62, top: 16 },
    { left: 28, top: 40 },
    { left: 50, top: 35 },
    { left: 72, top: 40 },
    { left: 15, top: 64 },
    { left: 32, top: 67 },
    { left: 50, top: 69 },
    { left: 68, top: 67 },
    { left: 85, top: 64 },
    { left: 50, top: 85 },
  ],
};

export const formations = Object.keys(formationSlots);

export const formationSlotRoles: Record<string, PositionCode[]> = {
  "4-3-3": ["A", "A", "A", "M", "M", "M", "L", "Z", "Z", "L", "G"],
  "4-4-2": ["A", "A", "M", "M", "M", "M", "L", "Z", "Z", "L", "G"],
  "3-5-2": ["A", "A", "M", "M", "M", "M", "M", "Z", "Z", "Z", "G"],
  "5-3-2": ["A", "A", "M", "M", "M", "L", "Z", "Z", "Z", "L", "G"],
};

export type TacticalFit = {
  role: PositionCode;
  penalty: number;
  label: "Natural" | "Secundária" | "Improvisado";
};

export function nearestFormationSlot(formation: string, position: ManualPosition, allowGoalkeeper: boolean) {
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  const roles = formationSlotRoles[formation] ?? formationSlotRoles["4-3-3"];
  return slots.reduce((best, slot, index) => {
    if ((roles[index] === "G") !== allowGoalkeeper) return best;
    const distance = Math.hypot(slot.left - position.left, slot.top - position.top);
    return distance < best.distance ? { index, distance } : best;
  }, { index: allowGoalkeeper ? 10 : 0, distance: Number.POSITIVE_INFINITY }).index;
}

export function tacticalFit(player: Player, role: PositionCode): TacticalFit {
  if (player.position === role) return { role, penalty: 0, label: "Natural" };
  if (player.secondaryPosition === role) return { role, penalty: 4, label: "Secundária" };
  return { role, penalty: player.position === "G" || role === "G" ? 25 : 10, label: "Improvisado" };
}

export function playerFitAtPosition(player: Player, formation: string, position: ManualPosition, fallbackIndex: number): TacticalFit {
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  const roles = formationSlotRoles[formation] ?? formationSlotRoles["4-3-3"];
  const index = slots.reduce((best, slot, slotIndex) => {
    const distance = Math.hypot(slot.left - position.left, slot.top - position.top);
    return distance < best.distance ? { index: slotIndex, distance } : best;
  }, { index: fallbackIndex, distance: Number.POSITIVE_INFINITY }).index;
  return tacticalFit(player, roles[index] ?? player.position);
}
