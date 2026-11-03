import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { clubThemeStyle } from "./app-shell";

function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

it("keeps the football accent and its button text legible regardless of club colors", () => {
  const red = clubThemeStyle("Flamengo") as Record<string, string>;
  const blackAndWhite = clubThemeStyle("Corinthians") as Record<string, string>;
  expect(red["--game-accent"]).toBe(blackAndWhite["--game-accent"]);
  expect(red["--team-primary"]).not.toBe(blackAndWhite["--team-primary"]);
  expect(contrast(red["--game-accent"], red["--game-accent-text"])).toBeGreaterThanOrEqual(4.5);
  expect(contrast(red["--game-accent"], "#14151b")).toBeGreaterThanOrEqual(4.5);
  expect(contrast("#526c59", "#ffffff")).toBeGreaterThanOrEqual(4.5);
  expect(contrast("#365943", "#e7f0e8")).toBeGreaterThanOrEqual(4.5);
});

it("does not recolor arbitrary child screens or tables from the career window", () => {
  const css = readFileSync(resolve(process.cwd(), "src/components/ui/career-workspace.module.css"), "utf8");
  expect(css).not.toMatch(/:global\(\[class\*=/);
  expect(css).not.toMatch(/:global\((?:th|td|table|select)\)/);
});
