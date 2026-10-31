// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ResultScreen } from "./result-screen";
import { squad } from "@/lib/game/mock-data";

afterEach(cleanup);

const statistics = {
  home: { possession: 54, shots: 5, shotsOnTarget: 3, passes: 31, passesCompleted: 26, tackles: 4, fouls: 2, offsides: 0, yellowCards: 1, redCards: 0 },
  away: { possession: 46, shots: 4, shotsOnTarget: 2, passes: 28, passesCompleted: 20, tackles: 3, fouls: 3, offsides: 1, yellowCards: 2, redCards: 0 },
};
const emptyRatings = squad.slice(0, 11).map((player) => ({ playerId: player.id, rating: 7.2, goals: 0, assists: 0, shots: 0, tackles: 0, saves: 0, passes: 0, errors: 0, cards: 0 }));

it("shows the Google-inspired post-match tabs, both formations, stats and all round fixtures", () => {
  const scorer = squad[0];
  const awayPlayer = squad[10];
  const continued = vi.fn();
  const events = [
    { minute: 38, half: 1 as const, team: "home" as const, text: `GOL! ${scorer.name} finaliza.`, scorer: scorer.name, scorerId: scorer.id, actorId: scorer.id, outcome: "goal" as const, scene: { action: "goal" as const, team: "home" as const, actorIndex: 0, actorId: scorer.id, targetIndex: 1, from: { x: 40, y: 40 }, to: { x: 95, y: 50 }, possessionAfter: "away" as const } },
    { minute: 68, half: 2 as const, team: "away" as const, text: "Reserva entrou no lugar do titular" },
    { minute: 20, half: 1 as const, team: "home" as const, text: "Passe de rotina", scene: { action: "pass" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: { x: 40, y: 40 }, to: { x: 50, y: 50 }, possessionAfter: "home" as const } },
  ];
  render(<ResultScreen
    competition="Campeonato Estadual" trophyAsset="/game-assets/trophies/catalog/tr_estadual_RJ.png" round={8}
    fixtures={[
      { home: "Flamengo", away: "Botafogo", stadium: "Maracanã", attendance: 0, homeScore: 1, awayScore: 0 },
      { home: "Palmeiras", away: "Corinthians", stadium: "Allianz Parque", attendance: 0, homeScore: 2, awayScore: 1 },
    ]}
    club="Flamengo" opponent="Botafogo" homeScore={1} awayScore={0}
    homeFormation="4-3-3" awayFormation="4-4-2"
    homeFormationPlayers={squad.slice(0, 11)} awayFormationPlayers={squad.slice(8, 19)}
    ratingPlayers={[scorer, awayPlayer]} events={events}
    weather={{ id: "chuva", label: "Chuva", temperatureC: 21, rainIntensity: .75, windKmh: 8 }}
    motivationHome={70} motivationAway={63}
    homePlayerRatings={emptyRatings} awayPlayerRatings={emptyRatings}
    statistics={statistics} onContinue={continued}
  />);

  expect(screen.getByText("Campeonato Estadual")).toBeTruthy();
  expect(screen.getByRole("img", { name: "Troféu Campeonato Estadual" }).getAttribute("src")).toContain("tr_estadual_RJ.png");
  expect(document.body.textContent).toContain("1–0");
  expect(screen.getByText("GOL! Rossi finaliza.")).toBeTruthy();
  expect(screen.getByText("Reserva entrou no lugar do titular")).toBeTruthy();
  expect(screen.queryByText("Passe de rotina")).toBeNull();
  expect(screen.getByText("Palmeiras")).toBeTruthy();
  expect(screen.getByText("2")).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "Estatísticas" }));
  expect(screen.getByRole("tabpanel")).toBeTruthy();
  expect(screen.getAllByText("Posse de bola").length).toBeGreaterThan(0);
  expect(screen.getByText("Passes certos")).toBeTruthy();
  expect(screen.getByText("26/31")).toBeTruthy();
  expect(screen.getByText("20/28")).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "Formações" }));
  expect(screen.getByRole("region", { name: "Formações das equipes" })).toBeTruthy();
  expect(screen.getByLabelText("Flamengo, formação 4-3-3")).toBeTruthy();
  expect(screen.getByLabelText("Botafogo, formação 4-4-2")).toBeTruthy();
  expect(screen.getByText("Notas dos atletas")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /Voltar ao hub/ }));
  expect(continued).toHaveBeenCalledOnce();
});
