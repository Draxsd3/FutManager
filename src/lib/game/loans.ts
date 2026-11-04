import { z } from "zod";
import type { EditorDatabase } from "./editor-data";
import type { Player } from "./mock-data";

const clubReference = z.object({ name: z.string().min(1), externalId: z.string().regex(/^[1-9]\d*$/).optional(), clubId: z.string().optional() });
export const loanContractSchema = z.object({
  owner: clubReference, borrower: clubReference,
  startsOn: z.iso.date().nullable(), endsOn: z.iso.date().nullable(), status: z.enum(["active", "returned"]),
  source: z.enum(["transfermarkt", "game", "manual"]), wageSharePercent: z.number().min(0).max(100).optional(),
  renewal: z.object({ proposedOn: z.iso.date(), months: z.number().int().min(1).max(24), feeBrl: z.number().min(0), status: z.enum(["accepted", "rejected"]) }).optional(),
});
export type LoanContract = z.infer<typeof loanContractSchema>;
export type CareerLoans = Record<string, LoanContract>;
export const isLoanAtClub = (loan: LoanContract, clubId: string) => (loan.status === "active" ? loan.borrower.clubId : loan.owner.clubId) === clubId;
export function dateAfterMonths(date: string, months: number) {
  const value = new Date(`${date}T12:00:00Z`), day = value.getUTCDate();
  value.setUTCDate(1); value.setUTCMonth(value.getUTCMonth() + months);
  const last = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  value.setUTCDate(Math.min(day, last)); return value.toISOString().slice(0, 10);
}
export function nextCareerDate(date: string) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + 7); return value.toISOString().slice(0, 10);
}
export function expireLoans(loans: CareerLoans, date: string): CareerLoans {
  let changed = false;
  const next = Object.fromEntries(Object.entries(loans).map(([id, loan]) => {
    if (loan.status === "active" && loan.endsOn && loan.endsOn <= date) { changed = true; return [id, { ...loan, status: "returned" as const }]; }
    return [id, loan];
  }));
  return changed ? next : loans;
}
export function databaseWithLoans(database: EditorDatabase, overrides: CareerLoans): EditorDatabase {
  return { ...database, players: database.players.map(player => {
    const loan = overrides[player.id] ?? player.loan;
    return loan ? { ...player, loan, clubId: (loan.status === "active" ? loan.borrower.clubId : loan.owner.clubId) ?? player.clubId, marketStatus: "normal" as const } : player;
  }) };
}
/** Explicit game negotiation rule; never a request to a real club. Money in BRL, budget in thousands. */
export function proposeLoanExtension(loan: LoanContract, date: string, budget: number, salaryMonthlyBrl: number, ownClubId: string, months: number, feeBrl: number, wageSharePercent: number) {
  const invalid = { loan, budget, message: "Proposta inválida. Informe prazo de 1–24 meses, taxa e participação salarial válidos." };
  if (loan.status !== "active" || !loan.endsOn || date >= loan.endsOn || (loan.startsOn !== null && date < loan.startsOn)) return { loan, budget, message: "A prorrogação exige empréstimo vigente, prazo conhecido e proposta antes do vencimento." };
  if (![loan.owner.clubId, loan.borrower.clubId].includes(ownClubId)) return { loan, budget, message: "Este empréstimo não pertence ao seu clube." };
  if (!Number.isInteger(months) || months < 1 || months > 24 || !Number.isFinite(feeBrl) || feeBrl < 0 || !Number.isFinite(wageSharePercent) || wageSharePercent < 0 || wageSharePercent > 100 || !Number.isFinite(salaryMonthlyBrl) || salaryMonthlyBrl < 0) return invalid;
  const receiving = ownClubId === loan.borrower.clubId;
  const cost = Math.ceil((feeBrl + salaryMonthlyBrl * wageSharePercent / 100 * months) / 1000);
  if (receiving && cost > budget) return { loan, budget, message: "Saldo insuficiente para a taxa e os salários da prorrogação." };
  const minimumFee = Math.round(salaryMonthlyBrl * months * 0.25);
  const accepted = wageSharePercent >= 50 && (receiving ? feeBrl >= minimumFee : feeBrl <= minimumFee * 2);
  const renewal = { proposedOn: date, months, feeBrl, status: accepted ? "accepted" as const : "rejected" as const };
  if (!accepted) return { loan: { ...loan, renewal }, budget, message: `Proposta recusada na simulação. O jogador permanece até ${loan.endsOn} e retorna ao clube de origem no vencimento.` };
  return { loan: { ...loan, endsOn: dateAfterMonths(loan.endsOn, months), wageSharePercent, renewal }, budget: receiving ? budget - cost : budget + Math.floor(feeBrl / 1000), message: "Prorrogação aceita na simulação pelos clubes. Prazo atualizado; não houve transferência definitiva." };
}
/** Preserve every existing career identity; returning owned players receive a new non-reused numeric ID. */
export function reconcileLoanSquad(squad: Player[], databaseSquad: Player[], loans: CareerLoans, ownClubId: string, reservedIds: number[] = []) {
  const updated = squad.flatMap(player => {
    const loan = player.sourceId ? loans[player.sourceId] ?? player.loan : player.loan;
    if (!loan) return [player];
    if (!isLoanAtClub(loan, ownClubId)) return [];
    return [{ ...player, loan, acquisitionType: loan.status === "active" ? "loan" as const : "permanent" as const, loanExpiresOn: loan.status === "active" ? loan.endsOn ?? undefined : undefined }];
  });
  let nextId = Math.max(0, ...squad.map(player => player.id), ...reservedIds) + 1;
  for (const player of databaseSquad) {
    if (player.sourceId && loans[player.sourceId]?.status === "returned" && loans[player.sourceId].owner.clubId === ownClubId && !updated.some(other => other.sourceId === player.sourceId)) updated.push({ ...player, id: nextId++ });
  }
  return updated;
}

/** Old saves can recover ownership only from their own completed loan negotiation. */
export function recoverCareerLoans(squad: Player[], negotiations: import("./transfers").TransferNegotiation[], database: EditorDatabase, existing: CareerLoans = {}): CareerLoans {
  const loans = { ...existing };
  for (const player of squad) {
    if (!player.sourceId || loans[player.sourceId]) continue;
    if (player.loan) { loans[player.sourceId] = player.loan; continue; }
    const deal = negotiations.find(item => item.playerId === player.sourceId && item.kind === "loan" && item.status === "completed");
    if (player.acquisitionType !== "loan" || !player.loanExpiresOn || !deal) continue;
    const recovered = loanContractSchema.safeParse({ owner: { clubId: deal.sourceClubId, name: deal.sourceClub }, borrower: { clubId: deal.buyerClubId, name: database.clubs.find(club => club.id === deal.buyerClubId)?.name ?? "Clube do save" }, startsOn: null, endsOn: player.loanExpiresOn, status: "active", source: "game", wageSharePercent: deal.agreedWageSharePercent ?? deal.wageSharePercent });
    if (recovered.success) loans[player.sourceId] = recovered.data;
  }
  return loans;
}

export function loanExpiryReminders(loans: CareerLoans, ownClubId: string, date: string) {
  const horizon = nextCareerDate(nextCareerDate(nextCareerDate(nextCareerDate(date))));
  return Object.values(loans).filter(loan => loan.status === "active" && loan.endsOn && loan.endsOn > date && loan.endsOn <= horizon && [loan.owner.clubId, loan.borrower.clubId].includes(ownClubId)).length;
}
