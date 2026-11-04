import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("keeps the original dark lineup theme without light-surface overrides", () => {
  const css = readFileSync("src/components/screens/lineup-screen.module.css", "utf8");
  expect(css).toContain("color-scheme: dark");
  expect(css).toContain("--panel: #151a1d");
  expect(css).not.toMatch(/color-scheme:\s*light/);
  expect(css).not.toContain("#f5f6f3");
  expect(css).toContain('.screen[data-layout="classic"] .field');
});
it("does not force a light background around the shared in-match tactics board", () => {
  const css = readFileSync("src/components/screens/match-detail-screen.module.css", "utf8");
  expect(css).not.toMatch(/\.unifiedModal\s*\{[^}]*#f5f6f3/);
});
