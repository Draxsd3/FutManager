// @vitest-environment jsdom
import { CURRENT_CAREER_RULESET } from "@/lib/game/career-rules";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { nextCareerFixture } from "@/lib/game/season";
import { GameBoard } from "./game-board";

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

// Full-universe integration: durable snapshots include financial + player books.
// E6 baseline also exceeds short wall-clock budgets on this sandbox.
// Keep every full-catalog/isolation assertion; no storage quota or engine limit is relaxed.
vi.setConfig({ testTimeout: 60_000 });
configure({ asyncUtilTimeout: 15000 });

const matchRulesMarkdown = readFileSync("public/game-assets/match-engine-rules.md", "utf8");
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => {
  // Do not retain every full-universe autosave in mock call history across tests.
  vi.clearAllMocks();
  // Release the real persistence layer's in-memory frozen universes as well.
  writeLocalSaves([],"alice");writeLocalSaves([],"bob");
  Object.defineProperty(navigator,"locks",{configurable:true,value:{request:async (_key: string, task: () => unknown) => task()}});
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
  expect(first.progress?.competitionSeason?.season).toBe(2026);
  expect(first.inGameDate).toBe(nextCareerFixture(first.progress?.competitionSeason)?.scheduledDate);
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
}, 60000);

it("does not expose another account's careers on the same browser", async () => {
  localStorage.setItem("futmanager.saves.v1.alice", JSON.stringify([{ id: "private", name: "Carreira privada", careerRuleset: CURRENT_CAREER_RULESET }]));
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
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.minute).toBeGreaterThan(0), { timeout: 10000 });
  expect(screen.queryByRole("button", { name: /Salvar e voltar ao início/ })).toBeNull();
  view.unmount();
  const saved = readLocalSaves("alice")[0];
  expect(saved.progress?.page).toBe("matchOverview");
  expect(saved.progress?.matchRunning).toBe(false);
  expect(saved.progress?.matchPreparation?.weather).toBeTruthy();
  const savedWeather = saved.progress?.matchPreparation?.weather;
  expect(saved.progress?.matchPreparation?.contractVersion).toBe(2);
  expect(saved.progress?.matchPreparation?.cpu?.active).toHaveLength(11);
  render(game());
  expect(await screen.findByText("PARTIDA PAUSADA")).toBeTruthy();
  expect(screen.getByText(new RegExp(`${savedWeather?.label} · ${savedWeather?.temperatureC} °C · vento ${savedWeather?.windKmh} km/h`))).toBeTruthy();
  expect(screen.queryByRole("button", { name: /CONTINUAR JOGANDO/ })).toBeNull();
  expect(readLocalSaves("alice")[0].progress?.minute).toBe(saved.progress?.minute);
  expect(readLocalSaves("alice")[0].progress?.matchPreparation?.cpu).toEqual(saved.progress?.matchPreparation?.cpu);
});


// E6 baseline also exceeded 30s on this sandbox; preserve all 45 live ticks/assertions.
it("pauses at minute 45 and automatically opens tactics before the second half", async () => {
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Intervalo automático" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Ir para a partida/ }));
  await screen.findByText("AO VIVO");
  fireEvent.click(screen.getByRole("button", { name: "4x" }));
  const dialog = await screen.findByRole("dialog", { name: "Táticas" }, { timeout: 45_000 });
  expect(within(dialog).getByText(/Ajuste a equipe antes do segundo tempo/)).toBeTruthy();
  expect(within(dialog).getByRole("button", { name: "Iniciar 2º tempo →" })).toBeTruthy();
  await waitFor(() => {
    const progress = readLocalSaves("alice")[0].progress;
    expect(progress?.minute).toBe(45);
    expect(progress?.matchPreparation?.cpu?.reviewed).toContain(45);
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
}, 60_000);

it("warns before a browser exit during a match and saves the resumable state", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Técnica em jogo" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Ir para a partida/ }));
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.minute).toBeGreaterThan(0), { timeout: 10000 });

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
  await screen.findByRole("heading", { name: "Escalação" });
  view.unmount();

  render(game());
  expect(await screen.findByRole("heading", { name: "Escalação" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /CONTINUAR JOGANDO/ })).toBeNull();
});

it("returns to the redesigned menu from new career, saves and the universe editor", async () => {
  render(game());
  const assertCurrentMenu = async () => {
    await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ });
    const title = screen.getByRole("heading", { level: 1 });
    expect(title.textContent?.replace(/\s+/g, " ").trim()).toBe("FUTMANAGER 26");
    expect(document.querySelector('[data-menu-version="stadium-v3"]')).toBeTruthy();
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
  fireEvent.click(screen.getByRole("button", { name: /EDITAR O UNIVERSO/ }));
  fireEvent.click(await screen.findByRole("button", { name: "← Voltar ao início" }));
  await assertCurrentMenu();
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
  expect(document.querySelector('[data-menu-version="stadium-v3"]')).toBeTruthy();
  expect(readLocalSaves("alice")[0].managerName).toBe("Teste Navegação");
}, 30000);


