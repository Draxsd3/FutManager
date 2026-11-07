import { createPlayerCareer, type PlayerCareerRecord } from "./career";
import type { EditorDatabase } from "./editor-data";
import type { ManagerMarket } from "./manager-market";
import type { Player } from "./mock-data";

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

/** Simulate at most one purchase offer per completed match. Stable IDs make retries idempotent.
 * Only listed, owned players are considered; no outgoing loan terms are invented here.
 * AI clubs need simulated cash for the quoted fee. A pending offer blocks another for that athlete.
 */
export function generateIncomingOffers({ squad, records, database, managerMarket, clubId, club, eventId, date }: {
  squad: Player[]; records: Record<number, PlayerCareerRecord>; database: EditorDatabase;
  managerMarket: ManagerMarket | undefined; clubId: string; club: string; eventId: string; date: string;
}): Record<number, PlayerCareerRecord> {
  if (!clubId || !eventId || !managerMarket) return records;
  const event = `${clubId}:${eventId}`;
  if (Object.values(records).some(record => (record.transferOffers ?? []).some(offer => offer.id.startsWith(`ai:${event}:`)))) return records;
  const players = squad.filter(player => {
    const record = records[player.id];
    return (record?.marketStatus ?? player.marketAvailability) === "sale" &&
      player.acquisitionType !== "loan" && player.loan?.status !== "active" &&
      Number.isFinite(player.marketValue) && player.marketValue > 0 &&
      !(record?.transferOffers ?? []).some(offer => offer.status === "pending" || offer.id === `ai:${event}:${player.id}`);
  }).sort((a, b) => hash(`${event}:${a.id}`) - hash(`${event}:${b.id}`));
  for (const player of players) {
    const factor = 0.85 + (hash(`${event}:${player.id}:fee`) % 31) / 100;
    const fee = Math.max(0.01, Math.round(player.marketValue * factor * 100) / 100);
    const buyers = database.clubs.filter(candidate => candidate.id !== clubId &&
      candidate.name !== club && (managerMarket.clubs[candidate.id]?.budget ?? -1) >= fee * 1000)
      .sort((a, b) => hash(`${event}:${player.id}:${a.id}`) - hash(`${event}:${player.id}:${b.id}`));
    const buyer = buyers[0];
    if (!buyer) continue;
    const current = records[player.id] ?? createPlayerCareer(player, club);
    return { ...records, [player.id]: { ...current, transferOffers: [...(current.transferOffers ?? []), {
      id: `ai:${event}:${player.id}`, club: buyer.name, clubId: buyer.id, fee, status: "pending", sentOn: date,
    }] } };
  }
  return records;
}
