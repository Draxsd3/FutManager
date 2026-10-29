// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { activeCareerSessionKey, canResumeSavedCareer, readActiveCareerSession, resumableCareerPage, writeActiveCareerSession } from "./session";

describe("canResumeSavedCareer", () => {
  it.each(["menu", "new", "saves", "editor"])("does not restore a career from the %s screen", (page) => {
    expect(canResumeSavedCareer(page, "career-1", ["career-1"])).toBe(false);
  });

  it("restores only the exact active save from a career screen", () => {
    expect(canResumeSavedCareer("hub", "career-1", ["career-2", "career-1"])).toBe(true);
    expect(canResumeSavedCareer("hub", "career-1", ["career-2"])).toBe(false);
  });

  it("restores known career screens while safely falling back from transient screens", () => {
    expect(resumableCareerPage("lineup")).toBe("lineup");
    expect(resumableCareerPage("matchOverview")).toBe("matchOverview");
    expect(resumableCareerPage("agenda")).toBe("agenda");
    expect(resumableCareerPage("new")).toBe("hub");
    expect(resumableCareerPage("unknown")).toBe("hub");
  });

  it("stores the active career session per account and clears it on deliberate exit", () => {
    writeActiveCareerSession("alice", "career-1");
    expect(readActiveCareerSession("alice")).toBe("career-1");
    expect(readActiveCareerSession("bob")).toBeNull();
    expect(sessionStorage.getItem(activeCareerSessionKey("alice"))).toBe("career-1");
    writeActiveCareerSession("alice", null);
    expect(readActiveCareerSession("alice")).toBeNull();
  });
});
