// @vitest-environment jsdom
import { useState, type ComponentProps } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { squad, buildStartingXI } from "@/lib/game/mock-data";
import { MatchDetailScreen } from "./match-detail-screen";
const ids = buildStartingXI("4-3-3", squad);
const starters = ids.map((id) => squad.find((p) => p.id === id)!);
const bench = squad.filter((p) => !ids.includes(p.id));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function setup(overrides: Partial<ComponentProps<typeof MatchDetailScreen>> = {}) {
  const substitute = vi.fn(), change = vi.fn(), close = vi.fn();
  function Wrapper() {
    const [selected, select] = useState<number | null>(null);
    const [out, setOut] = useState<number | null>(null);
    return <MatchDetailScreen club="Flamengo" opponent="Palmeiras" homeScore={2} awayScore={1} minute={35}
      formation="4-3-3" setFormation={change} startersData={starters} bench={bench}
      substitutionsLeft={5} selectedPlayer={selected} substitutionOut={out}
      onSelectPlayer={(id) => {
        if (id === null) { select(null); setOut(null); }
        else if (ids.includes(id)) { setOut(id); select((current) => current !== null && !ids.includes(current) ? current : id); }
        else select(id);
      }} onSubstitute={substitute} onClose={close} isHalftime={false} {...overrides} />;
  }
  return { ...render(<Wrapper />), substitute, change, close };
}
const starter = (index = 0) => screen.getByRole("button", { name: new RegExp(`Sai: ${starters[index].name},`) });
const reserve = (index = 0) => screen.getByRole("button", { name: new RegExp(`Entra: ${bench[index].name},`) });
it("shows a focused modal with formation and substitution lists, not the full lineup screen", () => {
  setup();
  expect(screen.getByRole("dialog", { name: "Táticas da partida" })).toBeTruthy();
  expect(document.querySelectorAll('[data-starter]')).toHaveLength(11);
  expect(document.querySelectorAll('[data-reserve]')).toHaveLength(bench.length);
  expect(screen.getByText(/35′/)).toBeTruthy();
  expect(screen.getByText("2 × 1")).toBeTruthy();
  expect(screen.queryByLabelText("Campo de escalação")).toBeNull();
  expect(screen.queryByText("Plano tático")).toBeNull();
  expect(screen.queryByText("Estatísticas e lances")).toBeNull();
  expect(screen.queryByText("Melhores momentos")).toBeNull();
  expect(screen.getAllByRole("combobox")).toHaveLength(1);
});
it("requires explicit confirmation in either selection order and can cancel", () => {
  const { substitute } = setup();
  const confirm = screen.getByRole("button", { name: "Confirmar substituição" }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  fireEvent.click(reserve()); fireEvent.click(starter());
  expect(starter().getAttribute("aria-pressed")).toBe("true");
  expect(reserve().getAttribute("aria-pressed")).toBe("true");
  expect(substitute).not.toHaveBeenCalled();
  fireEvent.click(confirm); expect(substitute).toHaveBeenCalledWith(bench[0].id);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar troca" }));
  expect(confirm.disabled).toBe(true);
  fireEvent.click(starter(1)); fireEvent.click(reserve(1)); fireEvent.click(confirm);
  expect(substitute).toHaveBeenLastCalledWith(bench[1].id);
});
it("applies formation independently without consuming a substitution", () => {
  const { change, substitute } = setup();
  fireEvent.change(screen.getByLabelText("Formação"), { target: { value: "4-4-2" } });
  expect(change).toHaveBeenCalledWith("4-4-2"); expect(substitute).not.toHaveBeenCalled();
});
it("blocks substitutions at the limit but keeps formation available and shows halftime", () => {
  const { change, substitute } = setup({ substitutionsLeft: 0, isHalftime: true });
  expect(screen.getByText(/Intervalo/)).toBeTruthy();
  expect((reserve() as HTMLButtonElement).disabled).toBe(true);
  expect((starter() as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(reserve()); fireEvent.click(starter());
  fireEvent.change(screen.getByLabelText("Formação"), { target: { value: "4-4-2" } });
  expect(change).toHaveBeenCalledWith("4-4-2"); expect(substitute).not.toHaveBeenCalled();
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
  expect(screen.getByRole("dialog").getAttribute("style")).toContain("--team-primary: #342acd");
  unmount(); expect(document.activeElement).toBe(opener); expect(document.body.style.overflow).toBe("auto");
  opener.remove(); document.body.style.overflow = "";
});
it("handles an empty bench without allowing a substitution", () => {
  setup({ bench: [] });
  expect(screen.getByText("Não há reservas disponíveis.")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Confirmar substituição" }) as HTMLButtonElement).disabled).toBe(true);
});
