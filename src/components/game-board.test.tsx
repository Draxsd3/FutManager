// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GameBoard } from "./game-board";
import { readLocalSaves } from "@/lib/game/persistence";

vi.mock("@/lib/game/persistence", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/game/persistence")>(),
  readCloudDatabase: vi.fn().mockResolvedValue(null),
  readCloudSaves: vi.fn().mockResolvedValue([]),
  readCloudCareer: vi.fn().mockResolvedValue(null),
  writeCloudDatabase: vi.fn().mockResolvedValue(undefined),
  writeCloudSave: vi.fn().mockResolvedValue(undefined),
  deleteCloudSave: vi.fn().mockResolvedValue(undefined),
}));

afterEach(cleanup);
beforeEach(() => { localStorage.clear(); });
const game = (id = "alice") => <GameBoard userId={id} email={`${id}@example.com`} onSignOut={async () => {}} />;

it("creates independent careers, preserves the lineup on returning home and always opens on the menu", async () => {
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Técnico Alice" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Salvar e voltar ao início/ }));
  await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ });
  const first = readLocalSaves("alice")[0];
  expect(first.managerName).toBe("Técnico Alice");
  expect(first.progress?.careerSquad?.length).toBeGreaterThan(10);
  expect(first.progress?.starters).toHaveLength(11);

  fireEvent.click(screen.getByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Segunda Carreira" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Salvar e voltar ao início/ }));
  expect(readLocalSaves("alice")).toHaveLength(2);
  expect(readLocalSaves("alice").find((save) => save.id === first.id)?.progress?.starters).toEqual(first.progress?.starters);

  view.unmount();
  render(game());
  expect(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Salvar e voltar ao início/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /CARREGAR CARREIRA/ }));
  const continueButtons = await screen.findAllByRole("button", { name: "CONTINUAR" });
  expect(continueButtons).toHaveLength(2);
  fireEvent.click(continueButtons[1]);
  await screen.findByRole("button", { name: /Salvar e voltar ao início/ });
  await waitFor(() => expect(readLocalSaves("alice").find((save) => save.id === first.id)?.progress?.coach).toBe("Técnico Alice"));
});

it("does not expose another account's careers on the same browser", async () => {
  localStorage.setItem("futmanager.saves.v1.alice", JSON.stringify([{ id: "private", name: "Carreira privada" }]));
  render(game("bob"));
  fireEvent.click(await screen.findByRole("button", { name: /CARREGAR CARREIRA/ }));
  expect(await screen.findByText("Nenhuma carreira encontrada")).toBeTruthy();
  expect(screen.queryByText("Carreira privada")).toBeNull();
  expect(readLocalSaves("alice")).toHaveLength(1);
});


it("can save and return home during a match, then resume that match paused", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Técnico da Partida" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Ir para a partida/ }));
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.minute).toBeGreaterThan(0), { timeout: 2000 });
  fireEvent.click(screen.getByRole("button", { name: /Salvar e voltar ao início/ }));
  const saved = readLocalSaves("alice")[0];
  expect(saved.progress?.page).toBe("matchOverview");
  expect(saved.progress?.matchRunning).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: /CARREGAR CARREIRA/ }));
  fireEvent.click(await screen.findByRole("button", { name: "CONTINUAR" }));
  expect(await screen.findByText("PARTIDA PAUSADA")).toBeTruthy();
  expect(readLocalSaves("alice")[0].progress?.minute).toBe(saved.progress?.minute);
});


it("returns to the redesigned menu from new career, saves and both editor exit buttons", async () => {
  render(game());
  const assertCurrentMenu = async () => {
    const title = await screen.findByRole("heading", { level: 1 });
    expect(title.textContent).toBe("SEU CLUBE.SUAS REGRAS.SUA HISTÓRIA.");
    expect(document.querySelector('[data-menu-version="minimal-v1"]')).toBeTruthy();
    expect(screen.queryByRole("button", { name: "OPÇÕES" })).toBeNull();
    expect(screen.getByRole("link", { name: /menu principal/ }).getAttribute("href")).toBe("#menu-principal");
  };
  await assertCurrentMenu();
  fireEvent.click(screen.getByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Voltar ao menu/ }));
  await assertCurrentMenu();
  fireEvent.click(screen.getByRole("button", { name: /CARREGAR CARREIRA/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Voltar ao menu" }));
  await assertCurrentMenu();
  for (const exit of ["início", "sair editor"]) {
    fireEvent.click(screen.getByRole("button", { name: /EDITOR DE CLUBES/ }));
    fireEvent.click(await screen.findByRole("button", { name: exit }));
    await assertCurrentMenu();
  }
});

it("keeps club navigation internal and the top Menu inicial button returns to the new menu", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Teste Navegação" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  for (const destination of ["Agenda", "Estádio", "Juniores", "Times", "Procura", "Técnicos", "História"]) {
    fireEvent.click(await screen.findByRole("button", { name: destination }));
    expect(screen.getByRole("button", { name: /Salvar e voltar ao início/ })).toBeTruthy();
  }
  fireEvent.click(screen.getByRole("button", { name: "Menu inicial" }));
  expect(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ })).toBeTruthy();
  expect(document.querySelector('[data-menu-version="minimal-v1"]')).toBeTruthy();
  expect(readLocalSaves("alice")[0].managerName).toBe("Teste Navegação");
});
