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

export function clubAssetSlug(club: string) {
  return imported[club]?.slug ?? clubSlugs[club] ?? null;
}

export function clubCrestAsset(club: string, mini = false) {
  if (imported[club] && !imported[club].crest) return null;
  const slug = clubAssetSlug(club);
  return slug ? `/game-assets/clubs/${slug}/${mini ? "crest-mini" : "crest"}.png` : null;
}

export function clubKitAsset(club: string, kit: 1 | 2 | 3 = 1) {
  if (imported[club] && !imported[club].kits.includes(kit)) return null;
  const slug = clubAssetSlug(club);
  return slug ? `/game-assets/clubs/${slug}/kit-${kit}.png` : null;
}

export const competitionTrophies = [
  { name: "Brasileirão", asset: "/game-assets/trophies/brasileirao.png" },
  { name: "Copa do Brasil", asset: "/game-assets/trophies/copadobrasil.png" },
  { name: "Libertadores", asset: "/game-assets/trophies/libertadores.png" },
  { name: "Sul-Americana", asset: "/game-assets/trophies/sulamericana.png" },
  { name: "Mundial", asset: "/game-assets/trophies/mundial.png" },
] as const;
