import { expect, it } from "vitest";
import { simulateMatch } from "./engine";

it("registra pontos após uma partida", () => {
  const result = simulateMatch({ id: "1", date: "2026-04-12", home: "fla", away: "pal" }, [{ id: "fla", name: "Flamengo", overall: 80, points: 0, played: 0, goalsFor: 0, goalsAgainst: 0 }, { id: "pal", name: "Palmeiras", overall: 78, points: 0, played: 0, goalsFor: 0, goalsAgainst: 0 }], () => 0.2);
  expect(result.clubs[0].played).toBe(1);
  expect(result.fixture.homeScore).toBeDefined();
});
