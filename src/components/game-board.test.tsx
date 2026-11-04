// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { GameBoard } from "./game-board";
import * as transfermarktSync from "@/lib/importer/transfermarkt-sync";
import { readLocalSaves, writeLocalSaves } from "@/lib/game/persistence";

vi.mock("@/lib/game/persistence", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/game/persistence")>(),
  readCloudDatabase: vi.fn().mockResolvedValue(null),
  readCloudSaves: vi.fn().mockResolvedValue([]),
  readCloudCareer: vi.fn().mockResolvedValue(null),
  writeCloudDatabase: vi.fn().mockResolvedValue(undefined),
  writeCloudSave: vi.fn().mockResolvedValue(undefined),
  deleteCloudSave: vi.fn().mockResolvedValue(undefined),
}));

configure({ asyncUtilTimeout: 5000 });

const matchRulesMarkdown = readFileSync("public/game-assets/match-engine-rules.md", "utf8");
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => matchRulesMarkdown }));
});
const game = (id = "alice") => <GameBoard userId={id} email={`${id}@example.com`} onSignOut={async () => {}} />;

it("creates independent careers, preserves the lineup on returning home and opens the menu after a deliberate exit", async () => {
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Técnico Alice" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Configurações" }));
  fireEvent.click(screen.getByRole("button", { name: "Voltar ao menu inicial" }));
  await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ });
  const first = readLocalSaves("alice")[0];
  expect(first.managerName).toBe("Técnico Alice");
  expect(first.progress?.careerSquad?.length).toBeGreaterThan(10);
  expect(first.progress?.starters).toHaveLength(11);

  fireEvent.click(screen.getByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Segunda Carreira" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Configurações" }));
  fireEvent.click(screen.getByRole("button", { name: "Voltar ao menu inicial" }));
  expect(readLocalSaves("alice")).toHaveLength(2);
  expect(readLocalSaves("alice").find((save) => save.id === first.id)?.progress?.starters).toEqual(first.progress?.starters);

  view.unmount();
  render(game());
  expect(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Salvar e voltar ao início/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /CONTINUAR JOGANDO/ }));
  const continueButtons = await screen.findAllByRole("button", { name: "CONTINUAR" });
  expect(continueButtons).toHaveLength(2);
  fireEvent.click(continueButtons[1]);
  await screen.findByRole("dialog", { name: "Configurações" });
  fireEvent.click(screen.getByRole("button", { name: "Fechar Configurações" }));
  await screen.findByRole("button", { name: "Configurações" });
  await waitFor(() => expect(readLocalSaves("alice").find((save) => save.id === first.id)?.progress?.coach).toBe("Técnico Alice"));
});

it("does not expose another account's careers on the same browser", async () => {
  localStorage.setItem("futmanager.saves.v1.alice", JSON.stringify([{ id: "private", name: "Carreira privada" }]));
  render(game("bob"));
  fireEvent.click(await screen.findByRole("button", { name: /CONTINUAR JOGANDO/ }));
  expect(await screen.findByText("Nenhuma carreira encontrada")).toBeTruthy();
  expect(screen.queryByText("Carreira privada")).toBeNull();
  expect(readLocalSaves("alice")).toHaveLength(1);
});


it("requires the canonical Markdown rules before starting a match and stays on the lineup when loading fails", async () => {
  const failedFetch = vi.fn().mockRejectedValue(new Error("offline"));
  vi.stubGlobal("fetch", failedFetch);
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Regras obrigatórias" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Ir para a partida/ }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(failedFetch).toHaveBeenCalledWith("/game-assets/match-engine-rules.md", { cache: "no-store" });
  expect(screen.queryByRole("heading", { name: "O jogo minuto a minuto" })).toBeNull();
  expect(readLocalSaves("alice")[0].progress?.minute).toBe(0);
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
  expect(saved.progress?.matchPreparation?.weather).toBeTruthy();
  const savedWeather = saved.progress?.matchPreparation?.weather;
  render(game());
  expect(await screen.findByText("PARTIDA PAUSADA")).toBeTruthy();
  expect(screen.getByText(new RegExp(`${savedWeather?.label} · ${savedWeather?.temperatureC} °C · vento ${savedWeather?.windKmh} km/h`))).toBeTruthy();
  expect(screen.queryByRole("button", { name: /CONTINUAR JOGANDO/ })).toBeNull();
  expect(readLocalSaves("alice")[0].progress?.minute).toBe(saved.progress?.minute);
});


