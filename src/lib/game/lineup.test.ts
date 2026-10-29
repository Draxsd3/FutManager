import { expect, it } from "vitest";
import { squad, buildStartingXI } from "./mock-data";
import { deployLineupPlayer, fieldSectors } from "./lineup";
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
it("rejects keeper swaps, invalid slots, nonfinite coordinates and keeper moves out of goal", () => {
  for (const [id, slot] of [
    [starters[0], 10],
    [starters[10], 0],
    [99999, 0],
    [starters[0], -1],
    [starters[0], 0.5],
  ]) {
    expect(
      deployLineupPlayer(starters, squad, "4-3-3", {}, id, slot),
    ).toBeNull();
  }
  expect(
    deployLineupPlayer(starters, squad, "4-3-3", {}, starters[10], 10, {
      left: 20,
      top: 30,
    }),
  ).toBeNull();
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
    }),
  ).toBeNull();
});
it("exposes distinct options for all lanes, midfield lines and goal", () => {
  expect(fieldSectors).toHaveLength(16);
  expect(new Set(fieldSectors.map((s) => s.name)).size).toBe(16);
  expect(fieldSectors.some((s) => s.name === "Volante central")).toBe(true);
  expect(fieldSectors.some((s) => s.name === "Goleiro")).toBe(true);
});