it("opens Agenda choices before navigating and routes each choice to its own section", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Teste Agenda" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Agenda" }));
  expect(screen.queryByRole("heading", { name: "Cada jogo, um novo capítulo." })).toBeNull();
  expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  fireEvent.click(screen.getByRole("menuitem", { name: /Jogos amistosos/ }));
  expect(await screen.findByRole("heading", { name: "Agendamento ainda indisponível" })).toBeTruthy();
  expect(screen.queryByRole("menu")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Fechar Agenda" }));
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Central de empregos/ }));
  expect(await screen.findByRole("heading", { name: "Central de empregos" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fechar Agenda" }));
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Jogos do seu time/ }));
  expect(await screen.findByRole("heading", { name: "Jogos do seu time" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Preparar equipe/ }));
  expect(await screen.findByRole("heading", { name: "Escalação" })).toBeTruthy();
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
  expect(screen.queryByRole("button", { name: /Voltar ao clube/ })).toBeNull();
  expect(document.querySelector("[data-window-header] [data-window-date]")?.textContent).toMatch(/de 2026$/);
  fireEvent.click(screen.getByRole("button", { name: "Fechar Escalação" }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  expect(document.querySelector(`[data-player="${id}"][data-slot]`)?.getAttribute("style")).toContain("10%");
  expect(readLocalSaves("alice")[0].progress?.starters).toEqual(xi);
  view.unmount();
  render(game());
  expect(await screen.findByRole("heading", { name: "Escalação" })).toBeTruthy();
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
  const reserve = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-reserve]')).find((button) => before.careerSquad?.find((player) => player.id === Number(button.dataset.reserve))?.position !== 'G')!;
  const incoming = Number(reserve.dataset.reserve);
  fireEvent.click(shirt());
  fireEvent.click(reserve);
  expect(readLocalSaves("alice")[0].progress?.starters).toEqual(before.starters);
  expect(readLocalSaves("alice")[0].progress?.substitutionsLeft).toBe(5);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar substituição" }));
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.substitutionsLeft).toBe(4));
  const after = readLocalSaves("alice")[0].progress!;
  expect(after.matchBenchIds?.length).toBeLessThanOrEqual(12);
  expect(after.matchBenchIds).toContain(incoming);
  expect(after.participation?.[id]?.left).toBe(after.minute);
  expect(document.querySelector(`button[data-reserve="${id}"]`)).toBeNull();
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
  expect(document.querySelector(`button[data-reserve="${id}"]`)).toBeNull();
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
      expect(within(dialog).getByRole("heading", { name: "Treino" })).toBeTruthy();
      expect(within(dialog).getByRole("heading", { name: "Atletas da sessão" })).toBeTruthy();
      expect(within(dialog).getByRole("region", { name: "Escolha os atletas" }).getAttribute("tabindex")).toBe("0");
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

it("keeps external collection out of career settings and saves the selected match speed", async () => {
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Preferências" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Configurações" }));
  expect(screen.queryByRole("heading", { name: "Transfermarkt" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Rodar importação/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /4× Acelerado/ }));
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.defaultMatchSpeed).toBe(4));
  expect(readLocalSaves("alice")[0].progress?.universeSnapshot?.clubs.length).toBeGreaterThan(0);
});

it("shows the club shirt in a player profile after career reload", async () => {
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Camisa teste" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  const roster = await screen.findByRole("region", { name: "Elenco do clube" });
  const first = readLocalSaves("alice")[0].progress!.careerSquad![0];
  fireEvent.doubleClick(within(roster).getByRole("button", { name: first.name }));
  const profile = await screen.findByRole("dialog", { name: `Perfil de ${first.name}` });
  expect(within(profile).getByRole("img", { name: `Camisa de ${first.name}` })).toBeTruthy();
  expect(within(profile).queryByLabelText(/foto/i)).toBeNull();
  view.unmount();
  render(game());
  const restoredRoster = await screen.findByRole("region", { name: "Elenco do clube" });
  fireEvent.doubleClick(within(restoredRoster).getByRole("button", { name: first.name }));
  const restored = await screen.findByRole("dialog", { name: `Perfil de ${first.name}` });
  expect(within(restored).getByRole("img", { name: `Camisa de ${first.name}` })).toBeTruthy();
});