it("pauses at minute 45 and automatically opens tactics before the second half", async () => {
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Intervalo automático" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Ir para a partida/ }));
  await screen.findByText("AO VIVO");
  fireEvent.click(screen.getByRole("button", { name: "4x" }));
  const dialog = await screen.findByRole("dialog", { name: "Táticas" }, { timeout: 20_000 });
  expect(within(dialog).getByText(/Ajuste a equipe antes do segundo tempo/)).toBeTruthy();
  expect(within(dialog).getByRole("button", { name: "Iniciar 2º tempo →" })).toBeTruthy();
  await waitFor(() => {
    const progress = readLocalSaves("alice")[0].progress;
    expect(progress?.minute).toBe(45);
    expect(progress?.halftimeWaiting).toBe(true);
    expect(progress?.detailOpen).toBe(true);
    expect(progress?.matchRunning).toBe(false);
  }, { timeout: 3000 });
  fireEvent.click(within(dialog).getByRole("button", { name: "Fechar táticas" }));
  expect(await screen.findByText("INTERVALO")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Iniciar 2º tempo/ })).toBeTruthy();
  await waitFor(() => {
    const progress = readLocalSaves("alice")[0].progress;
    expect(progress?.halftimeWaiting).toBe(true);
    expect(progress?.detailOpen).toBe(false);
    expect(progress?.matchRunning).toBe(false);
  });
  view.unmount();
}, 30_000);

it("warns before a browser exit during a match and saves the resumable state", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Técnica em jogo" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Ir para a partida/ }));
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.minute).toBeGreaterThan(0), { timeout: 2000 });

  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  expect(readLocalSaves("alice")[0].progress?.page).toBe("matchOverview");
  expect(readLocalSaves("alice")[0].progress?.matchRunning).toBe(false);
});

it("reloads directly into the last career screen without going through the start menu", async () => {
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Técnica da Retomada" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  await screen.findByRole("heading", { name: /ESCALAR TIME ·/ });
  view.unmount();

  render(game());
  expect(await screen.findByRole("heading", { name: /ESCALAR TIME ·/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /CONTINUAR JOGANDO/ })).toBeNull();
});

