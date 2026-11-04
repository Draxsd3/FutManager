import { expect, it } from "vitest";
import { buildSquadFromDatabase, createDefaultDatabase } from "./editor-data";
import { databaseWithLoans, dateAfterMonths, expireLoans, loanExpiryReminders, nextCareerDate, proposeLoanExtension, reconcileLoanSquad, recoverCareerLoans, type LoanContract } from "./loans";
import { recruitPlayer } from "./recruitment";
const loan: LoanContract = { owner: { clubId: "owner", name: "Origem" }, borrower: { clubId: "borrower", name: "Destino" }, startsOn: "2026-01-01", endsOn: "2026-06-30", status: "active", source: "game" };
it("clamps months, advances career calendar and reminds only the two clubs", () => {
  expect(dateAfterMonths("2026-01-31", 1)).toBe("2026-02-28");
  expect(nextCareerDate("2026-12-28")).toBe("2027-01-04");
  expect(loanExpiryReminders({ a: loan }, "borrower", "2026-06-10")).toBe(1);
  expect(loanExpiryReminders({ a: loan }, "other", "2026-06-10")).toBe(0);
});
it("returns on the exact due date, is idempotent, and never guesses unknown end dates", () => {
  const loans = { known: loan, unknown: { ...loan, endsOn: null } };
  expect(expireLoans(loans, "2026-06-29")).toBe(loans);
  const next = expireLoans(loans, "2026-06-30");
  expect(next.known.status).toBe("returned"); expect(next.unknown.status).toBe("active");
  expect(expireLoans(next, "2026-07-01")).toBe(next);
});
it("accepts a funded extension and preserves ownership; rejected offers retain the original expiration", () => {
  const result = proposeLoanExtension(loan, "2026-06-01", 1000, 10000, "borrower", 6, 15000, 50);
  expect(result.loan).toMatchObject({ endsOn: "2026-12-30", owner: loan.owner, renewal: { status: "accepted" } });
  expect(result.budget).toBe(955);
  expect(expireLoans({ a: result.loan }, "2026-06-30").a.status).toBe("active");
  const refused = proposeLoanExtension(loan, "2026-06-01", 1000, 10000, "borrower", 6, 1, 50);
  expect(refused.loan.endsOn).toBe(loan.endsOn); expect(refused.loan.renewal?.status).toBe("rejected");
  expect(expireLoans({ a: refused.loan }, "2026-06-30").a.status).toBe("returned");
  expect(proposeLoanExtension(loan, "2026-06-01", 1, 10000, "borrower", 6, 15000, 50).loan).toBe(loan);
  for (const date of ["2025-01-01", "2026-06-30", "2026-07-01"]) expect(proposeLoanExtension(loan, date, 1000, 10000, "borrower", 6, 15000, 50).loan).toBe(loan);
  expect(proposeLoanExtension(loan, "2026-06-01", 1000, 10000, "other", 6, 15000, 50).loan).toBe(loan);
});
it("allows the owner to agree a temporary continuation and rejects invalid/too expensive outgoing terms", () => {
  expect(proposeLoanExtension(loan, "2026-06-01", 0, 10000, "owner", 6, 15000, 50)).toMatchObject({ budget: 15, loan: { renewal: { status: "accepted" } } });
  expect(proposeLoanExtension(loan, "2026-06-01", 0, 10000, "owner", 6, 999999, 50).loan.renewal?.status).toBe("rejected");
  for (const months of [0, 25, NaN, 1.5]) expect(proposeLoanExtension(loan, "2026-06-01", 1000, 10000, "borrower", months, 1, 50).loan).toBe(loan);
});
it("removes an incoming loanee and restores the owner's squad, without changing the imported catalog", () => {
  const db = createDefaultDatabase(), owner = db.clubs[0], borrower = db.clubs[1], source = db.players.find(p => p.clubId === owner.id)!;
  source.marketStatus = "loan";
  const initial = buildSquadFromDatabase(db, borrower.name)!;
  const acquired = recruitPlayer(db, initial, borrower.name, 1e8, source.id, [], { kind: "loan", feeBrl: 100000, wageSharePercent: 50, loanMonths: 6, gameDate: "2026-01-01" });
  const player = acquired.squad.at(-1)!;
  expect(player.loan?.owner.clubId).toBe(owner.id);
  const loans = { [source.id]: player.loan! };
  const away = databaseWithLoans(db, loans);
  expect(buildSquadFromDatabase(away, owner.name)!.some(p => p.sourceId === source.id)).toBe(false);
  const returned = expireLoans(loans, "2026-07-01"), back = databaseWithLoans(db, returned);
  const borrowerSquad = reconcileLoanSquad(acquired.squad, buildSquadFromDatabase(back, borrower.name)!, returned, borrower.id);
  expect(borrowerSquad.some(p => p.sourceId === source.id)).toBe(false);
  const oldOwnerSquad = buildSquadFromDatabase(away, owner.name)!;
  const ownerSquad = reconcileLoanSquad(oldOwnerSquad, buildSquadFromDatabase(back, owner.name)!, returned, owner.id, [999]);
  expect(ownerSquad.find(p => p.sourceId === source.id)).toMatchObject({ id: 1000, acquisitionType: "permanent" });
  expect(reconcileLoanSquad(ownerSquad, buildSquadFromDatabase(back, owner.name)!, returned, owner.id)).toHaveLength(ownerSquad.length);
  expect(db.players.find(p => p.id === source.id)?.clubId).toBe(owner.id);
  expect(db.players.find(p => p.id === source.id)?.loan).toBeUndefined();
});
it("foreign ownership needs no invented playable club and legacy saves never guess an owner", () => {
  const db = createDefaultDatabase(), source = db.players[0], club = db.clubs.find(c => c.id === source.clubId)!;
  const foreign = { ...loan, owner: { name: "Clube externo", externalId: "999" }, borrower: { name: club.name, clubId: club.id }, status: "returned" as const };
  const back = databaseWithLoans(db, { [source.id]: foreign });
  expect(buildSquadFromDatabase(back, club.name)!.some(p => p.sourceId === source.id)).toBe(false);
  expect(back.clubs).toHaveLength(db.clubs.length);
  const squad = buildSquadFromDatabase(db, club.name)!;
  const legacy = [{ ...squad[0], acquisitionType: "loan" as const, loanExpiresOn: "2026-06-30" }];
  expect(recoverCareerLoans(legacy, [], db)).toEqual({});
});
