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
  fireEvent.click(await screen.findByRole("button", { name: "Menu inicial" }));
  await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ });
  const first = readLocalSaves("alice")[0];
  expect(first.managerName).toBe("Técnico Alice");
  expect(first.progress?.careerSquad?.length).toBeGreaterThan(10);
  expect(first.progress?.starters).toHaveLength(11);

  fireEvent.click(screen.getByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Segunda Carreira" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Menu inicial" }));
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
  await screen.findByRole("button", { name: "Menu inicial" });
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


it("autosaves a match without a floating exit button and resumes paused after reload", async () => {
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Técnico da Partida" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Ir para a partida/ }));
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.minute).toBeGreaterThan(0), { timeout: 2000 });
  expect(screen.queryByRole("button", { name: /Salvar e voltar ao início/ })).toBeNull();
  view.unmount();
  const saved = readLocalSaves("alice")[0];
  expect(saved.progress?.page).toBe("matchOverview");
  expect(saved.progress?.matchRunning).toBe(false);
  render(game());
  await screen.findByRole("button", { name: /CARREGAR CARREIRA/ });
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
    if (destination === "Agenda") fireEvent.click(screen.getByRole("menuitem", { name: /Jogos do seu time/ }));
    expect(screen.queryByRole("button", { name: /Salvar e voltar ao início/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Menu inicial" })).toBeTruthy();
  }
  fireEvent.click(screen.getByRole("button", { name: "Principal" }));
  expect(screen.queryByRole("button", { name: /INICIAR NOVA CARREIRA/ })).toBeNull();
  expect(screen.getByRole("button", { name: "Principal" }).className).toContain("bg-[var(--team-accent)]");
  expect(screen.getAllByRole("table").length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Menu inicial" }));
  expect(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ })).toBeTruthy();
  expect(document.querySelector('[data-menu-version="minimal-v1"]')).toBeTruthy();
  expect(readLocalSaves("alice")[0].managerName).toBe("Teste Navegação");
});


it("opens Agenda choices before navigating and routes each choice to its own section", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Teste Agenda" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Agenda" }));
  expect(screen.queryByRole("heading", { name: "Cada jogo, um novo capítulo." })).toBeNull();
  expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  fireEvent.click(screen.getByRole("menuitem", { name: /Jogos amistosos/ }));
  expect(await screen.findByRole("heading", { name: "Nenhum amistoso agendado" })).toBeTruthy();
  expect(screen.queryByRole("menu")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Central de empregos/ }));
  expect(await screen.findByRole("heading", { name: "Nenhuma proposta de trabalho" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Jogos do seu time/ }));
  expect(await screen.findByRole("heading", { name: "Jogos do seu time" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Preparar equipe/ }));
  expect(await screen.findByRole("heading", { name: "Escalação & Tática" })).toBeTruthy();
});

it("preserves the custom lineup when reopening tactics and after a saved-career reload", async () => {
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Tático" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  const shirt = screen.getAllByRole("button", { name: /camisa.*titular/ })[0];
  const id = Number(shirt.getAttribute("data-player"));
  fireEvent.click(shirt);
  fireEvent.click(screen.getByRole("button", { name: "Posicionar em Meia esquerda" }));
  await waitFor(() => expect(readLocalSaves("alice")[0].manualPositions?.[id]).toEqual({ left: 16, top: 30 }));
  const xi = readLocalSaves("alice")[0].progress?.starters;
  fireEvent.click(screen.getByRole("button", { name: /Voltar ao clube/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  expect(document.querySelector(`[data-player="${id}"][data-slot]`)?.getAttribute("style")).toContain("left: 16%");
  expect(readLocalSaves("alice")[0].progress?.starters).toEqual(xi);
  view.unmount();
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /CARREGAR CARREIRA/ }));
  fireEvent.click(await screen.findByRole("button", { name: "CONTINUAR" }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  expect(document.querySelector(`[data-player="${id}"][data-slot]`)?.getAttribute("style")).toContain("left: 16%");
});
