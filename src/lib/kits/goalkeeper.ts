import rawKitColors from "@/data/brazil-kit-colors.json";
import { canonicalAssetClubName, clubCrestAsset, clubKitAsset } from "@/lib/game/assets";
import { clubThemes } from "@/lib/game/mock-data";

export type GoalkeeperKitColorId = "graphite" | "yellow" | "sky" | "orange";

export interface GoalkeeperKitOption {
  id: GoalkeeperKitColorId;
  label: string;
  hex: string;
}

export interface ClubColorIdentity {
  primaryColor?: string;
  secondaryColor?: string;
  shortName?: string;
}

interface CatalogClubKitColors {
  c?: Array<string | null>;
  "1"?: string[];
  "2"?: string[];
  "3"?: string[];
}

const kitColorCatalog = rawKitColors as Record<string, CatalogClubKitColors>;

export const GOALKEEPER_KIT_PALETTE: readonly GoalkeeperKitOption[] = [
  { id: "graphite", label: "Grafite", hex: "#252930" },
  { id: "yellow", label: "Amarelo", hex: "#eab308" },
  { id: "sky", label: "Azul-celeste", hex: "#2ea8e6" },
  { id: "orange", label: "Laranja", hex: "#ea6a1f" },
] as const;

const DEFAULT_OUTFIELD_HEX = "#287354";
const DEFAULT_SECONDARY_HEX = "#ffffff";

function normalizeHex(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function clubInitials(club?: string, explicitShortName?: string): string {
  const cleaned = explicitShortName?.trim();
  if (cleaned) return cleaned.slice(0, 3).toUpperCase();
  if (!club?.trim()) return "FC";
  const words = club
    .trim()
    .replace(/[-/]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0 && !/^(de|da|do|dos|das|e)$/i.test(word));
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }
  return (words[0] ?? "FC").slice(0, 3).toUpperCase();
}

export function hexToLab(hex: string): [number, number, number] {
  const safe = normalizeHex(hex) ?? DEFAULT_OUTFIELD_HEX;
  const numeric = Number.parseInt(safe.slice(1), 16);
  const channels = [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  const x = (channels[0] * 0.4124 + channels[1] * 0.3576 + channels[2] * 0.1805) / 0.95047;
  const y = (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722) / 1.0;
  const z = (channels[0] * 0.0193 + channels[1] * 0.1192 + channels[2] * 0.9505) / 1.08883;

  const transform = (value: number) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  const fx = transform(x);
  const fy = transform(y);
  const fz = transform(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function kitContrastScore(hexA: string, hexB: string): number {
  const [l1, a1, b1] = hexToLab(hexA);
  const [l2, a2, b2] = hexToLab(hexB);
  return Math.hypot((l1 - l2) * 1.55, (a1 - a2) * 0.78, (b1 - b2) * 0.78);
}

export function resolveClubIdentity(club?: string, clubColors?: ClubColorIdentity) {
  const canonical = club ? canonicalAssetClubName(club) : undefined;
  const catalogEntry = club ? kitColorCatalog[club] ?? (canonical ? kitColorCatalog[canonical] : undefined) : undefined;
  const themeEntry = club ? clubThemes[club] ?? (canonical ? clubThemes[canonical] : undefined) : undefined;

  const primaryColor =
    normalizeHex(clubColors?.primaryColor) ??
    normalizeHex(catalogEntry?.c?.[0]) ??
    normalizeHex(themeEntry?.primary) ??
    DEFAULT_OUTFIELD_HEX;

  const secondaryColor =
    normalizeHex(clubColors?.secondaryColor) ??
    normalizeHex(catalogEntry?.c?.[1]) ??
    normalizeHex(themeEntry?.secondary) ??
    DEFAULT_SECONDARY_HEX;

  const shortName = clubInitials(club, clubColors?.shortName ?? catalogEntry?.c?.[2] ?? undefined);

  return { primaryColor, secondaryColor, shortName };
}

export function resolveOutfieldKitColors(
  club?: string,
  kit: 1 | 2 | 3 = 1,
  clubColors?: ClubColorIdentity,
): string[] {
  if (club && clubKitAsset(club, kit)) {
    const canonical = canonicalAssetClubName(club);
    const entry = kitColorCatalog[club] ?? kitColorCatalog[canonical];
    const extracted = entry?.[String(kit) as "1" | "2" | "3"]
      ?.map((hex) => normalizeHex(hex))
      .filter((hex): hex is string => Boolean(hex));
    if (extracted && extracted.length > 0) {
      return extracted;
    }
  }

  const identity = resolveClubIdentity(club, clubColors);
  if (kit === 2) return [identity.secondaryColor];
  if (kit === 3) return ["#e8eaed"];
  const colors = [identity.primaryColor];
  if (kitContrastScore(identity.primaryColor, identity.secondaryColor) >= 24 && clubColors?.secondaryColor) {
    colors.push(identity.secondaryColor);
  }
  return colors;
}

export function pickContrastingGoalkeeperColor(outfieldColors: readonly string[]): GoalkeeperKitOption {
  const references = outfieldColors.length > 0 ? outfieldColors : [DEFAULT_OUTFIELD_HEX];
  let best = GOALKEEPER_KIT_PALETTE[0];
  let bestScore = -1;

  for (const candidate of GOALKEEPER_KIT_PALETTE) {
    const minDistance = Math.min(...references.map((color) => kitContrastScore(candidate.hex, color)));
    if (minDistance > bestScore) {
      bestScore = minDistance;
      best = candidate;
    }
  }

  return best;
}

export function resolveGoalkeeperKit(
  club?: string,
  kit: 1 | 2 | 3 = 1,
  clubColors?: ClubColorIdentity,
) {
  const outfieldColors = resolveOutfieldKitColors(club, kit, clubColors);
  const selected = pickContrastingGoalkeeperColor(outfieldColors);
  const fallbackCrest = resolveClubIdentity(club, clubColors);
  const crestAsset = club ? clubCrestAsset(club) : null;

  return {
    ...selected,
    outfieldColors,
    crestAsset,
    fallbackCrest,
  };
}
