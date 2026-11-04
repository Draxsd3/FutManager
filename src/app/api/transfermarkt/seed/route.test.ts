import { expect, it } from "vitest";
import { POST } from "./route";
it("previews manual corrections without changing the public base file", async () => {
  const make = (corrections: unknown[]) => new Request("https://game.example/api/transfermarkt/seed", { method: "POST", body: JSON.stringify({ corrections }) });
  const corrected = await POST(make([{ clubId: "4064", playerId: "1355436", position: "Central Midfield", correctedAt: "2026-11-04T00:00:00Z" }]));
  expect(corrected.status).toBe(200);
  const result = await corrected.json();
  expect(result.report.validClubs).toBe(75);
  expect(result.reviewPlayers.some((player: { playerId: string }) => player.playerId === "1355436")).toBe(true);
  expect((await (await POST(make([]))).json()).report.validClubs).toBe(74);
});
it("rejects invalid fields, foreign IDs, duplicate patches and oversized requests", async () => {
  const make = (body: string) => new Request("https://game.example/api/transfermarkt/seed", { method: "POST", body });
  expect((await POST(make("{"))).status).toBe(400);
  expect((await POST(make("x".repeat(1_000_001)))).status).toBe(413);
  const patch = { clubId: "4064", playerId: "999999999", position: "Central Midfield", correctedAt: "2026-11-04T00:00:00Z" };
  expect((await POST(make(JSON.stringify({ corrections: [patch] })))).status).toBe(400);
  expect((await POST(make(JSON.stringify({ corrections: [patch, patch] })))).status).toBe(400);
});
