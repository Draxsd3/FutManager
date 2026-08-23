export function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export function playerMatchScore(a: { fullName: string; birthDate?: string; club?: string }, b: { fullName: string; birthDate?: string; club?: string }) {
  let score = normalizeName(a.fullName) === normalizeName(b.fullName) ? 30 : 0;
  if (a.birthDate && a.birthDate === b.birthDate) score += 30;
  if (a.club && b.club && normalizeName(a.club) === normalizeName(b.club)) score += 15;
  return score;
}
