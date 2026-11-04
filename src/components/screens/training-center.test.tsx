// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ClubSectionScreen } from "./club-section-screen";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import { squad } from "@/lib/game/mock-data";

afterEach(cleanup);
function setup(overrides: Partial<ComponentProps<typeof ClubSectionScreen>> = {}) {
  const onTrainPlayers = vi.fn().mockReturnValue({ error: "Sessão indisponível" });
  render(<ClubSectionScreen section="training" database={createDefaultDatabase()} club="Flamengo" coach="Teste" round={1} budget={1000}
    squad={squad.slice(0, 4)} starters={[squad[0].id]} fixtures={[]} onBack={vi.fn()} onOpenPlayer={vi.fn()}
    onTrainPlayers={onTrainPlayers} trainingWeek={13} trainingSeason={2026} {...overrides} />);
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


it("renders directly in the existing modal surface, without an inner stadium frame", () => {
  setup();
  const center = screen.getByRole("heading", { name: "Centro de treinamento" }).closest("header")!.parentElement!;
  expect(center.parentElement).toBe(document.body.firstElementChild);
  expect(center.querySelector('[class*="shadow-xl"]')).toBeNull();
  const builder = screen.getByRole("region", { name: "Configurar sessão de treino" });
  expect(builder.querySelectorAll("svg[data-training-icon]")).toHaveLength(6);
  const ids = [...center.querySelectorAll("svg defs [id]")].map(node => node.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(screen.getByRole("progressbar", { name: "Sessões concluídas na semana" }).getAttribute("aria-valuenow")).toBe("0");
});

it("keeps search and position filters and explains an empty roster result", () => {
  setup();
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar atleta no treino" }), { target: { value: "Atleta inexistente xyz" } });
  expect(screen.getByText(/Nenhum atleta encontrado/)).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar atleta no treino" }), { target: { value: "" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Filtrar posição no treino" }), { target: { value: "G" } });
  const list = screen.getByLabelText("Escolha os atletas");
  expect(within(list).getAllByRole("checkbox")).toHaveLength(squad.slice(0, 4).filter(player => player.position === "G").length);
});

it("preserves the completed-day lock and displays the session journal and recovered energy", () => {
  const session = { id: "recovery", day: "Segunda" as const, drill: "recuperacao" as const, intensity: "Moderada" as const, week: 13, season: 2026, playerIds: [squad[0].id], energySpent: 0, energyRecovered: 10, overallImprovements: 0 };
  const apply = setup({ trainingSessions: [session] });
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
  expect(screen.queryByText("Sua semana começa aqui")).toBeNull();
  expect(screen.getByText("+10%/atleta")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Seg.*FEITO/ }));
  expect(screen.getByText(/Sessão concluída:/)).toBeTruthy();
  const button = screen.getByRole("button", { name: /APLICAR SESSÃO/ }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  expect(apply).not.toHaveBeenCalled();
});

it("preserves recovery eligibility and the exact payload after changing the drill", () => {
  const players = [{ ...squad[0], energy: 10 }, { ...squad[1], energy: 100 }];
  const apply = setup({ squad: players, starters: [players[0].id] });
  expect((screen.getByRole("button", { name: /APLICAR SESSÃO/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /Recuperação ativa/ }));
  expect(screen.getByText("+10% energia por atleta")).toBeTruthy();
  expect((screen.getByRole("checkbox", { name: "Selecionar aptos" }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /APLICAR SESSÃO/ }));
  expect(apply).toHaveBeenCalledWith({ day: "Segunda", drill: "recuperacao", intensity: "Moderada", playerIds: [players[0].id] });
  expect(screen.getByRole("status").textContent).toBe("Sessão indisponível");
});
