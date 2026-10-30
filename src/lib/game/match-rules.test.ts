import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { loadMatchRules, parseMatchRules } from "./match-rules";

const rulesMarkdown = readFileSync("public/game-assets/match-engine-rules.md", "utf8");

describe("canonical match rules", () => {
  it("parses the executable config from the documented Markdown", () => {
    const rules = parseMatchRules(rulesMarkdown);
    expect(rules.version).toBe(1);
    expect(rules.durationMinutes).toBe(90);
    expect(rules.weatherOptions.map((weather) => weather.id)).toContain("chuva");
  });

  it("reads the same Markdown without cache before a match starts", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => rulesMarkdown });
    const rules = await loadMatchRules(fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledWith("/game-assets/match-engine-rules.md", { cache: "no-store" });
    expect(rules.version).toBe(1);
  });

  it("fails closed if the rules are unavailable, missing, or invalid", async () => {
    await expect(loadMatchRules(vi.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch)).rejects.toThrow(/não foi possível ler/i);
    await expect(loadMatchRules(vi.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch)).rejects.toThrow(/HTTP 503/);
    expect(() => parseMatchRules("# no config")).toThrow(/não foi encontrado/i);
    expect(() => parseMatchRules(rulesMarkdown.replace('"durationMinutes": 90', '"durationMinutes": 900'))).toThrow(/limites aceitos/i);
  });
});
