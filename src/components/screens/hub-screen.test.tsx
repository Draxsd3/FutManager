// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HubScreen } from "./hub-screen";
import { squad } from "@/lib/game/mock-data";

afterEach(cleanup);
it("preserves the original compact roster and its player and management actions", () => {
  const select = vi.fn(), open = vi.fn(), lineup = vi.fn(), quick = vi.fn();
  const { container } = render(<HubScreen club="Corinthians" coach="Teste" budget={12620} opponent="Flamengo" round={1} competition="Estadual" squad={squad} starters={squad.slice(0,11).map(p=>p.id)} selectedPlayer={squad[0]} onSelectPlayer={select} onOpenPlayer={open} onEscalar={lineup} onQuickAction={quick}/>);
  expect(screen.getByRole("heading", {name:"ELENCO"})).toBeTruthy();
  expect(screen.getAllByRole("columnheader")).toHaveLength(16);
  expect(screen.getAllByRole("row")).toHaveLength(squad.length + 1);
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
