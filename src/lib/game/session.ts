const menuPages = new Set(["menu", "new", "saves", "editor"]);

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

export function isMenuPage(page: string) {
  return menuPages.has(page);
}
