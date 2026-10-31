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
