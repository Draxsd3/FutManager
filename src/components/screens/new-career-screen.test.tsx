// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { NewCareerScreen } from "./new-career-screen";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import type { DivisionKey } from "@/lib/game/mock-data";

afterEach(cleanup);
function Fixture() {
  const initial = createDefaultDatabase().clubs;
  const clubs = [
    { ...initial[0], name: "Palmeiras", division: "Série A" as const },
    { ...initial[1], name: "Clube customizado", division: "Série A" as const },
    { ...initial[2], name: "Outro clube", division: "Série B" as const },
  ];
  const [division, setDivision] = useState<DivisionKey>("Série A");
  const [club, setClub] = useState("Palmeiras");
  return <NewCareerScreen coach="Teste" setCoach={vi.fn()} division={division} setDivision={setDivision} club={club} setClub={setClub} onStart={vi.fn()} onBack={vi.fn()} availableClubs={clubs} />;
}
it("mostra escudos na seleção e aceita clubes personalizados", () => {
  render(<Fixture />);
  const selector = screen.getByRole("combobox", { name: /Seu clube Palmeiras/ });
  expect(within(selector).getByAltText("Escudo do Palmeiras")).toBeTruthy();
  fireEvent.click(selector);
  const options = within(screen.getByRole("listbox", { name: "Seu clube" }));
  expect(options.getByRole("option", { name: "Palmeiras", selected: true })).toBeTruthy();
  expect(options.getByAltText("Escudo do Palmeiras")).toBeTruthy();
  expect(options.getByLabelText("Escudo do Clube customizado")).toBeTruthy();
  fireEvent.click(options.getByRole("option", { name: "Clube customizado" }));
  expect(screen.getByRole("combobox", { name: /Seu clube Clube customizado/ })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Clube customizado" })).toBeTruthy();
  expect(screen.queryByRole("listbox")).toBeNull();
});
it("permite navegar por teclado, cancelar e mudar de divisão", () => {
  render(<Fixture />);
  const selector = screen.getByRole("combobox", { name: /Seu clube Palmeiras/ });
  fireEvent.keyDown(selector, { key: "ArrowDown" });
  fireEvent.keyDown(selector, { key: "ArrowDown" });
  fireEvent.keyDown(selector, { key: "Enter" });
  expect(screen.getByRole("heading", { name: "Clube customizado" })).toBeTruthy();
  const selected = screen.getByRole("combobox", { name: /Seu clube Clube customizado/ });
  fireEvent.keyDown(selected, { key: "ArrowDown" });
  fireEvent.keyDown(selected, { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
  fireEvent.change(screen.getByLabelText("Divisão"), { target: { value: "Série B" } });
  fireEvent.click(screen.getByRole("combobox", { name: /Seu clube Outro clube/ }));
  expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1);
});
