import { expect, it } from "vitest";
import { GET } from "./route";

it("returns the audited November collection with source date and resumable staging", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  const { report, checkpoint } = await response.json();
  expect(report).toMatchObject({ clubs: 156, players: 4208, validClubs: 69, pendingClubs: 87, sourceCollectedAt: "2026-11-04T15:48:14.249086+00:00" });
  expect(checkpoint.members).toHaveLength(156);
  expect(checkpoint.members.every((item: { expectedPlayerIds?: string[] }) => Array.isArray(item.expectedPlayerIds))).toBe(true);
  expect(checkpoint.snapshot.generatedAt).toBe(report.sourceCollectedAt);
});
