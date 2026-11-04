import { expect, it, vi } from "vitest";
import file from "@/data/transfermarkt/brasileirao-2026.json";
import { prepareNationalSeed } from "./transfermarkt-seed";
import { collectNationalSnapshot } from "./transfermarkt-live";

it("audits the actual attachment without inventing facts or losing incomplete players", () => {
  const before = JSON.stringify(file);
  const { checkpoint, report } = prepareNationalSeed(file, "attachment-v1");
  expect(report.clubs).toBe(156); expect(report.players).toBe(4497);
  expect(report.playerIssues).toHaveLength(203);
  expect(report.validClubs).toBe(74); expect(report.pendingClubs).toBe(82);
  expect(checkpoint.snapshot.clubs.reduce((sum, club) => sum + club.players.length, 0)).toBe(2222);
  expect(report.playerIssues.find(p => p.playerName === "Maiky")?.clubName).toContain("Figueirense");
  expect(checkpoint.members).toHaveLength(156);
  expect(checkpoint.snapshot.clubs.length + checkpoint.issues!.length).toBe(156);
  expect(checkpoint.snapshot.clubs.every(club => club.stadiumName === null && club.coachName === null)).toBe(true);
  expect(checkpoint.issues!.find(club => club.clubName.includes("ABECAT"))?.message).toContain("7 jogadores");
  expect(report.sourceCollectedAt).toBeNull();
  expect(JSON.stringify(file)).toBe(before);
});
it("requests only clubs pending in the file, preserving all valid attached squads", async () => {
  const { checkpoint, report } = prepareNationalSeed(file, "attachment-v1");
  const request = vi.fn().mockRejectedValue(new Error("Still incomplete"));
  let saved = checkpoint;
  await expect(collectNationalSnapshot({ request, seed: async () => checkpoint, save: async value => { saved = structuredClone(value!); } })).rejects.toThrow("pendências");
  const validIds = new Set(checkpoint.snapshot.clubs.map(club => club.id));
  expect(request.mock.calls.every(([body]) => body.action === "club" && !validIds.has(body.club))).toBe(true);
  expect(request).toHaveBeenCalledTimes(report.pendingClubs * 2);
  expect(saved.snapshot.clubs).toHaveLength(report.validClubs);
});
it("rejects duplicate identities or incomplete manifests in the file", () => {
  const duplicate = structuredClone(file);
  duplicate.competitions[1].clubs[0].id = duplicate.competitions[0].clubs[0].id;
  expect(() => prepareNationalSeed(duplicate, "bad")).toThrow("duplicado");
  expect(() => prepareNationalSeed({ competitions: [] }, "bad")).toThrow();
});

it("merges a new file into an older checkpoint without replacing already validated live clubs", async () => {
  const { checkpoint } = prepareNationalSeed(file, "attachment-v1");
  const previous = structuredClone(checkpoint);
  previous.seedId = undefined;
  previous.snapshot.clubs = previous.snapshot.clubs.slice(0, 1);
  previous.snapshot.clubs[0].stadiumName = "Previously verified stadium";
  let saved = previous;
  await expect(collectNationalSnapshot({ seed: async () => checkpoint, load: async () => previous,
    request: vi.fn().mockRejectedValue(new Error("Missing position")), save: async value => { saved = structuredClone(value!); } })).rejects.toThrow("pendências");
  expect(saved.snapshot.clubs).toHaveLength(74);
  expect(saved.snapshot.clubs[0].stadiumName).toBe("Previously verified stadium");
  expect(saved.seedId).toBe("attachment-v1");
});
