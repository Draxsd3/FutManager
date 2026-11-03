import { describe, expect, it } from "vitest";
import { squad } from "./mock-data";
import { applyTrainingSession, canJoinTraining, sessionEnergyDelta, trainingWeekSessions, type TrainingSessionRecord } from "./training";

describe("weekly training", () => {
  it("uses lighter, differentiated energy loads instead of the old flat six-point drain", () => {
    expect(sessionEnergyDelta("passe", "Moderada")).toBe(2);
    expect(sessionEnergyDelta("marcacao", "Moderada")).toBe(2);
    expect(sessionEnergyDelta("resistencia", "Moderada")).toBe(3);
    expect(sessionEnergyDelta("resistencia", "Intensa")).toBe(5);
    expect(sessionEnergyDelta("recuperacao", "Moderada")).toBe(-10);
  });

  it("applies a small technical load and records only the selected participants", () => {
    const players = squad.slice(0, 3).map((player, index) => ({ ...player, energy: 90 - index * 5 }));
    const result = applyTrainingSession(players, {
      season: 2026, week: 2, day: "Quarta", drill: "passe", intensity: "Moderada", playerIds: [players[0].id, players[0].id],
    }, () => .99);
    expect(result.error).toBeUndefined();
    expect(result.record?.playerIds).toEqual([players[0].id]);
    expect(result.record?.energySpent).toBe(2);
    expect(result.squad.map((player) => player.energy)).toEqual([88, 85, 80]);
  });

  it("keeps recovery restorative and leaves a full-energy player unchanged", () => {
    const players = squad.slice(0, 2).map((player, index) => ({ ...player, energy: index === 0 ? 80 : 100 }));
    expect(canJoinTraining(players[0], "recuperacao", "Moderada")).toBe(true);
    expect(canJoinTraining(players[1], "recuperacao", "Moderada")).toBe(false);
    const result = applyTrainingSession(players, {
      season: 2026, week: 1, day: "Segunda", drill: "recuperacao", intensity: "Moderada", playerIds: players.map((player) => player.id),
    });
    expect(result.record?.playerIds).toEqual([players[0].id]);
    expect(result.record?.energyRecovered).toBe(10);
    expect(result.squad.map((player) => player.energy)).toEqual([90, 100]);
  });

  it("blocks a high-intensity session when the selected players need rest", () => {
    const tired = { ...squad[0], energy: 20 };
    expect(canJoinTraining(tired, "resistencia", "Intensa")).toBe(false);
    const result = applyTrainingSession([tired], {
      season: 2026, week: 1, day: "Sexta", drill: "resistencia", intensity: "Intensa", playerIds: [tired.id],
    });
    expect(result.record).toBeNull();
    expect(result.error).toMatch(/mais energia/);
    expect(result.squad[0].energy).toBe(20);
  });

  it("records gradual development and scopes the dashboard summary to the selected week", () => {
    const player = { ...squad[0], age: 20, overall: 75, energy: 90 };
    const applied = applyTrainingSession([player], {
      season: 2026, week: 3, day: "Quinta", drill: "finalizacao", intensity: "Intensa", playerIds: [player.id],
    }, () => 0);
    expect(applied.record?.overallImprovements).toBe(1);
    expect(applied.squad[0].overall).toBe(76);
    const other = { ...applied.record!, id: "other", week: 2 };
    expect(trainingWeekSessions([applied.record!, other] as TrainingSessionRecord[], 2026, 3)).toHaveLength(1);
    expect(trainingWeekSessions([applied.record!, other] as TrainingSessionRecord[], 2025, 3)).toHaveLength(0);
  });
});
