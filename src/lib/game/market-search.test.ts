import { expect, it } from "vitest";
import { createDefaultDatabase } from "./editor-data";
import { searchMarket, isFreeAgent, type MarketSearch } from "./market-search";
import { proposeTransfer, databaseWithCompletedTransfers, respondToTransferNegotiation } from "./transfers";
import { recruitPlayer } from "./recruitment";
const filters: MarketSearch = { query: "", availability: "all", country: "", nationality: "", division: "", position: "", maxAge: "", maxFee: "", minOverall: "", maxSalary: "" };
function fixture() {
  const db = createDefaultDatabase();
  const buyer = db.clubs[0], abroad = { ...db.clubs[1], country: "Portugal", name: "Clube Lisboa" };
  const template = db.players[0];
  db.clubs = [buyer,abroad];
  db.players = [
    { ...template, id: "arg", clubId: abroad.id, name: "Julián", nationalities: ["Argentina","Itália"], primaryPosition: "G", age: 22, overall: 75, salaryMonthlyBrl: 10000, marketStatus: "sale" },
    { ...template, id: "free", clubId: "", name: "Livre", marketStatus: "normal", nationalities: ["Brasil"], salaryMonthlyBrl: 2000 },
    { ...template, id: "normal", clubId: abroad.id, name: "Observado", marketStatus: "normal", contractEndsOn: "2020-01-01", nationalities: [] },
    { ...template, id: "orphan", clubId: "missing-club", name: "Cadastro incompleto", marketStatus: "sale" },
  ];
  return { db, buyer };
}
it("explora sem nome e combina país onde atua com nacionalidade sem confundi-los", () => {
  const {db,buyer} = fixture();
  const find = (patch: Partial<MarketSearch>) => searchMarket(db,buyer.name,new Set(),{ ...filters,...patch }).map(p => p.id);
  expect(find({})).toEqual(expect.arrayContaining(["arg","free","normal"]));
  expect(find({})).not.toContain("orphan");
  expect(find({country: "Portugal",nationality: "Argentina"})).toEqual(["arg"]);
  expect(find({country: "Portugal",nationality: "Itália"})).toEqual(["arg"]);
  expect(find({nationality: "Portugal"})).toEqual([]);
  expect(find({nationality: "__unknown"})).toEqual(["normal"]);
  expect(find({query: "goleiro argentina lisboa"})).toEqual(["arg"]);
  expect(find({query: "julian"})).toEqual(["arg"]);
  expect(find({maxAge: "23",minOverall: "70",maxSalary: "10",availability: "sale"})).toEqual(["arg"]);
  expect(find({maxFee: "0", availability: "free"})).toEqual(["free"]);
});
it("contrato antigo e clube ausente não viram passe livre; livre só assina após acordo e com orçamento salarial", () => {
  const {db,buyer} = fixture();
  expect(isFreeAgent(db.players[2])).toBe(false);
  expect(isFreeAgent(db.players[3])).toBe(false);
  const result = proposeTransfer(db,[],{ id: "free-offer",playerId: "free",buyerClubId: buyer.id,feeBrl: 0 });
  expect(result.negotiation).toMatchObject({status: "agreed",kind: "sale",agreedFeeBrl: 0,freeAgent: true});
  expect(proposeTransfer(db,[],{id: "wrong",playerId: "free",buyerClubId: buyer.id,feeBrl: 1}).negotiation).toBeUndefined();
  expect(proposeTransfer(db,[result.negotiation!],{id: "duplicate",playerId: "free",buyerClubId: buyer.id,feeBrl: 0}).negotiation).toBeUndefined();
  const terms = { feeBrl: 0,kind: "sale" as const,wageSharePercent: 100,gameDate: "2026-02-01" };
  expect(recruitPlayer(db,[],buyer.name,23,"free",[],terms).squad).toEqual([]);
  const signed = recruitPlayer(db,[],buyer.name,100,"free",[],terms);
  expect(signed.budget).toBe(76);
  expect(signed.squad[0]).toMatchObject({sourceId: "free",contractUntil: "2027-02-01"});
  const completed = respondToTransferNegotiation(result.negotiation!,{type: "complete"}).negotiation;
  expect(databaseWithCompletedTransfers(db,[completed]).players.find(p => p.id === "free")?.clubId).toBe(buyer.id);
});
