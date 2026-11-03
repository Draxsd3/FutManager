// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClubSectionScreen } from "./club-section-screen";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import { squad } from "@/lib/game/mock-data";

afterEach(cleanup);
function setup() {
  const onTrainPlayers = vi.fn().mockReturnValue({ error: "Sessão indisponível" });
  render(<ClubSectionScreen section="training" database={createDefaultDatabase()} club="Flamengo" coach="Teste" round={1} budget={1000}
    squad={squad.slice(0, 4)} starters={[squad[0].id]} fixtures={[]} onBack={vi.fn()} onOpenPlayer={vi.fn()}
    onTrainPlayers={onTrainPlayers} trainingWeek={13} trainingSeason={2026} />);
  return onTrainPlayers;
}
it("keeps one heading and removes duplicate return, summary cards and redundant selection buttons", () => {
  setup();
  expect(screen.getAllByRole("heading", { name: "Centro de treinamento" })).toHaveLength(1);
  expect(screen.queryByRole("button", { name: /VOLTAR AO CLUBE|Titulares|Limpar/ })).toBeNull();
  expect(screen.queryByText("NOTA DA COMISSÃO")).toBeNull();
  expect(screen.getByText("Semana 13 · 2026")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Passe e posse/ }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: /Passe e posse/ }).querySelector("svg")).toBeTruthy();
});
it("selects/clears eligible players with one checkbox and keeps intensity and session payload intact", () => {
  const apply = setup();
  const all = screen.getByRole("checkbox", { name: "Selecionar aptos" });
  fireEvent.click(all);
  fireEvent.change(screen.getByRole("combobox", { name: "Intensidade do treino" }), { target: { value: "Leve" } });
  fireEvent.click(screen.getByRole("button", { name: /APLICAR SESSÃO/ }));
  expect(apply).toHaveBeenCalledWith({ day: "Segunda", drill: "passe", intensity: "Leve", playerIds: squad.slice(0, 4).map((player) => player.id) });
  fireEvent.click(all);
  expect((screen.getByRole("button", { name: /APLICAR SESSÃO/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole("status")).toBeNull();
});
