// @vitest-environment jsdom
import { useState, type ComponentProps } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { squad, buildStartingXI } from "@/lib/game/mock-data";
import { MatchDetailScreen } from "./match-detail-screen";

const ids = buildStartingXI("4-3-3", squad);
const starters = ids.map((id) => squad.find((player) => player.id === id)!);
const bench = squad.filter((player) => !ids.includes(player.id));
const stats = {
  home: { possession: 55, shots: 4, shotsOnTarget: 2, passes: 16, passesCompleted: 13, tackles: 3, fouls: 1, offsides: 0, yellowCards: 1, redCards: 0 },
  away: { possession: 45, shots: 3, shotsOnTarget: 1, passes: 14, passesCompleted: 9, tackles: 2, fouls: 2, offsides: 1, yellowCards: 0, redCards: 0 },
};
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function setup(overrides: Partial<ComponentProps<typeof MatchDetailScreen>> = {}) {
  const substitute = vi.fn(), change = vi.fn(), close = vi.fn(), startSecondHalf = vi.fn(), movePlayers = vi.fn();
  function Wrapper() {
    const [selected, select] = useState<number | null>(null);
    const [out, setOut] = useState<number | null>(null);
    return <MatchDetailScreen club="Flamengo" opponent="Palmeiras" homeScore={2} awayScore={1} minute={35}
      formation="4-3-3" setFormation={change} style="Equilibrado" setStyle={vi.fn()} marking="Leve" setMarking={vi.fn()} focus="Pelo meio" setFocus={vi.fn()}
      statistics={stats} manualPositions={{}} onMovePlayers={movePlayers} startersData={starters} bench={bench}
      substitutionsLeft={5} selectedPlayer={selected} substitutionOut={out}
      onSelectPlayer={(id) => {
        if (id === null) { select(null); setOut(null); }
        else if (ids.includes(id)) { setOut(id); select((current) => current !== null && !ids.includes(current) ? current : id); }
        else select(id);
      }} onSubstitute={substitute} onClose={close} onStartSecondHalf={startSecondHalf} isHalftime={false} {...overrides} />;
  }
  return { ...render(<Wrapper />), substitute, change, close, startSecondHalf, movePlayers };
}
const starter = (index = 0) => screen.getByRole("button", { name: new RegExp(`${starters[index].name}, camisa`) });
const reserve = (index = 0) => screen.getByRole("button", { name: new RegExp(`${bench[index].name},`) });

it("shows a tactics modal with the live pitch, reserves, team statistics and match controls", () => {
  setup();
  expect(screen.getByRole("dialog", { name: "Táticas" })).toBeTruthy();
  expect(screen.getByLabelText("Campo de escalação")).toBeTruthy();
  expect(document.querySelectorAll('[data-slot]')).toHaveLength(11);
  expect(document.querySelectorAll('[data-reserve]')).toHaveLength(bench.length);
  expect(screen.getByRole("heading", { name: "ESCALAR TIME · 4-3-3" })).toBeTruthy();
  expect(screen.getByText("2 × 1")).toBeTruthy();
  expect(screen.getByText("Posse de bola")).toBeTruthy();
  expect(screen.getByText("Passes certos")).toBeTruthy();
  expect(screen.getByLabelText("Formação")).toBeTruthy();
  expect(screen.getByLabelText("Estilo de jogo")).toBeTruthy();
  expect(screen.getByLabelText("Marcação / pressão")).toBeTruthy();
  expect(screen.getByLabelText("Concentração de ataque")).toBeTruthy();
});

it.each([false, true])("uses the same free-placement sector controls during play and halftime (%s)", (isHalftime) => {
  const place = vi.fn();
  setup({ isHalftime, onPlacePlayer: place });
  fireEvent.click(screen.getByLabelText("Mostrar setores"));
  fireEvent.click(starter());
  fireEvent.click(screen.getByRole("button", { name: "Posicionar em Meia esquerda" }));
  expect(place).toHaveBeenCalledWith(starters[0].id, expect.any(Number), expect.objectContaining({ left: 10, top: 43 }));
});

