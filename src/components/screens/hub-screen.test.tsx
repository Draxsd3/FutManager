// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HubScreen } from "./hub-screen";
import { squad } from "@/lib/game/mock-data";
import { createPlayerCareer } from "@/lib/game/career";

afterEach(cleanup);

it("preserves roster management actions while showing authentic career records", () => {
  const select = vi.fn(), open = vi.fn(), lineup = vi.fn(), quick = vi.fn();
  const player = squad[0];
  const record = createPlayerCareer(player, "Corinthians");
  record.seasons[0] = { season: 2026, club: "Corinthians", games: 3, goals: 2, assists: 1, average: 7.4, ratedGames: 2 };
  const { container } = render(<HubScreen club="Corinthians" coach="Teste" budget={12620} opponent="Flamengo" round={1} competition="Estadual" squad={squad} starters={squad.slice(0,11).map(p=>p.id)} records={{ [player.id]: record }} selectedPlayer={player} onSelectPlayer={select} onOpenPlayer={open} onEscalar={lineup} onQuickAction={quick}/>);
  expect(screen.getByRole("heading", {name:"ELENCO"})).toBeTruthy();
  expect(screen.getAllByRole("columnheader")).toHaveLength(16);
  expect(screen.getAllByRole("row")).toHaveLength(squad.length + 1);
  expect(screen.getByText("Valores registrados na carreira")).toBeTruthy();
  expect(screen.getByRole("columnheader", { name: "J" })).toBeTruthy();
  expect(screen.queryByText("Satisfação")).toBeNull();
  expect(screen.queryByText("Forma recente")).toBeNull();
  const row = screen.getByRole("cell",{name:new RegExp(player.name)}).closest("tr")!;
  const cells = within(row).getAllByRole("cell");
  expect(cells[11].textContent).toBe("3");
  expect(cells[12].textContent).toBe("2");
  expect(cells[13].textContent).toBe("1");
  expect(cells[14].textContent).toBe("7.4");
  expect(screen.getByText(/Jogos\s*3/)).toBeTruthy();
  fireEvent.click(row); expect(select).toHaveBeenCalledWith(player.id);
  fireEvent.doubleClick(row); expect(open).toHaveBeenCalledWith(player.id);
  fireEvent.click(screen.getByRole("button",{name:"Escalar Time"})); expect(lineup).toHaveBeenCalledOnce();
  for (const [label, action] of [["Elenco","roster"],["Finanças","finances"],["Troféus","trophies"],["Treino","training"]]) {
    fireEvent.click(screen.getByRole("button",{name:label})); expect(quick).toHaveBeenCalledWith(action);
  }
  expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(4);
});
