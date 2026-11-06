// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LoadingScreen } from "./loading-screen";

afterEach(cleanup);
it.each([
  ["game", "Preparando o jogo"],
  ["careers", "Carregando suas carreiras..."],
  ["career", "Carregando a carreira selecionada..."],
] as const)("announces the actual %s phase with a simple loading indicator", (phase, label) => {
  const { container } = render(<LoadingScreen phase={phase} />);
  expect(screen.getByRole("status").textContent).toBe(label);
  expect(container.querySelector('[data-loading-phase]')?.getAttribute("data-loading-phase")).toBe(phase);
  expect(container.querySelector('img[src="/game-assets/branding/logo-simbolo.png"]')).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});
it("uses the game preparation phase by default", () => {
  render(<LoadingScreen />);
  expect(screen.getByRole("status").textContent).toBe("Preparando o jogo");
});
