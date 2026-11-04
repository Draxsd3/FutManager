import { describe, expect, it } from "vitest";
import type { CareerSave } from "./editor-data";
import { CURRENT_CAREER_RULESET, currentCareerSaves } from "./career-rules";
import { mergeCareerSaves } from "./save-utils";

const career = (id: string, careerRuleset?: string): CareerSave => ({ id, careerRuleset, name: id, managerName: "Técnico", clubId: "a", clubName: "Clube", division: "Série A", round: 1, budget: 12624, inGameDate: "2026-01-11", updatedAt: "2099-01-01T00:00:00Z" });
describe("reinício único para calendário CBF", () => {
  it("retira todas as versões antigas, mesmo se um dispositivo offline aumentar updatedAt", () => {
    expect(currentCareerSaves([career("old"), career("obsolete", "old"), career("new", CURRENT_CAREER_RULESET)]).map(s => s.id)).toEqual(["new"]);
  });
  it("não ressuscita uma carreira ao combinar caches e nuvem e não apaga as novas", () => {
    const current = career("new", CURRENT_CAREER_RULESET);
    expect(mergeCareerSaves([career("offline")], [career("remote"), current])).toEqual([current]);
    expect(mergeCareerSaves([current], [career("new")])).toEqual([current]);
    expect(currentCareerSaves(currentCareerSaves([current]))).toEqual([current]);
  });
});
