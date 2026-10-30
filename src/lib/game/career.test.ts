import { describe, expect, it } from "vitest";
import { createPlayerCareer, recordPlayerMatch } from "./career";
import { squad } from "./mock-data";

describe("registro de partidas", () => {
  it("contabiliza jogos, minutos, gols, assistências e nota sem duplicar ao retomar", () => {
    const [starter, substitute, unused] = squad;
    const match = { key: "2026:league:round1:fixture-1", round: 1, opponent: "Rival", homeScore: 2, awayScore: 1, season: 2026, competitionId: "league:Brasil:Série A", competition: "Brasileirão Série A", competitionRound: 1 };
    const participation = { [starter.id]: { entered: 0, left: 60 }, [substitute.id]: { entered: 60 }, [unused.id]: { entered: 90 } };
    const initial = { [starter.id]: createPlayerCareer(starter, "Clube") };
    const performance = { [starter.id]: { goals: 0, assists: 1, rating: 7.4, passes: 21, tackles: 2 }, [substitute.id]: { goals: 2, assists: 0, rating: 8.2, yellowCards: 1, shots: 3 } };
    const result = recordPlayerMatch(initial, squad, "Clube", participation, match, performance);
    expect(result[starter.id].matches?.[0]).toMatchObject({ minutes: 60, goals: 0, assists: 1, rating: 7.4, competitionId: match.competitionId });
    expect(result[substitute.id].matches?.[0]).toMatchObject({ minutes: 30, goals: 2, assists: 0, rating: 8.2, yellowCards: 1, shots: 3 });
    expect(result[starter.id].seasons[0]).toMatchObject({ minutes: 60, passes: 21, tackles: 2 });
    expect(result[substitute.id].seasons[0]).toMatchObject({ games: 1, goals: 2, assists: 0, average: 8.2 });
    expect(result[unused.id]).toBeUndefined();
    expect(recordPlayerMatch(result, squad, "Clube", participation, match, performance)).toEqual(result);
    expect(initial[starter.id].matches).toBeUndefined();
  });

  it("ignora contagens e notas não finitas em dados antigos ou corrompidos", () => {
    const player = squad[0];
    const result = recordPlayerMatch({}, [player], "Clube", { [player.id]: { entered: 0 } }, {
      key: "malformed-match", round: 1, opponent: "Rival", homeScore: 0, awayScore: 0, season: 2026,
    }, { [player.id]: { goals: Number.POSITIVE_INFINITY, assists: Number.NaN, rating: Number.NaN } });
    expect(result[player.id].matches?.[0]).toMatchObject({ minutes: 90, goals: 0, assists: 0, rating: null });
    expect(result[player.id].seasons[0]).toMatchObject({ games: 1, goals: 0, assists: 0, ratedGames: 0, average: null });
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
