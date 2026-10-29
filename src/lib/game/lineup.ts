import type { ManualPosition } from "./career";
import type { Player } from "./mock-data";
import { formationSlots } from "./formations";

// Attack points upward. Side names are always the team's left/right, not the viewer's.
export const fieldSectors = [
  {
    name: "Centroavante esquerdo",
    short: "ST",
    left: 38,
    top: 9,
    group: "attack",
  },
  {
    name: "Centroavante direito",
    short: "ST",
    left: 62,
    top: 9,
    group: "attack",
  },
  { name: "Ponta esquerda", short: "LW", left: 12, top: 22, group: "attack" },
  { name: "Segundo atacante", short: "CF", left: 50, top: 23, group: "attack" },
  { name: "Ponta direita", short: "RW", left: 88, top: 22, group: "attack" },
  { name: "Meia ofensivo", short: "CAM", left: 50, top: 36, group: "midfield" },
  { name: "Meia esquerda", short: "LM", left: 10, top: 43, group: "midfield" },
  { name: "Meio esquerdo", short: "CM", left: 31, top: 48, group: "midfield" },
  { name: "Meio central", short: "CM", left: 50, top: 51, group: "midfield" },
  { name: "Meio direito", short: "CM", left: 69, top: 48, group: "midfield" },
  { name: "Meia direita", short: "RM", left: 90, top: 43, group: "midfield" },
  { name: "Ala esquerdo", short: "LWB", left: 10, top: 64, group: "defense" },
  {
    name: "Volante central",
    short: "CDM",
    left: 50,
    top: 65,
    group: "midfield",
  },
  { name: "Ala direito", short: "RWB", left: 90, top: 64, group: "defense" },
  {
    name: "Lateral esquerdo",
    short: "LB",
    left: 10,
    top: 83,
    group: "defense",
  },
  {
    name: "Zagueiro esquerdo",
    short: "CB",
    left: 31,
    top: 80,
    group: "defense",
  },
  { name: "Zaga central", short: "CB", left: 50, top: 80, group: "defense" },
  {
    name: "Zagueiro direito",
    short: "CB",
    left: 69,
    top: 80,
    group: "defense",
  },
  { name: "Lateral direito", short: "RB", left: 90, top: 83, group: "defense" },
  { name: "Goleiro", short: "GK", left: 50, top: 95, group: "keeper" },
] as const;

type Point = { left: number; top: number };
/** Voronoi cells tile the entire pitch without gaps; these are guides, never drag constraints. */
export function sectorPolygon(
  seed: Point,
  seeds: readonly Point[] = fieldSectors,
): Point[] {
  let polygon: Point[] = [
    { left: 0, top: 0 },
    { left: 100, top: 0 },
    { left: 100, top: 100 },
    { left: 0, top: 100 },
  ];
  for (const other of seeds) {
    const a = 2 * (other.left - seed.left),
      b = 2 * (other.top - seed.top);
    if (a === 0 && b === 0) continue;
    const c = other.left ** 2 + other.top ** 2 - seed.left ** 2 - seed.top ** 2;
    const result: Point[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const start = polygon[i],
        end = polygon[(i + 1) % polygon.length];
      const d1 = a * start.left + b * start.top - c,
        d2 = a * end.left + b * end.top - c;
      if (d1 <= 0) result.push(start);
      if (d1 <= 0 !== d2 <= 0) {
        const t = d1 / (d1 - d2);
        result.push({
          left: start.left + t * (end.left - start.left),
          top: start.top + t * (end.top - start.top),
        });
      }
    }
    polygon = result;
  }
  return polygon;
}
export const fieldRegions = fieldSectors.map((sector) => ({
  ...sector,
  polygon: sectorPolygon(sector),
}));

/** Pure placement: unique starters, unrestricted placement and preservation of unrelated custom positions. */
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
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  if (!player || !Number.isInteger(slot) || slot < 0 || slot >= slots.length)
    return null;
  if (point && (!Number.isFinite(point.left) || !Number.isFinite(point.top)))
    return null;
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
      left: Math.min(100, Math.max(0, point.left)),
      top: Math.min(100, Math.max(0, point.top)),
    };
  else if (positions[displaced]) nextPositions[id] = positions[displaced];
  else delete nextPositions[id];
  return { starters: next, positions: nextPositions };
}
