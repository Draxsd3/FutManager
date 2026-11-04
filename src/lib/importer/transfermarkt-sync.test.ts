import { afterEach, expect, it, vi } from "vitest";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import { prepareTransfermarktSync } from "./transfermarkt-sync";
vi.mock("@/data/brazil-clubs.json", () => ({ default: [{ source: "flarj", name: "Flamengo", state: "Rio de Janeiro" }] }));
vi.mock("../../../scripts/transfermarkt/clubs.json", () => ({ default: { flarj: { approved: true, transfermarktId: "123" } } }));
afterEach(() => vi.unstubAllGlobals());
const snapshot = () => ({ version: 1, generatedAt: "2026-11-03T12:00:00Z", seasonId: null,
  clubs: [{ source: "flarj", id: "123", name: "Flamengo", fetchedAt: "2026-11-03T12:00:00Z", updatedAt: null,
    stadiumName: null, stadiumCapacity: null, coachName: null,
    players: Array.from({ length: 11 }, (_, i) => ({ id: String(i + 1), name: `Test player ${i}`, age: 25, position: i ? "M" : "G", shirtNumber: i + 1, foot: null, contractEndsOn: null, marketValueEur: null })) }] });
it("downloads via a relative same-origin URL, bypasses cache and prepares only existing clubs", async () => {
  const db = createDefaultDatabase(), original = structuredClone(db);
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ snapshot: snapshot() }) });
  vi.stubGlobal("fetch", fetcher);
  const result = await prepareTransfermarktSync(db);
  expect(fetcher).toHaveBeenCalledWith("/api/transfermarkt", expect.objectContaining({ cache: "no-store" }));
  expect(result.clubs).toBe(1); expect(result.players).toBe(11);
  expect(result.database.clubs).toHaveLength(db.clubs.length);
  expect(db).toEqual(original);
});
it("does not apply empty, invalid, unavailable or unrelated collections", async () => {
  const db = createDefaultDatabase();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  await expect(prepareTransfermarktSync(db)).rejects.toThrow("Não foi possível");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ snapshot: { ...snapshot(), clubs: [] } }) }));
  await expect(prepareTransfermarktSync(db)).rejects.toThrow("Nenhuma coleta");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ snapshot: { invalid: true } }) }));
  await expect(prepareTransfermarktSync(db)).rejects.toThrow();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ snapshot: snapshot() }) }));
  await expect(prepareTransfermarktSync({ clubs: [], players: [] })).rejects.toThrow("não contém");
});
