// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowHeader, WindowHeaderContext } from "./window-header";
import { ManagementHeader } from "./management-header";
import { CareerWorkspace } from "./career-workspace";

afterEach(cleanup);
it.each(["Agenda", "Times", "Técnicos", "Treino", "Finanças", "Troféus", "Escalação", "Configurações"])("gives %s the same compact chrome and working close action", title => {
  const close = vi.fn();
  render(<CareerWorkspace nav={[]} date="Hoje" teamName="Corinthians" background={null} title={title} onClose={close}><ManagementHeader title={title} eyebrow="FutManager" icon="group" description="Descrição redundante" actions={<button>Voltar</button>} /></CareerWorkspace>);
  const dialog = screen.getByRole("dialog", { name: title });
  expect(dialog.querySelectorAll("[data-window-header]")).toHaveLength(1);
  expect(dialog.querySelectorAll("[data-management-header]")).toHaveLength(0);
  expect(screen.getAllByRole("heading", { level: 1, name: title })).toHaveLength(1);
  expect(screen.queryByText("Descrição redundante")).toBeNull();
  expect(screen.getByRole("button", { name: "Voltar" })).toBeTruthy();
  const button = screen.getByRole("button", { name: `Fechar ${title}` });
  expect(button.textContent).toBe("×");
  fireEvent.click(button);
  expect(close).toHaveBeenCalledOnce();
});
it("preserves nested labels and heading levels independently of the parent", () => {
  render(<WindowHeaderContext.Provider value><section role="dialog" aria-labelledby="detail"><WindowHeader id="detail" level={2} title="Detalhe do atleta" onClose={vi.fn()} /></section></WindowHeaderContext.Provider>);
  expect(screen.getByRole("dialog", { name: "Detalhe do atleta" })).toBeTruthy();
  expect(screen.getByRole("heading", { level: 2, name: "Detalhe do atleta" })).toBeTruthy();
});
it("preserves referenced screen IDs when removing repeated management titles", () => {
  render(<WindowHeaderContext.Provider value><section aria-labelledby="agenda"><ManagementHeader title="Agenda do clube" id="agenda" eyebrow="Clube" icon="calendar" /></section></WindowHeaderContext.Provider>);
  expect(screen.getByRole("region", { name: "Agenda do clube" })).toBeTruthy();
  expect(screen.queryByRole("heading")).toBeNull();
});
