import { expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import file from "@/data/transfermarkt/brasileirao-2026.json";
import { manualCorrectionSchema } from "./transfermarkt-corrections";
import { prepareNationalSeed } from "./transfermarkt-seed";
import { collectNationalSnapshot } from "./transfermarkt-live";
import { readTransfermarktCorrections, saveTransfermarktCorrections } from "./database-cache";

const patch = { clubId: "4064", playerId: "1355436", correctedAt: "2026-11-04T12:00:00Z", position: "Central Midfield" as const };
it("corrects the supplied player's missing field with manual provenance, without mutating the source", () => {
  const before = JSON.stringify(file);
  const result = prepareNationalSeed(file, "manual-v1", patch.correctedAt, [patch]);
  expect(result.report.validClubs).toBe(75);
  expect(result.report.playerIssues).toHaveLength(202);
  const maiky = result.checkpoint.snapshot.clubs.find(club => club.id === "4064")?.players.find(player => player.id === patch.playerId);
  expect(maiky).toMatchObject({ position: "M", age: 21, dateOfBirth: "2005-03-31", manualCorrection: { fields: ["position"], correctedAt: patch.correctedAt } });
  expect(JSON.stringify(file)).toBe(before);
});
it("derives age from a manually entered birth date rather than retaining a contradictory source age", () => {
  const result = prepareNationalSeed(file, "manual-v2", patch.correctedAt, [{ ...patch, dateOfBirth: "2001-01-01" }]);
  const player = result.checkpoint.snapshot.clubs.find(club => club.id === "4064")?.players.find(player => player.id === patch.playerId);
  expect(player?.age).toBe(25);
  expect(player?.manualCorrection?.fields).toContain("dateOfBirth");
});
it("rejects future/invalid birth dates, missing fields, unsupported positions and foreign identities", () => {
  expect(manualCorrectionSchema.safeParse({ ...patch, dateOfBirth: "2099-01-01" }).success).toBe(false);
  expect(manualCorrectionSchema.safeParse({ ...patch, dateOfBirth: "2000-02-30" }).success).toBe(false);
  expect(manualCorrectionSchema.safeParse({ ...patch, age: 24, dateOfBirth: "2000-01-01" }).success).toBe(false);
  expect(manualCorrectionSchema.safeParse({ ...patch, position: "Unknown" }).success).toBe(false);
  expect(manualCorrectionSchema.safeParse({ clubId: patch.clubId, playerId: patch.playerId, correctedAt: patch.correctedAt }).success).toBe(false);
  expect(() => prepareNationalSeed(file, "invalid", patch.correctedAt, [{ ...patch, playerId: "999999999" }])).toThrow("não pertence");
});
it("isolates persisted corrections by account and supports explicit removal", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  try {
    await saveTransfermarktCorrections("manual-alice", [patch]);
    expect(await readTransfermarktCorrections("manual-alice")).toEqual([patch]);
    expect(await readTransfermarktCorrections("manual-bob")).toEqual([]);
    await saveTransfermarktCorrections("manual-alice", []);
    expect(await readTransfermarktCorrections("manual-alice")).toEqual([]);
  } finally { vi.unstubAllGlobals(); }
});
it("replaces a previously staged manual correction and invalidates it when explicitly removed", async () => {
  const old = prepareNationalSeed(file, "manual-v1", new Date().toISOString(), [patch]).checkpoint;
  const restored = prepareNationalSeed(file, "original-v2").checkpoint;
  let saved = old;
  const request = vi.fn().mockRejectedValue(new Error("Missing position"));
  await expect(collectNationalSnapshot({ load: async () => old, seed: async () => restored, request, save: async value => { saved = structuredClone(value!); } })).rejects.toThrow("pendências");
  expect(saved.snapshot.clubs).toHaveLength(74);
  expect(saved.snapshot.clubs.some(club => club.id === "4064")).toBe(false);
  expect(request.mock.calls.some(([body]) => body.club === "4064")).toBe(true);
});
