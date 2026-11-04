import { z } from "zod";
import type { LoanContract } from "@/lib/game/loans";
const club = z.object({ id: z.string().regex(/^[1-9]\d*$/), name: z.string().min(1) });
const historySchema = z.object({ id: z.string(), transfers: z.array(z.object({
  clubFrom: club, clubTo: club, date: z.iso.date().nullable(),
  transferType: z.string().nullable(), contractUntil: z.string().nullable().optional(),
})).max(300) });
/** Reconstruct the loan at the career's starting date, not at the API's collection date.
 * contractUntil belongs to the owner's employment contract, NOT the loan (e.g. Kaique).
 */
export function loanFromTransferHistory(input: unknown, playerId: string, referenceDate = "2026-01-22"): LoanContract | null {
  const history = historySchema.parse(input);
  if (history.id !== playerId) throw new Error("A fonte retornou outro jogador.");
  if (history.transfers.some(event => !event.date)) throw new Error("Histórico com transferência sem data; vínculo não confirmado.");
  const events = [...history.transfers].sort((a, b) => b.date!.localeCompare(a.date!));
  const latest = events.find(event => event.date! <= referenceDate);
  if (!latest || latest.transferType !== "loan" || latest.clubFrom.id === latest.clubTo.id) return null;
  const end = events.filter(event => event.transferType === "endOfLoan" && event.date! > latest.date! && event.clubFrom.id === latest.clubTo.id && event.clubTo.id === latest.clubFrom.id).sort((a, b) => a.date!.localeCompare(b.date!))[0];
  return { owner: { externalId: latest.clubFrom.id, name: latest.clubFrom.name }, borrower: { externalId: latest.clubTo.id, name: latest.clubTo.name }, startsOn: latest.date!, endsOn: end?.date ?? null, status: "active", source: "transfermarkt" };
}
