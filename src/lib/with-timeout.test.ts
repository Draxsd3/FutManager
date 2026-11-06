import { afterEach, expect, it, vi } from "vitest";
import { withTimeout } from "./with-timeout";
afterEach(() => vi.useRealTimers());
it("bounds a request that never settles", async () => {
  vi.useFakeTimers();
  const pending = withTimeout(new Promise<never>(() => {}), 8000);
  const assertion = expect(pending).rejects.toThrow("Tempo de espera excedido");
  await vi.advanceTimersByTimeAsync(8000);
  await assertion;
  expect(vi.getTimerCount()).toBe(0);
});
it("returns the result and cleans up the deadline", async () => {
  vi.useFakeTimers();
  await expect(withTimeout(Promise.resolve("ready"), 8000)).resolves.toBe("ready");
  expect(vi.getTimerCount()).toBe(0);
});
it("handles late rejections after timing out", async () => {
  vi.useFakeTimers();
  let fail!: (error: Error) => void;
  const pending = withTimeout(new Promise<never>((_, reject) => { fail = reject; }), 100);
  const assertion = expect(pending).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(100);
  await assertion;
  fail(new Error("late"));
  await Promise.resolve();
});
