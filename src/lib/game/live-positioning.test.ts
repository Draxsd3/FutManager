import { describe, expect, it } from "vitest";
import { visualFormation } from "./live-positioning";
import { squad } from "./mock-data";
import type { MatchScene } from "./live-match";

const starters = squad.slice(0, 11);
const scene: MatchScene = { action: "pass", team: "home", actorIndex: 1, targetIndex: 3, from: { x: 60, y: 45 }, to: { x: 72, y: 70 } };
const input = { starters, formation: "4-3-3", manualPositions: {}, minute: 10, scene };

describe("live visual positioning", () => {
  it("uses formation as a responsive team shape instead of a movement boundary", () => {
    const result = visualFormation(input);
    expect(result).toHaveLength(22);
    expect(result.filter((player) => player.key.startsWith("home-") && player.target.x !== player.base.x).length).toBeGreaterThan(8);
    expect(result.filter((player) => player.key.startsWith("away-") && player.target.x !== player.base.x).length).toBeGreaterThan(8);
    expect(result.some((player) => !player.goalkeeper && Math.hypot(player.target.x - player.base.x, player.target.y - player.base.y) > 15)).toBe(true);
    expect(result[1].target).toEqual(scene.from);
    expect(result[3].target).toEqual(scene.to);
    for (const player of result) {
      expect(player.target.x).toBeGreaterThanOrEqual(5);
      expect(player.target.x).toBeLessThanOrEqual(95);
      expect(player.target.y).toBeGreaterThanOrEqual(5);
      expect(player.target.y).toBeLessThanOrEqual(95);
    }

    const shifted = visualFormation({ ...input, scene: { ...scene, to: { x: 25, y: 25 } } });
    expect(shifted[4].target).not.toEqual(result[4].target);
  });

  it("uses custom positions as the starting organization while the goalkeeper tracks play softly", () => {
    const players = starters.map((player, index) => index === 10 ? { ...player, position: "G" as const } : player);
    const keeperBase = { x: 80, y: 20 };
    const result = visualFormation({
      ...input,
      starters: players,
      manualPositions: { [players[10].id]: { left: 20, top: 20 } },
      scene: { ...scene, team: "away", action: "foul", targetIndex: 0, to: { x: 5, y: 95 } },
    });
    expect(result[10].base).toEqual(keeperBase);
    expect(result[10].target.x).toBeLessThan(keeperBase.x - 4);
    expect(result[10].target.y).toBeGreaterThan(keeperBase.y + 7);
    expect(result[10].target.x).toBeGreaterThan(45);
    expect(result[10].target.y).toBeLessThan(70);
  });

  it("keeps players at their saved organization before kickoff when there is no live scene", () => {
    const result = visualFormation({ ...input, scene: undefined });
    expect(result.every((player) => player.target.x === player.base.x && player.target.y === player.base.y)).toBe(true);
  });
});