it("returns to the redesigned menu from new career, saves and both editor exit buttons", async () => {
  render(game());
  const assertCurrentMenu = async () => {
    const title = await screen.findByRole("heading", { level: 1 });
    expect(title.textContent).toBe("90 MINUTOS.UM CLUBE.UMA VIDA.");
    expect(document.querySelector('[data-menu-version="field-v2"]')).toBeTruthy();
    expect(screen.queryByRole("button", { name: "OPÇÕES" })).toBeNull();
    expect(screen.getByRole("link", { name: /menu principal/ }).getAttribute("href")).toBe("#menu-principal");
  };
  await assertCurrentMenu();
  fireEvent.click(screen.getByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Voltar ao início/ }));
  await assertCurrentMenu();
  fireEvent.click(screen.getByRole("button", { name: /CONTINUAR JOGANDO/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Voltar ao menu" }));
  await assertCurrentMenu();
  for (const exit of ["início", "sair editor"]) {
    fireEvent.click(screen.getByRole("button", { name: /EDITAR O UNIVERSO/ }));
    fireEvent.click(await screen.findByRole("button", { name: exit }));
    await assertCurrentMenu();
  }
});

it("keeps club navigation internal and the top Menu inicial button returns to the new menu", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Teste Navegação" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  for (const destination of ["Agenda", "Estádio", "Juniores", "Times", "Mercado", "Técnicos", "História"]) {
    fireEvent.click(await screen.findByRole("button", { name: destination }));
    if (destination === "Agenda") fireEvent.click(screen.getByRole("menuitem", { name: /Jogos do seu time/ }));
    if (destination === "História") fireEvent.click(screen.getByRole("menuitem", { name: /História dos jogadores/ }));
    expect(screen.queryByRole("button", { name: /Salvar e voltar ao início/ })).toBeNull();
    const dialog = screen.getByRole("dialog", { name: destination });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.queryByRole("button", { name: "Configurações" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: `Fechar ${destination}` }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Configurações" })).toBeTruthy();
  }
  fireEvent.click(screen.getByRole("button", { name: "Principal" }));
  expect(screen.queryByRole("button", { name: /INICIAR NOVA CARREIRA/ })).toBeNull();
  expect(screen.getByRole("button", { name: "Principal" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getAllByRole("table").length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Configurações" }));
  fireEvent.click(screen.getByRole("button", { name: "Voltar ao menu inicial" }));
  expect(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ })).toBeTruthy();
  expect(document.querySelector('[data-menu-version="field-v2"]')).toBeTruthy();
  expect(readLocalSaves("alice")[0].managerName).toBe("Teste Navegação");
}, 15000);


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
  fireEvent.click(screen.getByRole("button", { name: "Fechar Agenda" }));
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Central de empregos/ }));
  expect(await screen.findByRole("heading", { name: "Nenhuma proposta de trabalho" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fechar Agenda" }));
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Jogos do seu time/ }));
  expect(await screen.findByRole("heading", { name: "Jogos do seu time" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Preparar equipe/ }));
  expect(await screen.findByRole("heading", { name: /ESCALAR TIME ·/ })).toBeTruthy();
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
  fireEvent.click(screen.getByLabelText("Mostrar setores"));
  fireEvent.click(screen.getByRole("button", { name: "Posicionar em Meia esquerda" }));
  await waitFor(() => expect(readLocalSaves("alice")[0].manualPositions?.[id]).toEqual({ left: 10, top: 43 }));
  const xi = readLocalSaves("alice")[0].progress?.starters;
  fireEvent.click(screen.getByRole("button", { name: /Voltar ao clube/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  expect(document.querySelector(`[data-player="${id}"][data-slot]`)?.getAttribute("style")).toContain("10%");
  expect(readLocalSaves("alice")[0].progress?.starters).toEqual(xi);
  view.unmount();
  render(game());
  expect(await screen.findByRole("heading", { name: /ESCALAR TIME ·/ })).toBeTruthy();
  expect(document.querySelector(`[data-player="${id}"][data-slot]`)?.getAttribute("style")).toContain("10%");
});

it("uses the shared pre-match tactics board, confirms substitutions once and transfers custom positions into autosave", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Teste Táticas" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  const initialShirt = screen.getAllByRole("button", { name: /camisa.*titular/ })[0];
  const initialId = Number(initialShirt.getAttribute("data-player"));
  fireEvent.click(screen.getByLabelText("Mostrar setores"));
  fireEvent.click(initialShirt);
  fireEvent.click(screen.getByRole("button", { name: "Posicionar em Centroavante esquerdo" }));
  await waitFor(() => expect(readLocalSaves("alice")[0].manualPositions?.[initialId]).toEqual({ left: 38, top: 9 }));
  fireEvent.click(await screen.findByRole("button", { name: /Ir para a partida/ }));
  const tacticsTrigger = await screen.findByRole("button", { name: /Escalação e táticas/ });
  tacticsTrigger.focus();
  fireEvent.click(tacticsTrigger);
  await screen.findByRole("dialog", { name: "Táticas" });
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.detailOpen).toBe(true));
  const before = readLocalSaves("alice")[0].progress!;
  const id = before.starters[0];
  expect(screen.getByLabelText("Campo de escalação")).toBeTruthy();
  expect(document.querySelector('[inert]')).toBeTruthy();
  const shirt = () => document.querySelector<HTMLButtonElement>(`button[data-player="${id}"][data-slot]`)!;
  const reserve = document.querySelector<HTMLButtonElement>('button[data-reserve]')!;
  const incoming = Number(reserve.dataset.reserve);
  fireEvent.click(shirt());
  fireEvent.click(reserve);
  expect(readLocalSaves("alice")[0].progress?.starters).toEqual(before.starters);
  expect(readLocalSaves("alice")[0].progress?.substitutionsLeft).toBe(5);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar substituição" }));
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.substitutionsLeft).toBe(4));
  const after = readLocalSaves("alice")[0].progress!;
  expect(after.starters).not.toContain(id);
  expect(after.starters[0]).toBe(incoming);
  expect(after.manualPositions[incoming]).toEqual({ left: 38, top: 9 });
  expect(after.manualPositions[id]).toBeUndefined();
  expect(after.minute).toBe(before.minute);
  expect(after.events.length).toBe(before.events.length + 1);
  fireEvent.click(screen.getByRole("button", { name: "Voltar ao jogo" }));
  expect(screen.queryByRole("dialog", { name: "Táticas da partida" })).toBeNull();
  expect(document.activeElement).toBe(tacticsTrigger);
  fireEvent.click(screen.getByRole("button", { name: /Escalação e táticas/ }));
  expect(document.querySelector(`button[data-player="${incoming}"][data-slot]`)).toBeTruthy();
  expect(readLocalSaves("alice")[0].progress?.manualPositions[incoming]).toEqual({ left: 38, top: 9 });
});


