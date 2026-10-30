// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ResultScreen } from "./result-screen";
import { squad } from "@/lib/game/mock-data";

afterEach(cleanup);

it("reports match climate, events, statistics and event-based player ratings", () => {
  const scorer = squad[0];
  const continued = vi.fn();
  const event = {
    minute: 38, half: 1 as const, text: `GOL! ${scorer.name} finaliza.`, scorer: scorer.name,
    scorerId: scorer.id, actorId: scorer.id,
    scene: { action: "goal" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: { x: 40, y: 40 }, to: { x: 95, y: 50 }, possessionAfter: "away" as const },
  };
  render(<ResultScreen
    round={1} fixtures={[]} club="Flamengo" opponent="Botafogo" homeScore={1} awayScore={0}
    startersData={[scorer]} events={[event]}
    weather={{ id: "chuva", label: "Chuva", temperatureC: 21, rainIntensity: .75, windKmh: 8 }}
    motivationHome={70} motivationAway={63}
    playerRatings={[{ playerId: scorer.id, rating: 8.1, goals: 1, assists: 0, shots: 1, tackles: 0, saves: 0, passes: 0, errors: 0, cards: 0 }]}
    possession={54} shots={1} onGoal="1/0" tackles={0} passErrors={0} onContinue={continued}
  />);
  expect(screen.getByText("CLIMA SIMULADO")).toBeTruthy();
  expect(document.body.textContent).toContain("Chuva, 21 °C, vento 8 km/h");
  expect(document.body.textContent).toContain("Motivação estimada / 100 · 70 × 63");
  expect(document.body.textContent).toContain(scorer.name);
  expect(screen.getByText("8.1")).toBeTruthy();
  expect(document.body.textContent).toContain(`GOL! ${scorer.name} finaliza.`);
  fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
  expect(continued).toHaveBeenCalledOnce();
});