// Includes two full-universe hydrations and E4 financial/planning checkpoints.
it("advances the career date after a result and returns an expired incoming loan without keeping its lineup slot", async () => {
  const stats = vi.spyOn(await import("@/lib/game/season"), "getCompetitionPlayerStats");
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Teste Empréstimos" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  await screen.findByRole("button", { name: "Empréstimos" });
  await waitFor(() => expect(readLocalSaves("alice")[0]?.progress?.careerSquad?.length).toBeGreaterThan(10));
  const save = structuredClone(readLocalSaves("alice")[0]), state = save.progress!;
  const played = nextCareerFixture(state.competitionSeason)!;
  state.competitionSeason!.fixtures = state.competitionSeason!.fixtures.map(f => f.id === played.id ? { ...f, status: "played", homeScore: 1, awayScore: 0 } : f);
  const expectedDate = nextCareerFixture(state.competitionSeason)!.scheduledDate!;
  expect(save.inGameDate).toBe(played.scheduledDate);
  const expiresOn = new Date(Date.parse(played.scheduledDate!) + 86400000).toISOString().slice(0, 10);
  expect(expectedDate > expiresOn).toBe(true);
  const player = state.careerSquad![0];
  const loan = { owner: { name: "Origem externa", externalId: "99999999" }, borrower: { name: save.clubName, clubId: save.clubId }, startsOn: "2026-01-01", endsOn: expiresOn, status: "active" as const, source: "transfermarkt" as const };
  player.loan = loan; player.acquisitionType = "loan"; player.loanExpiresOn = loan.endsOn;
  delete state.managerMarket!.staff;
  delete state.managerMarket!.finance; // Legacy E2 fixture: finance adopts this external loan without inventing its owner club.
  state.loanContracts = { [player.sourceId!]: loan }; state.page = "result"; state.minute = 90;
  state.starters = [player.id, ...state.starters.filter(id => id !== player.id)].slice(0, 11);
  state.manualPositions = { [player.id]: { left: 50, top: 50 } };
  view.unmount(); sessionStorage.clear(); writeLocalSaves([save], "alice");
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /CONTINUAR JOGANDO/ }));
  fireEvent.click(await screen.findByRole("button", { name: "CONTINUAR" }));
  await screen.findByRole("button", { name: /Voltar ao hub/ });
  stats.mockClear();
  fireEvent.click(screen.getByRole("tab", { name: "Estatísticas" }));
  expect(stats).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /Ver tabelas dos campeonatos/i }));
  expect(stats).toHaveBeenCalled();
  const standingsDialog = await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: /^Fechar / }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(standingsDialog).toBeTruthy();
  stats.mockClear();
  fireEvent.click(screen.getByRole("tab", { name: "Eventos" }));
  expect(stats).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button", { name: /Voltar ao hub/ }));
  await screen.findByRole("button", { name: "Empréstimos" });
  await waitFor(() => {
    const restored = readLocalSaves("alice")[0];
    expect(restored.inGameDate).toBe(expectedDate);
    expect(restored.progress?.engine?.revision).toBe(1);
    expect(restored.progress?.engine?.date).toBe(expectedDate);
    expect(restored.progress?.engine?.events.some(event => event.type === "checkpoint")).toBe(true);
    expect(restored.progress?.competitionSeason?.calendarVersion).toBe(3);
    expect(restored.progress?.loanContracts?.[player.sourceId!].status).toBe("returned");
    expect(restored.progress?.careerSquad?.some(item => item.id === player.id)).toBe(false);
    expect(restored.progress?.starters).not.toContain(player.id);
    expect(restored.progress?.manualPositions[player.id]).toBeUndefined();
  });
  stats.mockRestore();
}, 120000);

it("archives concluded competitions from an old save and persists champions separately from the imported catalog", async () => {
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Técnico campeão" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  await screen.findByRole("button", { name: "Empréstimos" });
  await waitFor(() => expect(readLocalSaves("alice")[0]?.progress?.competitionSeason).toBeTruthy());
  const save = structuredClone(readLocalSaves("alice")[0]), season = save.progress!.competitionSeason!;
  season.fixtures = season.fixtures.filter(f => f.type === "league").map(f => ({ ...f, status: "played", homeScore: f.homeClubId === season.clubId ? 3 : 0, awayScore: f.awayClubId === season.clubId ? 3 : 0 }));
  save.progress!.page = "hub"; delete save.progress!.championHistory;
  view.unmount(); sessionStorage.clear(); writeLocalSaves([save], "alice");
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /CONTINUAR JOGANDO/ }));
  fireEvent.click(await screen.findByRole("button", { name: "CONTINUAR" }));
  await screen.findByRole("button", { name: "Empréstimos" });
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.championHistory?.[0]).toMatchObject({ championId: season.clubId, coach: "Técnico campeão", season: 2026 }));
  fireEvent.click(screen.getByRole("button", { name: "História" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: /Times campeões/ }));
  expect(await screen.findByRole("columnheader", { name: "Técnico campeão" })).toBeTruthy();
}, 30000);

it("removes pre-reset careers from IndexedDB/localStorage/session and cannot restore them from cloud", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  const { cacheCareerSaves, readCachedCareerSaves } = await import("@/lib/importer/database-cache");
  const { accountStorageKey } = await import("@/lib/game/save-utils");
  const persistence = await import("@/lib/game/persistence");
  vi.stubGlobal("indexedDB", new IDBFactory());
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Carreira encerrada" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  await screen.findByRole("button", { name: "Empréstimos" });
  const old = structuredClone(readLocalSaves("alice")[0]);
  delete old.careerRuleset;
  if (old.progress) { delete old.progress.universeSnapshot; if(old.progress.managerMarket) delete old.progress.managerMarket.finance; if(old.progress.worldMarket) delete old.progress.worldMarket.population; }
  view.unmount();
  // Raw seed emulates a browser/database written by a release before the reset.
  localStorage.setItem(accountStorageKey("futmanager.saves.v1", "alice"), JSON.stringify([old]));
  await cacheCareerSaves([old], "alice");
  vi.mocked(persistence.readCloudSaves).mockResolvedValueOnce([old]);
  const restored = render(game());
  await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ });
  expect(screen.queryByRole("button", { name: "Empréstimos" })).toBeNull();
  expect(readLocalSaves("alice")).toEqual([]);
  expect(await readCachedCareerSaves("alice")).toEqual([]);
  fireEvent.click(screen.getByRole("button", { name: /CONTINUAR JOGANDO/ }));
  expect(screen.queryByRole("button", { name: "CONTINUAR" })).toBeNull();
  restored.unmount();
});


