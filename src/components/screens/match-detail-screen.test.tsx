// @vitest-environment jsdom
import { useState, type ComponentProps } from "react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { squad, buildStartingXI } from "@/lib/game/mock-data";
import { MatchDetailScreen } from "./match-detail-screen";
const ids = buildStartingXI("4-3-3", squad);
const starters = ids.map((id) => squad.find((p) => p.id === id)!);
const bench = squad.filter((p) => !ids.includes(p.id));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeAll(() => { if (!window.PointerEvent) window.PointerEvent = MouseEvent as typeof PointerEvent; });
function setup(overrides: Partial<ComponentProps<typeof MatchDetailScreen>> = {}) {
  const place = vi.fn(), substitute = vi.fn(), change = vi.fn(), close = vi.fn(), reset = vi.fn();
  function Wrapper() {
    const [selected, select] = useState<number | null>(null);
    const [out, setOut] = useState<number | null>(null);
    return <MatchDetailScreen club="Flamengo" opponent="Palmeiras" homeScore={2} awayScore={1} minute={35}
      formation="4-3-3" setFormation={change} startersData={starters} bench={bench}
      events={[{ minute: 12, half: 1, text: "Gol do Flamengo" }]} possession={56} shots={7} onGoal="4/3" tackles={8} passErrors={5}
      style="Equilibrado" setStyle={change} marking="Normal" setMarking={change} focus="Pelo meio" setFocus={change}
      substitutionsLeft={5} selectedPlayer={selected} substitutionOut={out}
      onSelectPlayer={(id) => {
        if (id === null) { select(null); setOut(null); }
        else if (ids.includes(id)) { setOut(id); select((current) => current !== null && !ids.includes(current) ? current : id); }
        else select(id);
      }}
      onSubstitute={substitute} onClose={close} isHalftime={false} manualPositions={{}}
      onPlacePlayer={place} onResetPositions={reset} {...overrides} />;
  }
  const view = render(<Wrapper />);
  return { ...view, place, substitute, change, close, reset };
}
const starter = (index = 0) => screen.getByRole("button", { name: new RegExp(`${starters[index].name}, camisa`) });
const reserve = (index = 0) => screen.getByRole("button", { name: new RegExp(bench[index].name) });
it("reuses the modern board, numbered jerseys and full bench, retaining match information", () => {
  setup();
  expect(screen.getByRole("dialog", { name: "Táticas da partida" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Táticas da partida" })).toBeTruthy();
  expect(screen.getByLabelText("Campo de escalação")).toBeTruthy();
  expect(document.querySelectorAll('[data-slot]').length).toBe(11);
  expect(document.querySelectorAll('button[class*="reserve"]').length).toBe(bench.length);
  expect(screen.getAllByText("2 × 1").length).toBe(2);
  expect(screen.getByText("35′ · PAUSADO")).toBeTruthy();
  expect(screen.getByText("Gol do Flamengo")).toBeTruthy();
  expect(screen.getByText("56%")).toBeTruthy();
  expect((screen.getByLabelText("Mostrar setores") as HTMLInputElement).checked).toBe(false);
  expect(screen.queryByRole("button", { name: /Ir para a partida/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Voltar ao clube/ })).toBeNull();
});
it("prepares substitutions in either selection order and requires explicit confirmation", () => {
  const { substitute, place } = setup();
  fireEvent.click(reserve());
  fireEvent.click(starter());
  expect(substitute).not.toHaveBeenCalled();
  expect(place).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar substituição" }));
  expect(substitute).toHaveBeenCalledWith(bench[0].id, undefined);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar troca" }));
  expect(screen.queryByRole("button", { name: "Confirmar substituição" })).toBeNull();
  fireEvent.click(starter(1));
  fireEvent.click(reserve(1));
  expect(screen.getByText(starters[1].name, { selector: 'p b' })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar substituição" }));
  expect(substitute).toHaveBeenLastCalledWith(bench[1].id, undefined);
});
it("keeps free positioning and tactical controls separate from substitutions", () => {
  const { place, substitute, change, reset, close } = setup();
  fireEvent.click(screen.getByLabelText("Mostrar setores"));
  fireEvent.click(starter());
  fireEvent.click(screen.getByRole("button", { name: "Posicionar em Centroavante esquerdo" }));
  expect(place).toHaveBeenCalledWith(starters[0].id, 0, expect.objectContaining({ left: 38, top: 9 }));
  expect(substitute).not.toHaveBeenCalled();
  for (const [label, value] of [["Esquema tático", "4-4-2"], ["Estilo de jogo", "Ofensivo"], ["Marcação / pressão", "Pesada"], ["Concentração de ataque", "Pelas laterais"]]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(change).toHaveBeenCalledWith(value);
  }
  fireEvent.click(screen.getByRole("button", { name: "Restaurar posições" }));
  expect(reset).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: /Voltar ao jogo/ }));
  expect(close).toHaveBeenCalledOnce();
});
it("prepares a dragged reserve without committing it and retains the requested free coordinate", () => {
  const { place, substitute } = setup();
  const field = screen.getByLabelText("Campo de escalação");
  vi.spyOn(field, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, right: 500, bottom: 700, width: 500, height: 700 } as DOMRect);
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: vi.fn(() => field) });
  const handle = reserve().querySelector('[data-player]')!;
  fireEvent.pointerDown(handle, { isPrimary: true, pointerId: 1, button: 0, clientX: 530, clientY: 300 });
  fireEvent.pointerMove(field, { isPrimary: true, pointerId: 1, clientX: 210, clientY: 420 });
  fireEvent.pointerUp(field, { isPrimary: true, pointerId: 1, clientX: 210, clientY: 420 });
  expect(place).not.toHaveBeenCalled();
  expect(substitute).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar substituição" }));
  expect(substitute).toHaveBeenCalledWith(bench[0].id, { left: 42, top: 60 });
});
it("blocks reserve deployment at the limit while allowing starter positioning and displays halftime", () => {
  const { place, substitute } = setup({ substitutionsLeft: 0, isHalftime: true });
  expect(screen.getByText("Intervalo · PAUSADO")).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Mostrar setores"));
  fireEvent.click(reserve());
  fireEvent.click(screen.getByRole("button", { name: "Posicionar em Centroavante esquerdo" }));
  expect(screen.getByRole("status").textContent).toContain("Sem substituições restantes");
  expect(place).not.toHaveBeenCalled();
  fireEvent.click(starter());
  expect((screen.getByRole("button", { name: "Confirmar substituição" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar troca" }));
  fireEvent.click(starter());
  fireEvent.click(screen.getByRole("button", { name: "Posicionar em Centroavante esquerdo" }));
  expect(place).toHaveBeenCalledOnce();
  expect(substitute).not.toHaveBeenCalled();
});
it("inherits registered club colors and restores focus when leaving the match dialog", () => {
  const opener = document.createElement("button"); document.body.append(opener); opener.focus();
  const { unmount } = setup({ clubColors: { primaryColor: "#342acd", secondaryColor: "#eeeeee" } });
  const dialog = screen.getByRole("dialog");
  expect(document.activeElement).toBe(dialog);
  expect(dialog.firstElementChild?.getAttribute("style")).toContain("--team-primary: #342acd");
  unmount(); expect(document.activeElement).toBe(opener); opener.remove();
});
