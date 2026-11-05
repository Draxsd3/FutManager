import { describe, expect, it } from "vitest";
import rawAssets from "@/data/brazil-assets.json";
import {
  GOALKEEPER_KIT_PALETTE,
  kitContrastScore,
  resolveGoalkeeperKit,
} from "./goalkeeper";

describe("resolveGoalkeeperKit", () => {
  it("chooses a contrasting goalkeeper jersey color against each selected match uniform", () => {
    expect(resolveGoalkeeperKit("Flamengo", 1).id).toBe("yellow");
    expect(resolveGoalkeeperKit("Flamengo", 2).id).toBe("graphite");
    expect(resolveGoalkeeperKit("Corinthians", 1).id).toBe("graphite");
    expect(resolveGoalkeeperKit("Corinthians", 2).id).toBe("yellow");
    expect(resolveGoalkeeperKit("Corinthians", 3).id).toBe("sky");
    expect(resolveGoalkeeperKit("Botafogo", 1).id).toBe("orange");
    expect(resolveGoalkeeperKit("Internacional", 1).id).toBe("sky");
    expect(resolveGoalkeeperKit("Mirassol", 1).id).toBe("graphite");
  });

  it("maintains strong perceptual contrast across all 346 clubs with imported uniform assets", () => {
    const validHexes = new Set(GOALKEEPER_KIT_PALETTE.map((option) => option.hex));
    const entries = Object.entries(rawAssets as Record<string, { kits: number[] }>);

    for (const [club, info] of entries) {
      for (const kit of info.kits) {
        if (kit !== 1 && kit !== 2 && kit !== 3) continue;
        const resolved = resolveGoalkeeperKit(club, kit);
        expect(validHexes.has(resolved.hex)).toBe(true);
        for (const outfieldColor of resolved.outfieldColors) {
          expect(kitContrastScore(resolved.hex, outfieldColor)).toBeGreaterThanOrEqual(45);
        }
      }
    }
  });

  it("respects custom club colors and produces fallback shield metadata when a club has no crest asset", () => {
    const customYellow = resolveGoalkeeperKit("Clube Customizado", 1, {
      primaryColor: "#eab308",
      secondaryColor: "#ffffff",
      shortName: "JAC",
    });
    expect(customYellow.id).toBe("graphite");
    expect(customYellow.crestAsset).toBeNull();
    expect(customYellow.fallbackCrest).toEqual({
      primaryColor: "#eab308",
      secondaryColor: "#ffffff",
      shortName: "JAC",
    });
  });
});
