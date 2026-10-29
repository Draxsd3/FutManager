// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AgendaScreen } from "./agenda-screen";

afterEach(cleanup);
const props = { club: "Flamengo", coach: "Renan", competition: "Campeonato Estadual", inGameDate: "2026-01-22", round: 1,
  fixtures: [{ home: "Flamengo", away: "Botafogo", stadium: "Maracanã", attendance: 0, homeScore: 0, awayScore: 0 }],
  view: "matches" as const, onViewChange: vi.fn(), onBack: vi.fn(), onPrepare: vi.fn() };

it("shows only the available match and filters by home or away", () => {
  render(<AgendaScreen {...props} />);
  expect(screen.getByRole("table").querySelectorAll("tbody tr")).toHaveLength(1);
  expect(screen.getByText("A disputar")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Mando de campo"), { target: { value: "away" } });
  expect(screen.getByText("Nenhum jogo disponível para este filtro.")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Mando de campo"), { target: { value: "home" } });
  fireEvent.click(screen.getByRole("button", { name: /Preparar equipe/ }));
  expect(props.onPrepare).toHaveBeenCalled();
});

it("handles a career without fixtures without inventing a next opponent", () => {
  render(<AgendaScreen {...props} fixtures={[]} />);
  expect(screen.getByText("Nenhum próximo compromisso disponível.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Preparar equipe/ })).toBeNull();
});
