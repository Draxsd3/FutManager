// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LiveBall } from "./live-ball";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("moves continuously, freezes at the current point on pause and resumes without remounting", () => {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { frames.set(++id, callback); return id; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frame) => { frames.delete(frame); });
  const step = (time: number) => { const [key, callback] = [...frames.entries()][0]; frames.delete(key); act(() => callback(time)); };
  const { rerender } = render(<LiveBall target={{ x: 20, y: 30 }} running speed={1} />);
  const ball = screen.getByTestId("live-ball");
  rerender(<LiveBall target={{ x: 80, y: 30 }} running speed={1} />);
  step(0); step(350);
  const beforePause = parseFloat(ball.style.left);
  expect(beforePause).toBeGreaterThan(20); expect(beforePause).toBeLessThan(80);
  rerender(<LiveBall target={{ x: 80, y: 30 }} running={false} speed={1} />);
  expect(frames.size).toBe(0);
  expect(parseFloat(ball.style.left)).toBe(beforePause);
  rerender(<LiveBall target={{ x: 80, y: 30 }} running speed={2} />);
  expect(screen.getByTestId("live-ball")).toBe(ball);
  step(1000); expect(parseFloat(ball.style.left)).toBe(beforePause);
  step(1350); expect(parseFloat(ball.style.left)).toBe(80);
});
