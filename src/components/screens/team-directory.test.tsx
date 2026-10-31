// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createDefaultDatabase, buildSquadFromDatabase } from "@/lib/game/editor-data";
import { TeamDirectory } from "./team-directory";

afterEach(cleanup);

it("mostra o elenco do clube selecionado e permite iniciar uma proposta de transferência", () => {
  const database = createDefaultDatabase();
  const managedClub = database.clubs[0];
  const player = database.players.find((item) => item.clubId !== managedClub.id && item.marketStatus === "sale")!;
  const seller = database.clubs.find((item) => item.id === player.clubId)!;
  const propose = vi.fn().mockReturnValue("Proposta enviada ao clube.");
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<TeamDirectory database={database} club={managedClub.name} coach="Técnico" squad={buildSquadFromDatabase(database, managedClub.name)!} budget={100_000} records={{}} negotiations={[]} onOpenPlayer={vi.fn()} onTransferOffer={propose} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`${seller.name}.*${seller.division}`) }));
  const team = screen.getByRole("region", { name: `Elenco do ${seller.name}` });
  const playerName = within(team).getByText(player.name);
  fireEvent.click(playerName.closest("tr")!);
  expect(within(team).getByText("Disponíveis no mercado")).toBeTruthy();
  fireEvent.click(within(team).getByRole("button", { name: "Fazer proposta" }));
  fireEvent.click(within(team).getByRole("button", { name: "Enviar proposta" }));

  expect(propose).toHaveBeenCalledWith(player.id, expect.any(Number), 0);
  expect(screen.getByRole("status").textContent).toContain("Proposta enviada");
  confirm.mockRestore();
});
