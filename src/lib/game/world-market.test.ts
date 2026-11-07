import { expect, it } from "vitest";
import { createDefaultDatabase, type EditorPlayer } from "./editor-data";
import { simulateWorldMarket, worldDatabase } from "./world-market";
import type { ManagerMarket } from "./manager-market";
import { expireLoans } from "./loans";
import { playerAskingFeeBrl, proposeTransfer } from "./transfers";

function fixture(kind: "sale" | "loan" = "sale") {
  const base = createDefaultDatabase();
  const [human, buyer, seller] = base.clubs.slice(0,3).map((club,i) => ({ ...club, id: `test-club-${i}`, coachName: `Treinador de teste ${i}` }));
  const positions = ["G","G","G",...Array(5).fill("L"),...Array(5).fill("Z"),...Array(6).fill("M"),...Array(5).fill("A")] as EditorPlayer["primaryPosition"][];
  const template = base.players[0];
  const players: EditorPlayer[] = positions.map((position,i) => ({ ...template, id: `seller-${i}`, clubId: seller.id, primaryPosition: position, overall: 70, marketStatus: "normal", salaryMonthlyBrl: 100000000, marketValueBrl: 100000000 }));
  players[13] = { ...players[13], id: "target", overall: 63, age: 21, marketStatus: kind, salaryMonthlyBrl: 1000, marketValueBrl: 100000 };
  for (const [i, position] of (["G","L","L","Z","Z","M","M","M","A","A","A"] as const).entries()) players.push({ ...template, id: `buyer-${i}`, clubId: buyer.id, primaryPosition: position, overall: 60, salaryMonthlyBrl: 1000, marketValueBrl: 100000000, marketStatus: "normal" });
  const database = { ...base, clubs: [human,buyer,seller], players };
  const managers: ManagerMarket = { clubs: Object.fromEntries(database.clubs.map(c => [c.id, { clubId: c.id, coach: c.coachName || c.name, budget: 12000, startingBudget: 12000, payroll: 0, history: [], processedFixtures: [] }])), dismissals: [] };
  return { database, human, buyer, seller, managers, input: { database, humanClubId: human.id, date: "2026-01-18", previousDate: "2026-01-11", negotiations: [], loans: {}, managers } };
}
function conclude(input: ReturnType<typeof fixture>["input"]) {
  const proposed=simulateWorldMarket(input);
  return simulateWorldMarket({...input,...proposed,previousDate:input.date,date:"2026-01-25"});
}
it("CPU negocia, paga e transfere uma única vez por semana sem alterar o universo original", () => {
  const { input, database, buyer, seller, managers } = fixture();
  const before = structuredClone(input);
  const proposed=simulateWorldMarket(input);
  expect(proposed.negotiations.find(d=>d.playerId==="target")?.status).toBe("agreed");
  expect(proposed.managers.clubs[buyer.id].budget).toBe(12000);
  expect(Object.keys(proposed.managers.finance!.reservations)).toHaveLength(1);
  const result = conclude(input);
  const deal = result.negotiations.find(d => d.playerId === "target")!;
  expect(deal).toMatchObject({ status: "completed", buyerClubId: buyer.id, sourceClubId: seller.id, agreedFeeBrl: 90000 });
  expect(result.managers.clubs[buyer.id].budget).toBe(11910);
  expect(result.managers.clubs[seller.id].budget).toBe(12090);
  expect(managers.clubs[buyer.id].budget).toBe(12000);
  expect(input).toEqual(before);
  const effective = worldDatabase(database, result.negotiations, result.loans, result.world);
  expect(effective.players.find(p => p.id === "target")?.clubId).toBe(buyer.id);
  expect(effective.players.filter(p => p.clubId === seller.id).length).toBe(23);
  expect(result.world.events.some(e => e.text.includes("contratou"))).toBe(true);
  const again = simulateWorldMarket({ ...input, ...result, date:"2026-01-25" });
  expect(again).toEqual(result);
  const next = simulateWorldMarket({ ...input, ...result, previousDate: "2026-01-25", date: "2026-02-01" });
  expect(next.negotiations.filter(d => d.playerId === "target")).toHaveLength(1);
});
it("CPU empresta com proprietário preservado, prazo e retorno ao clube de origem", () => {
  const { input, database, buyer, seller } = fixture("loan");
  expect(simulateWorldMarket(input).loans.target).toBeUndefined();
  const result = conclude(input);
  expect(result.loans.target).toMatchObject({ owner: { clubId: seller.id }, borrower: { clubId: buyer.id }, endsOn: "2026-07-25", wageSharePercent: 50 });
  const restored = JSON.parse(JSON.stringify(result));
  expect(worldDatabase(database,restored.negotiations,restored.loans,restored.world).players.find(p => p.id === "target")?.clubId).toBe(buyer.id);
  const returned = expireLoans(result.loans, "2026-07-25");
  expect(worldDatabase(database,result.negotiations,returned,result.world).players.find(p => p.id === "target")?.clubId).toBe(seller.id);
});
it("protege propostas humanas ativas, elenco humano, caixa e elenco mínimo", () => {
  const { input, database, human, buyer } = fixture();
  const target = database.players.find(p => p.id === "target")!;
  const active = proposeTransfer(database,[],{ id: "human", playerId: target.id, buyerClubId: human.id, feeBrl: playerAskingFeeBrl(target) }).negotiation!;
  const protectedResult = simulateWorldMarket({ ...input, negotiations: [active] });
  expect(protectedResult.negotiations.filter(d => d.playerId === target.id)).toEqual([active]);
  const poor = structuredClone(input); poor.managers.clubs[buyer.id].budget = 0;
  expect(simulateWorldMarket(poor).negotiations).toHaveLength(0);
  const own = structuredClone(input); own.database.players.find(p => p.id === "target")!.clubId = human.id;
  expect(simulateWorldMarket(own).negotiations).toHaveLength(0);
  const thin = structuredClone(input); thin.database.players = thin.database.players.filter(p => !p.id.startsWith("seller-") || Number(p.id.split("-")[1]) < 15);
  expect(simulateWorldMarket(thin).negotiations).toHaveLength(0);
});
it("não simula por abrir a tela, voltar no tempo nem repetir a semana", () => {
  const { input } = fixture();
  expect(simulateWorldMarket({ ...input, date: input.previousDate }).negotiations).toHaveLength(0);
  expect(simulateWorldMarket({ ...input, date: "invalid" }).negotiations).toHaveLength(0);
});
it("preenche vagas com técnico disponível sem duplicar vínculos ou roubar oferta de emprego", () => {
  const { input, database, buyer, seller } = fixture();
  input.managers.clubs[buyer.id].coach = null;
  input.managers.clubs[seller.id].coach = null;
  let result = simulateWorldMarket(input);
  for (let day = 25; !Object.values(result.managers.clubs).some(c => [buyer.id,seller.id].includes(c.clubId) && c.coach); day += 7) {
    if (day > 53) break;
    const date = new Date(Date.UTC(2026,0,day)).toISOString().slice(0,10);
    result = simulateWorldMarket({ ...input, ...result, date });
  }
  const names = Object.values(result.managers.clubs).map(c => c.coach).filter(Boolean);
  expect(new Set(names).size).toBe(names.length);
  expect(names.length).toBeGreaterThan(1);
  const protectedInput = structuredClone(input);
  protectedInput.managers.applications = [buyer,seller].map(c => ({ id: c.id, clubId: c.id, vacancyVersion: 0, appliedOn: "2026-01-11", expiresOn: "2026-02-01", status: "offered", message: "oferta" }));
  const protectedResult = simulateWorldMarket(protectedInput);
  expect(protectedResult.managers.clubs[buyer.id].coach).toBeNull();
  expect(protectedResult.managers.clubs[seller.id].coach).toBeNull();
  expect(database.clubs.find(c => c.id === buyer.id)?.coachName).toBe(buyer.coachName);
});

it("CPU contrata livre sem taxa e reserva salários, sem inventar clube ou atleta", () => {
  const { input, database, buyer } = fixture();
  database.players.find(p => p.id === "target")!.clubId = "";
  const result = conclude(input);
  expect(result.negotiations.find(d => d.playerId === "target")).toMatchObject({ freeAgent: true, agreedFeeBrl: 0, buyerClubId: buyer.id, status: "completed" });
  expect(result.managers.clubs[buyer.id].budget).toBe(12000);
  expect(database.players.find(p => p.id === "target")?.clubId).toBe("");
});
