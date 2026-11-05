import importedAssets from "@/data/brazil-assets.json";
const imported: Record<string, {slug: string; crest: boolean; kits: number[]}> = importedAssets;
const clubSlugs: Record<string, string> = {
  Flamengo: "flamengo",
  Palmeiras: "palmeiras",
  Corinthians: "corinthians",
  Botafogo: "botafogo",
  Santos: "santos",
  Cruzeiro: "cruzeiro",
  "Grêmio": "gremio",
  Gremio: "gremio",
  Bahia: "bahia",
};

const clubAliases: Record<string, string> = {
  Gremio: "Grêmio",
  "CEFAT Tirol": "Tirol",
  "Ivinhema FC": "Ivinhema",
  "Clube Laguna": "Laguna",
  "Clube Laguna (RN)": "Laguna",
  "Monte Roraima FC": "Monte Roraima",
  "Piauí EC": "Piauí",
  "Piauí EC (PI)": "Piauí",
  "Primavera AC": "Primavera - MT",
  "Primavera-MT": "Primavera - MT",
  "Real Noroeste CFC": "Real Noroeste",
};

export function canonicalAssetClubName(club: string) {
  return clubAliases[club] ?? club;
}

export function clubAssetSlug(club: string) {
  const canonical = canonicalAssetClubName(club);
  return imported[canonical]?.slug ?? clubSlugs[canonical] ?? clubSlugs[club] ?? null;
}

export function clubCrestAsset(club: string, mini = false) {
  const canonical = canonicalAssetClubName(club);
  if (imported[canonical] && !imported[canonical].crest) return null;
  const slug = clubAssetSlug(canonical);
  return slug ? `/game-assets/clubs/${slug}/${mini ? "crest-mini" : "crest"}.png` : null;
}

export function clubKitAsset(club: string, kit: 1 | 2 | 3 = 1) {
  const canonical = canonicalAssetClubName(club);
  if (imported[canonical] && !imported[canonical].kits.includes(kit)) return null;
  const slug = clubAssetSlug(canonical);
  return slug ? `/game-assets/clubs/${slug}/kit-${kit}.png` : null;
}

export const competitionTrophies = [
  { name: "Brasileirão", asset: "/game-assets/trophies/brasileirao.png" },
  { name: "Copa do Brasil", asset: "/game-assets/trophies/copadobrasil.png" },
  { name: "Libertadores", asset: "/game-assets/trophies/libertadores.png" },
  { name: "Sul-Americana", asset: "/game-assets/trophies/sulamericana.png" },
  { name: "Mundial", asset: "/game-assets/trophies/mundial.png" },
] as const;
