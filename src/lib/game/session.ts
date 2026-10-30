const menuPages = new Set(["menu", "new", "saves", "editor"]);
const resumableCareerPages = new Set([
  "hub",
  "lineup",
  "matchOverview",
  "result",
  "agenda",
  "stadium",
  "juniors",
  "teams",
  "search",
  "coaches",
  "history",
  "finances",
  "trophies",
  "training",
  "settings",
]);
const ACTIVE_CAREER_SESSION_KEY = "futmanager.activeCareerSession.v1";

/** Returns whether a stored session may safely reopen a specific saved career. */
export function canResumeSavedCareer(
  page: string,
  activeSaveId: string | null | undefined,
  saveIds: Iterable<string>,
) {
  if (menuPages.has(page) || !activeSaveId) return false;

  for (const saveId of saveIds) {
    if (saveId === activeSaveId) return true;
  }
  return false;
}

/** Restore only known career screens; never reopen transient account/menu flows. */
export function resumableCareerPage(page: string) {
  return resumableCareerPages.has(page) ? page : "hub";
}

export function activeCareerSessionKey(userId: string) {
  if (!userId) throw new Error("Conta obrigatória para restaurar a sessão.");
  return `${ACTIVE_CAREER_SESSION_KEY}.${userId}`;
}

export function readActiveCareerSession(userId: string): string | null {
  try {
    return sessionStorage.getItem(activeCareerSessionKey(userId));
  } catch {
    return null;
  }
}

export function writeActiveCareerSession(userId: string, careerId: string | null) {
  try {
    const key = activeCareerSessionKey(userId);
    if (careerId) sessionStorage.setItem(key, careerId);
    else sessionStorage.removeItem(key);
  } catch {
    // Session storage may be disabled; regular career saves remain available.
  }
}

export function isMenuPage(page: string) {
  return menuPages.has(page);
}