it("opens finances, trophies and training as modal shortcuts without losing the career", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Janelas do clube" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  for (const title of ["Finanças", "Troféus", "Treino"]) {
    fireEvent.click(await screen.findByRole("button", { name: title }));
    const dialog = screen.getByRole("dialog", { name: title });
    if (title === "Treino") {
      expect(within(dialog).getByRole("heading", { name: "Centro de treinamento" })).toBeTruthy();
      expect(within(dialog).getByRole("heading", { name: "Atletas da sessão" })).toBeTruthy();
    }
    fireEvent.keyDown(within(dialog).getByRole("button", { name: `Fechar ${title}` }), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Principal" }).getAttribute("aria-current")).toBe("page");
  }
  expect(readLocalSaves("alice")[0].managerName).toBe("Janelas do clube");
});

it("applies a manageable training session and persists its weekly summary", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Treino semanal" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  await waitFor(() => expect(readLocalSaves("alice")[0]?.progress?.starters).toHaveLength(11));
  const careerBefore = readLocalSaves("alice")[0];
  const selectedId = careerBefore.progress!.starters[0];
  const energyBefore = careerBefore.progress!.careerSquad!.find((player) => player.id === selectedId)!.energy;
  fireEvent.click(await screen.findByRole("button", { name: "Treino" }));
  const dialog = await screen.findByRole("dialog", { name: "Treino" });
  fireEvent.click(within(dialog).getByRole("button", { name: /APLICAR SESSÃO/ }));
  await waitFor(() => expect(readLocalSaves("alice")[0]?.progress?.trainingSessions).toHaveLength(1));
  const saved = readLocalSaves("alice")[0].progress!;
  expect(saved.trainingSessions?.[0]).toMatchObject({ week: 1, day: "Segunda", drill: "passe", intensity: "Moderada" });
  expect(saved.trainingSessions?.[0].energySpent).toBe(22);
  expect(saved.careerSquad!.find((player) => player.id === selectedId)!.energy).toBe(energyBefore - 2);
  fireEvent.click(within(dialog).getByRole("button", { name: "Fechar Treino" }));
  expect(screen.getByText("1/6 sessões")).toBeTruthy();
  expect(screen.getByLabelText("Segunda: treino concluído — Passe e posse")).toBeTruthy();
});

it("offers Transfermarkt synchronization in Settings without changing the active career on an empty collection", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Catálogo protegido" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Configurações" }));
  expect(screen.getByRole("heading", { name: "Transfermarkt" })).toBeTruthy();
  const before = structuredClone(readLocalSaves("alice")[0].progress);
  const failedSync = vi.spyOn(transfermarktSync, "prepareLiveTransfermarktSync").mockRejectedValue(new Error("Nenhuma coleta válida. Catálogo não alterado."));
  fireEvent.click(screen.getByRole("button", { name: "Rodar importação — Séries A/B/C/D" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Nenhuma coleta");
  expect(readLocalSaves("alice")[0].progress?.careerSquad).toEqual(before?.careerSquad);
  expect(readLocalSaves("alice")[0].progress?.starters).toEqual(before?.starters);
  expect(screen.getByRole("dialog", { name: "Configurações" })).toBeTruthy();
  failedSync.mockRestore();
});


it("saves a synchronized catalog but leaves the active career squad untouched", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  vi.stubGlobal("indexedDB", new IDBFactory());
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  const spy = vi.spyOn(transfermarktSync, "prepareLiveTransfermarktSync").mockImplementation(async (database) => ({
    database: { ...database, players: database.players.map(player => ({ ...player, name: `Atualizado ${player.name}` })) },
    clubs: database.clubs.length, players: database.players.length, collectedAt: "2026-11-03T12:00:00Z",
  }));
  try {
    render(game("sync-success"));
    fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
    fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Carreira preservada" } });
    fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Configurações" }));
    const before = structuredClone(readLocalSaves("sync-success")[0].progress);
    fireEvent.click(screen.getByRole("button", { name: "Rodar importação — Séries A/B/C/D" }));
    await waitFor(() => expect(screen.getByText(/jogadores sincronizados no catálogo/)).toBeTruthy(), { timeout: 5000 });
    const { readCachedDatabase } = await import("@/lib/importer/database-cache");
    expect((await readCachedDatabase("sync-success"))?.players[0].name).toMatch(/^Atualizado /);
    expect(readLocalSaves("sync-success")[0].progress?.careerSquad).toEqual(before?.careerSquad);
    expect(readLocalSaves("sync-success")[0].progress?.starters).toEqual(before?.starters);
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao menu inicial" }));
    expect(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ })).toBeTruthy();
  } finally { spy.mockRestore(); confirm.mockRestore(); }
});

