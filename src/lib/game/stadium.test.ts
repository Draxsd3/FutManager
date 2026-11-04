import { describe, expect, it } from "vitest";
import { finishConstruction, newStadium, projectStadiumGate, recordGate, sectorCapacities, setSectorPrice, stadiumCapacity, startExpansion } from "./stadium";

describe("career stadium", () => {
  it("splits every seat, applies each sector price and calculates the net gate", () => {
    expect(Object.values(sectorCapacities(101)).reduce((a, b) => a + b, 0)).toBe(101);
    const state = setSectorPrice(newStadium(), "popular", 100);
    const gate = projectStadiumGate(1000, state.prices, 100);
    expect(gate.audience).toBe(1000);
    expect(gate.gross).toBe(500 * 100 + 300 * 50 + 150 * 80 + 50 * 150);
    expect(gate.net).toBe(gate.gross - gate.costs);
    expect(setSectorPrice(state, "popular", -1)).toBe(state);
    expect(setSectorPrice(state, "popular", Infinity)).toBe(state);
  });
  it("charges once and only adds capacity on the date the selected construction ends", () => {
    const original = newStadium();
    expect(startExpansion(original, 10000, "2026-01-01", 100).error).toMatch(/insuficiente/);
    const started = startExpansion(original, 5000, "2026-01-01", 6000);
    expect(started.budget).toBe(1000);
    expect(started.state.construction?.endsOn).toBe("2026-04-01");
    expect(stadiumCapacity(10000, started.state, "2026-03-31")).toBe(10000);
    expect(startExpansion(started.state, 1000, "2026-03-31", 5000).error).toMatch(/andamento/);
    expect(stadiumCapacity(10000, started.state, "2026-04-01")).toBe(15000);
    const finished = finishConstruction(started.state, "2026-04-01");
    expect(finishConstruction(finished, "2026-04-02").addedCapacity).toBe(5000);
    expect(startExpansion(finished, 1000, "2026-04-02", 1000).state.addedCapacity).toBe(5000);
  });
  it("records home gate once per fixture and preserves its historical values after price changes", () => {
    const state = newStadium();
    const result = recordGate(state, 10000, "2026-01-22", "fixture-1", "Rival");
    expect(result.receipt?.net).toBeGreaterThan(0);
    expect(result.receipt?.audience).toBe(7000);
    const changed = setSectorPrice(result.state, "popular", 0);
    expect(changed.receipts[0]).toEqual(result.receipt);
    expect(recordGate(changed, 10000, "2026-01-22", "fixture-1", "Rival").receipt).toBeUndefined();
  });
});
