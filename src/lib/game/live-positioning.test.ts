import { describe, expect, it } from "vitest";
import { visualFormation } from "./live-positioning";
import { squad } from "./mock-data";
import type { MatchScene } from "./live-match";

const starters = squad.slice(0, 11);
const scene: MatchScene = { action: "pass", team: "home", actorIndex: 1, targetIndex: 3, from: { x: 60, y: 45 }, to: { x: 72, y: 70 } };
const input = { starters, formation: "4-3-3", manualPositions: {}, minute: 10, scene };
describe("live visual positioning", () => {
  it("moves outfield players on both teams in response to the ball while preserving tactical anchors", () => {
    const result = visualFormation(input);
    expect(result).toHaveLength(22);
    expect(result.filter((p) => p.key.startsWith("home-") && p.target.x !== p.base.x).length).toBeGreaterThan(8);
    expect(result.filter((p) => p.key.startsWith("away-") && p.target.x !== p.base.x).length).toBeGreaterThan(8);
    for (const p of result) {
      expect(Math.abs(p.target.x - p.base.x)).toBeLessThanOrEqual(p.goalkeeper ? 4 : p.key.startsWith("away-") ? 25 : 12);
      expect(Math.abs(p.target.y - p.base.y)).toBeLessThanOrEqual(p.goalkeeper ? 7 : 15);
      expect(p.target.x).toBeGreaterThanOrEqual(5); expect(p.target.x).toBeLessThanOrEqual(95);
    }
    const shifted = visualFormation({ ...input, scene: { ...scene, to: { x: 25, y: 25 } } });
    expect(shifted[4].target).not.toEqual(result[4].target);
  });
  it("uses free manual positions as anchors, including a goalkeeper placed outfield", () => {
    const players = starters.map((p, i) => i === 10 ? { ...p, position: "G" as const } : p);
    const result = visualFormation({ ...input, starters: players, manualPositions: { [players[10].id]: { left: 20, top: 20 } }, scene: { ...scene, team: "away", action: "foul", targetIndex: 10, to: { x: 5, y: 95 } } });
    expect(result[10].base).toEqual({ x: 80, y: 20 });
    expect(Math.abs(result[10].target.x - 80)).toBeLessThanOrEqual(4);
    expect(Math.abs(result[10].target.y - 20)).toBeLessThanOrEqual(7);
  });
  it("keeps all players still at their base positions before play when there is no scene", () => {
    const result = visualFormation({ ...input, scene: undefined });
    // Existing tactics may deliberately overlap; no background simulation should move them on mount.
    expect(result.every((p) => Math.hypot(p.target.x - p.base.x, p.target.y - p.base.y) < 5)).toBe(true);
  });
});