it("requires explicit substitution confirmation in either selection order and can cancel", () => {
  const { substitute } = setup();
  const confirm = screen.getByRole("button", { name: "Confirmar substituição" }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  fireEvent.click(reserve()); fireEvent.click(starter());
  expect(screen.getByText("Sai")).toBeTruthy();
  expect(reserve().getAttribute("aria-pressed")).toBe("true");
  expect(substitute).not.toHaveBeenCalled();
  fireEvent.click(confirm); expect(substitute).toHaveBeenCalledWith(bench[0].id);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar troca" }));
  expect(confirm.disabled).toBe(true);
  fireEvent.click(starter(1)); fireEvent.click(reserve(1)); fireEvent.click(confirm);
  expect(substitute).toHaveBeenLastCalledWith(bench[1].id);
});

it("applies formation, style, marking and focus without consuming a substitution", () => {
  const { change, substitute } = setup();
  fireEvent.change(screen.getByLabelText("Formação"), { target: { value: "4-4-2" } });
  expect(change).toHaveBeenCalledWith("4-4-2");
  expect(substitute).not.toHaveBeenCalled();
});

it("reuses the pre-match lineup at halftime and blocks substitutions at the limit", () => {
  const { change, substitute, startSecondHalf } = setup({ substitutionsLeft: 0, isHalftime: true });
  expect(screen.getByRole("heading", { name: "ESCALAR TIME · 4-3-3" })).toBeTruthy();
  expect(screen.getByRole("checkbox", { name: "Mostrar setores" })).toBeTruthy();
  const reserveButton = document.querySelector(`[data-reserve="${bench[0].id}"]`) as HTMLButtonElement;
  expect(reserveButton.disabled).toBe(true);
  fireEvent.click(reserveButton);
  fireEvent.change(screen.getByLabelText("Formação"), { target: { value: "4-4-2" } });
  expect(change).toHaveBeenCalledWith("4-4-2");
  expect(substitute).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Iniciar 2º tempo →" }));
  expect(startSecondHalf).toHaveBeenCalledOnce();
});

it("requires confirmation for halftime substitutions on the shared lineup", () => {
  const { substitute } = setup({ isHalftime: true });
  fireEvent.click(document.querySelector(`button[data-player="${starters[0].id}"]`)!);
  fireEvent.click(document.querySelector(`[data-reserve="${bench[0].id}"]`)!);
  expect(substitute).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar substituição" }));
  expect(substitute).toHaveBeenCalledWith(bench[0].id);
});

it("closes through Escape, backdrop, close and return without committing a pending change", () => {
  const { close, substitute } = setup();
  fireEvent.click(starter()); fireEvent.click(reserve());
  const dialog = screen.getByRole("dialog");
  fireEvent.click(dialog); expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Fechar táticas" }));
  fireEvent.click(screen.getByRole("button", { name: "Voltar ao jogo" }));
  fireEvent.keyDown(dialog, { key: "Escape" });
  fireEvent.click(dialog.parentElement!);
  expect(close).toHaveBeenCalledTimes(4); expect(substitute).not.toHaveBeenCalled();
});

it("restores focus and page scrolling on unmount and uses registered kit colors", () => {
  const opener = document.createElement("button"); document.body.append(opener); opener.focus();
  document.body.style.overflow = "auto";
  const { unmount } = setup({ clubColors: { primaryColor: "#342acd", secondaryColor: "#eeeeee" } });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fechar táticas" }));
  expect(document.body.style.overflow).toBe("hidden");
  expect(screen.getByRole("dialog", { name: "Táticas" }).getAttribute("style")).toContain("--team-primary: #342acd");
  unmount(); expect(document.activeElement).toBe(opener); expect(document.body.style.overflow).toBe("auto");
  opener.remove(); document.body.style.overflow = "";
});

it("handles an empty bench without allowing a substitution", () => {
  setup({ bench: [] });
  expect(screen.getByText("Nenhum reserva para este filtro.")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Confirmar substituição" }) as HTMLButtonElement).disabled).toBe(true);
});
