import { expect, it } from "vitest";
import { squad, buildStartingXI } from "./mock-data";
import { deployLineupPlayer, fieldSectors, fieldRegions } from "./lineup";
const starters = buildStartingXI("4-3-3", squad);
it("swaps starters atomically without duplicates or losing other custom coordinates", () => {
  const positions = {
    [starters[0]]: { left: 20, top: 20 },
    [starters[3]]: { left: 45, top: 40 },
  };
  const result = deployLineupPlayer(
    starters,
    squad,
    "4-3-3",
    positions,
    starters[0],
    1,
  )!;
  expect(result.starters[1]).toBe(starters[0]);
  expect(result.starters[0]).toBe(starters[1]);
  expect(new Set(result.starters).size).toBe(11);
  expect(result.positions[starters[1]]).toEqual(positions[starters[0]]);
  expect(result.positions[starters[3]]).toEqual(positions[starters[3]]);
  expect(positions[starters[0]]).toEqual({ left: 20, top: 20 });
});
it("deploys a reserve and removes stale position of the departing player", () => {
  const reserve = squad.find(
    (p) => !starters.includes(p.id) && p.position !== "G",
  )!;
  const result = deployLineupPlayer(
    starters,
    squad,
    "4-3-3",
    { [starters[0]]: { left: 23, top: 18 } },
    reserve.id,
    0,
    { left: 16, top: 30 },
  )!;
  expect(result.starters).toHaveLength(11);
  expect(result.starters).toContain(reserve.id);
  expect(result.starters).not.toContain(starters[0]);
  expect(result.positions[starters[0]]).toBeUndefined();
  expect(result.positions[reserve.id]).toEqual({ left: 16, top: 30 });
});
it("moves a starter into a free sector without rearranging the XI", () => {
  const result = deployLineupPlayer(
    starters,
    squad,
    "4-3-3",
    {},
    starters[0],
    0,
    { left: 16, top: 46 },
  )!;
  expect(result.starters).toEqual(starters);
  expect(result.positions[starters[0]]).toEqual({ left: 16, top: 46 });
});
it("rejects invalid ids, slots and nonfinite coordinates without restricting roles", () => {
  for (const [id, slot] of [
    [99999, 0],
    [starters[0], -1],
    [starters[0], 0.5],
  ]) {
    expect(
      deployLineupPlayer(starters, squad, "4-3-3", {}, id, slot),
    ).toBeNull();
  }
  expect(
    deployLineupPlayer(starters, squad, "4-3-3", {}, starters[0], 0, {
      left: NaN,
      top: 30,
    }),
  ).toBeNull();
  expect(
    deployLineupPlayer(starters, squad, "4-3-3", {}, starters[0], 0, {
      left: 50,
      top: 90,
    })!.positions[starters[0]],
  ).toEqual({ left: 50, top: 90 });
});
it("exposes distinct options for all lanes, midfield lines and goal", () => {
  expect(fieldSectors).toHaveLength(20);
  expect(new Set(fieldSectors.map((s) => s.name)).size).toBe(20);
  expect(fieldSectors.some((s) => s.name === "Volante central")).toBe(true);
  expect(fieldSectors.some((s) => s.name === "Goleiro")).toBe(true);
});

it("allows keepers in attack, outfield players in goal, and swaps across all functions", () => {
  const result = deployLineupPlayer(
    starters,
    squad,
    "4-3-3",
    {},
    starters[10],
    0,
  )!;
  expect(result.starters[0]).toBe(starters[10]);
  expect(result.starters[10]).toBe(starters[0]);
  expect(new Set(result.starters).size).toBe(11);
  const free = deployLineupPlayer(
    starters,
    squad,
    "4-3-3",
    {},
    starters[10],
    10,
    { left: 3, top: 4 },
  )!;
  expect(free.positions[starters[10]]).toEqual({ left: 3, top: 4 });
  expect(
    deployLineupPlayer(starters, squad, "4-3-3", {}, starters[0], 0, {
      left: 0,
      top: 100,
    })!.positions[starters[0]],
  ).toEqual({ left: 0, top: 100 });
});

