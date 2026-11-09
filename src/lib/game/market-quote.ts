import { financeAvailability, brlToCents, dealCost, type FinanceState } from "./simulation/finance";
import type { TransferNegotiation, TransferKind } from "./transfers";

/** Same cents, horizons and reservation exclusion used by the financial executor. */
export function marketCostQuote(finance: FinanceState | undefined, clubId: string, kind: TransferKind, fee: number, monthly: number, share: number, excludingId?: string) {
  try {
    if (!Number.isFinite(monthly) || monthly < 0) return null;
    const deal = { kind, agreedFeeBrl: fee, wageSharePercent: share, agreedWageSharePercent: kind === "sale" ? 100 : share } as TransferNegotiation;
    const totalCents = dealCost(deal, brlToCents(monthly));
    const salaryCents = totalCents - brlToCents(fee);
    const breakdown = finance?.clubs[clubId] ? financeAvailability(finance, clubId, excludingId) : null;
    const available = breakdown?.available ?? null;
    const cash = breakdown?.cash ?? null;
    return { breakdown: breakdown ? { wages: breakdown.wages / 100, payables: breakdown.payables / 100, reservations: breakdown.reservations / 100, unreserved: breakdown.unreserved / 100 } : null, fee: brlToCents(fee) / 100, salary: salaryCents / 100, total: totalCents / 100, available: available === null ? null : available / 100, cash: cash === null ? null : cash / 100, enough: available === null ? null : totalCents <= available };
  } catch { return null; }
}
