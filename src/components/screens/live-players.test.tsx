// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LivePlayers } from "./live-players";
import { squad } from "@/lib/game/mock-data";
import type { MatchScene } from "@/lib/game/live-match";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("moves both teams with one loop, freezes during pause and resumes from the same point", () => {
  let id = 0; const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { frames.set(++id, callback); return id; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frame) => { frames.delete(frame); });
  const tick = (time: number) => { const [key, callback] = [...frames.entries()][0]; frames.delete(key); act(() => callback(time)); };
  const starters = squad.slice(0, 11), manualPositions = {};
  const scene: MatchScene = { action: "pass", team: "home", actorIndex: 0, targetIndex: 1, from: { x: 40, y: 50 }, to: { x: 75, y: 70 } };
  const props = { starters, formation: "4-3-3", manualPositions, minute: 1, speed: 1 as const };
  const { container, rerender } = render(<LivePlayers {...props} running={false} />);
  const home = container.querySelector('[data-player-key="home-5"]') as HTMLElement;
  const away = container.querySelector('[data-player-key="away-4"]') as HTMLElement;
  const h0 = parseFloat(home.style.left), a0 = parseFloat(away.style.left);
  rerender(<LivePlayers {...props} scene={scene} running />);
  expect(frames.size).toBe(1);
  tick(0); tick(350);
  const h1 = parseFloat(home.style.left), a1 = parseFloat(away.style.left);
  expect(h1).not.toBe(h0); expect(a1).not.toBe(a0);
  rerender(<LivePlayers {...props} scene={scene} running={false} />);
  expect(frames.size).toBe(0); expect(parseFloat(home.style.left)).toBe(h1);
  rerender(<LivePlayers {...props} scene={scene} running speed={2} />);
  tick(1000); expect(parseFloat(home.style.left)).toBe(h1);
  tick(1350); expect(parseFloat(home.style.left)).not.toBe(h1);
});
