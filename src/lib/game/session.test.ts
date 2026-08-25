import { describe, expect, it } from "vitest";
import { canResumeSavedCareer } from "./session";

describe("canResumeSavedCareer", () => {
  it.each(["menu", "new", "saves", "editor"])("does not restore a career from the %s screen", (page) => {
    expect(canResumeSavedCareer(page, "career-1", ["career-1"])).toBe(false);
  });

  it("restores only the exact active save from a career screen", () => {
    expect(canResumeSavedCareer("hub", "career-1", ["career-2", "career-1"])).toBe(true);
    expect(canResumeSavedCareer("hub", "career-1", ["career-2"])).toBe(false);
  });
});
