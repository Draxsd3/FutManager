import { expect, it } from "vitest";
import { standingsZone } from "./standings-zones";

it("only projects the documented Série A 2026 positions with real results and 20 clubs", () => {
  const zone = (position: number) => standingsZone("league:Brasil:Série A", 2026, 20, true, position);
  expect([1, 4, 5, 6, 11, 12, 16, 17, 20, 21].map(zone)).toEqual(["libertadores-grupos", "libertadores-grupos", "libertadores-preliminar", "sul-americana", "sul-americana", undefined, undefined, "rebaixamento", "rebaixamento", undefined]);
  expect(standingsZone("league:Brasil:Série B", 2026, 20, true, 1)).toBeUndefined();
  expect(standingsZone("league:Brasil:Série A", 2026, 20, false, 1)).toBeUndefined();
  expect(standingsZone("league:Brasil:Série A", 2025, 20, true, 1)).toBeUndefined();
});