// E6 baseline also exceeded 60s; retain full-universe/two-career/reload coverage.
it("connects jobs to the career, confirms a club change and restores it without moving the old squad or money", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  vi.stubGlobal("indexedDB", new IDBFactory());
  const { readCachedDatabase, cacheCareerSaves } = await import("@/lib/importer/database-cache");
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Técnico no mercado" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  await screen.findByRole("button", { name: "Empréstimos" });
  await waitFor(() => expect(readLocalSaves("alice")[0]?.progress?.managerMarket).toBeTruthy());
  const database = (await readCachedDatabase("alice"))!;
  const save = structuredClone(readLocalSaves("alice")[0]);
  const current = database.clubs.find(c => c.id === save.clubId)!;
  const target = database.clubs.find(c => c.id !== current.id && c.division === current.division && c.level <= current.level + 2 && database.players.filter(p => p.clubId === c.id).length >= 11)!;
  save.budget = 9000; save.progress!.budget = 9000;
  const { processCoaches } = await import("@/lib/game/simulation/coaches");
  const targetCoach=Object.values(save.progress!.managerMarket!.staff!.coaches).find(c=>c.clubId===target.id);
  if(targetCoach) {
    const yesterday=new Date(Date.parse(`${save.inGameDate}T12:00:00Z`)-86400000).toISOString().slice(0,10);
    targetCoach.contract!.endsOn=yesterday;
    save.progress!.managerMarket!.finance!.contracts[`coach:${targetCoach.id}`].endsOn=yesterday;
    save.progress!.managerMarket=processCoaches(save.progress!.managerMarket!,database,undefined,save.inGameDate);
  }
  // An affordable target roster: employment now requires twelve months of salary cover.
  for(const c of Object.values(save.progress!.managerMarket!.finance!.contracts)) if(c.clubId===target.id && c.personKind!=="coach") c.monthlyCents=100_000;
  save.progress!.managerMarket!.clubs[target.id].budget = 4321;
  const originalSquad = structuredClone(save.progress!.careerSquad);
  const otherSave = { ...structuredClone(save), id: "independent-career", name: "Outra carreira", progress: { ...save.progress!, activeSaveId: "independent-career" } };
  view.unmount(); sessionStorage.clear(); writeLocalSaves([save, otherSave], "alice"); await cacheCareerSaves([save, otherSave], "alice");
  const restored = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /CONTINUAR JOGANDO/ }));
  fireEvent.click((await screen.findAllByRole("button", { name: "CONTINUAR" }))[0]);
  fireEvent.click(await screen.findByRole("button", { name: "Agenda" }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Central de empregos/ }));
  fireEvent.click(await screen.findByRole("button", { name: `Candidatar-se ao ${target.name}` }));
  fireEvent.click(await screen.findByRole("button", { name: `Aceitar proposta do ${target.name}` }));
  expect(readLocalSaves("alice").find(item => item.id === save.id)?.clubId).toBe(current.id);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar mudança" }));
  expect(readLocalSaves("alice").find(item => item.id === save.id)?.clubId).toBe(current.id);
  fireEvent.click(screen.getByRole("button", { name: `Aceitar proposta do ${target.name}` }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar mudança de clube" }));
  await screen.findByRole("button", { name: "Empréstimos" });
  await waitFor(() => {
    const changed = readLocalSaves("alice").find(item => item.id === save.id)!;
    expect(changed.clubId).toBe(target.id);
    const contract=changed.progress!.managerMarket!.staff!.coaches[changed.progress!.managerMarket!.staff!.humanId].contract!;
    expect(changed.budget).toBe(4321-contract.monthlyCents/100_000);
    expect(changed.progress?.club).toBe(target.name);
    expect(changed.progress?.managerMarket?.clubs[target.id].coach).toBe("Técnico no mercado");
    expect(changed.progress?.managerAppointments).toHaveLength(2);
    expect(changed.progress?.jobClubSnapshots?.[current.id].careerSquad).toEqual(originalSquad);
    expect(changed.progress?.careerSquad?.every(p => database.players.find(source => source.id === p.sourceId)?.clubId === target.id)).toBe(true);
    expect(readLocalSaves("alice").find(item => item.id === otherSave.id)).toEqual(otherSave);
  });
  restored.unmount(); render(game());
  await screen.findByRole("button", { name: "Empréstimos" });
  expect(readLocalSaves("alice").find(item => item.id === save.id)?.clubId).toBe(target.id);
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Central de empregos/ }));
  expect(await screen.findByText("Contratação confirmada.")).toBeTruthy();
}, 120000);

it("saves the chosen imported shirt per career, restores it and carries it into match tactics", async () => {
  const { clubCrestAsset, clubKitAsset } = await import("@/lib/game/assets");
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Escolha de uniforme" } });
  fireEvent.click(screen.getByRole("combobox", { name: /Seu clube/ }));
  fireEvent.click(screen.getByRole("option", { name: "Flamengo" }));
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  fireEvent.click(await screen.findByRole("button", { name: "Usar camisa 3" }));
  expect(screen.getByRole("button", { name: "Usar camisa 3" }).getAttribute("aria-pressed")).toBe("true");
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.kit).toBe(3));
  const club = readLocalSaves("alice")[0].clubName;
  view.unmount();
  render(game());
  expect((await screen.findByRole("button", { name: "Usar camisa 3" })).getAttribute("aria-pressed")).toBe("true");
  const lineupField = screen.getByLabelText("Campo de escalação");
  expect(lineupField.querySelectorAll("svg[data-jersey-role='outfield'] image").length).toBeGreaterThan(0);
  expect(lineupField.querySelectorAll("svg[data-jersey-role='goalkeeper']").length).toBe(1);
  for (const image of lineupField.querySelectorAll("svg[data-jersey-role='outfield'] image")) {
    expect(image.getAttribute("href")).toBe(clubKitAsset(club, 3));
  }
  for (const gkSvg of lineupField.querySelectorAll("svg[data-jersey-role='goalkeeper']")) {
    expect(gkSvg.getAttribute("data-gk-color")).toBe("#eab308");
    expect(gkSvg.querySelector("image[data-jersey-crest='true']")?.getAttribute("href")).toBe(clubCrestAsset(club));
  }
  fireEvent.click(screen.getByRole("button", { name: /Ir para a partida/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalação e táticas/ }));
  const dialog = await screen.findByRole("dialog", { name: "Táticas" });
  expect(within(dialog).getByText("Uniforme 3")).toBeTruthy();
  for (const image of dialog.querySelectorAll("svg[data-jersey-role='outfield'] image")) {
    expect(image.getAttribute("href")).toBe(clubKitAsset(club, 3));
  }
  for (const gkSvg of dialog.querySelectorAll("svg[data-jersey-role='goalkeeper']")) {
    expect(gkSvg.getAttribute("data-gk-color")).toBe("#eab308");
    expect(gkSvg.querySelector("image[data-jersey-crest='true']")?.getAttribute("href")).toBe(clubCrestAsset(club));
  }
  expect(readLocalSaves("alice")[0].progress?.kit).toBe(3);
}, 30000);

