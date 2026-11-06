// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WorldScreens } from "./world-screens";
import { createDefaultDatabase, buildSquadFromDatabase } from "@/lib/game/editor-data";
afterEach(cleanup);

it("filtra jogadores listados para venda ou empréstimo e envia uma proposta, não uma contratação imediata", () => {
  const database = createDefaultDatabase(), club = database.clubs[0];
  const player = database.players.find((item) => item.clubId !== club.id && item.marketStatus === "sale")!;
  const offer = vi.fn().mockReturnValue("O clube fez uma contraproposta.");
  const action = vi.fn();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<WorldScreens section="search" database={database} club={club.name} coach="Treinador" squad={buildSquadFromDatabase(database, club.name)!} budget={100000} records={{}} negotiations={[]} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={offer} onTransferAction={action} onBack={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Buscar por nome"), { target: { value: player.name } });
  expect(screen.getAllByText("À VENDA").length).toBeGreaterThan(0);
  const seller = database.clubs.find((item) => item.id === player.clubId)!;
  fireEvent.click(screen.getByRole("button", { name: `Fazer proposta por ${player.name} do ${seller.name}` }));
  fireEvent.click(screen.getByRole("button", { name: "Enviar proposta" }));
  expect(offer).toHaveBeenCalledWith(player.id, expect.any(Number), 0);
  expect(action).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toContain("contraproposta");
  confirm.mockRestore();
});

it("filtra somente empréstimos quando essa disponibilidade é selecionada", () => {
  const database = createDefaultDatabase(), club = database.clubs[0];
  const player = database.players.find((item) => item.clubId !== club.id && item.marketStatus === "loan")!;
  render(<WorldScreens section="search" database={database} club={club.name} coach="Treinador" squad={buildSquadFromDatabase(database, club.name)!} budget={100000} records={{}} negotiations={[]} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onTransferAction={vi.fn()} onBack={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Disponibilidade"), { target: { value: "loan" } });
  fireEvent.change(screen.getByLabelText("Buscar por nome"), { target: { value: player.name } });
  expect(screen.getAllByText("PARA EMPRÉSTIMO").length).toBeGreaterThan(0);
  expect(screen.queryByText("À VENDA")).toBeNull();
});

it("separa a busca das negociações e mantém as ações de contraproposta e confirmação", () => {
  const database = createDefaultDatabase(), club = database.clubs[0];
  const player = database.players.find((item) => item.clubId !== club.id && item.marketStatus === "sale")!;
  const seller = database.clubs.find((item) => item.id === player.clubId)!;
  const deal = { id: "deal-1", playerId: player.id, playerName: player.name, sourceClubId: seller.id, sourceClub: seller.name, buyerClubId: club.id, kind: "sale" as const, askingFeeBrl: 1000000, offerFeeBrl: 900000, counterFeeBrl: 1000000, status: "countered" as const, attempts: 1, wageSharePercent: 0, message: "Clube enviou contraproposta." };
  const action = vi.fn().mockReturnValue("Acordo registrado.");
  const props = { section: "search" as const, database, club: club.name, coach: "Treinador", squad: [], budget: 100000, records: {}, historyView: "players" as const, onHistoryView: vi.fn(), onOpenPlayer: vi.fn(), onTransferOffer: vi.fn(), onTransferAction: action, onBack: vi.fn() };
  const { rerender } = render(<WorldScreens {...props} negotiations={[deal]} />);
  expect(screen.getByRole("button", { name: /Negociações.*1 em andamento/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Negociações/ }));
  expect(screen.getByText("Contraproposta recebida")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Aceitar contraproposta" }));
  expect(action).toHaveBeenCalledWith("deal-1", { type: "accept-counter" });
  rerender(<WorldScreens {...props} negotiations={[{ ...deal, status: "agreed", agreedFeeBrl: 1000000 }]} />);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar contratação" }));
  expect(action).toHaveBeenCalledWith("deal-1", { type: "complete" });
  confirm.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: /Buscar jogadores/ }));
  expect(screen.getByLabelText("Buscar por nome")).toBeTruthy();
});

it("mostra estado vazio das negociações e disponibiliza filtros avançados", () => {
  const database = createDefaultDatabase(), club = database.clubs[0];
  render(<WorldScreens section="search" database={database} club={club.name} coach="Teste" squad={[]} budget={1000} records={{}} negotiations={[]} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onTransferAction={vi.fn()} onBack={vi.fn()} />);
  fireEvent.click(screen.getByText("Mais filtros"));
  expect(screen.getByLabelText("Idade máxima")).toBeTruthy();
  expect(screen.getByLabelText("Taxa máxima em milhões")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Negociações/ }));
  expect(screen.getByText("Nenhuma negociação ainda")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Buscar jogadores" }));
  expect(screen.getByLabelText("Disponibilidade")).toBeTruthy();
});
