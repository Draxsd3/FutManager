import type { EditorPlayer } from "./editor-data";

/** An expired/missing contract date or a dangling club ID is NOT evidence of unemployment. */
export function isFreeAgent(player: EditorPlayer) {
  return player.clubId.trim() === "" && player.loan?.status !== "active";
}