it("persists sector prices and paid stadium construction across career reload", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  vi.stubGlobal("indexedDB", new IDBFactory());
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Gestão do estádio" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Estádio" }));
  const price = await screen.findByLabelText("Ingresso Popular (R$)");
  fireEvent.change(price, { target: { value: "42" } });
  fireEvent.blur(price);
  fireEvent.click(screen.getAllByRole("button", { name: "Selecionar obra" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar obra" }));
  await waitFor(() => {
    const save = readLocalSaves("alice")[0];
    expect(save.budget).toBe(11624);
    expect(save.progress?.stadiums?.[save.clubId].prices.popular).toBe(42);
    expect(save.progress?.stadiums?.[save.clubId].construction?.seats).toBe(1000);
  });
  view.unmount();
  render(game());
  await waitFor(() => expect((screen.getByLabelText("Ingresso Popular (R$)") as HTMLInputElement).value).toBe("42"));
  expect(screen.getByText(/lugares em construção/)).toBeTruthy();
  expect(readLocalSaves("alice")[0].budget).toBe(11624);
}, 60000);

it.each([true, false])("credits gate only for a completed home fixture (home=%s)", async (home) => {
  const { IDBFactory } = await import("fake-indexeddb");
  const { cacheCareerSaves, readCachedDatabase } = await import("@/lib/importer/database-cache");
  const { newStadium, projectStadiumGate } = await import("@/lib/game/stadium");
  vi.stubGlobal("indexedDB", new IDBFactory());
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Bilheteria" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Escalar Time/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Ir para a partida/ }));
  await screen.findByText("AO VIVO");
  const save = structuredClone(readLocalSaves("alice")[0]);
  const database = (await readCachedDatabase("alice"))!;
  const fixture = save.progress!.competitionSeason!.fixtures.find(item => item.id === save.progress!.activeFixtureId)!;
  if ((fixture.homeClubId === save.clubId) !== home) {
    [fixture.homeClubId, fixture.awayClubId] = [fixture.awayClubId, fixture.homeClubId];
    [fixture.home, fixture.away] = [fixture.away, fixture.home];
  }
  save.progress!.minute = 89;
  save.progress!.matchRunning = false;
  save.progress!.page = "matchOverview";
  save.progress!.halftimeWaiting = false;
  save.progress!.detailOpen = false;
  save.budget = 12624; save.progress!.budget = 12624;
  view.unmount();
  sessionStorage.clear();
  writeLocalSaves([save], "alice");
  await cacheCareerSaves([save], "alice");
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /CONTINUAR JOGANDO/ }));
  fireEvent.click(await screen.findByRole("button", { name: "CONTINUAR" }));
  fireEvent.click(await screen.findByRole("button", { name: /Continuar/ }));
  const expectedNet = projectStadiumGate(database.clubs.find(c => c.id === save.clubId)!.stadiumCapacity, newStadium().prices).net;
  await waitFor(() => {
    const result = readLocalSaves("alice")[0];
    expect(result.progress?.minute).toBe(90);
    const completed=result.progress!.competitionSeason!.fixtures.find(item=>item.id===fixture.id)!;
    expect(completed.report?.version).toBe(1);
    expect(completed.report?.origin).toBe("live");
    expect(completed.report?.goals.filter(goal=>goal.clubId===completed.homeClubId)).toHaveLength(completed.homeScore!);
    expect(completed.report?.goals.filter(goal=>goal.clubId===completed.awayClubId)).toHaveLength(completed.awayScore!);
    expect(new Set(completed.playerContributions!.map(row=>row.clubId))).toEqual(new Set([completed.homeClubId,completed.awayClubId]));
    expect(result.budget).toBeCloseTo(12624 + 151 + (home ? expectedNet / 1000 : 0));
    expect(result.progress?.stadiums?.[save.clubId]?.receipts.length ?? 0).toBe(home ? 1 : 0);
  }, { timeout: 15000 });
  // Exercise the real transition after minute 90 rather than a fabricated result save.
  expect(await screen.findByRole("button", { name: /Voltar ao hub/ }, { timeout: 15000 })).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "Estatísticas" }));
  expect(screen.getByRole("tab", { name: "Estatísticas" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("tab", { name: "Formações" }));
  expect(screen.getByRole("region", { name: "Formações das equipes" })).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "Eventos" }));
  expect(screen.getByRole("region", { name: "Eventos da partida" })).toBeTruthy();
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.page).toBe("result"));
  const result = readLocalSaves("alice")[0];
  const finished = result.progress!.competitionSeason!.fixtures.find(f => f.id === fixture.id)!;
  expect(finished.status).toBe("played");
  expect(result.progress?.stadiums?.[save.clubId]?.receipts.length ?? 0).toBe(home ? 1 : 0);
  if (home) {
    fireEvent.click(screen.getByRole("button", { name: /Voltar ao hub/ }));
    await screen.findByRole("button", { name: "Empréstimos" }, { timeout: 15000 });
    await waitFor(() => expect(readLocalSaves("alice")[0].progress?.page).toBe("hub"));
    const advanced = readLocalSaves("alice")[0];
    const savedFixture = advanced.progress!.competitionSeason!.fixtures.find(f => f.id === fixture.id)!;
    expect(savedFixture.status).toBe("played");
    expect([savedFixture.homeScore, savedFixture.awayScore]).toEqual([finished.homeScore, finished.awayScore]);
    expect(advanced.progress?.stadiums?.[save.clubId]?.receipts).toHaveLength(1);
  }
}, 90000);

