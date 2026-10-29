// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MatchOverviewScreen } from "./match-overview-screen";
import { squad } from "@/lib/game/mock-data";

afterEach(cleanup);

function matchProps() {
  const starters = squad.slice(0, 11);
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
      halftimeWaiting: false, formation: "4-3-3", starters,
      manualPositions: { [starters[0].id]: { left: 25, top: 80 } },
      onToggleRunning, onSpeedChange, onOpenDetail, onRequestExit,
    },
    onSpeedChange, onOpenDetail, onToggleRunning, onRequestExit,
  };
}

it("reflects lineup and custom positions and retains match controls", () => {
  const { props, onSpeedChange, onOpenDetail, onToggleRunning } = matchProps();
  const { rerender } = render(<MatchOverviewScreen {...props} />);
  const player = screen.getByTitle(`${props.starters[0].name} · ${props.starters[0].position}`);
  expect(parseFloat(player.style.left)).toBeGreaterThan(16);
  expect(parseFloat(player.style.left)).toBeLessThan(24);
  const position = player.style.left;
  rerender(<MatchOverviewScreen {...props} running={false} />);
  expect(player.style.left).toBe(position);
  rerender(<MatchOverviewScreen {...props} minute={11} />);
  expect(player.style.left).toBe(position);
  fireEvent.click(screen.getByRole("button", { name: "4x" }));
  fireEvent.click(screen.getByRole("button", { name: /Escalação e táticas/ }));
  fireEvent.click(screen.getByRole("button", { name: /Pausar/ }));
  expect(onSpeedChange).toHaveBeenCalledWith(4);
  expect(onOpenDetail).toHaveBeenCalled();
  expect(onToggleRunning).toHaveBeenCalled();
  expect(screen.getByText(/adversário em formação genérica/)).toBeTruthy();
});

it("renders the simulated scene in the pitch and event feed and stops its ball animation when paused", () => {
  const scene = { action: "goal" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: { x: 30, y: 40 }, to: { x: 95, y: 50 } };
  const props = {
    competition: "Estadual", round: 1, minute: 10, half: "1º tempo" as const,
    club: "Flamengo", opponent: "Botafogo", homeScore: 1, awayScore: 0,
    possession: 50, shots: 1, onGoal: "1/0", tackles: 0, passErrors: 0,
    fixtures: [], events: [{ minute: 10, half: 1 as const, text: "Gol de teste!", scene }],
    running: true, speed: 1 as const, halftimeWaiting: false,
    formation: "4-3-3", starters: squad.slice(0, 11), manualPositions: {},
    onToggleRunning: vi.fn(), onSpeedChange: vi.fn(), onOpenDetail: vi.fn(), onRequestExit: vi.fn(),
  };
  const { rerender, container } = render(<MatchOverviewScreen {...props} />);
  expect(screen.getAllByText(/Gol de teste!/)).toHaveLength(2);
  const ball = screen.getByTestId("live-ball");
  expect(ball.style.left).toBe("95%");
  rerender(<MatchOverviewScreen {...props} running={false} />);
  expect(container.querySelector('[data-testid="live-ball"]')).toBe(ball);
  expect(ball.style.left).toBe("95%");
});

it("shows only important moments while preserving routine events in the model", () => {
  const pass = { minute: 1, half: 1 as const, text: "Passe de rotina", scene: { action: "pass" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: { x: 30, y: 40 }, to: { x: 40, y: 40 } } };
  const goal = { ...pass, minute: 2, text: "Gol importante", scene: { ...pass.scene, action: "goal" as const } };
  render(<MatchOverviewScreen competition="Liga" round={1} minute={2} half="1º tempo" club="A" opponent="B" homeScore={1} awayScore={0} possession={50} shots={1} onGoal="1/0" tackles={0} passErrors={0} fixtures={[]} events={[pass, goal]} running={false} speed={1} halftimeWaiting={false} formation="4-3-3" starters={squad.slice(0, 11)} manualPositions={{}} onToggleRunning={vi.fn()} onSpeedChange={vi.fn()} onOpenDetail={vi.fn()} onRequestExit={vi.fn()} />);
  expect(screen.getByText("Melhores momentos")).toBeTruthy();
  expect(screen.queryByText("Passe de rotina")).toBeNull();
  expect(screen.getAllByText(/Gol importante/).length).toBeGreaterThan(0);
});

it("does not teleport the goalkeeper to a distant event while the match is paused", () => {
  const players = squad.slice(0, 11).map((player, i) => i === 10 ? { ...player, position: "G" as const } : player);
  const scene = { action: "foul" as const, team: "away" as const, actorIndex: 0, targetIndex: 10, from: { x: 94, y: 90 }, to: { x: 95, y: 95 } };
  render(<MatchOverviewScreen competition="Liga" round={1} minute={15} half="1º tempo" club="A" opponent="B" homeScore={0} awayScore={0} possession={50} shots={0} onGoal="0/0" tackles={0} passErrors={0} fixtures={[]} events={[{ minute: 15, half: 1, text: "Falta", scene }]} running={false} speed={1} halftimeWaiting={false} formation="4-3-3" starters={players} manualPositions={{ [players[10].id]: { left: 25, top: 80 } }} onToggleRunning={vi.fn()} onSpeedChange={vi.fn()} onOpenDetail={vi.fn()} onRequestExit={vi.fn()} />);
  const keeper = screen.getByTitle(`${players[10].name} · G`);
  expect(parseFloat(keeper.style.left)).toBe(20);
  expect(parseFloat(keeper.style.top)).toBe(25);
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
