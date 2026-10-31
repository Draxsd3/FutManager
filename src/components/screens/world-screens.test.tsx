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