it("waits for catalog synchronization, explains failure, and retries with Atualizar", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  vi.stubGlobal("indexedDB", new IDBFactory());
  const persistence = await import("@/lib/game/persistence");
  const cloud = vi.mocked(persistence.writeCloudDatabase);
  cloud.mockResolvedValue(undefined);
  render(<GameBoard userId="sync-test" email="sync@example.com" onSignOut={async () => {}} initialPage="editor" />);
  fireEvent.click(await screen.findByRole("button", { name: "Dados e importação" }));
  const november = await import("@/lib/importer/november-database");
  const apply = vi.spyOn(november, "applyNovemberDatabase").mockImplementation(async database => ({ database, clubs: 156, players: 4208, provisional: 207, shortRosters: 4 }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
  // Let hydration finish before testing the explicit update.
  await waitFor(() => expect(cloud).toHaveBeenCalled());
  cloud.mockRejectedValueOnce({ code: "23505" });
  fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
  expect(await screen.findByText(/não foi possível confirmar a sincronização/)).toBeTruthy();
  expect(screen.getAllByText(/a nuvem recusou os dados/i).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
  expect(await screen.findByText(/4208 jogadores atualizados e sincronizados/)).toBeTruthy();
  expect(apply).toHaveBeenCalledTimes(2);
  vi.restoreAllMocks();
}, 30000);

it("creates a separate simulated youth team and persists a promotion after reload", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  vi.stubGlobal("indexedDB", new IDBFactory());
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  const view = render(game("youth-manager"));
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Técnico Base" } });
  // E6 promotion now honors the common salary book; use an affordable lower-division club.
  fireEvent.change(screen.getByLabelText("Divisão"),{target:{value:"Série D"}});
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Juniores" }));
  await screen.findByText(/Jogadores fictícios gerados pelo jogo/);
  expect(screen.getAllByRole("button", { name: "Promover" })).toHaveLength(20);
  fireEvent.click(screen.getAllByRole("button", { name: "Promover" })[0]);
  expect((await screen.findByRole("status")).textContent).toMatch(/promovido ao elenco principal/);
  await waitFor(() => expect(readLocalSaves("youth-manager")[0].progress?.careerSquad?.some(p => p.youthId)).toBe(true));
  const saved = readLocalSaves("youth-manager")[0];
  expect(Object.values(saved.progress!.youthTeams!)[0].players).toHaveLength(19);
  expect(screen.queryByRole("button", { name: "Tentar buscar dados reais" })).toBeNull();
  expect(screen.getAllByRole("button", { name: "Promover" })).toHaveLength(19);
  view.unmount();
  render(game("youth-manager"));
  await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ });
  fireEvent.click(screen.getByRole("button", { name: /CONTINUAR JOGANDO/ }));
  fireEvent.click((await screen.findAllByRole("button", { name: "CONTINUAR" }))[0]);
  await screen.findByText(/Jogadores fictícios gerados pelo jogo/);
  expect(screen.getAllByRole("button", { name: "Promover" })).toHaveLength(19);
  confirm.mockRestore();
}, 60000);

it("preserves the entire career universe across editor changes, reload and continuing the saved career", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  vi.stubGlobal("indexedDB", new IDBFactory());
  const { createDefaultDatabase } = await import("@/lib/game/editor-data");
  const { cacheDatabase, readCachedCareerSaves } = await import("@/lib/importer/database-cache");
  const base = createDefaultDatabase();
  await cacheDatabase(base, "isolated-universe", false);
  const view = render(game("isolated-universe"));
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Universo original" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Configurações" }));
  fireEvent.click(screen.getByRole("button", { name: "Voltar ao menu inicial" }));
  const original = readLocalSaves("isolated-universe")[0];
  const snapshot = structuredClone(original.progress!.universeSnapshot!);
  fireEvent.click(await screen.findByRole("button", { name: /EDITAR O UNIVERSO/ }));
  fireEvent.click(screen.getByRole("button", { name: "Clubes e jogadores" }));
  fireEvent.click(screen.getByRole("button", { name: "editar" }));
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Clube editado apenas no catálogo" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar e fechar" }));
  fireEvent.click(screen.getByRole("button", { name: /Voltar ao início/ }));
  await screen.findByRole("button", { name: /CONTINUAR JOGANDO/ });
  view.unmount();
  const stored = await readCachedCareerSaves("isolated-universe");
  expect(stored?.[0].progress?.universeSnapshot).toEqual(snapshot);
  render(game("isolated-universe"));
  fireEvent.click(await screen.findByRole("button", { name: /CONTINUAR JOGANDO/ }));
  fireEvent.click((await screen.findAllByRole("button", { name: "CONTINUAR" }))[0]);
  await screen.findByRole("dialog", { name: "Configurações" });
  expect(readLocalSaves("isolated-universe")[0].progress?.universeSnapshot?.clubs).toEqual(snapshot.clubs);
  expect(readLocalSaves("isolated-universe")[0].progress?.universeSnapshot?.players).toEqual(snapshot.players);
  expect(within(screen.getByRole("dialog", { name: "Configurações" })).getByText(original.clubName, { selector: "strong" })).toBeTruthy();
}, 30000);

