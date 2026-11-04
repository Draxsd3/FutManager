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
  expect(screen.getByRole("button", { name: /Escalar Time/ }).compareDocumentPosition(screen.getByRole("region", { name: "Confronto" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole("region", { name: "Confronto" }).compareDocumentPosition(screen.getByRole("button", { name: "Elenco" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole("complementary", { name: "Resumo do elenco" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Semana 1" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Abrir centro de treino/ })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Energia do plantel" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Pilares do elenco" })).toBeTruthy();
  expect(screen.queryByLabelText("Buscar atleta")).toBeNull();
  expect(screen.queryByLabelText("Filtrar posição")).toBeNull();
  expect(screen.getByRole("img", { name: /^Energia média do elenco:/ })).toBeTruthy();
  const row = screen.getByRole("cell",{name:new RegExp(squad[0].name)}).closest("tr")!;
  fireEvent.click(row); expect(select).toHaveBeenCalledWith(squad[0].id);
  fireEvent.doubleClick(row); expect(open).toHaveBeenCalledWith(squad[0].id);
  const lineupButton = screen.getByRole("button",{name:/Escalar Time/});
  expect(lineupButton.querySelector("img")?.getAttribute("src")).toBe("/icons/navigation/taticas.webp");
  expect(lineupButton.querySelector("img")?.getAttribute("alt")).toBe("");
  fireEvent.click(lineupButton); expect(lineup).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: /Abrir centro de treino/ })); expect(quick).toHaveBeenCalledWith("training");
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
  expect(screen.getByRole("heading", { name: "Pilares do elenco" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Disponibilidade" })).toBeNull();
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

it("keeps the entire roster visible without filters and retains the player profile action", () => {
  const open = vi.fn();
  const players = squad.slice(0, 5);
  render(<HubScreen club="Corinthians" coach="Teste" budget={12000} opponent="Flamengo" round={2} competition="Paulista" squad={players} starters={[players[0].id]} selectedPlayer={players[0]} onSelectPlayer={vi.fn()} onOpenPlayer={open} onEscalar={vi.fn()} onQuickAction={vi.fn()} />);
  expect(within(screen.getByRole("region", { name: "Elenco do clube" })).getAllByRole("row")).toHaveLength(players.length + 1);
  expect(screen.queryByLabelText("Buscar atleta")).toBeNull();
  expect(screen.queryByLabelText("Filtrar posição")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Ver ficha/ }));
  expect(open).toHaveBeenCalledWith(players[0].id);
});

it("shows every completed day using the training week, not the competition round", () => {
  const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
  const sessions = days.map((day, index) => ({ id: `training-${index}`, season: 2026, week: 3, day,
    drill: "passe" as const, intensity: "Moderada" as const, playerIds: [squad[0].id], energySpent: 2, energyRecovered: 0, overallImprovements: 0 }));
  const props = { club: "Corinthians", coach: "Teste", budget: 1000, opponent: "Flamengo", round: 1, competition: "Paulista", trainingWeek: 3, season: 2026,
    squad: squad.slice(0, 2), starters: [], selectedPlayer: null, onSelectPlayer: vi.fn(), onOpenPlayer: vi.fn(), onEscalar: vi.fn(), onQuickAction: vi.fn() };
  const view = render(<HubScreen {...props} trainingSessions={[]} />);
  expect(screen.getByText("0/6 sessões")).toBeTruthy();
  view.rerender(<HubScreen {...props} trainingSessions={sessions} />);
  expect(screen.getByText("6/6 sessões")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Semana 3" })).toBeTruthy();
  for (const day of days) expect(screen.getByLabelText(`${day}: treino concluído — Passe e posse`)).toBeTruthy();
  expect(screen.getAllByText("Passe e posse")).toHaveLength(6);
  view.rerender(<HubScreen {...props} trainingWeek={4} trainingSessions={sessions} />);
  expect(screen.getByText("0/6 sessões")).toBeTruthy();
  expect(screen.queryByLabelText(/treino concluído/)).toBeNull();
});

it("shows confidence estimates and updates them when season results change", () => {
  const props = { club: "Corinthians", coach: "Teste", budget: 12000, opponent: "Flamengo", round: 2, competition: "Paulista", squad: squad.slice(0, 2), starters: [], selectedPlayer: null, onSelectPlayer: vi.fn(), onOpenPlayer: vi.fn(), onEscalar: vi.fn(), onQuickAction: vi.fn() };
  const view = render(<HubScreen {...props} confidence={{ board: 50, fans: 50, matches: 0 }} />);
  expect(screen.getByText("Sem jogos · diretoria considera finanças")).toBeTruthy();
  expect(screen.getAllByText("50%")).toHaveLength(2);
  view.rerender(<HubScreen {...props} confidence={{ board: 90, fans: 100, matches: 1 }} />);
  expect(screen.getByText("90%")).toBeTruthy();
  expect(within(screen.getByLabelText("Confiança estimada na carreira")).getByText("100%")).toBeTruthy();
  expect(screen.getByText("Estimativa da carreira · 1 jogo")).toBeTruthy();
  view.rerender(<HubScreen {...props} confidence={null} />);
  expect(screen.getAllByText("Indisponível")).toHaveLength(2);
});