it("tiles the whole pitch without gaps or overlapping interiors", () => {
  const area = (poly: (typeof fieldRegions)[number]["polygon"]) =>
    Math.abs(
      poly.reduce((sum, p, i) => {
        const q = poly[(i + 1) % poly.length];
        return sum + p.left * q.top - q.left * p.top;
      }, 0) / 2,
    );
  expect(fieldRegions.reduce((sum, r) => sum + area(r.polygon), 0)).toBeCloseTo(
    10000,
    7,
  );
  const contains = (
    poly: (typeof fieldRegions)[number]["polygon"],
    x: number,
    y: number,
  ) =>
    poly.every((p, i) => {
      const q = poly[(i + 1) % poly.length];
      return (
        (q.left - p.left) * (y - p.top) - (q.top - p.top) * (x - p.left) >=
        -1e-7
      );
    });
  for (const region of fieldRegions) {
    expect(area(region.polygon)).toBeGreaterThan(0);
    expect(contains(region.polygon, region.left, region.top)).toBe(true);
    expect(
      region.polygon.every(
        (p) =>
          Number.isFinite(p.left) &&
          Number.isFinite(p.top) &&
          p.left >= -1e-7 &&
          p.left <= 100 + 1e-7 &&
          p.top >= -1e-7 &&
          p.top <= 100 + 1e-7,
      ),
    ).toBe(true);
  }
  for (let x = 0.371; x < 100; x += 2)
    for (let y = 0.613; y < 100; y += 2)
      expect(
        fieldRegions.filter((r) => contains(r.polygon, x, y)),
      ).toHaveLength(1);
  for (const [x, y] of [
    [0, 0],
    [0, 100],
    [100, 0],
    [100, 100],
  ])
    expect(fieldRegions.some((r) => contains(r.polygon, x, y))).toBe(true);
});
it("covers every reference position including second striker, wingbacks and both sides of the center backs", () => {
  expect(new Set(fieldSectors.map((s) => s.short))).toEqual(
    new Set([
      "ST",
      "CF",
      "LW",
      "RW",
      "CAM",
      "LM",
      "RM",
      "CM",
      "CDM",
      "LWB",
      "RWB",
      "LB",
      "RB",
      "CB",
      "GK",
    ]),
  );
  for (const side of ["esquerdo", "direito"])
    for (const role of ["Centroavante", "Ala", "Zagueiro"])
      expect(fieldSectors.some((s) => s.name === `${role} ${side}`)).toBe(true);
});

it("merges repeated role markings without removing side-specific placement targets", async () => {
  const { fieldBoundaries, fieldRoleLabels } = await import("./lineup");
  expect(fieldRoleLabels).toHaveLength(15);
  expect(fieldRoleLabels.filter((s) => s.short === "CB")).toHaveLength(1);
  expect(fieldRoleLabels.filter((s) => s.short === "CM")).toHaveLength(1);
  expect(fieldRoleLabels.filter((s) => s.short === "ST")).toHaveLength(1);
  expect(fieldBoundaries.length).toBeGreaterThan(0);
  expect(fieldBoundaries.every((edge) => edge.roles[0] !== edge.roles[1])).toBe(
    true,
  );
  const keys = fieldBoundaries.map(({ from, to }) =>
    [
      `${from.left.toFixed(5)},${from.top.toFixed(5)}`,
      `${to.left.toFixed(5)},${to.top.toFixed(5)}`,
    ]
      .sort()
      .join("|"),
  );
  expect(new Set(keys).size).toBe(keys.length);
  expect(fieldRegions.filter((r) => r.short === "CB")).toHaveLength(3);
  expect(fieldRegions.filter((r) => r.short === "CM")).toHaveLength(3);
});