it("opens local career options when cloud reads never respond", async () => {
  const persistence = await import("@/lib/game/persistence");
  const pending = vi.mocked(persistence.readCloudDatabase).mockImplementationOnce(() => new Promise(() => {}));
  render(game("cloud-timeout"));
  expect(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }, { timeout: 22000 })).toBeTruthy();
  expect(screen.getByRole("button", { name: /CONTINUAR JOGANDO/ })).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Carregamento do FutManager" })).toBeNull();
  pending.mockResolvedValue(null);
}, 30000);

// Three full-universe hydrations; retain every offer, persistence and rejection assertion.
it("receives automatic club offers after the match, persists and rejects them after reload", async () => {
  const { createPlayerCareer } = await import("@/lib/game/career");
  const view = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Ofertas automáticas" } });
  fireEvent.click(screen.getByRole("button", { name: /Iniciar jogo/ }));
  await screen.findByRole("button", { name: "Empréstimos" });
  await waitFor(() => expect(readLocalSaves("alice")[0]?.progress?.careerSquad?.length).toBeGreaterThan(10));
  const save = structuredClone(readLocalSaves("alice")[0]), state = save.progress!;
  const played = nextCareerFixture(state.competitionSeason)!;
  state.competitionSeason!.fixtures = state.competitionSeason!.fixtures.map(f => f.id === played.id ? { ...f, status: "played", homeScore: 1, awayScore: 0 } : f);
  const player = state.careerSquad!.find(item => !item.loan && item.acquisitionType !== "loan")!;
  player.marketValue = 1;
  state.playerCareers = Object.fromEntries(state.careerSquad!.map(item => [item.id, { ...createPlayerCareer(item, save.clubName), marketStatus: item.id === player.id ? "sale" : "normal" }]));
  state.page = "result"; state.minute = 90; state.activeFixtureId = played.id;
  view.unmount(); sessionStorage.clear(); writeLocalSaves([save], "alice");
  const resumed = render(game());
  fireEvent.click(await screen.findByRole("button", { name: /CONTINUAR JOGANDO/ }));
  fireEvent.click(await screen.findByRole("button", { name: "CONTINUAR" }));
  fireEvent.click(await screen.findByRole("button", { name: /Voltar ao hub/ }));
  expect(await screen.findByText(/Propostas recebidas para 1 atleta/)).toBeTruthy();
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.playerCareers[player.id]?.transferOffers).toHaveLength(1));
  const offer = readLocalSaves("alice")[0].progress!.playerCareers[player.id].transferOffers![0];
  resumed.unmount(); sessionStorage.clear();
  render(game());
  fireEvent.click(await screen.findByRole("button", { name: /CONTINUAR JOGANDO/ }));
  fireEvent.click(await screen.findByRole("button", { name: "CONTINUAR" }));
  const roster = await screen.findByRole("region", { name: "Elenco do clube" });
  expect(within(roster).getByText(/Proposta!/)).toBeTruthy();
  fireEvent.doubleClick(within(roster).getByRole("button", { name: player.name }));
  const profile = await screen.findByRole("dialog", { name: `Perfil de ${player.name}` });
  fireEvent.click(within(profile).getByRole("button", { name: "Mercado" }));
  fireEvent.click(within(profile).getByRole("button", { name: "Propostas (1)" }));
  expect(within(profile).getByText(offer.club)).toBeTruthy();
  fireEvent.click(within(profile).getByRole("button", { name: "Recusar" }));
  await waitFor(() => expect(readLocalSaves("alice")[0].progress?.playerCareers[player.id]?.transferOffers?.[0].status).toBe("rejected"));
}, 120000);

