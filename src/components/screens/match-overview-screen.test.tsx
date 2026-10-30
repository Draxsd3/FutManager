// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MatchOverviewScreen } from "./match-overview-screen";

afterEach(cleanup);

function matchProps() {
  const onSpeedChange = vi.fn();
  const onOpenDetail = vi.fn();
  const onToggleRunning = vi.fn();
  const onRequestExit = vi.fn();
  return {
    props: {
      competition: "Estadual", round: 1, minute: 10, half: "1º tempo" as const,
      club: "Flamengo", opponent: "Botafogo", homeScore: 1, awayScore: 0,
      possession: 50, shots: 3, onGoal: "2/1", tackles: 1, passErrors: 1,
      fixtures: [], events: [], running: true, speed: 1 as const,
      halftimeWaiting: false,
      weather: { id: "chuva", label: "Chuva", temperatureC: 21, rainIntensity: .75, windKmh: 8 },
      motivationHome: 72, motivationAway: 65,
      rulesLoading: false, rulesError: null,
      onToggleRunning, onSpeedChange, onOpenDetail, onRequestExit,
    },
    onSpeedChange, onOpenDetail, onToggleRunning, onRequestExit,
  };
}

it("shows a text-only match report with climate and retains match controls", () => {
  const { props, onSpeedChange, onOpenDetail, onToggleRunning } = matchProps();
  render(<MatchOverviewScreen {...props} />);
  expect(screen.getByRole("region", { name: "Relato textual da partida" })).toBeTruthy();
  expect(screen.getByText("Chuva · 21 °C · vento 8 km/h")).toBeTruthy();
  expect(screen.getByText("Motivação estimada / 100 · Flamengo 72 · Botafogo 65")).toBeTruthy();
  expect(screen.queryByText(/VISÃO DE JOGO|Dentro de campo/)).toBeNull();
  expect(screen.queryByRole("group", { name: /Campo simulado/ })).toBeNull();
  expect(screen.queryByTestId("live-ball")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "4x" }));
  fireEvent.click(screen.getByRole("button", { name: /Escalação e táticas/ }));
  fireEvent.click(screen.getByRole("button", { name: /Pausar/ }));
  expect(onSpeedChange).toHaveBeenCalledWith(4);
  expect(onOpenDetail).toHaveBeenCalled();
  expect(onToggleRunning).toHaveBeenCalled();
});

it("renders textual events from the same match event records and does not require a pitch", () => {
  const scene = { action: "goal" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: { x: 30, y: 40 }, to: { x: 95, y: 50 }, possessionAfter: "away" as const };
  const props = {
    competition: "Estadual", round: 1, minute: 10, half: "1º tempo" as const,
    club: "Flamengo", opponent: "Botafogo", homeScore: 1, awayScore: 0,
    possession: 50, shots: 1, onGoal: "1/0", tackles: 0, passErrors: 0,
    fixtures: [], events: [{ minute: 10, half: 1 as const, text: "GOL! Jogador finaliza.", scene }],
    running: true, speed: 1 as const, halftimeWaiting: false,
    weather: { id: "seco", label: "Tempo firme", temperatureC: 25, rainIntensity: 0, windKmh: 3 },
    rulesLoading: false, rulesError: null,
    onToggleRunning: vi.fn(), onSpeedChange: vi.fn(), onOpenDetail: vi.fn(), onRequestExit: vi.fn(),
  };
  render(<MatchOverviewScreen {...props} />);
  expect(screen.getAllByText(/GOL! Jogador finaliza/).length).toBeGreaterThan(0);
  expect(screen.getByRole("log", { name: "Lances da partida" })).toBeTruthy();
  expect(screen.queryByTestId("live-ball")).toBeNull();
});

it("shows routine events in the live text timeline instead of hiding circulation", () => {
  const pass = { minute: 1, half: 1 as const, text: "Passe de rotina", scene: { action: "pass" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: { x: 30, y: 40 }, to: { x: 40, y: 40 }, possessionAfter: "home" as const } };
  const goal = { ...pass, minute: 2, text: "Gol importante", scene: { ...pass.scene, action: "goal" as const, possessionAfter: "away" as const } };
  render(<MatchOverviewScreen competition="Liga" round={1} minute={2} half="1º tempo" club="A" opponent="B" homeScore={1} awayScore={0} possession={50} shots={1} onGoal="1/0" tackles={0} passErrors={0} fixtures={[]} events={[pass, goal]} running={false} speed={1} halftimeWaiting={false} rulesLoading={false} rulesError={null} onToggleRunning={vi.fn()} onSpeedChange={vi.fn()} onOpenDetail={vi.fn()} onRequestExit={vi.fn()} />);
  expect(screen.getByText("O jogo minuto a minuto")).toBeTruthy();
  expect(screen.getByText("Passe de rotina")).toBeTruthy();
  expect(screen.getByText("Gol importante")).toBeTruthy();
});

it("blocks match continuation with a visible error when canonical rules cannot be read", () => {
  const { props } = matchProps();
  render(<MatchOverviewScreen {...props} running={false} rulesError="Falha ao carregar as regras." />);
  expect(screen.getByRole("alert").textContent).toContain("partida permanece pausada");
});

it("explains that leaving saves the minute and lets the user cancel or confirm", () => {
  const { props, onRequestExit } = matchProps();
  render(<MatchOverviewScreen {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Menu inicial" }));
  expect(screen.getByRole("alertdialog", { name: "Sair da partida?" })).toBeTruthy();
  expect(screen.getByText(/retomada pausada/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Continuar partida" }));
  expect(screen.queryByRole("alertdialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Menu inicial" }));
  fireEvent.click(screen.getByRole("button", { name: "Sair e salvar" }));
  expect(onRequestExit).toHaveBeenCalledTimes(1);
});
