import { describe, expect, it } from "vitest";
import { visualFormation } from "./live-positioning";
import { squad, buildStartingXI } from "./mock-data";
import type { MatchScene } from "./live-match";

const starters = buildStartingXI("4-3-3", squad).map((id) => squad.find((player) => player.id === id)!);
const scene: MatchScene = { action: "pass", team: "home", actorIndex: 1, targetIndex: 3, from: { x: 60, y: 45 }, to: { x: 72, y: 70 } };
const input = { starters, formation: "4-3-3", manualPositions: {}, minute: 10, scene };

describe("live visual positioning", () => {
  it("uses formation as a responsive team shape instead of a movement boundary", () => {
    const result = visualFormation(input);
    expect(result).toHaveLength(22);
    expect(result.filter((player) => player.key.startsWith("home-") && player.target.x !== player.base.x).length).toBeGreaterThanOrEqual(8);
    expect(result.filter((player) => player.key.startsWith("away-") && player.target.x !== player.base.x).length).toBeGreaterThanOrEqual(8);
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

  it("keeps both goalkeepers at the fixed goal position even with legacy manual positions or an active scene", () => {
    const players = starters.map((player, index) => index === 10 ? { ...player, position: "G" as const } : player);
    for (const team of ["home", "away"] as const) {
      const result = visualFormation({ ...input, starters: players,
        manualPositions: { [players[10].id]: { left: 20, top: 20 } },
        scene: { ...scene, team, actorIndex: 10, to: { x: 5, y: 95 } },
      });
      expect(result[10].base).toEqual({ x: 15, y: 50 });
      expect(result[10].target).toEqual(result[10].base);
      expect(result[21].target).toEqual(result[21].base);
    }
  });

  it("keeps players at their saved organization before kickoff when there is no live scene", () => {
    const result = visualFormation({ ...input, scene: undefined });
    expect(result.every((player) => player.target.x === player.base.x && player.target.y === player.base.y)).toBe(true);
  });
});
