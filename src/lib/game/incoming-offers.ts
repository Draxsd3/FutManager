import type { TransferNegotiation } from "./transfers";
import { availableCents } from "./simulation/finance";
import { assessMove } from "./simulation/market-rules";
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
  records=expireIncomingOffers(records,date);
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
    const source=database.players.find(p=>p.id===player.sourceId);
    const buyer = buyers.find(candidate=> {
      if(!managerMarket.finance) return true; // Legacy unit adapter, never the adopted E4 career.
      if(!source) return false;
      const roster=database.players.filter(p=>p.clubId===candidate.id);
      const wage=Math.ceil(source.salaryMonthlyBrl*1.2);
      if(roster.length>=30 || !assessMove(source,roster,"sale",wage,{database,buyerClubId:candidate.id,date}).accepted) return false;
      return availableCents(managerMarket.finance,candidate.id)>=Math.round((fee*1e6+wage*12)*100);
    });
    if (!buyer) continue;
    const current = records[player.id] ?? createPlayerCareer(player, club);
    return { ...records, [player.id]: { ...current, transferOffers: [...(current.transferOffers ?? []), {
      id: `ai:${event}:${player.id}`, club: buyer.name, clubId: buyer.id, fee, status: "pending", sentOn: date, expiresOn:new Date(Date.parse(`${date}T12:00:00Z`)+14*86400000).toISOString().slice(0,10),revision:1,...(source ? {monthlyWageBrl:Math.ceil(source.salaryMonthlyBrl*1.2)} : {}),
    }] } };
  }
  return records;
}


export function expireIncomingOffers(records: Record<number,PlayerCareerRecord>, date: string): Record<number,PlayerCareerRecord> {
 let changed=false;
 const entries=Object.entries(records).map(([id,record])=> {
  const offers=record.transferOffers?.map(offer=> {
   const expiry=offer.expiresOn ?? (offer.sentOn && Number.isFinite(Date.parse(offer.sentOn)) ? new Date(Date.parse(`${offer.sentOn}T12:00:00Z`)+14*86400000).toISOString().slice(0,10) : undefined);
   if(offer.status==="pending" && expiry && expiry<date) { changed=true; return {...offer,status:"expired" as const,revision:(offer.revision ?? 0)+1}; }
   return offer;
  });
  return [id,offers ? {...record,transferOffers:offers} : record];
 });
 return changed ? Object.fromEntries(entries) : records;
}
/** Player profile offers are a UI projection; authoritative pending terms share the common negotiation log. */
export function registerIncomingNegotiations(records: Record<number,PlayerCareerRecord>, squad: Player[], database: EditorDatabase, clubId: string, club: string, deals: TransferNegotiation[]): TransferNegotiation[] {
 const next=[...deals]; const ids=new Set(next.map(d=>d.id));
 for(const player of squad) for(const offer of records[player.id]?.transferOffers ?? []) {
  if(offer.status!=="pending" || ids.has(offer.id) || !player.sourceId) continue;
  const buyer=database.clubs.find(c=>c.id===offer.clubId || c.name===offer.club);
  if(!buyer) continue;
  next.unshift({id:offer.id,playerId:player.sourceId,playerName:player.name,sourceClubId:clubId,sourceClub:club,buyerClubId:buyer.id,kind:"sale",origin:"cpu",createdOn:offer.sentOn,expiresOn:offer.expiresOn,revision:offer.revision ?? 1,askingFeeBrl:offer.fee*1e6,offerFeeBrl:offer.fee*1e6,counterFeeBrl:offer.fee*1e6,agreedMonthlyWageBrl:offer.monthlyWageBrl,wageSharePercent:100,counterWageSharePercent:100,status:"countered",attempts:0,message:"Aguardando consentimento do clube humano; não há débito até a confirmação."});
  ids.add(offer.id);
 }
 return next;
}
