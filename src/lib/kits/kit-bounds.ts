import rawBounds from "@/data/kit-bounds.json";

const bounds = rawBounds as Record<string, number[]>;

/** Fit the visible pixels (not the transparent canvas) to the standard shirt's frame. */
export function importedKitFrame(asset: string) {
  const entry = bounds[asset];
  if (!entry) return { x: 0, y: 0, width: 870, height: 1000 };
  const [width, height, left, top, right, bottom] = entry;
  const scale = Math.min(836 / (right - left), 976 / (bottom - top));
  return {
    x: 435 - (left + right) * scale / 2,
    y: 502.5 - (top + bottom) * scale / 2,
    width: width * scale,
    height: height * scale,
  };
}
