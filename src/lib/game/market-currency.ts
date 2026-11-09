import type { CareerSave, EditorDatabase, EditorPlayer } from "./editor-data";
import type { Player } from "./mock-data";

/** Indicative mid-market EUR/BRL, 29 October 2026 02:00 UTC; fixed for the game. */
export const EUR_BRL_RATE = 5.961293;
export const EUR_BRL_VERSION = "eur-brl-2026-10-29-0200-v1";
export function euroValueInBrl(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return null;
  const result = Math.round(value * EUR_BRL_RATE);
  return Number.isSafeInteger(result) ? result : null;
}
export function convertPlayerMarketValue(player: EditorPlayer): EditorPlayer {
  const source = player.transfermarkt;
  const value = euroValueInBrl(source?.marketValueEur);
  if (!source || value === null || source.marketValueFxVersion === EUR_BRL_VERSION) return player;
  return {...player,marketValueBrl:value,transfermarkt:{...source,marketValueFxVersion:EUR_BRL_VERSION,estimatedFields:source.estimatedFields?.filter(field => field !== "marketValueBrl")}};
}
export function convertDatabaseMarketValues(db: EditorDatabase): EditorDatabase {
  const players=db.players.map(convertPlayerMarketValue);
  return players.some((p,i)=>p!==db.players[i]) ? {...db,players} : db;
}
/** One-time conversion of the frozen universe and linked squad values; never change deals or finances. */
export function convertCareerMarketValues(save: CareerSave, fallback: EditorDatabase): CareerSave {
  const progress=save.progress;
  if (!progress || progress.marketValueFxVersion === EUR_BRL_VERSION) return save;
  const db=convertDatabaseMarketValues(progress.universeSnapshot ?? fallback);
  const values=new Map(db.players.filter(p=>p.transfermarkt?.marketValueFxVersion===EUR_BRL_VERSION).map(p=>[p.id,p.marketValueBrl]));
  const convertSquad=(players: Player[] | null | undefined) => players?.map(p => {
    const value=p.sourceId ? values.get(p.sourceId) : undefined;
    return value === undefined ? p : {...p, marketValue:value/1_000_000, passValue:value/1_000_000};
  });
  const snapshots=progress.jobClubSnapshots && Object.fromEntries(Object.entries(progress.jobClubSnapshots).map(([id,snapshot])=>[id,{...snapshot,careerSquad:convertSquad(snapshot.careerSquad) ?? snapshot.careerSquad}]));
  return {...save,progress:{...progress,universeSnapshot:db,careerSquad:convertSquad(progress.careerSquad) ?? progress.careerSquad,jobClubSnapshots:snapshots,marketValueFxVersion:EUR_BRL_VERSION}};
}
