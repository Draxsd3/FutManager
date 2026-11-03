// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HubScreen } from "./hub-screen";
import { squad } from "@/lib/game/mock-data";

afterEach(cleanup);
it("preserves the original compact roster and its player and management actions", () => {
  const select = vi.fn(), open = vi.fn(), lineup = vi.fn(), quick = vi.fn();
  const { container } = render(<HubScreen club="Corinthians" coach="Teste" budget={12620} opponent="Flamengo" round={1} competition="Estadual" squad={squad} starters={squad.slice(0,11).map(p=>p.id)} selectedPlayer={squad[0]} onSelectPlayer={select} onOpenPlayer={open} onEscalar={lineup} onQuickAction={quick}/>);
  expect(screen.queryByRole("heading", { name: "ELENCO" })).toBeNull();
  expect(screen.queryByText("Força média")).toBeNull();
  const roster = screen.getByRole("region", { name: "Elenco do clube" });
  expect(within(roster).getAllByRole("columnheader")).toHaveLength(14);
  expect(within(roster).getAllByRole("row")).toHaveLength(squad.length + 1);
  expect(screen.queryByRole("button",{name:"Desempenho"})).toBeNull();
  expect(screen.getByRole("region", { name: `Prévia de ${squad[0].name}` })).toBeTruthy();
  expect(screen.getByRole("region", { name: "Confronto" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Escalar Time" }).compareDocumentPosition(screen.getByRole("region", { name: "Confronto" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole("region", { name: "Confronto" }).compareDocumentPosition(screen.getByRole("button", { name: "Elenco" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole("complementary", { name: "Resumo do elenco" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Profundidade por setor" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Energia do plantel" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Disponibilidade" })).toBeTruthy();
  expect(screen.getByRole("img", { name: /^Energia média do elenco:/ })).toBeTruthy();
  const row = screen.getByRole("cell",{name:new RegExp(squad[0].name)}).closest("tr")!;
  fireEvent.click(row); expect(select).toHaveBeenCalledWith(squad[0].id);
  fireEvent.doubleClick(row); expect(open).toHaveBeenCalledWith(squad[0].id);
  fireEvent.click(screen.getByRole("button",{name:"Escalar Time"})); expect(lineup).toHaveBeenCalledOnce();
  for (const [label, action] of [["Elenco","roster"],["Finanças","finances"],["Troféus","trophies"],["Treino","training"]]) {
    fireEvent.click(screen.getByRole("button",{name:label})); expect(quick).toHaveBeenCalledWith(action);
  }
  expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(4);
});
it("shows recorded season statistics and the actual next-match venue", () => {
  const player = squad[0];
  const records = { [player.id]: { marketStatus: "sale" as const, contractUntil: "2030-12-31", salary: 125, retirementYear: null, seasons: [{ season: 2026, club: "Corinthians", games: 8, goals: 3, assists: 2, average: 7.4 }] } };
  render(<HubScreen club="Corinthians" coach="Teste" budget={12000} opponent="Flamengo" round={2} competition="Paulista" isHome={false} roundLabel="2ª rodada" playerCareers={records} squad={[player]} starters={[]} selectedPlayer={player} onSelectPlayer={vi.fn()} onOpenPlayer={vi.fn()} onEscalar={vi.fn()} onQuickAction={vi.fn()}/>);
  const roster = screen.getByRole("region", { name: "Elenco do clube" });
  const cells = within(roster).getAllByRole("row")[1].querySelectorAll("td");
  expect(cells[7].textContent).toBe("8"); expect(cells[8].textContent).toBe("3"); expect(cells[11].textContent).toBe("2"); expect(cells[12].textContent).toBe("7,40");
  expect(cells[13].textContent).toBe("À venda");
  expect(screen.getByText("À venda · 1")).toBeTruthy();
  expect(screen.getByText("Empréstimo · 0")).toBeTruthy();
  expect(screen.getByRole("region", { name: "Confronto" })).toBeTruthy();
  expect(screen.getByText("FORA")).toBeTruthy();
  expect(screen.getByText(/contrato até 2030-12-31/i)).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("button", { name: player.name }), { key: "Enter" });
});

it("shows the selected player's preview at the bottom after a roster click", () => {
  function InteractiveRoster() {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selectedPlayer = squad.find((player) => player.id === selectedId) ?? null;
    return <HubScreen club="Corinthians" coach="Teste" budget={12000} opponent="Flamengo" round={2} competition="Paulista" squad={squad.slice(0, 4)} starters={[]} selectedPlayer={selectedPlayer} onSelectPlayer={setSelectedId} onOpenPlayer={vi.fn()} onEscalar={vi.fn()} onQuickAction={vi.fn()} />;
  }
  render(<InteractiveRoster />);
  expect(screen.queryByRole("region", { name: /^Prévia de / })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: squad[0].name }));
  expect(screen.getByRole("region", { name: `Prévia de ${squad[0].name}` })).toBeTruthy();
});

it("filters, sorts and opens the selected player without fabricating summary data", () => {
  const open = vi.fn();
  const players = squad.slice(0, 5);
  render(<HubScreen club="Corinthians" coach="Teste" budget={12000} opponent="Flamengo" round={2} competition="Paulista" squad={players} starters={[players[0].id]} selectedPlayer={players[0]} onSelectPlayer={vi.fn()} onOpenPlayer={open} onEscalar={vi.fn()} onQuickAction={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Filtrar elenco"), { target: { value: "starters" } });
  expect(within(screen.getByRole("region", { name: "Elenco do clube" })).getAllByRole("row")).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Buscar atleta"), { target: { value: "inexistente" } });
  expect(screen.getByText("Nenhum atleta encontrado para os filtros.")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Buscar atleta"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: /Ver ficha/ }));
  expect(open).toHaveBeenCalledWith(players[0].id);
});
