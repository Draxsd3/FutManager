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

it("separa clubes por divisão nacional sem duplicá-los em copas e preserva filtros", () => {
  const database = createDefaultDatabase();
  const template = database.clubs[0];
  database.clubs = ["Série D", "Série B", "Sem divisão nacional", "Série A", "Série C"].map((division, i) => ({ ...template, id: `group-${i}`, name: `Clube ${division}`, country: "Brasil", division: division as typeof template.division }));
  database.players = [];
  render(<TeamDirectory database={database} club="Clube Série A" coach="Técnico" squad={[]} budget={1000} records={{}} negotiations={[]} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onBack={vi.fn()} />);
  const list = screen.getByRole("complementary", { name: "Lista de clubes" });
  expect(within(list).getAllByRole("heading", { level: 2 }).map(heading => heading.textContent)).toEqual(["Brasileirão · Série A1", "Brasileirão · Série B1", "Brasileirão · Série C1", "Brasileirão · Série D1", "Sem divisão nacional1"]);
  expect(within(list).getAllByRole("button")).toHaveLength(5);
  expect(within(list).queryByRole("heading", { name: /Copa do Brasil/ })).toBeNull();
  fireEvent.change(screen.getByLabelText("Competição"), { target: { value: "Série C" } });
  expect(within(list).getAllByRole("button")).toHaveLength(1);
  fireEvent.click(within(list).getByRole("button", { name: /Clube Série C/ }));
  expect(screen.getByRole("region", { name: "Elenco do Clube Série C" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Buscar clube"), { target: { value: "não existe" } });
  expect(within(list).getByText("Nenhum clube corresponde aos filtros.")).toBeTruthy();
  expect(within(list).queryByRole("heading", { level: 2 })).toBeNull();
});
