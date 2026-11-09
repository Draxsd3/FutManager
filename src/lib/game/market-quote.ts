import { financeAvailability, brlToCents, dealCost, type FinanceState } from "./simulation/finance";
import type { TransferNegotiation, TransferKind } from "./transfers";

/** The fee is checked against cash; wages and other obligations are shown as a projection. */
export function marketCostQuote(finance: FinanceState | undefined, clubId: string, kind: TransferKind, fee: number, monthly: number, share: number, excludingId?: string) {
  try {
    if (!Number.isFinite(monthly) || monthly < 0) return null;
    const deal = { kind, agreedFeeBrl: fee, wageSharePercent: share, agreedWageSharePercent: kind === "sale" ? 100 : share } as TransferNegotiation;
    const totalCents = dealCost(deal, brlToCents(monthly));
    const salaryCents = totalCents - brlToCents(fee);
    const breakdown = finance?.clubs[clubId] ? financeAvailability(finance, clubId, excludingId) : null;
    const available = breakdown ? Math.max(0, breakdown.cash) : null;
    const cash = breakdown?.cash ?? null;
    return { breakdown: breakdown ? { wages: breakdown.wages / 100, payables: breakdown.payables / 100, reservations: breakdown.reservations / 100, unreserved: (breakdown.cash - breakdown.payables - breakdown.wages) / 100 } : null, fee: brlToCents(fee) / 100, salary: salaryCents / 100, total: totalCents / 100, available: available === null ? null : available / 100, cash: cash === null ? null : cash / 100, enough: available === null ? null : brlToCents(fee) <= available };
  } catch { return null; }
}
