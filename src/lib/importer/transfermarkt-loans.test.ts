import { expect, it } from "vitest";
import { loanFromTransferHistory } from "./transfermarkt-loans";
const owner = { id: "1023", name: "Palmeiras" }, borrower = { id: "982", name: "CD Nacional" };
const event = (transferType: string, date: string | null, reverse = false) => ({ transferType, date, clubFrom: reverse ? borrower : owner, clubTo: reverse ? owner : borrower, contractUntil: "2030-06-30" });
it("uses the explicit return event, not the owner's longer employment contract (Kaique pattern)", () => {
  const history = { id: "964590", transfers: [event("transfer", "2026-08-29"), event("endOfLoan", "2026-06-30", true), event("loan", "2025-07-14")] };
  expect(loanFromTransferHistory(history, "964590")).toMatchObject({ owner: { externalId: "1023" }, borrower: { externalId: "982" }, endsOn: "2026-06-30", startsOn: "2025-07-14" });
  expect(loanFromTransferHistory(history, "964590", "2026-11-04")).toBeNull();
  expect(loanFromTransferHistory(history, "964590", "2026-06-30")).toBeNull();
});
it("does not reuse stale loans, unrelated returns or ordinary contract ends", () => {
  expect(loanFromTransferHistory({ id: "1", transfers: [event("loan", "2025-07-14")] }, "1")?.endsOn).toBeNull();
  expect(loanFromTransferHistory({ id: "1", transfers: [event("transfer", "2026-01-01"), event("loan", "2025-07-14")] }, "1")).toBeNull();
  const unrelated = { ...event("endOfLoan", "2026-06-30", true), clubTo: { id: "999", name: "Outro" } };
  expect(loanFromTransferHistory({ id: "1", transfers: [event("loan", "2025-07-14"), unrelated] }, "1")?.endsOn).toBeNull();
  expect(() => loanFromTransferHistory({ id: "2", transfers: [] }, "1")).toThrow("outro jogador");
  expect(() => loanFromTransferHistory({ id: "1", transfers: [event("loan", null)] }, "1")).toThrow("sem data");
});
