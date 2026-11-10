import { describe, expect, it } from "vitest";
import { createDefaultDatabase, type CareerSave } from "./editor-data";
import type { CareerProgress } from "./progress";
import type { TransferNegotiation } from "./transfers";
import { careerMessages, MAJOR_TRANSFER_BRL } from "./messages";
const database = createDefaultDatabase();
const deal = (
  changes: Partial<TransferNegotiation> = {},
): TransferNegotiation => ({
  id: "deal-1",
  playerId: "p",
  playerName: "Atleta",
  sourceClubId: database.clubs[0].id,
  sourceClub: database.clubs[0].name,
  buyerClubId: database.clubs[1].id,
  kind: "sale",
  askingFeeBrl: MAJOR_TRANSFER_BRL,
  offerFeeBrl: MAJOR_TRANSFER_BRL,
  wageSharePercent: 100,
  status: "countered",
  attempts: 1,
  message: "Proposta recebida",
  createdOn: "2026-01-10",
  revision: 1,
  ...changes,
});
export function messageSave(deals: TransferNegotiation[] = []): CareerSave {
  return {
    id: "career",
    name: "Carreira",
    managerName: "Treinador",
    clubId: database.clubs[0].id,
    clubName: database.clubs[0].name,
    division: "Série A",
    round: 1,
    budget: 1,
    inGameDate: "2026-02-01",
    updatedAt: "2026-02-01",
    progress: {
      transferNegotiations: deals,
      playerCareers: {},
    } as CareerProgress,
  };
}
describe("mensagens da carreira", () => {
  it("não inventa notícias em saves antigos ou vazios", () => {
    expect(
      careerMessages({ ...messageSave(), progress: undefined }, database),
    ).toEqual([]);
    expect(careerMessages(messageSave(), database)).toEqual([]);
  });
  it("mostra grandes negócios de outros clubes e negócios menores do próprio clube", () => {
    const save = messageSave([
      deal({ sourceClubId: database.clubs[2].id }),
      deal({ id: "small", offerFeeBrl: 100 }),
    ]);
    const rows = careerMessages(save, database);
    expect(rows.filter((m) => m.category === "market")).toHaveLength(1);
    expect(rows.filter((m) => m.category === "players")).toHaveLength(1);
    expect(rows.find((m) => m.category === "market")?.amount).toBe(
      MAJOR_TRANSFER_BRL,
    );
  });
  it("usa valor fechado, não divulga eventos futuros nem inventa data ou preço legado", () => {
    const rows = careerMessages(
      messageSave([
        deal({
          status: "completed",
          agreedFeeBrl: 100,
          completedOn: "2026-01-20",
        }),
        deal({ id: "future", createdOn: "2026-03-01" }),
        deal({ id: "legacy", status: "completed", completedOn: undefined }),
      ]),
      database,
    );
    expect(rows.some((m) => m.category === "market")).toBe(false);
    expect(rows).toHaveLength(2);
    expect(rows.find((m) => m.id.includes("legacy"))).toMatchObject({
      date: undefined,
      amount: undefined,
    });
  });
  it("é determinístico, não altera o save e reabre como não lida uma negociação atualizada", () => {
    const save = messageSave([deal()]),
      before = JSON.stringify(save);
    const first = careerMessages(save, database);
    expect(careerMessages(JSON.parse(before), database)).toEqual(first);
    expect(JSON.stringify(save)).toBe(before);
    const next = careerMessages(
      messageSave([
        deal({
          status: "completed",
          agreedFeeBrl: MAJOR_TRANSFER_BRL,
          completedOn: "2026-01-20",
          revision: 2,
        }),
      ]),
      database,
    );
    expect(next.every((m) => !first.some((old) => old.id === m.id))).toBe(true);
  });
});