it("saves a player photo in the active career and restores it after reload", async () => {
  const photo = await import("@/lib/game/player-photo");
  const processor = vi.spyOn(photo, "preparePlayerPhoto").mockResolvedValue("data:image/webp;base64,abc");
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Foto teste" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  const roster = await screen.findByRole("region", { name: "Elenco do clube" });
  const first = readLocalSaves("alice")[0].progress!.careerSquad![0];
  fireEvent.doubleClick(within(roster).getByRole("button", { name: first.name }));
  const profile = await screen.findByRole("dialog", { name: `Perfil de ${first.name}` });
  fireEvent.change(within(profile).getByLabelText("Adicionar foto"), { target: { files: [new File(["foto"], "foto.png", { type: "image/png" })] } });
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.careerSquad?.find((player) => player.id === first.id)?.photoDataUrl).toBe("data:image/webp;base64,abc"));
  expect(readLocalSaves("alice")[0].progress?.careerSquad?.find((player) => player.id !== first.id)?.photoDataUrl).toBeFalsy();
  view.unmount();
  render(game());
  const restoredRoster = await screen.findByRole("region", { name: "Elenco do clube" });
  fireEvent.doubleClick(within(restoredRoster).getByRole("button", { name: first.name }));
  const restored = await screen.findByRole("dialog", { name: `Perfil de ${first.name}` });
  expect(within(restored).getByRole("img", { name: `Retrato de ${first.name}` }).getAttribute("src")).toBe("data:image/webp;base64,abc");
  fireEvent.click(within(restored).getByRole("button", { name: "Remover foto" }));
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.careerSquad?.find((player) => player.id === first.id)?.photoDataUrl).toBeNull());
  processor.mockRestore();
});

it("advances the career date after a result and returns an expired incoming loan without keeping its lineup slot", async () => {
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Teste Empréstimos" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  await screen.findByRole("button", { name: "Empréstimos" });
  await waitFor(() => expect(readLocalSaves("alice")[0]?.progress?.careerSquad?.length).toBeGreaterThan(10));
  const save = structuredClone(readLocalSaves("alice")[0]), state = save.progress!;
  const player = state.careerSquad![0];
  const loan = { owner: { name: "Origem externa", externalId: "99999999" }, borrower: { name: save.clubName, clubId: save.clubId }, startsOn: "2026-01-01", endsOn: "2026-01-25", status: "active" as const, source: "transfermarkt" as const };
  player.loan = loan; player.acquisitionType = "loan"; player.loanExpiresOn = loan.endsOn;
  state.loanContracts = { [player.sourceId!]: loan }; state.page = "result"; state.minute = 90;
  state.starters = [player.id, ...state.starters.filter(id => id !== player.id)].slice(0, 11);
  state.manualPositions = { [player.id]: { left: 50, top: 50 } };
  view.unmount(); sessionStorage.clear(); writeLocalSaves([save], "alice");
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /CONTINUAR JOGANDO/ }));
  fireEvent.click(await screen.findByRole("button", { name: "CONTINUAR" }));
  fireEvent.click(await screen.findByRole("button", { name: /Voltar ao hub/ }));
  await screen.findByRole("button", { name: "Empréstimos" });
  await waitFor(() => {
    const restored = readLocalSaves("alice")[0];
    expect(restored.inGameDate).toBe("2026-01-29");
    expect(restored.progress?.loanContracts?.[player.sourceId!].status).toBe("returned");
    expect(restored.progress?.careerSquad?.some(item => item.id === player.id)).toBe(false);
    expect(restored.progress?.starters).not.toContain(player.id);
    expect(restored.progress?.manualPositions[player.id]).toBeUndefined();
  });
});
