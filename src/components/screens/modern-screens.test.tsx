// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { SavesScreen } from "./saves-screen";
import { StadiumScreen } from "./stadium-screen";
import { createDefaultDatabase, type CareerSave } from "@/lib/game/editor-data";
import { simulateGate } from "@/lib/game/stadium";

afterEach(cleanup);
const saves: CareerSave[] = [
  {
    id: "a",
    name: "Primeira",
    managerName: "Alice",
    clubId: "a",
    clubName: "Palmeiras",
    division: "Série A",
    round: 2,
    budget: 100,
    inGameDate: "2026-01-22",
    updatedAt: "2026-01-22T12:00:00Z",
  },
  {
    id: "b",
    name: "Segunda",
    managerName: "Bruno",
    clubId: "b",
    clubName: "Flamengo",
    division: "Série A",
    round: 8,
    budget: 200,
    inGameDate: "2026-02-22",
    updatedAt: "2026-02-22T12:00:00Z",
  },
];
it("searches careers by manager, sorts and dispatches the correct load/delete", async () => {
  const onLoad = vi.fn(),
    onDelete = vi.fn();
  render(
    <SavesScreen
      saves={saves}
      onLoad={onLoad}
      onDelete={onDelete}
      onBack={vi.fn()}
    />,
  );
  expect(screen.getAllByRole("article")[0].getAttribute("aria-label")).toBe(
    "Carreira Segunda",
  );
  fireEvent.change(screen.getByLabelText("Buscar carreira"), {
    target: { value: "alice" },
  });
  expect(screen.getAllByRole("article")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "CONTINUAR" }));
  await waitFor(() => expect(onLoad).toHaveBeenCalledWith(saves[0]));
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "CONTINUAR" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.change(screen.getByLabelText("Buscar carreira"), {
    target: { value: "" },
  });
  fireEvent.change(screen.getByLabelText("Ordenar por"), {
    target: { value: "round" },
  });
  fireEvent.click(
    within(screen.getAllByRole("article")[0]).getByRole("button", {
      name: "EXCLUIR",
    }),
  );
  await waitFor(() => expect(onDelete).toHaveBeenCalledWith("b"));
  fireEvent.change(screen.getByLabelText("Buscar carreira"), {
    target: { value: "inexistente" },
  });
  expect(screen.getByText("Nenhuma carreira corresponde à busca")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
  expect(screen.getAllByRole("article")).toHaveLength(2);
});
it("shows honest empty saves and allows returning to the menu", () => {
  const back = vi.fn();
  render(
    <SavesScreen
      saves={[]}
      onLoad={vi.fn()}
      onDelete={vi.fn()}
      onBack={back}
    />,
  );
  expect(screen.getByText("Nenhuma carreira encontrada")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voltar ao menu" }));
  expect(back).toHaveBeenCalledOnce();
});
it("shows the stadium, editable sector prices, gate projection and upgrade choices in one view", () => {
  const club = createDefaultDatabase().clubs[0];
  const price = vi.fn(), expand = vi.fn(), agenda = vi.fn();
  render(<StadiumScreen club={club} budget={10000} payroll={20000} onBack={vi.fn()} onAgenda={agenda} onPriceChange={price} onExpand={expand} />);
  expect(screen.getByRole("heading", { name: club.stadiumName })).toBeTruthy();
  expect(screen.getByRole("img", { name: "Imagem ilustrativa de um estádio de futebol" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Ingressos por setor" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Ampliação do estádio" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  expect(agenda).toHaveBeenCalledOnce();
  const input = screen.getByLabelText("Ingresso Popular (R$)");
  fireEvent.change(input, { target: { value: "75" } });
  fireEvent.blur(input);
  expect(price).toHaveBeenCalledWith("popular", 75);
  fireEvent.change(input, { target: { value: "-1" } });
  fireEvent.blur(input);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(price).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getAllByRole("button", { name: "Selecionar obra" })[0]);
  expect(expand).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar obra" }));
  expect(expand).toHaveBeenCalledWith(1000);
});
it("clamps invalid simulation inputs, allows losses and never exceeds capacity", () => {
  expect(simulateGate(100, 120, 10, 2000)).toEqual({
    audience: 100,
    gross: 1000,
    net: -1000,
  });
  expect(simulateGate(NaN, -5, Infinity, -10)).toEqual({
    audience: 0,
    gross: 0,
    net: 0,
  });
  expect(simulateGate(101, 50, 10, 0).audience).toBe(50);
});
