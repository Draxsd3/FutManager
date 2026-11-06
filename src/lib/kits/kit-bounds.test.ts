import { expect, it } from "vitest";
import rawBounds from "@/data/kit-bounds.json";
import { importedKitFrame } from "./kit-bounds";

it("fits the visible imported artwork to the same shirt frame while preserving aspect ratio", () => {
  for (const [asset, [width, height, left, top, right, bottom]] of Object.entries(rawBounds)) {
    const frame = importedKitFrame(asset);
    const scale = frame.width / width;
    expect(frame.height / height).toBeCloseTo(scale);
    const visibleWidth = (right - left) * scale, visibleHeight = (bottom - top) * scale;
    expect(visibleWidth).toBeLessThanOrEqual(836.001);
    expect(visibleHeight).toBeLessThanOrEqual(976.001);
    expect(visibleWidth >= 835.99 || visibleHeight >= 975.99).toBe(true);
    expect(frame.x + (left + right) * scale / 2).toBeCloseTo(435);
    expect(frame.y + (top + bottom) * scale / 2).toBeCloseTo(502.5);
  }
});
