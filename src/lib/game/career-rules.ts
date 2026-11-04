import type { CareerSave } from "./editor-data";

/** Explicit reset requested by the owner. Never infer this from updatedAt: old tabs
 * and offline devices can upload an old career with a newer modification date. */
export const CURRENT_CAREER_RULESET = "cbf-2026-reset-20261104";

export function isCurrentCareerSave(save: CareerSave): boolean {
  return save?.careerRuleset === CURRENT_CAREER_RULESET;
}

export function currentCareerSaves(saves: CareerSave[]): CareerSave[] {
  return saves.filter(isCurrentCareerSave);
}
