import { expect, it } from "vitest";
import { createDefaultDatabase, buildSquadFromDatabase } from "./editor-data";
import { recruitPlayer } from "./recruitment";
it("valida saldo, duplicação e limite de elenco antes de contratar", () => {
  const db = createDefaultDatabase(), club = db.clubs[0];
  const squad = buildSquadFromDatabase(db, club.name)!;
  const source = db.players.find((p) => p.clubId !== club.id && p.marketValueBrl > 0)!;
  const price = Math.ceil(source.marketValueBrl * 2 / 1000);
  expect(recruitPlayer(db, squad, club.name, price - 1, source.id).squad).toBe(squad);
  const result = recruitPlayer(db, squad, club.name, price, source.id, [999]);
  expect(result.budget).toBe(0);
  expect(result.squad.at(-1)?.id).toBe(1000);
  expect(result.squad.at(-1)?.sourceId).toBe(source.id);
  expect(recruitPlayer(db, result.squad, club.name, price, source.id).squad).toBe(result.squad);
  expect(recruitPlayer(db, Array.from({ length: 35 }, (_, i) => ({ ...squad[0], id: i })), club.name, price, source.id).message).toContain("limite");
});
