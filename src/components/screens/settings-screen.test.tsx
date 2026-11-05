// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SettingsScreen } from "./settings-screen";
afterEach(cleanup);
it("exposes game speed presets and session actions, but no external import controls", () => {
  const speed = vi.fn(), menu = vi.fn(), back = vi.fn();
  render(<SettingsScreen club="Corinthians" coach="Treinador" speed={2} onSpeedChange={speed} onMenu={menu} onBackToClub={back} />);
  expect(screen.getByRole("button", { name: "2× Dinâmico" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "4× Acelerado" }));
  expect(speed).toHaveBeenCalledWith(4);
  fireEvent.click(screen.getByRole("button", { name: "Voltar ao menu inicial" }));
  expect(menu).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Continuar no clube" }));
  expect(back).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: /importação|Consultar API/ })).toBeNull();
  expect(screen.getByText(/Alterações de equipes e elencos/)).toBeTruthy();
});
