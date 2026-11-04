// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { CareerWorkspace } from "./career-workspace";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function Example() {
  const [open, setOpen] = useState(false);
  return <CareerWorkspace nav={[{ label: "Times", icon: "house", onClick: () => setOpen(true) }]}
    date="22/01/2026" teamName="Corinthians" title={open ? "Times" : undefined} onClose={() => setOpen(false)}
    background={<p data-testid="roster">Elenco principal preservado</p>}>
    <button>Último controle</button>
  </CareerWorkspace>;
}

it("opens a named modal above an inert roster and closes via X or Escape, restoring focus", () => {
  render(<Example />);
  const roster = screen.getByTestId("roster");
  const opener = screen.getByRole("button", { name: "Times" });
  opener.focus();
  fireEvent.click(opener);
  const dialog = screen.getByRole("dialog", { name: "Times" });
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  expect(roster.closest('[inert]')?.getAttribute("aria-hidden")).toBe("true");
  expect(screen.getByTestId("roster")).toBe(roster);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fechar Times" }));
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
  expect(document.body.style.overflow).toBe("");
  expect(roster.closest('[inert]')).toBeNull();
  fireEvent.click(opener);
  fireEvent.click(screen.getByRole("button", { name: "Fechar Times" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("wraps keyboard focus in both directions", () => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{ width: 10, height: 10 }] as unknown as DOMRectList);
  render(<CareerWorkspace nav={[]} date="Hoje" teamName="Corinthians" background={<p>Elenco</p>} title="Times" onClose={() => {}}>
    <button>Último controle</button>
  </CareerWorkspace>);
  const first = screen.getByRole("button", { name: "Fechar Times" });
  const last = screen.getByRole("button", { name: "Último controle" });
  first.focus();
  fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(last);
  fireEvent.keyDown(last, { key: "Tab" });
  expect(document.activeElement).toBe(first);
});

it("does not close the parent window for Escape inside a nested dialog", () => {
  const close = vi.fn();
  render(<CareerWorkspace nav={[]} date="Hoje" teamName="Corinthians" background={null} title="Times" onClose={close}>
    <div role="dialog" aria-label="Perfil"><button>Fechar perfil</button></div>
  </CareerWorkspace>);
  fireEvent.keyDown(screen.getByRole("button", { name: "Fechar perfil" }), { key: "Escape" });
  expect(close).not.toHaveBeenCalled();
});

it("restores body scrolling on unmount", () => {
  document.body.style.overflow = "auto";
  const view = render(<CareerWorkspace nav={[]} date="Hoje" teamName="Corinthians" background={null} title="Times" onClose={() => {}} />);
  expect(document.body.style.overflow).toBe("hidden");
  view.unmount();
  expect(document.body.style.overflow).toBe("auto");
  document.body.style.overflow = "";
});

it("places the section icon and accessible title in the top window bar", () => {
  render(<CareerWorkspace nav={[]} date="Hoje" teamName="Corinthians" background={null} title="Times" titleIcon="group" onClose={vi.fn()}><p>Conteúdo</p></CareerWorkspace>);
  const heading = screen.getByRole("heading", { level: 1, name: "Times" });
  expect(heading.closest("header")?.querySelector('[data-management-icon="group"]')).toBeTruthy();
  expect(screen.getByRole("dialog", { name: "Times" })).toBeTruthy();
});
