import { expect, it } from "vitest";
import { createDefaultDatabase, buildSquadFromDatabase } from "./editor-data";
import { recruitPlayer } from "./recruitment";
it("valida saldo, duplicação e limite de elenco antes de contratar", () => {
  const db = createDefaultDatabase(), club = db.clubs[0];
  const squad = buildSquadFromDatabase(db, club.name)!;
  const source = db.players.find((p) => p.clubId !== club.id && p.marketStatus === "sale" && p.marketValueBrl > 0)!;
  const price = Math.ceil((source.marketValueBrl * 2 + source.salaryMonthlyBrl * 12) / 1000);
  expect(recruitPlayer(db, squad, club.name, price - 1, source.id).squad).toBe(squad);
  const result = recruitPlayer(db, squad, club.name, price, source.id, [999]);
  expect(result.budget).toBe(0);
  expect(result.squad.at(-1)?.id).toBe(1000);
  expect(result.squad.at(-1)?.sourceId).toBe(source.id);
  expect(result.squad.at(-1)?.acquisitionType).toBe("permanent");
  expect(recruitPlayer(db, result.squad, club.name, price, source.id).squad).toBe(result.squad);
  expect(recruitPlayer(db, Array.from({ length: 35 }, (_, i) => ({ ...squad[0], id: i })), club.name, price, source.id).message).toContain("limite");
});

it("cadastra empréstimo com taxa, participação salarial e data de retorno", () => {
  const db = createDefaultDatabase(), club = db.clubs[0];
  const squad = buildSquadFromDatabase(db, club.name)!;
  const source = db.players.find((player) => player.clubId !== club.id && player.marketStatus === "loan")!;
  const feeBrl = 100_000;
  const months = 6;
  const share = 50;
  const totalCost = Math.ceil((feeBrl + source.salaryMonthlyBrl * share / 100 * months) / 1000);
  const result = recruitPlayer(db, squad, club.name, totalCost, source.id, [], { feeBrl, kind: "loan", wageSharePercent: share, loanMonths: months, gameDate: "2026-01-31" });
  expect(result.budget).toBe(0);
  expect(result.squad.at(-1)).toMatchObject({ acquisitionType: "loan", loanExpiresOn: "2026-07-31", contractUntil: "2026-07-31", sourceId: source.id });
  expect(recruitPlayer(db, squad, club.name, totalCost - 1, source.id, [], { feeBrl, kind: "loan", wageSharePercent: share, loanMonths: months }).squad).toBe(squad);
});
