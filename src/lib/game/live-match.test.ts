import { describe, expect, it } from "vitest";
import { squad } from "./mock-data";
import { otherScore, simulateAction } from "./live-match";

const players = squad.slice(0, 11);
function generate(values: number[]) {
  let index = 0;
  return simulateAction({ minute: 30, starters: players, formation: "4-3-3", positions: { [players[0].id]: { left: 25, top: 80 } }, opponent: "Rival", random: () => values[index++] ?? 0 });
}
describe("live match model", () => {
  it("generates passes from the actual configured positions", () => {
    const event = generate([0, .1, 0, 0]);
    expect(event.scene?.action).toBe("pass");
    expect(event.scene?.from.x).toBeGreaterThanOrEqual(18);
    expect(event.scene?.from.x).toBeLessThanOrEqual(22);
    expect(event.scene?.from.y).toBeGreaterThanOrEqual(23);
    expect(event.scene?.from.y).toBeLessThanOrEqual(27);
    expect(event.text).toContain(players[0].name);
    expect(JSON.parse(JSON.stringify(event))).toEqual(event);
  });
  it("uses the same event for shots, goals, fouls and discussions", () => {
    expect(generate([0, .7, 0, 0, 0]).scene?.action).toBe("goal");
    expect(generate([0, .7, 0, 0, .9]).scene?.action).toBe("shot");
    expect(generate([0, .9, 0, 0]).scene?.action).toBe("foul");
    expect(generate([0, .99, 0, 0]).scene?.action).toBe("discussion");
    expect(generate([0, .82, 0, 0]).scene?.action).toBe("tackle");
  });
  it("keeps the other scores stable, monotonic and limited by the clock", () => {
    expect(otherScore("A", "B", 1, 0)).toEqual([0, 0]);
    const a = otherScore("A", "B", 1, 45);
    expect(otherScore("A", "B", 1, 45)).toEqual(a);
    const b = otherScore("A", "B", 1, 90);
    expect(b[0]).toBeGreaterThanOrEqual(a[0]); expect(b[1]).toBeGreaterThanOrEqual(a[1]);
    expect(otherScore("A", "B", 1, 200)).toEqual(b);
  });
});

it("continues a completed pass from the receiving player without moving the ball backwards", () => {
  const first = generate([0, .1, 0, 0]);
  let n = 0;
  const rolls = [.99, .1, .2, .2, .2];
  const next = simulateAction({ minute: 31, starters: players, formation: "4-3-3", positions: {}, opponent: "Rival", previous: first.scene, random: () => rolls[n++] ?? 0 });
  expect(next.scene?.team).toBe(first.scene?.team);
  expect(next.scene?.actorIndex).toBe(first.scene?.targetIndex);
  expect(next.scene?.from).toEqual(first.scene?.to);
  expect(next.scene?.targetIndex).not.toBe(next.scene?.actorIndex);
});

it("uses the same live player locations as the preview when creating the next pass", () => {
  const snapshot = {
    home: players.map((_, index) => ({ x: 30 + index * 4, y: 20 + index * 5 })),
    away: players.map((_, index) => ({ x: 70 - index * 4, y: 80 - index * 5 })),
  };
  let n = 0;
  const rolls = [0, .1, .1, .1];
  const event = simulateAction({ minute: 30, starters: players, formation: "4-3-3", positions: {}, opponent: "Rival", snapshot, random: () => rolls[n++] ?? 0 });
  expect(event.scene?.team).toBe("home");
  expect(event.scene?.actorIndex).toBe(1);
  expect(Math.hypot(event.scene!.from.x - snapshot.home[1].x, event.scene!.from.y - snapshot.home[1].y)).toBeLessThan(3);
  expect(Math.hypot(event.scene!.to.x - snapshot.home[event.scene!.targetIndex].x, event.scene!.to.y - snapshot.home[event.scene!.targetIndex].y)).toBeLessThan(3);
});

it("filters ordinary circulation but keeps key moments and legacy events", async () => {
  const { isHighlight } = await import("./live-match");
  expect(isHighlight(generate([0, .1, 0, 0]))).toBe(false);
  expect(isHighlight(generate([0, .82, 0, 0]))).toBe(false);
  expect(isHighlight(generate([0, .7, 0, 0, 0]))).toBe(true);
  expect(isHighlight(generate([0, .9, 0, 0]))).toBe(true);
  expect(isHighlight({ minute: 5, half: 1, text: "Substituição" })).toBe(true);
  expect(isHighlight({ ...generate([0, .1, 0, 0]), card: "yellow" })).toBe(true);
});

it("restarts in midfield after a goal and stores named scorers when available", () => {
  const previous = { action: "goal" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: { x: 75, y: 50 }, to: { x: 95, y: 50 } };
  let n = 0;
  const rolls = [.99, .7, .0, .0, .0, .0];
  const event = simulateAction({ minute: 60, starters: players, opponentStarters: players, formation: "4-3-3", positions: {}, opponent: "Rival", previous, random: () => rolls[n++] ?? 0 });
  expect(event.scene?.from).toEqual({ x: 50, y: 50 });
  expect(event.scene?.action).toBe("goal");
  expect(event.scorer).toBe(players[event.scene!.actorIndex].name);
});
