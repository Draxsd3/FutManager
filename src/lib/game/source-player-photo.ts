import photos from "@/data/transfermarkt/player-photos-novembro.json";
import type { EditorDatabase } from "./editor-data";
import type { Player } from "./mock-data";

const bundledPhotos: Record<string, string> = photos;

/** Only known Transfermarkt portrait URLs are displayed; never trust arbitrary JSON URLs. */
export function trustedPlayerPhoto(url: unknown): string | undefined {
  if (typeof url !== "string" || url.length > 2048) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "img.a.transfermarkt.technology" || parsed.port || parsed.username || parsed.password || !parsed.pathname.startsWith("/portrait/")) return undefined;
    return parsed.href;
  } catch { return undefined; }
}

/** Match by the saved source ID and the trusted external ID, never by a player's name. */
export function sourcePlayerPhoto(player: Player, database: EditorDatabase | null | undefined): string | undefined {
  if (!player.sourceId || !database) return undefined;
  const source = database.players.find((item) => item.id === player.sourceId);
  if (!source?.transfermarkt?.id) return undefined;
  return trustedPlayerPhoto(source.transfermarkt.photoUrl) ?? trustedPlayerPhoto(bundledPhotos[source.transfermarkt.id]);
}
