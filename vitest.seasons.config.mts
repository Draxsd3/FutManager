import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/** Isolated long-running acceptance audit; never run alongside the full UI suite. */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["src/lib/game/simulation/*.endurance.ts"],
    maxWorkers: 1,
    testTimeout: 1_800_000,
    disableConsoleIntercept: true,
  },
});
