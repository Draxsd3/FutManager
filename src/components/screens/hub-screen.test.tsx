// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HubScreen } from "./hub-screen";
import { squad } from "@/lib/game/mock-data";

afterEach(cleanup);
it("preserves the original compact roster and its player and management actions", () => {
  const select = vi.fn(), open = vi.fn(), lineup = vi.fn(), quick = vi.fn();
  const { container } = render(<HubScreen club="Corinthians" coach="Teste" budget={12620} opponent="Flamengo" round={1} competition="Estadual" squad={squad} starters={squad.slice(0,11).map(p=>p.id)} selectedPlayer={squad[0]} onSelectPlayer={select} onOpenPlayer={open} onEscalar={lineup} onQuickAction={quick}/>);
  expect(screen.getByRole("heading", {name:"ELENCO"})).toBeTruthy();
  const roster = screen.getByRole("region", { name: "ELENCO" });
  expect(within(roster).getAllByRole("columnheader")).toHaveLength(13);
  expect(within(roster).getAllByRole("row")).toHaveLength(squad.length + 1);
  expect(screen.queryByRole("button",{name:"Desempenho"})).toBeNull();
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
  const records = { [player.id]: { marketStatus: "normal" as const, contractUntil: "2030-12-31", salary: 125, retirementYear: null, seasons: [{ season: 2026, club: "Corinthians", games: 8, goals: 3, assists: 2, average: 7.4 }] } };
  render(<HubScreen club="Corinthians" coach="Teste" budget={12000} opponent="Flamengo" round={2} competition="Paulista" isHome={false} roundLabel="2ª rodada" playerCareers={records} squad={[player]} starters={[]} selectedPlayer={player} onSelectPlayer={vi.fn()} onOpenPlayer={vi.fn()} onEscalar={vi.fn()} onQuickAction={vi.fn()}/>);
  const roster = screen.getByRole("region", { name: "ELENCO" });
  const cells = within(roster).getAllByRole("row")[1].querySelectorAll("td");
  expect(cells[7].textContent).toBe("8"); expect(cells[8].textContent).toBe("3"); expect(cells[11].textContent).toBe("2"); expect(cells[12].textContent).toBe("7,40");
  expect(screen.getByText("Próximo jogo · Fora")).toBeTruthy();
  expect(screen.getByText(/Contrato até: 2030-12-31/)).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("button", { name: player.name }), { key: "Enter" });
});
