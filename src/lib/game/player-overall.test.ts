import { describe, expect, it } from "vitest";
import { estimatePlayerOverall, recalibrateDatabaseOveralls } from "./player-overall";
import { createDefaultDatabase } from "./editor-data";

const small = { division: "Série D" as const, level: 5 };
const big = { division: "Série A" as const, level: 16 };
const player = { age: 27, starRating: 2 };
const withValue = (marketValueEur: number | null) => ({ ...player, transfermarkt: { id: "1", collectedAt: "2026-01-01", season: "2026", marketValueEur } });
describe("estimativas de força", () => {
  it("tem uma hierarquia entre divisões sem confundir valor ausente com zero", () => {
    expect(estimatePlayerOverall(player, big)).toBeGreaterThan(estimatePlayerOverall(player, small));
    expect(estimatePlayerOverall(withValue(0), small)).toBe(estimatePlayerOverall(withValue(null), small));
    expect(estimatePlayerOverall({ ...player, age: 19 }, small)).toBeLessThan(estimatePlayerOverall(player, small));
  });
  it("permite destaque de clube menor e não altera a nota de um atleta valorizado ao trocar de clube", () => {
    const standout = withValue(5_000_000), other = withValue(100_000);
    expect(estimatePlayerOverall(standout, small)).toBeGreaterThan(estimatePlayerOverall(other, big));
    expect(estimatePlayerOverall(standout, small)).toBe(estimatePlayerOverall(standout, big));
    expect(estimatePlayerOverall(withValue(1_000_000_000), big)).toBeLessThanOrEqual(90);
  });
  it("recalibra sem mudar identidade, salários, estrelas ou a base de origem, e ignora órfãos", () => {
    const db = createDefaultDatabase();
    const first = db.players[0];
    const orphan = { ...first, id: "orphan", clubId: "missing" };
    const input = { ...db, players: [first, orphan] };
    const result = recalibrateDatabaseOveralls(input);
    expect(result.updated).toBe(1); expect(result.skipped).toBe(1);
    expect(result.database.players[0]).toEqual({ ...first, overall: estimatePlayerOverall(first, db.clubs.find(c => c.id === first.clubId)!) });
    expect(input.players[0]).toBe(first);
    expect(recalibrateDatabaseOveralls(result.database).database).toEqual(result.database);
  });
});
