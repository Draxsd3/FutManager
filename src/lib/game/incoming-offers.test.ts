import { expect, it } from "vitest";
import { createDefaultDatabase } from "./editor-data";
import { createManagerMarket } from "./manager-market";
import { createPlayerCareer, applyNegotiation } from "./career";
import { generateIncomingOffers } from "./incoming-offers";
import { squad } from "./mock-data";
import type { CareerSeason } from "./season";

function fixture() {
  const database = createDefaultDatabase();
  const club = database.clubs[0];
  const managerMarket = createManagerMarket(database, { fixtures: [] } as unknown as CareerSeason);
  const player = { ...squad[0], marketValue: 1, marketAvailability: "sale" as const };
  return { squad: [player], records: {}, database, managerMarket, clubId: club.id, club: club.name, eventId: "fixture-1", date: "2026-01-18" };
}
it("gera oferta de clube elegível ao avançar, de forma determinística e sem duplicar", () => {
  const input = fixture();
  const generated = generateIncomingOffers(input);
  const offer = generated[input.squad[0].id].transferOffers![0];
  expect(offer).toMatchObject({ status: "pending", sentOn: input.date });
  expect(offer.clubId).not.toBe(input.clubId);
  expect(input.database.clubs.find(club => club.id === offer.clubId)?.name).toBe(offer.club);
  expect(offer.fee * 1000).toBeLessThanOrEqual(input.managerMarket.clubs[offer.clubId!].budget);
  expect(generateIncomingOffers({ ...input, records: generated })).toEqual(generated);
  const rejected = applyNegotiation(generated[input.squad[0].id], { type: "reject", id: offer.id }, input.date, input.club).record;
  expect(generateIncomingOffers({ ...input, records: { [input.squad[0].id]: rejected } })[input.squad[0].id].transferOffers).toHaveLength(1);
  expect(generateIncomingOffers({ ...input, records: generated, eventId: "fixture-2" })).toEqual(generated);
  const restored = JSON.parse(JSON.stringify(generated));
  expect(restored[input.squad[0].id].transferOffers[0]).toEqual(offer);
});
it("não inventa propostas para atleta não listado, emprestado ou clube sem caixa", () => {
  const input = fixture(), player = input.squad[0];
  expect(generateIncomingOffers({ ...input, records: { [player.id]: createPlayerCareer({ ...player, marketAvailability: "normal" }, input.club) } })).toEqual({ [player.id]: createPlayerCareer({ ...player, marketAvailability: "normal" }, input.club) });
  expect(generateIncomingOffers({ ...input, squad: [{ ...player, acquisitionType: "loan" }] })).toEqual({});
  const poor = structuredClone(input.managerMarket);
  Object.values(poor.clubs).forEach(club => { club.budget = 0; });
  expect(generateIncomingOffers({ ...input, managerMarket: poor })).toEqual({});
});
