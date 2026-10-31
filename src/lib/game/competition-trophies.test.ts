import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCompetitionCatalog } from "./competitions";
import { competitionTrophyAsset } from "./competition-trophies";
import { createDefaultDatabase } from "./editor-data";

describe("troféus do catálogo", () => {
  it("mapeia as competições brasileiras e outras competições cadastradas a arquivos existentes", () => {
    const entries = buildCompetitionCatalog(createDefaultDatabase());
    for (const entry of entries) {
      const asset = competitionTrophyAsset(entry);
      expect(asset, entry.id).not.toBeNull();
      expect(existsSync(join(process.cwd(), "public", asset!)), entry.id).toBe(true);
    }
    const a = entries.find((entry) => entry.id === "league:Brasil:Série A")!;
    const b = entries.find((entry) => entry.id === "league:Brasil:Série B")!;
    expect(competitionTrophyAsset(a)).toContain("BRA_d1");
    expect(competitionTrophyAsset(b)).toContain("BRA_d2");
  });
  it("não atribui um troféu brasileiro a uma liga estrangeira desconhecida", () => {
    expect(competitionTrophyAsset({ id: "league:Japão:Série A", name: "Liga", category: "national", location: "Japão", division: "Série A", format: "Liga", clubs: [] })).toBeNull();
  });
});
