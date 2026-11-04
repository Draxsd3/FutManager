// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ManagementHeader } from "./management-header";

afterEach(cleanup);
it("shares the training heading hierarchy with a decorative volume icon and working action", () => {
  const close = vi.fn();
  const { container } = render(<ManagementHeader title="Finanças" eyebrow="Gestão do clube" icon="money" description="Acompanhe o orçamento." actions={<button onClick={close}>Voltar</button>} />);
  expect(screen.getByRole("heading", { level: 1, name: "Finanças" })).toBeTruthy();
  expect(container.querySelector('[data-management-icon="money"]')?.getAttribute("aria-hidden")).toBe("true");
  expect(container.querySelector("[data-management-header]")).toBeTruthy();
  expect(screen.getByText("Acompanhe o orçamento.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
  expect(close).toHaveBeenCalledOnce();
});
it("preserves dialog labels and heading level without introducing another window", () => {
  const { container } = render(<section role="dialog" aria-labelledby="contracts"><ManagementHeader id="contracts" level={2} title="Contratos" eyebrow="Carreira" icon="arrow_refresh" /></section>);
  expect(screen.getByRole("dialog", { name: "Contratos" })).toBeTruthy();
  expect(screen.getByRole("heading", { level: 2, name: "Contratos" })).toBeTruthy();
  expect(container.querySelectorAll('[role="dialog"]')).toHaveLength(1);
});
