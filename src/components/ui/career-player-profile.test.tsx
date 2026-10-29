// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CareerPlayerProfile } from "./career-player-profile";
import { createPlayerCareer } from "@/lib/game/career";
import { squad } from "@/lib/game/mock-data";
afterEach(cleanup);
it("exibe partidas registradas e permite selecionar ações reais de mercado", () => {
  const player = squad[0];
  const record = { ...createPlayerCareer(player, "Clube"), matches: [{ key: "1", round: 1, opponent: "Rival", homeScore: 2, awayScore: 0, minutes: 90, goals: 1 }] };
  const onMarketAction = vi.fn();
  render(<CareerPlayerProfile player={player} club="Clube" record={record} onMarketAction={onMarketAction} onClose={vi.fn()}/>);
  fireEvent.click(screen.getByRole("button", { name: "Temporada" }));
  expect(screen.getByText("Clube 2 × 0 Rival")).toBeTruthy();
  expect(screen.getByText("Rodada 1 · 90 min")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Mercado" }));
  fireEvent.click(screen.getByRole("button", { name: "Listar para empréstimo" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar ação" }));
  expect(onMarketAction).toHaveBeenCalledWith("loan");
});
