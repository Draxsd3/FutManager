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
});
