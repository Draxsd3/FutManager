// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { formatWindowDate, WindowDateContext, WindowHeader, WindowHeaderContext } from "./window-header";
import { ManagementHeader } from "./management-header";
import { CareerWorkspace } from "./career-workspace";

afterEach(cleanup);
it.each(["Agenda", "Estádio", "Juniores", "Times", "Mercado", "Técnicos", "História", "Treino", "Finanças", "Troféus", "Escalação", "Configurações"])("places the career date beside × in %s and removes the inner back-to-club bar", title => {
  const close = vi.fn();
  render(<CareerWorkspace nav={[]} date="17/01/2026" teamName="Corinthians" background={null} title={title} onClose={close}><ManagementHeader title={title} eyebrow="FutManager" icon="group" description="Descrição redundante" actions={<><span>17 de janeiro de 2026</span><button>← Voltar ao clube</button></>} /></CareerWorkspace>);
  const dialog = screen.getByRole("dialog", { name: title });
  const header = dialog.querySelector("[data-window-header]")!;
  expect(dialog.querySelectorAll("[data-window-header]")).toHaveLength(1);
  expect(dialog.querySelectorAll("[data-management-header]")).toHaveLength(0);
  expect(screen.getAllByRole("heading", { level: 1, name: title })).toHaveLength(1);
  expect(screen.queryByText("Descrição redundante")).toBeNull();
  expect(screen.queryByRole("button", { name: /Voltar ao clube/ })).toBeNull();
  const dateEl = header.querySelector("[data-window-date]")!;
  expect(dateEl.textContent).toBe("17 de janeiro de 2026");
  const button = screen.getByRole("button", { name: `Fechar ${title}` });
  expect(dateEl.nextElementSibling).toBe(button);
  expect(button.textContent).toBe("×");
  fireEvent.click(button);
  expect(close).toHaveBeenCalledOnce();
});
it("inherits the career date in nested dialogs and formats ISO and slash dates consistently", () => {
  expect(formatWindowDate("2026-01-17")).toBe("17 de janeiro de 2026");
  expect(formatWindowDate("17/01/2026")).toBe("17 de janeiro de 2026");
  render(<WindowDateContext.Provider value="2026-01-17"><WindowHeaderContext.Provider value><section role="dialog" aria-labelledby="detail"><WindowHeader id="detail" level={2} title="Detalhe do atleta" onClose={vi.fn()} /></section></WindowHeaderContext.Provider></WindowDateContext.Provider>);
  const dialog = screen.getByRole("dialog", { name: "Detalhe do atleta" });
  expect(screen.getByRole("heading", { level: 2, name: "Detalhe do atleta" })).toBeTruthy();
  expect(dialog.querySelector("[data-window-date]")?.textContent).toBe("17 de janeiro de 2026");
});
it("preserves referenced screen IDs when removing repeated management titles", () => {
  render(<WindowHeaderContext.Provider value><section aria-labelledby="agenda"><ManagementHeader title="Agenda do clube" id="agenda" eyebrow="Clube" icon="calendar" /></section></WindowHeaderContext.Provider>);
  expect(screen.getByRole("region", { name: "Agenda do clube" })).toBeTruthy();
  expect(screen.queryByRole("heading")).toBeNull();
});
