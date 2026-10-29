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
