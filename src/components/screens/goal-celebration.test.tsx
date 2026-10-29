// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GoalCelebration } from "./goal-celebration";
import type { MatchEvent } from "@/lib/game/live-match";

afterEach(() => { cleanup(); vi.useRealTimers(); });
const goal = (minute: number, team: "home" | "away", scorer: string): MatchEvent => ({ minute, half: minute <= 45 ? 1 : 2, text: `Gol de ${scorer}!`, scorer, scene: { action: "goal", team, actorIndex: 0, targetIndex: 1, from: { x: 45, y: 50 }, to: { x: 95, y: 50 } } });
it("celebrates newly scored goals with scorer and team, then dismisses without replaying", () => {
  vi.useFakeTimers();
  const old = goal(10, "home", "Alice");
  const { rerender } = render(<GoalCelebration events={[old]} club="Time A" opponent="Time B" />);
  expect(screen.queryByText("GOOOL!")).toBeNull();
  const next = goal(45, "away", "João");
  rerender(<GoalCelebration events={[old, next]} club="Time A" opponent="Time B" />);
  act(() => vi.advanceTimersByTime(0));
  expect(screen.getByRole("status").textContent).toContain("João");
  expect(screen.getByRole("status").textContent).toContain("Time B");
  act(() => vi.advanceTimersByTime(2500));
  expect(screen.queryByText("GOOOL!")).toBeNull();
  rerender(<GoalCelebration events={[old, next]} club="Time A" opponent="Time B" />);
  act(() => vi.advanceTimersByTime(0));
  expect(screen.queryByText("GOOOL!")).toBeNull();
  const last = goal(90, "home", "Bruno");
  rerender(<GoalCelebration events={[old, next, last]} club="Time A" opponent="Time B" />);
  act(() => vi.advanceTimersByTime(0));
  expect(screen.getByRole("status").textContent).toContain("Bruno");
  expect(screen.getByRole("status").textContent).toContain("Time A");
});
