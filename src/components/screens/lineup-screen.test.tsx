// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { squad, buildStartingXI, type Player } from "@/lib/game/mock-data";
import { LineupScreen } from "./lineup-screen";
const ids = buildStartingXI("4-3-3", squad);
const starters = ids.map((id) => squad.find((p) => p.id === id)!);
const bench = squad.filter((p) => !ids.includes(p.id));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeAll(() => {
  if (!window.PointerEvent)
    window.PointerEvent = MouseEvent as typeof PointerEvent;
});
function setup() {
  const place = vi.fn(),
    reset = vi.fn(),
    play = vi.fn(),
    change = vi.fn();
  function Wrapper() {
    const [selected, select] = useState<Player | null>(null);
    return (
      <LineupScreen
        club="Flamengo"
        coach="Renan"
        opponent="Palmeiras"
        competition="Série A"
        round={1}
        formation="4-3-3"
        setFormation={change}
        style="Equilibrado"
        setStyle={change}
        marking="Leve"
        setMarking={change}
        focus="Pelo meio"
        setFocus={change}
        startersData={starters}
        bench={bench}
        selectedPlayer={selected}
        onSelectPlayer={(id) => select(squad.find((p) => p.id === id) ?? null)}
        onPlacePlayer={place}
        onPlay={play}
        onBack={vi.fn()}
        manualPositions={{}}
        onResetPositions={reset}
      />
    );
  }
  render(<Wrapper />);
  return { place, reset, play, change };
}
const starterButton = (index: number) =>
  screen.getByRole("button", {
    name: new RegExp(`${starters[index].name}, camisa`),
  });
it("uses numbered shirts, not photos, and exposes every sector", () => {
  setup();
  expect(screen.queryByText("Adicionar foto")).toBeNull();
  expect(document.querySelector('input[type="file"]')).toBeNull();
  expect(document.querySelector('img[alt^="Foto"]')).toBeNull();
  expect(starterButton(0).querySelector("svg text")?.textContent).toBe(
    String(starters[0].shirtNumber ?? starters[0].id),
  );
  expect(screen.queryByRole("button", { name: /Posicionar em/ })).toBeNull();
  expect(
    (screen.getByLabelText("Mostrar setores") as HTMLInputElement).checked,
  ).toBe(false);
  fireEvent.click(screen.getByLabelText("Mostrar setores"));
  expect(screen.getAllByRole("button", { name: /Posicionar em/ })).toHaveLength(
    20,
  );
  fireEvent.click(screen.getByLabelText("Mostrar setores"));
  expect(screen.queryByRole("button", { name: /Posicionar em/ })).toBeNull();
});
it("supports click/keyboard-compatible selection, sector movement and unrestricted keeper swaps", () => {
  const { place } = setup();
  fireEvent.click(screen.getByLabelText("Mostrar setores"));
  fireEvent.click(starterButton(0));
  fireEvent.click(
    screen.getByRole("button", { name: "Posicionar em Meia esquerda" }),
  );
  expect(place).toHaveBeenLastCalledWith(
    starters[0].id,
    0,
    expect.objectContaining({ left: 10, top: 43 }),
  );
  fireEvent.click(starterButton(1));
  expect(place).toHaveBeenLastCalledWith(starters[0].id, 1, undefined);
  place.mockClear();
  fireEvent.click(
    screen.getByRole("button", { name: "Posicionar em Goleiro" }),
  );
  expect(place).toHaveBeenCalledWith(
    starters[0].id,
    0,
    expect.objectContaining({ left: 50, top: 95 }),
  );
  place.mockClear();
  fireEvent.keyDown(
    screen.getByRole("heading", { name: "Escalação & Tática" }),
    { key: "Escape" },
  );
  fireEvent.click(starterButton(10));
  fireEvent.click(
    screen.getByRole("button", { name: "Posicionar em Centroavante esquerdo" }),
  );
  expect(place).toHaveBeenCalledWith(
    starters[10].id,
    10,
    expect.objectContaining({ left: 38, top: 9 }),
  );
});
it("filters reserves and restores positions without changing tactical controls", () => {
  const { reset, change, play } = setup();
  fireEvent.change(screen.getByLabelText("Buscar reserva"), {
    target: { value: "sem atleta" },
  });
  expect(screen.getByText("Nenhum reserva para este filtro.")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Buscar reserva"), {
    target: { value: "" },
  });
  fireEvent.change(screen.getByLabelText("Filtrar setor"), {
    target: { value: "G" },
  });
  expect(document.querySelectorAll('button[class*="reserve"]').length).toBe(
    bench.filter((p) => p.position === "G").length,
  );
  fireEvent.click(screen.getByRole("button", { name: "Restaurar posições" }));
  expect(reset).toHaveBeenCalledOnce();
  fireEvent.change(screen.getByLabelText("Estilo de jogo"), {
    target: { value: "Ofensivo" },
  });
  expect(change).toHaveBeenCalledWith("Ofensivo");
  fireEvent.click(screen.getByRole("button", { name: /Ir para a partida/ }));
  expect(play).toHaveBeenCalledOnce();
});
it("handles pointer drag onto a shirt and cancels outside/cancelled gestures without mutations", () => {
  const { place } = setup();
  const field = screen.getByLabelText("Campo de escalação");
  vi.spyOn(field, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: 500,
    bottom: 700,
    width: 500,
    height: 700,
  } as DOMRect);
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: vi.fn(() => starterButton(1)),
  });
  fireEvent.pointerDown(starterButton(0), {
    isPrimary: true,
    pointerId: 1,
    button: 0,
    clientX: 100,
    clientY: 100,
  });
  fireEvent.pointerMove(field, {
    isPrimary: true,
    pointerId: 1,
    clientX: 300,
    clientY: 110,
  });
  fireEvent.pointerUp(field, {
    isPrimary: true,
    pointerId: 1,
    clientX: 300,
    clientY: 110,
  });
  expect(place).toHaveBeenCalledWith(starters[0].id, 1, undefined);
  place.mockClear();
  fireEvent.pointerDown(starterButton(0), {
    isPrimary: true,
    pointerId: 1,
    button: 0,
    clientX: 100,
    clientY: 100,
  });
  fireEvent.pointerMove(field, {
    isPrimary: true,
    pointerId: 1,
    clientX: 300,
    clientY: 110,
  });
  fireEvent.pointerCancel(field, {
    isPrimary: true,
    pointerId: 1,
    clientX: 300,
    clientY: 110,
  });
  expect(place).not.toHaveBeenCalled();
  fireEvent.pointerDown(starterButton(0), {
    isPrimary: true,
    pointerId: 1,
    button: 0,
    clientX: 100,
    clientY: 100,
  });
  fireEvent.pointerMove(field, {
    isPrimary: true,
    pointerId: 1,
    clientX: 900,
    clientY: 800,
  });
  fireEvent.pointerUp(field, {
    isPrimary: true,
    pointerId: 1,
    clientX: 900,
    clientY: 800,
  });
  expect(place).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toContain(
    "Escalação preservada",
  );
});
it("drops on empty field coordinates and uses touch-sized movement threshold", () => {
  const { place } = setup();
  const field = screen.getByLabelText("Campo de escalação");
  vi.spyOn(field, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: 500,
    bottom: 700,
    width: 500,
    height: 700,
  } as DOMRect);
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: vi.fn(() => field),
  });
  fireEvent.pointerDown(starterButton(0), {
    isPrimary: true,
    pointerId: 1,
    button: 0,
    clientX: 100,
    clientY: 100,
  });
  fireEvent.pointerMove(field, {
    isPrimary: true,
    pointerId: 1,
    clientX: 102,
    clientY: 101,
  });
  fireEvent.pointerUp(field, {
    isPrimary: true,
    pointerId: 1,
    clientX: 102,
    clientY: 101,
  });
  expect(place).not.toHaveBeenCalled();
  fireEvent.pointerDown(starterButton(0), {
    isPrimary: true,
    pointerId: 1,
    button: 0,
    clientX: 100,
    clientY: 100,
  });
  fireEvent.pointerMove(field, {
    isPrimary: true,
    pointerId: 1,
    clientX: 250,
    clientY: 350,
  });
  // Touch starts with implicit capture on the shirt; transferring capture to the
  // screen must ignore the descendant's lostpointercapture event.
  fireEvent.lostPointerCapture(starterButton(0), {
    isPrimary: true,
    pointerId: 1,
  });
  fireEvent.pointerUp(field, {
    isPrimary: true,
    pointerId: 1,
    clientX: 250,
    clientY: 350,
  });
  expect(place).toHaveBeenCalledWith(starters[0].id, 0, { left: 50, top: 50 });
});

