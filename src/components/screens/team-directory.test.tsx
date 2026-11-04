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
  const sellerGroup = screen.getByRole("region", { name: new RegExp(`${seller.division}.*${seller.country}`) });
  fireEvent.click(within(sellerGroup).getByRole("button", { expanded: false }));
  fireEvent.click(within(sellerGroup).getByRole("button", { name: new RegExp(`${seller.name}.*${seller.division}`) }));
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
  expect(within(list).getAllByRole("heading", { level: 2 }).map(heading => heading.textContent?.replace(/[▸▾]/g, ""))).toEqual(["Brasileirão · Série A1", "Brasileirão · Série B1", "Brasileirão · Série C1", "Brasileirão · Série D1", "Sem divisão nacional1"]);
  expect(within(list).getAllByRole("button", { expanded: false })).toHaveLength(5);
  expect(within(list).queryByRole("button", { name: /Clube Série A/ })).toBeNull();
  const serieA = within(list).getByRole("button", { name: /Brasileirão · Série A/ });
  fireEvent.click(serieA);
  expect(serieA.getAttribute("aria-expanded")).toBe("true");
  expect(within(list).getByRole("button", { name: /Clube Série A/ })).toBeTruthy();
  fireEvent.click(serieA);
  expect(within(list).queryByRole("button", { name: /Clube Série A/ })).toBeNull();
  expect(within(list).queryByRole("heading", { name: /Copa do Brasil/ })).toBeNull();
  fireEvent.change(screen.getByLabelText("Competição"), { target: { value: "Série C" } });
  expect(within(list).getAllByRole("button")).toHaveLength(1);
  fireEvent.click(within(list).getByRole("button", { name: /Brasileirão · Série C/ }));
  fireEvent.click(within(list).getByRole("button", { name: /Clube Série C/ }));
  expect(screen.getByRole("region", { name: "Elenco do Clube Série C" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Buscar clube"), { target: { value: "Clube Série C" } });
  expect(within(list).getByRole("button", { name: /Clube Série C/ })).toBeTruthy();
  fireEvent.click(within(list).getByRole("button", { name: /Brasileirão · Série C/ }));
  expect(within(list).queryByRole("button", { name: /Clube Série C/ })).toBeNull();
  fireEvent.change(screen.getByLabelText("Buscar clube"), { target: { value: "não existe" } });
  expect(within(list).getByText("Nenhum clube corresponde aos filtros.")).toBeTruthy();
  expect(within(list).queryByRole("heading", { level: 2 })).toBeNull();
});

it("mantém divisões de países diferentes independentes e volta a fechá-las ao limpar a busca", () => {
  const database = createDefaultDatabase();
  const template = database.clubs[0];
  database.clubs = [
    { ...template, id: "brazil", name: "Atlético Brasil", country: "Brasil", division: "Série A" },
    { ...template, id: "italy", name: "Atlético Itália", country: "Itália", division: "Série A" },
  ];
  database.players = [];
  render(<TeamDirectory database={database} club="Atlético Brasil" coach="Teste" squad={[]} budget={1000} records={{}} negotiations={[]} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onBack={vi.fn()} />);
  const brazil = screen.getByRole("region", { name: "Brasileirão · Série A · Brasil" });
  const italy = screen.getByRole("region", { name: "Série A · Itália" });
  fireEvent.click(within(brazil).getByRole("button", { expanded: false }));
  expect(within(brazil).getByRole("button", { name: /Atlético Brasil/ })).toBeTruthy();
  expect(within(italy).queryByRole("button", { name: /Atlético Itália/ })).toBeNull();
  fireEvent.change(screen.getByLabelText("Buscar clube"), { target: { value: "Atlético" } });
  expect(within(italy).getByRole("button", { name: /Atlético Itália/ })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Buscar clube"), { target: { value: "" } });
  expect(within(brazil).getByRole("button", { expanded: false })).toBeTruthy();
  expect(within(italy).getByRole("button", { expanded: false })).toBeTruthy();
});

it("removes the repeated title, top action strip and back button inside the Times window while keeping balance and filters", () => {
  const database = createDefaultDatabase();
  const back = vi.fn();
  const { container } = render(<TeamDirectory embedded database={database} club={database.clubs[0].name} coach="Técnico" squad={[]} budget={1000} records={{}} negotiations={[]} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onBack={back} />);
  expect(screen.queryByRole("heading", { name: "Times" })).toBeNull();
  expect(container.querySelector("[data-management-header]")).toBeNull();
  expect(screen.queryByText("FutManager / universo")).toBeNull();
  expect(screen.queryByLabelText("Ações de Times")).toBeNull();
  expect(screen.queryByRole("button", { name: /Voltar ao clube/ })).toBeNull();
  expect(screen.getByLabelText("Buscar clube")).toBeTruthy();
  expect(screen.getByText("Saldo do clube")).toBeTruthy();
});
