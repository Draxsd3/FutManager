import { expect, it } from "vitest";
import { standingsZone } from "./standings-zones";

it("projects only the documented 2026 positions for twenty-team Brazilian leagues", () => {
  const zone = (id: string, position: number) => standingsZone(`league:Brasil:Série ${id}`, 2026, 20, position);
  expect([1, 4, 5, 6, 11, 12, 16, 17, 20, 21].map(p => zone("A", p))).toEqual(["libertadores-grupos", "libertadores-grupos", "libertadores-preliminar", "sul-americana", "sul-americana", undefined, undefined, "rebaixamento", "rebaixamento", undefined]);
  expect([1, 2, 3, 6, 7, 16, 17, 20].map(p => zone("B", p))).toEqual(["acesso", "acesso", "playoff-acesso", "playoff-acesso", undefined, undefined, "rebaixamento", "rebaixamento"]);
  expect(standingsZone("league:Brasil:Série A", 2025, 20, 1)).toBeUndefined();
  expect(standingsZone("league:Brasil:Série B", 2026, 19, 1)).toBeUndefined();
  expect(standingsZone("league:Brasil:Série C", 2026, 20, 1)).toBeUndefined();
});