it("places a selected player at exact field coordinates while guides are off", () => {
  const { place } = setup();
  const field = screen.getByLabelText("Campo de escalação");
  vi.spyOn(field, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 500,
    height: 700,
  } as DOMRect);
  fireEvent.click(starterButton(10));
  fireEvent.click(field, { clientX: 100, clientY: 70 });
  expect(place).toHaveBeenCalledWith(starters[10].id, 10, {
    left: 20,
    top: 10,
  });
  expect(screen.queryByRole("button", { name: /Posicionar em/ })).toBeNull();
});
it("places reserve keepers at the nearest actual outfield location without snapping to goal", () => {
  const { place } = setup();
  const reserve = bench.find((p) => p.position === "G")!;
  fireEvent.click(
    screen.getByRole("button", { name: new RegExp(reserve.name) }),
  );
  fireEvent.click(screen.getByLabelText("Mostrar setores"));
  fireEvent.click(
    screen.getByRole("button", { name: "Posicionar em Centroavante esquerdo" }),
  );
  expect(place).toHaveBeenCalledWith(
    reserve.id,
    1,
    expect.objectContaining({ left: 38, top: 9 }),
  );
});
it("offers contiguous polygon targets for second striker, wingbacks and every center-back side without role restrictions", () => {
  const { place } = setup();
  fireEvent.click(screen.getByLabelText("Mostrar setores"));
  fireEvent.click(starterButton(0));
  const targets = [
    ["Segundo atacante", 50, 23],
    ["Ala esquerdo", 10, 64],
    ["Ala direito", 90, 64],
    ["Zagueiro esquerdo", 31, 80],
    ["Zaga central", 50, 80],
    ["Zagueiro direito", 69, 80],
  ] as const;
  for (const [name, left, top] of targets) {
    const target = screen.getByRole("button", {
      name: `Posicionar em ${name}`,
    });
    expect((target as HTMLElement).style.clipPath).toMatch(/^polygon\(/);
    expect(target.getAttribute("aria-disabled")).toBe("false");
    fireEvent.click(target);
    expect(place).toHaveBeenLastCalledWith(
      starters[0].id,
      0,
      expect.objectContaining({ left, top }),
    );
  }
});
