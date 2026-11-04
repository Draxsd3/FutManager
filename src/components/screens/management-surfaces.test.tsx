// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import { squad } from "@/lib/game/mock-data";
import { ClubSectionScreen } from "./club-section-screen";
import { WorldScreens } from "./world-screens";

afterEach(cleanup);
const database = createDefaultDatabase();
it.each(["finances", "trophies"] as const)("uses the training canvas without an outer stadium card in %s", section => {
  const { container } = render(<ClubSectionScreen section={section} database={database} club="Flamengo" coach="Teste" round={1} budget={1000} squad={squad} fixtures={[]} onBack={vi.fn()} onOpenPlayer={vi.fn()} onTrainPlayers={vi.fn()} />);
  expect(container.firstElementChild?.getAttribute("data-management-surface")).toBe(section);
  expect(container.querySelector("[data-management-header]")).toBeTruthy();
  expect(container.querySelector('[class*="shadow-xl"]')).toBeNull();
  expect(screen.getByRole("button", { name: /Voltar ao clube/ })).toBeTruthy();
});
it.each(["juniors", "search", "coaches", "history", "teams"] as const)("shares header and surface in %s without changing navigation", section => {
  const { container } = render(<WorldScreens section={section} database={database} club="Flamengo" coach="Teste" budget={1000} squad={squad} records={{}} negotiations={[]} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onTransferOffer={vi.fn()} onTransferAction={vi.fn()} onBack={vi.fn()} />);
  expect(container.querySelectorAll("[data-management-surface]")).toHaveLength(1);
  expect(container.querySelectorAll("[data-management-header]")).toHaveLength(1);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("button", { name: /Voltar ao clube/ })).toBeTruthy();
});