it("loads a real unemployed checkpoint, advances without a fixture and preserves unemployment after reload", async () => {
  const { IDBFactory } = await import("fake-indexeddb"); vi.stubGlobal("indexedDB",new IDBFactory());
  const { marketFixture } = await import("@/lib/game/simulation/market-test-fixture");
  const { migrateCoachSave, processCoaches } = await import("@/lib/game/simulation/coaches");
  const { cacheCareerSaves } = await import("@/lib/importer/database-cache");
  const f=marketFixture();
  const save=migrateCoachSave(f.save,f.database), p=save.progress!, human=p.managerMarket!.staff!.coaches[p.managerMarket!.staff!.humanId];
  human.contract!.endsOn="2026-01-10";p.managerMarket!.finance!.contracts[`coach:${human.id}`].endsOn="2026-01-10";
  p.managerMarket=processCoaches(p.managerMarket!,f.database,undefined,save.inGameDate);
  p.universeSnapshot=f.database; p.competitionSeason={...p.competitionSeason!,fixtures:[]};p.activeFixtureId=undefined;
  expect(writeLocalSaves([save],"unemployed")).toBe(true);await cacheCareerSaves([save],"unemployed");
  const view=render(game("unemployed"));
  fireEvent.click(await screen.findByRole("button",{name:/CONTINUAR JOGANDO/}));
  fireEvent.click(await screen.findByRole("button",{name:"CONTINUAR"}));
  await screen.findByRole("heading",{name:/Sem clube/});
  expect(screen.queryByRole("region",{name:"Elenco do clube"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Avançar uma semana"}));
  await waitFor(()=>expect(readLocalSaves("unemployed")[0].inGameDate).toBe("2026-01-18"));
  await screen.findByRole("heading",{name:/Sem clube/});
  expect(readLocalSaves("unemployed")[0].progress!.engine!.revision).toBe(1);
  view.unmount();sessionStorage.clear();
  render(game("unemployed"));
  fireEvent.click(await screen.findByRole("button",{name:/CONTINUAR JOGANDO/}));
  fireEvent.click(await screen.findByRole("button",{name:"CONTINUAR"}));
  await screen.findByRole("heading",{name:/Sem clube/});
  expect(screen.getByRole("heading",{name:"Central de empregos"})).toBeTruthy();
  expect(readLocalSaves("unemployed")[0].progress!.engine!.revision).toBe(1);
},30000);

it("executes CPU fatigue substitutions at a live milestone and resumes the identical participants after reload", async () => {
  const {IDBFactory}=await import("fake-indexeddb");vi.stubGlobal("indexedDB",new IDBFactory());
  let view=render(game());
  fireEvent.click(await screen.findByRole("button",{name:/INICIAR NOVA CARREIRA/}));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"),{target:{value:"CPU contextual"}});
  fireEvent.click(screen.getByRole("button",{name:/Iniciar jogo/}));
  fireEvent.click(await screen.findByRole("button",{name:/Escalar Time/i}));
  fireEvent.click(await screen.findByRole("button",{name:/Ir para a partida/}));
  await waitFor(()=>expect(readLocalSaves("alice")[0].progress?.minute).toBeGreaterThan(0));
  view.unmount();
  const save=readLocalSaves("alice")[0],p=save.progress!,fixture=p.competitionSeason!.fixtures.find(f=>f.id===p.activeFixtureId)!;
  const rival=fixture.homeClubId===save.clubId?fixture.awayClubId:fixture.homeClubId;
  const ids=new Set(p.universeSnapshot!.players.filter(player=>player.clubId===rival).map(player=>player.id));
  for(const person of Object.values(p.worldMarket!.population!.people))if(ids.has(person.id))person.energy=30;
  p.minute=59;p.matchRunning=false;p.halftimeWaiting=false;p.detailOpen=false;
  expect(writeLocalSaves([save],"alice")).toBe(true);
  const {cacheCareerSaves}=await import("@/lib/importer/database-cache");await cacheCareerSaves([save],"alice");
  sessionStorage.clear();view=render(game());
  fireEvent.click(await screen.findByRole("button",{name:/CONTINUAR JOGANDO/}));
  fireEvent.click(await screen.findByRole("button",{name:"CONTINUAR"}));
  fireEvent.click(await screen.findByRole("button",{name:/Continuar/}));
  await waitFor(()=>expect(readLocalSaves("alice")[0].progress?.matchPreparation?.cpu?.changes.some(c=>c.minute===60)).toBe(true),{timeout:10000});
  view.unmount();
  const snapshot=readLocalSaves("alice")[0].progress!,cpu=structuredClone(snapshot.matchPreparation!.cpu!);
  expect(cpu.reviewed).toContain(60);expect(cpu.changes.length).toBeLessThanOrEqual(5);
  for(const c of cpu.changes.filter(c=>c.minute===60))expect(snapshot.events.some(e=>e.team==="away" && e.substitution?.outId===Number(c.out) && e.substitution.inId===Number(c.in))).toBe(true);
  sessionStorage.clear();render(game());
  fireEvent.click(await screen.findByRole("button",{name:/CONTINUAR JOGANDO/}));
  fireEvent.click(await screen.findByRole("button",{name:"CONTINUAR"}));
  await screen.findByText("PARTIDA PAUSADA");
  expect(readLocalSaves("alice")[0].progress?.matchPreparation?.cpu).toEqual(cpu);
},120_000);

it("opens messages from career navigation and restores read receipts after reload", async () => {
  const view=render(game());
  fireEvent.click(await screen.findByRole("button",{name:/INICIAR NOVA CARREIRA/}));
  fireEvent.change(screen.getByPlaceholderText("Seu nome"),{target:{value:"Gestor da caixa"}});
  fireEvent.click(screen.getByRole("button",{name:/Iniciar jogo/}));
  fireEvent.click(await screen.findByRole("button",{name:"Mensagens"}));
  const dialog=await screen.findByRole("dialog",{name:"Mensagens"});
  const message=within(dialog).getByRole("button",{name:/Objetivo para o trabalho/});
  fireEvent.click(message);
  await waitFor(()=>expect(readLocalSaves("alice")[0].progress?.messageReadIds).toHaveLength(1));
  const receipts=readLocalSaves("alice")[0].progress!.messageReadIds;
  view.unmount();render(game());
  const restored=await screen.findByRole("dialog",{name:"Mensagens"});
  expect(within(restored).getByRole("button",{name:/Objetivo para o trabalho/}).getAttribute("aria-label")).not.toContain("Não lida");
  expect(readLocalSaves("alice")[0].progress?.messageReadIds).toEqual(receipts);
});
