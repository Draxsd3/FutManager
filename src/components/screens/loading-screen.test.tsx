// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LoadingScreen } from "./loading-screen";

afterEach(cleanup);
it.each([
  ["game", "Preparando o jogo"],
  ["careers", "Carregando suas carreiras..."],
  ["career", "Carregando a carreira selecionada..."],
] as const)("announces the actual %s phase without inventing progress", (phase, label) => {
  const { container } = render(<LoadingScreen phase={phase} />);
  expect(screen.getByRole("status").textContent).toBe(label);
  const progress = screen.getByRole("progressbar", { name: label });
  expect(progress.hasAttribute("aria-valuenow")).toBe(false);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Grandes histórias.");
  expect(container.querySelector('[aria-hidden="true"] svg')).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
it("uses the game preparation phase by default", () => {
  render(<LoadingScreen />);
  expect(screen.getByRole("status").textContent).toBe("Preparando o jogo");
});
