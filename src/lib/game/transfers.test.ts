import { describe, expect, it } from "vitest";
import { createDefaultDatabase } from "./editor-data";
import { askingFeeBrl, databaseWithCompletedTransfers, proposeTransfer, respondToTransferNegotiation } from "./transfers";

describe("negociação de transferências", () => {
  it("recebe e aceita contraproposta por compra antes de concluir o acordo", () => {
    const database = createDefaultDatabase();
    const buyer = database.clubs[0];
    const player = database.players.find((item) => item.clubId !== buyer.id && item.marketStatus === "sale")!;
    const asking = askingFeeBrl("sale", player.marketValueBrl);
    const first = proposeTransfer(database, [], { id: "sale-1", playerId: player.id, buyerClubId: buyer.id, feeBrl: Math.round(asking * 0.8) });
    expect(first.negotiation).toMatchObject({ status: "countered", counterFeeBrl: asking, sourceClub: database.clubs.find((club) => club.id === player.clubId)?.name });
    const accepted = respondToTransferNegotiation(first.negotiation!, { type: "accept-counter" });
    expect(accepted.negotiation).toMatchObject({ status: "agreed", agreedFeeBrl: asking, agreedWageSharePercent: 100 });
    const completed = respondToTransferNegotiation(accepted.negotiation, { type: "complete" }).negotiation;
    expect(completed.status).toBe("completed");
    const careerDatabase = databaseWithCompletedTransfers(database, [completed]);
    expect(careerDatabase.players.find((item) => item.id === player.id)?.clubId).toBe(buyer.id);
    expect(careerDatabase.players.filter((item) => item.clubId === buyer.id)).toHaveLength(database.players.filter((item) => item.clubId === buyer.id).length + 1);
  });

  it("rejeita propostas muito baixas e bloqueia propostas duplicadas para um atleta", () => {
    const database = createDefaultDatabase();
    const buyer = database.clubs[0];
    const player = database.players.find((item) => item.clubId !== buyer.id && item.marketStatus === "sale")!;
    const asking = askingFeeBrl("sale", player.marketValueBrl);
    const rejected = proposeTransfer(database, [], { id: "sale-low", playerId: player.id, buyerClubId: buyer.id, feeBrl: asking * 0.2 });
    expect(rejected.negotiation?.status).toBe("rejected");
    const active = proposeTransfer(database, [], { id: "sale-active", playerId: player.id, buyerClubId: buyer.id, feeBrl: asking * 0.8 }).negotiation!;
    expect(proposeTransfer(database, [active], { id: "sale-duplicate", playerId: player.id, buyerClubId: buyer.id, feeBrl: asking }).negotiation).toBeUndefined();
  });

  it("negocia empréstimo incluindo a parte salarial e permite uma nova contraproposta", () => {
    const database = createDefaultDatabase();
    const buyer = database.clubs[0];
    const player = database.players.find((item) => item.clubId !== buyer.id && item.marketStatus === "loan")!;
    const asking = askingFeeBrl("loan", player.marketValueBrl);
    const first = proposeTransfer(database, [], { id: "loan-1", playerId: player.id, buyerClubId: buyer.id, feeBrl: asking * 0.6, wageSharePercent: 30 });
    expect(first.negotiation).toMatchObject({ status: "countered", counterFeeBrl: asking, counterWageSharePercent: 50 });
    const second = respondToTransferNegotiation(first.negotiation!, { type: "counter", feeBrl: Math.round(asking * 0.95), wageSharePercent: 50 });
    expect(second.negotiation).toMatchObject({ status: "agreed", agreedFeeBrl: Math.round(asking * 0.95), agreedWageSharePercent: 50 });
  });
});

it("permite sondar não listado com preço maior, mas bloqueia novo negócio de atleta emprestado", () => {
  const db = createDefaultDatabase(), buyer = db.clubs[0];
  const player = db.players.find(p => p.clubId !== buyer.id && p.marketStatus === "normal" && !p.loan)!;
  const asking = askingFeeBrl("sale", player.marketValueBrl)*1.5;
  const result = proposeTransfer(db, [], { id: "approach", playerId: player.id, buyerClubId: buyer.id, feeBrl: asking*0.8 });
  expect(result.negotiation).toMatchObject({ status: "countered", kind: "sale", askingFeeBrl: asking });
  player.loan = { owner: { clubId: player.clubId, name: "Dono" }, borrower: { clubId: db.clubs[2].id, name: "Destino" }, startsOn: "2026-01-01", endsOn: "2026-07-01", source: "game", status: "active", wageSharePercent: 50 };
  expect(proposeTransfer(db, [], { id: "invalid-loan", playerId: player.id, buyerClubId: buyer.id, feeBrl: asking }).negotiation).toBeUndefined();
});

it("calcula multa simulada por meses restantes, sem inventar vínculo encerrado", async () => {
  const { simulatedReleaseClauseBrl, transferAskingPrice } = await import("./transfers");
  const db = createDefaultDatabase(), buyer = db.clubs[0];
  const source = db.players.find(p => p.clubId !== buyer.id && p.marketStatus === "sale")!;
  const player = { ...source, marketValueBrl: 1_000_000, contractEndsOn: "2026-12-31" };
  expect(simulatedReleaseClauseBrl(player, "2026-06-30")).toBe(2_000_000);
  expect(simulatedReleaseClauseBrl(player, "2026-07-01")).toBe(1_000_000);
  expect(simulatedReleaseClauseBrl(player, "2026-11-01")).toBe(200_000);
  expect(simulatedReleaseClauseBrl(player, "2026-12-31")).toBe(200_000);
  expect(simulatedReleaseClauseBrl(player, "2027-01-01")).toBeNull();
  expect(simulatedReleaseClauseBrl({ ...player, contractEndsOn: "invalid" }, "2026-01-01")).toBeNull();
  expect(simulatedReleaseClauseBrl({ ...player, clubId: "" }, "2026-01-01")).toBe(0);
  db.players = db.players.map(p => p.id === player.id ? player : p);
  const date = "2026-11-01";
  const asking = transferAskingPrice(player, db.players, date);
  const result = proposeTransfer(db, [], { id: "buyout", playerId: player.id, buyerClubId: buyer.id, feeBrl: 200_000, monthlyWageBrl: player.salaryMonthlyBrl * 2, date });
  expect(result.negotiation).toMatchObject({ status: "agreed", askingFeeBrl: asking, releaseClauseBrl: 200_000, agreedFeeBrl: 200_000 });
  const noSalary = proposeTransfer(db, [], { id: "bad-wage", playerId: player.id, buyerClubId: buyer.id, feeBrl: 200_000, monthlyWageBrl: 1, date });
  expect(noSalary.negotiation?.status).toBe("rejected");
});
