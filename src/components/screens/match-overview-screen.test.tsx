// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MatchOverviewScreen } from "./match-overview-screen";

afterEach(cleanup);

const stats = {
  home: { possession: 55, shots: 4, shotsOnTarget: 2, passes: 16, passesCompleted: 13, tackles: 3, fouls: 1, offsides: 0, yellowCards: 1, redCards: 0 },
  away: { possession: 45, shots: 3, shotsOnTarget: 1, passes: 14, passesCompleted: 9, tackles: 2, fouls: 2, offsides: 1, yellowCards: 0, redCards: 0 },
};

function matchProps() {
  const onSpeedChange = vi.fn();
  const onOpenDetail = vi.fn();
  const onToggleRunning = vi.fn();
  return {
    props: {
      competition: "Estadual", trophyAsset: "/game-assets/trophies/catalog/tr_estadual_RJ.png", round: 1, minute: 10, half: "1º tempo" as const,
      club: "Flamengo", opponent: "Botafogo", homeScore: 1, awayScore: 0,
      statistics: stats, fixtures: [], events: [], running: true, speed: 1 as const,
      halftimeWaiting: false,
      weather: { id: "chuva", label: "Chuva", temperatureC: 21, rainIntensity: .75, windKmh: 8 },
      motivationHome: 72, motivationAway: 65,
      rulesLoading: false, rulesError: null,
      onToggleRunning, onSpeedChange, onOpenDetail,
    },
    onSpeedChange, onOpenDetail, onToggleRunning,
  };
}

it("shows both teams' live statistics, the championship cup and retains match controls", () => {
  const { props, onSpeedChange, onOpenDetail, onToggleRunning } = matchProps();
  render(<MatchOverviewScreen {...props} />);
  expect(screen.getByRole("region", { name: "Relato textual da partida" })).toBeTruthy();
  expect(screen.getByText("Estadual")).toBeTruthy();
  expect(screen.getByRole("img", { name: "Troféu Estadual" }).getAttribute("src")).toContain("tr_estadual_RJ.png");
  expect(screen.getByText("55%")).toBeTruthy();
  expect(screen.getByText("45%")).toBeTruthy();
  expect(screen.getByText("13/16")).toBeTruthy();
  expect(screen.getByText("9/14")).toBeTruthy();
  expect(screen.getByText("Chuva · 21 °C · vento 8 km/h")).toBeTruthy();
  expect(screen.getByText("Motivação estimada · Flamengo 72 · Botafogo 65")).toBeTruthy();
  expect(screen.queryByText(/PLANO DE JOGO/)).toBeNull();
  expect(screen.queryByTestId("live-ball")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "4x" }));
  fireEvent.click(screen.getByRole("button", { name: /Escalação e táticas/ }));
  fireEvent.click(screen.getByRole("button", { name: /Pausar/ }));
  expect(onSpeedChange).toHaveBeenCalledWith(4);
  expect(onOpenDetail).toHaveBeenCalled();
  expect(onToggleRunning).toHaveBeenCalled();
});

it("shows important text events as a two-sided timeline and keeps routine passes out of the feed", () => {
  const pass = { minute: 1, half: 1 as const, text: "Passe de rotina", scene: { action: "pass" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: { x: 30, y: 40 }, to: { x: 40, y: 40 }, possessionAfter: "home" as const } };
  const goal = { minute: 2, half: 1 as const, text: "Gol importante", scene: { action: "goal" as const, team: "away" as const, actorIndex: 0, targetIndex: 1, from: { x: 60, y: 40 }, to: { x: 5, y: 50 }, possessionAfter: "home" as const } };
  render(<MatchOverviewScreen competition="Liga" round={1} minute={2} half="1º tempo" club="A" opponent="B" homeScore={0} awayScore={1} statistics={stats} fixtures={[]} events={[pass, goal]} running={false} speed={1} halftimeWaiting={false} rulesLoading={false} rulesError={null} onToggleRunning={vi.fn()} onSpeedChange={vi.fn()} onOpenDetail={vi.fn()} />);
  expect(screen.getByRole("img", { name: "Troféu Liga" }).querySelector("svg")).toBeTruthy();
  expect(screen.getByText("Minuto a minuto")).toBeTruthy();
  expect(screen.queryByText("Passe de rotina")).toBeNull();
  expect(screen.getByText("Gol importante")).toBeTruthy();
  expect(screen.getByRole("log", { name: "Lances importantes da partida" })).toBeTruthy();
});

it("blocks match continuation with a visible error when canonical rules cannot be read", () => {
  const { props } = matchProps();
  render(<MatchOverviewScreen {...props} running={false} rulesError="Falha ao carregar as regras." />);
  expect(screen.getByRole("alert").textContent).toContain("partida permanece pausada");
});

it("does not expose a Menu inicial action during the match", () => {
  const { props } = matchProps();
  render(<MatchOverviewScreen {...props} />);
  expect(screen.queryByRole("button", { name: "Menu inicial" })).toBeNull();
});
