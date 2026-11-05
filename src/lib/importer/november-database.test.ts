import { expect, it } from "vitest";
import { applyNovemberDatabase } from "./november-database";
import { importBrazilDatabase } from "./brazil-database";
it("updates all source clubs and players while flagging inferred positions", async () => {
  const base = await importBrazilDatabase();
  const result = await applyNovemberDatabase(base);
  expect(result).toMatchObject({ clubs: 156, players: 4208, provisional: 207, shortRosters: 4 });
  const imported = result.database.players.filter(player => player.transfermarkt?.collectedAt === "2026-11-04T15:48:14.249086+00:00");
  expect(imported).toHaveLength(4208);
  expect(imported.filter(player => player.transfermarkt?.estimatedFields?.includes("primaryPosition"))).toHaveLength(207);
  expect(new Set(imported.map(player => player.transfermarkt?.id)).size).toBe(4208);
});
it("retains club identities and kit customizations on repeat and does not lose source players", async () => {
  const base = await importBrazilDatabase();
  const first = (await applyNovemberDatabase(base)).database;
  const imported = first.clubs.find(club => club.transfermarkt?.id)!;
  const clubId = imported.id;
  const changed = { ...first, clubs: first.clubs.map(club => club.id === clubId ? { ...club, primaryColor: "#123456", kitStyle: "listrada" as const } : club) };
  const second = (await applyNovemberDatabase(changed)).database;
  expect(second.clubs.find(club => club.id === clubId)).toMatchObject({ primaryColor: "#123456", kitStyle: "listrada" });
  expect(second.players.filter(player => player.transfermarkt?.collectedAt === "2026-11-04T15:48:14.249086+00:00")).toHaveLength(4208);
  expect(second.players.length).toBe(first.players.length);
});
