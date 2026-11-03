// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { AppShell } from "./app-shell";
afterEach(cleanup);
it("uses the editor's club colors for custom clubs instead of silently defaulting to Palmeiras", () => {
  const { container } = render(
    <AppShell
      teamName="Clube sem camisa"
      clubColors={{ primaryColor: "#cc0000", secondaryColor: "#000000" }}
      nav={[]}
      date="Teste"
      hideNav
    >
      <p>Elenco</p>
    </AppShell>,
  );
  const shell = container.firstElementChild as HTMLElement;
  expect(shell.style.getPropertyValue("--team-primary")).toBe("#cc0000");
  expect(shell.style.getPropertyValue("--team-secondary")).toBe("#000000");
  expect(shell.style.getPropertyValue("--team-text")).toBe("#ffffff");
  expect(shell.style.getPropertyValue("--team-accent")).not.toBe("#c4f06a");
  expect(shell.style.getPropertyValue("--game-accent")).toBe("#a2dfb2");
  expect(shell.style.getPropertyValue("--game-accent-text")).toBe("#10291a");
});

it("uses a neutral silver accent for monochrome clubs and still honors their official kit colors", () => {
  const { container } = render(<AppShell teamName="Corinthians" nav={[]} date="Hoje" hideNav><p>Carreira</p></AppShell>);
  const shell = container.firstElementChild as HTMLElement;
  expect(shell.style.getPropertyValue("--team-primary")).toBe("#ece8df");
  expect(shell.style.getPropertyValue("--team-secondary")).toBe("#111111");
  expect(shell.style.getPropertyValue("--team-accent")).toBe("#c5cad4");
});
