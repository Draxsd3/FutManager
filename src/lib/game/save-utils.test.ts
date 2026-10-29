import { describe, expect, it } from "vitest";
import { accountStorageKey, mergeCareerSaves } from "./save-utils";
import type { CareerSave } from "./editor-data";

const save = (id: string, updatedAt: string, round = 1): CareerSave => ({ id, updatedAt, round,
  name: id, managerName: "Treinador", clubId: "club", clubName: "Flamengo", division: "Série A", budget: 100, inGameDate: "2026-01-22" });

describe("account and career separation", () => {
  it("uses a different cache for each account and rejects missing owners", () => {
    expect(accountStorageKey("saves", "alice")).not.toBe(accountStorageKey("saves", "bob"));
    expect(() => accountStorageKey("saves", "")).toThrow();
  });
  it("keeps independent careers, preferring newer offline revisions", () => {
    const local = save("a", "2026-10-29T15:00:00Z", 8);
    const merged = mergeCareerSaves([local], [save("a", "2026-10-28T15:00:00Z", 2), save("b", "2026-10-29T12:00:00Z", 3)]);
    expect(merged).toHaveLength(2);
    expect(merged.find((s) => s.id === "a")?.round).toBe(8);
    expect(merged.find((s) => s.id === "b")?.round).toBe(3);
  });
  it("prefers newer cloud revisions and never mutates the supplied saves", () => {
    const local = [save("a", "2026-10-28T15:00:00Z", 2)];
    const cloud = [save("a", "2026-10-29T15:00:00Z", 9)];
    expect(mergeCareerSaves(local, cloud)[0].round).toBe(9);
    expect(local[0].round).toBe(2);
  });
});
