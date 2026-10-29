// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TopNav, type NavItem } from "./top-nav";

afterEach(cleanup);
const open = vi.fn();
const child = vi.fn();
const items: NavItem[] = [{ icon: "calendar", label: "Agenda", onClick: open, children: [
  { label: "Jogos do seu time", description: "Calendário", onClick: child },
  { label: "Jogos amistosos", description: "Preparação", onClick: child },
  { label: "Central de empregos", description: "Carreira", onClick: child },
] }];

it("opens choices without navigating, supports keyboard navigation and restores focus on Escape", () => {
  open.mockClear();
  render(<TopNav items={items} date="22/01/2026" />);
  const trigger = screen.getByRole("button", { name: "Agenda" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(open).not.toHaveBeenCalled();
  const choices = screen.getAllByRole("menuitem");
  expect(document.activeElement).toBe(choices[0]);
  fireEvent.keyDown(choices[0], { key: "ArrowDown" });
  expect(document.activeElement).toBe(choices[1]);
  fireEvent.keyDown(choices[1], { key: "End" });
  expect(document.activeElement).toBe(choices[2]);
  fireEvent.keyDown(choices[2], { key: "Escape" });
  expect(screen.queryByRole("menu")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("closes on an outside click", () => {
  render(<TopNav items={items} date="22/01/2026" />);
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  expect(screen.getByRole("menu")).toBeTruthy();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("menu")).toBeNull();
});
