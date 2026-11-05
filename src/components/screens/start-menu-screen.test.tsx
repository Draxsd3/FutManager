// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CareerSave } from "@/lib/game/editor-data";
import { StartMenuScreen } from "./start-menu-screen";

afterEach(cleanup);

const sampleSave: CareerSave = {
  id: "save-1",
  name: "Carreira Alviverde",
  managerName: "Renan",
  clubId: "palmeiras",
  clubName: "Palmeiras",
  division: "Série A",
  round: 6,
  budget: 18500,
  inGameDate: "2026-02-14",
  updatedAt: "2026-11-04T20:00:00Z",
};

describe("StartMenuScreen (stadium-v3)", () => {
  it("renders the recreated football title screen with season pyramid overview when no career is saved", () => {
    const onNewGame = vi.fn();
    const onSaves = vi.fn();
    const onEdit = vi.fn();
    const onSignOut = vi.fn().mockResolvedValue(undefined);

    render(
      <StartMenuScreen
        email="treinador@futmanager.com"
        onSignOut={onSignOut}
        saveCount={0}
        syncLabel="Sincronizado com a nuvem"
        clubCount={706}
        playerCount={16040}
        onNewGame={onNewGame}
        onSaves={onSaves}
        onEdit={onEdit}
      />,
    );

    expect(document.querySelector('[data-menu-version="stadium-v3"]')).toBeTruthy();
    expect(document.querySelector('[data-menu-version="field-v2"]')).toBeNull();
    expect(
      screen.getByRole("heading", { level: 1 }).textContent?.replace(/\s+/g, " ").trim(),
    ).toBe("FUTMANAGER 26");
    expect(screen.queryByText(/90 MINUTOS/i)).toBeNull();
    expect(screen.queryByText(/O CAMPO ESTÁ PRONTO/i)).toBeNull();

    expect(screen.getByRole("status").textContent).toContain("Sincronizado com a nuvem");
    expect(screen.getByText(/706 clubes e 16\.040 atletas prontos no catálogo/)).toBeTruthy();
    expect(screen.getByText("Nenhuma carreira salva nesta conta.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
    expect(onNewGame).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: /CONTINUAR JOGANDO/ }));
    expect(onSaves).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: /EDITAR O UNIVERSO/ }));
    expect(onEdit).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("highlights the latest saved career with real club crest and supports direct resume alongside full saves list", async () => {
    const onContinueLatest = vi.fn().mockResolvedValue(true);
    const onSaves = vi.fn();

    render(
      <StartMenuScreen
        email="dev.renan@example.com"
        saveCount={2}
        syncLabel="Salvo localmente"
        latestSave={sampleSave}
        latestClubColor="#006437"
        onContinueLatest={onContinueLatest}
        onNewGame={vi.fn()}
        onSaves={onSaves}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Última carreira salva")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Escudo do Palmeiras" })).toBeTruthy();
    expect(screen.getByText("Técnico · Renan")).toBeTruthy();
    expect(screen.getByText("6ª rodada")).toBeTruthy();
    expect(screen.getByText("2 carreiras salvas prontas para continuar.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Retomar Palmeiras/ }));
    await waitFor(() => expect(onContinueLatest).toHaveBeenCalledWith(sampleSave));
    expect(onSaves).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /CONTINUAR JOGANDO/ }));
    expect(onSaves).toHaveBeenCalledOnce();
  });

  it("renders the unauthenticated public entry cleanly without inventing database counts", () => {
    const onLogin = vi.fn();

    render(
      <StartMenuScreen
        saveCount={0}
        syncLabel="Entre para salvar e continuar suas carreiras"
        onLogin={onLogin}
        onNewGame={onLogin}
        onSaves={onLogin}
        onEdit={onLogin}
      />,
    );

    expect(screen.getByText("Entre para acessar suas carreiras.")).toBeTruthy();
    expect(screen.getByText("Séries A, B, C e D, Copa do Brasil e Estaduais")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Entrar / Criar conta" }));
    expect(onLogin).toHaveBeenCalledOnce();
  });
});
