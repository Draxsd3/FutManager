import type { ManualPosition } from "./career";
import type { Player } from "./mock-data";
import { formationSlotRoles } from "./formations";

export const fieldSectors = [
  { name: "Ponta esquerda", short: "PE", left: 16, top: 14 },
  { name: "Centroavante", short: "CA", left: 50, top: 14 },
  { name: "Ponta direita", short: "PD", left: 84, top: 14 },
  { name: "Meia esquerda", short: "ME", left: 16, top: 30 },
  { name: "Meia ofensivo", short: "MEI", left: 50, top: 30 },
  { name: "Meia direita", short: "MD", left: 84, top: 30 },
  { name: "Meio esquerdo", short: "MC", left: 16, top: 46 },
  { name: "Meio central", short: "MC", left: 50, top: 46 },
  { name: "Meio direito", short: "MC", left: 84, top: 46 },
  { name: "Volante esquerdo", short: "VOL", left: 16, top: 60 },
  { name: "Volante central", short: "VOL", left: 50, top: 60 },
  { name: "Volante direito", short: "VOL", left: 84, top: 60 },
  { name: "Lateral esquerdo", short: "LE", left: 16, top: 74 },
  { name: "Zaga central", short: "ZAG", left: 50, top: 74 },
  { name: "Lateral direito", short: "LD", left: 84, top: 74 },
  { name: "Goleiro", short: "GOL", left: 50, top: 90 },
];

/** Pure placement: unique starters, keeper safety and preservation of unrelated custom positions. */
export function deployLineupPlayer(
  starters: number[],
  squad: Player[],
  formation: string,
  positions: Record<number, ManualPosition>,
  id: number,
  slot: number,
  point?: ManualPosition,
) {
  const player = squad.find((item) => item.id === id);
  const role = (formationSlotRoles[formation] ?? formationSlotRoles["4-3-3"])[
    slot
  ];
  if (
    !player ||
    !role ||
    !Number.isInteger(slot) ||
    (role === "G") !== (player.position === "G")
  )
    return null;
  if (point && (!Number.isFinite(point.left) || !Number.isFinite(point.top)))
    return null;
  if (point && (player.position === "G") !== point.top >= 82) return null;
  const origin = starters.indexOf(id),
    displaced = starters[slot];
  if (displaced === undefined) return null;
  const next = [...starters],
    nextPositions = { ...positions };
  if (origin >= 0) next[origin] = displaced;
  next[slot] = id;
  // Positions belong to slots when swapping, not to the departing player's identity.
  if (origin >= 0 && origin !== slot) {
    if (positions[id]) nextPositions[displaced] = positions[id];
    else delete nextPositions[displaced];
  } else if (origin < 0) delete nextPositions[displaced];
  if (point)
    nextPositions[id] = {
      left: Math.min(90, Math.max(10, point.left)),
      top: Math.min(91, Math.max(10, point.top)),
    };
  else if (positions[displaced]) nextPositions[id] = positions[displaced];
  else delete nextPositions[id];
  return { starters: next, positions: nextPositions };
}
