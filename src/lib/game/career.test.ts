import { describe, expect, it } from "vitest";
import { createPlayerCareer, recordPlayerMatch } from "./career";
import { squad } from "./mock-data";

describe("registro de partidas", () => {
  it("contabiliza titulares e substitutos, gols e minutos, sem duplicar ao retomar", () => {
    const [starter, substitute, unused] = squad;
    const match = { key: "1|Clube|Rival", round: 1, opponent: "Rival", homeScore: 2, awayScore: 1 };
    const participation = { [starter.id]: { entered: 0, left: 60 }, [substitute.id]: { entered: 60 }, [unused.id]: { entered: 90 } };
    const initial = { [starter.id]: createPlayerCareer(starter, "Clube") };
    const result = recordPlayerMatch(initial, squad, "Clube", participation, match, { [substitute.id]: 2 });
    expect(result[starter.id].matches?.[0]).toMatchObject({ minutes: 60, goals: 0 });
    expect(result[substitute.id].matches?.[0]).toMatchObject({ minutes: 30, goals: 2 });
    expect(result[substitute.id].seasons[0].games).toBe(1);
    expect(result[unused.id]).toBeUndefined();
    expect(recordPlayerMatch(result, squad, "Clube", participation, match, { [substitute.id]: 2 })).toEqual(result);
    expect(initial[starter.id].matches).toBeUndefined();
  });
});

import { applyNegotiation, offerEligibility } from "./career";

describe("negociação simplificada", () => {
  const base = createPlayerCareer(squad[0], "Clube");
  it("exige multa para jogador não listado e permite proposta de qualquer clube quando listado", () => {
    expect(offerEligibility(base, 100)).toBe(false);
    const withClause = { ...base, releaseClause: 10 };
    expect(offerEligibility(withClause, 9.99)).toBe(false);
    expect(offerEligibility(withClause, 10)).toBe(true);
    const listed = applyNegotiation(base, { type: "list" }, "2026-01-22", "Clube").record;
    const result = applyNegotiation(listed, { type: "offer", id: "1", club: "Rival", fee: 1 }, "2026-01-22", "Clube");
    expect(result.record.transferOffers?.[0].status).toBe("pending");
    expect(applyNegotiation(result.record, { type: "accept", id: "1" }, "2026-01-22", "Clube").transfer?.fee).toBe(1);
    const unlisted = applyNegotiation(result.record, { type: "unlist" }, "2026-01-22", "Clube").record;
    expect(applyNegotiation(unlisted, { type: "accept", id: "1" }, "2026-01-22", "Clube").transfer).toBeUndefined();
  });
  it("valida e negocia salário, duração e multa sem alterar contratos antigos até aceite", () => {
    const offer = { salary: base.salary, years: 3, releaseClause: 15 };
    const accepted = applyNegotiation(base, { type: "contract", offer }, "2027-02-10", "Clube");
    expect(accepted.record).toMatchObject({ salary: base.salary, contractUntil: "2030-12-31", releaseClause: 15 });
    expect(applyNegotiation(base, { type: "contract", offer: { ...offer, salary: base.salary - 1 } }, "2027-02-10", "Clube").record).toBe(base);
    expect(applyNegotiation(base, { type: "contract", offer: { ...offer, years: 0 } }, "2027-02-10", "Clube").record).toBe(base);
    expect(base.releaseClause).toBeUndefined();
  });
});
