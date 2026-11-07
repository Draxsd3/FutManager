import type { EditorDatabase, EditorPlayer } from "./editor-data";
import { databaseWithLoans, dateAfterMonths, type CareerLoans } from "./loans";
import { appointManager, type ManagerMarket } from "./manager-market";
import { databaseWithCompletedTransfers, playerAskingFeeBrl, proposeTransfer, respondToTransferNegotiation, type TransferNegotiation } from "./transfers";

export type WorldMarket = {
  lastWeek?: number;
  listings: Record<string, "sale" | "loan">;
  events: { date: string; text: string }[];
};
export function worldDatabase(database: EditorDatabase, deals: TransferNegotiation[], loans: CareerLoans, world?: WorldMarket): EditorDatabase {
  const effective = databaseWithLoans(databaseWithCompletedTransfers({ ...database, players: database.players.map(p => ({ ...p, loan: undefined })) }, deals), loans);
  return world ? { ...effective, players: effective.players.map(p => world.listings[p.id] && p.loan?.status !== "active" ? { ...p, marketStatus: world.listings[p.id] } : p) } : effective;
}
const hash = (value: string) => { let n = 2166136261; for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };

/** One bounded decision round per elapsed game week, never on render or wall-clock time.
 * Data is an overlay inside a single career, not a rewrite of the editor's universe.
 * No forced transactions involving the human club or an active human negotiation.
 */
export function simulateWorldMarket(input: { database: EditorDatabase; humanClubId: string; date: string; previousDate: string; world?: WorldMarket; negotiations: TransferNegotiation[]; loans: CareerLoans; managers: ManagerMarket }) {
  const week = Math.floor(Date.parse(`${input.date}T12:00:00Z`) / 604800000);
  const previousWeek = Math.floor(Date.parse(`${input.previousDate}T12:00:00Z`) / 604800000);
  let world: WorldMarket = input.world ?? { listings: {}, events: [] };
  let managers = input.managers;
  let negotiations = input.negotiations;
  let loans = input.loans;
  if (!Number.isFinite(week) || week <= (world.lastWeek ?? previousWeek)) return { world, managers, negotiations, loans };
  world = { ...world, lastWeek: week, listings: { ...world.listings }, events: [...world.events] };
  managers = { ...managers, clubs: { ...managers.clubs } };
  negotiations = [...negotiations]; loans = { ...loans };
  const record = (text: string) => world.events.unshift({ date: input.date, text });
  const protectedPlayers = new Set(negotiations.filter(d => d.status === "agreed" || d.status === "countered" || (d.status === "completed" && d.completedOn && Date.parse(`${input.date}T12:00:00Z`)-Date.parse(`${d.completedOn}T12:00:00Z`) < 90*86400000)).map(d => d.playerId));
  const db = worldDatabase(input.database, negotiations, loans, world);
  const rosters = new Map<string, EditorPlayer[]>();
  for (const player of db.players) { const roster = rosters.get(player.clubId) ?? []; roster.push(player); rosters.set(player.clubId, roster); }
  const moved = new Set<string>();
  // A youngster behind several teammates can develop on loan; surplus seniors may be sold.
  for (const club of db.clubs) {
    const roster = rosters.get(club.id) ?? [];
    if (club.id === input.humanClubId || roster.length <= 20 || hash(`${week}:${club.id}:list`) % 3 !== 0) continue;
    const surplus = roster.filter(p => p.marketStatus === "normal" && p.loan?.status !== "active" && !protectedPlayers.has(p.id) && roster.filter(other => other.primaryPosition === p.primaryPosition).length > (p.primaryPosition === "G" ? 2 : 3)).sort((a,b) => a.overall-b.overall || a.id.localeCompare(b.id));
    const candidate = surplus[0];
    if (!candidate || world.listings[candidate.id]) continue;
    world.listings[candidate.id] = candidate.age <= 23 ? "loan" : "sale";
    candidate.marketStatus = world.listings[candidate.id];
    record(`${club.name} disponibilizou ${candidate.name} para ${candidate.marketStatus === "loan" ? "empréstimo" : "venda"}.`);
  }
  const candidates = db.players.filter(p => (p.marketStatus === "sale" || p.marketStatus === "loan" || !p.clubId.trim()) && p.clubId !== input.humanClubId && p.loan?.status !== "active" && !protectedPlayers.has(p.id));
  let completed = 0;
  for (const buyer of [...db.clubs].sort((a,b) => hash(`${week}:${a.id}`)-hash(`${week}:${b.id}`))) {
    const finances = managers.clubs[buyer.id];
    const roster = rosters.get(buyer.id) ?? [];
    if (completed >= 6 || buyer.id === input.humanClubId || !finances || finances.budget <= 0 || roster.length < 11 || roster.length >= 30) continue;
    const average = roster.reduce((sum,p) => sum+p.overall,0)/roster.length;
    const player = candidates.filter(p => {
      const sellerRoster = rosters.get(p.clubId) ?? [];
      if (moved.has(p.id) || p.clubId === buyer.id || !Number.isFinite(p.salaryMonthlyBrl) || p.salaryMonthlyBrl < 0) return false;
      if (p.clubId && (sellerRoster.length <= 20 || sellerRoster.filter(o => o.primaryPosition === p.primaryPosition).length <= (p.primaryPosition === "G" ? 2 : 3))) return false;
      const atPosition = roster.filter(o => o.primaryPosition === p.primaryPosition);
      if (atPosition.length >= (p.primaryPosition === "G" ? 3 : 8) || (atPosition.length >= 2 && p.overall <= Math.min(...atPosition.map(o => o.overall)))) return false;
      const cost = Math.ceil((playerAskingFeeBrl(p)+p.salaryMonthlyBrl*(p.marketStatus === "loan" ? 3 : 12))/1000);
      return p.overall >= average-5 && p.overall <= average+12 && cost <= finances.budget*0.25;
    }).sort((a,b) => b.overall-a.overall || playerAskingFeeBrl(a)-playerAskingFeeBrl(b) || a.id.localeCompare(b.id))[0];
    if (!player) continue;
    const result = proposeTransfer(db, negotiations, { id: `cpu:${week}:${buyer.id}:${player.id}`, playerId: player.id, buyerClubId: buyer.id, feeBrl: playerAskingFeeBrl(player)*0.8, wageSharePercent: 50 });
    if (!result.negotiation) continue;
    let deal = result.negotiation;
    if (deal.status === "countered") deal = respondToTransferNegotiation(deal, { type: "accept-counter" }).negotiation;
    if (deal.status !== "agreed") continue;
    deal = { ...respondToTransferNegotiation(deal, { type: "complete" }).negotiation, completedOn: input.date };
    const fee = deal.agreedFeeBrl ?? 0;
    const cost = Math.ceil((fee+player.salaryMonthlyBrl*(deal.kind === "loan" ? 3 : 12))/1000);
    if (cost > finances.budget*0.25) continue;
    managers.clubs[buyer.id] = { ...finances, budget: finances.budget-cost };
    const seller = managers.clubs[player.clubId];
    if (seller) managers.clubs[player.clubId] = { ...seller, budget: seller.budget+Math.floor(fee/1000) };
    if (deal.kind === "loan") loans[player.id] = { owner: { clubId: player.clubId, name: deal.sourceClub }, borrower: { clubId: buyer.id, name: buyer.name }, startsOn: input.date, endsOn: dateAfterMonths(input.date, 6), status: "active", source: "game", wageSharePercent: 50 };
    else delete loans[player.id];
    negotiations.unshift(deal);
    delete world.listings[player.id];
    rosters.set(player.clubId, (rosters.get(player.clubId) ?? []).filter(p => p.id !== player.id));
    rosters.set(buyer.id, [...roster, player]);
    moved.add(player.id); completed++;
    record(`${buyer.name} ${deal.kind === "loan" ? "recebeu por empréstimo" : "contratou"} ${player.name}${deal.sourceClubId ? `, do ${deal.sourceClub}` : ", livre de contrato"}.`);
  }
  // Recompute payroll from actual ownership/loan shares; keep the existing match economy.
  const effective = worldDatabase(input.database, negotiations, loans, world);
  const payroll: Record<string, number> = {};
  for (const p of effective.players) {
    const loan = p.loan;
    if (loan?.status === "active") {
      const share = (loan.wageSharePercent ?? 50)/100;
      if (loan.owner.clubId) payroll[loan.owner.clubId] = (payroll[loan.owner.clubId] ?? 0)+p.salaryMonthlyBrl*(1-share)/1000;
      if (loan.borrower.clubId) payroll[loan.borrower.clubId] = (payroll[loan.borrower.clubId] ?? 0)+p.salaryMonthlyBrl*share/1000;
    } else payroll[p.clubId] = (payroll[p.clubId] ?? 0)+p.salaryMonthlyBrl/1000;
  }
  for (const [id, club] of Object.entries(managers.clubs)) if (id !== input.humanClubId) managers.clubs[id] = { ...club, payroll: payroll[id] ?? 0 };
  // A vacancy waits at least one decision round; live job offers are never stolen.
  const occupied = new Set(Object.values(managers.clubs).map(c => c.coach).filter(Boolean));
  const pool = [...new Set([...db.clubs.map(c => c.coachName), ...managers.dismissals.map(d => d.coach)])].filter(name => name && !occupied.has(name));
  for (const club of db.clubs) {
    if (club.id === input.humanClubId || managers.clubs[club.id]?.coach !== null || managers.applications?.some(a => a.clubId === club.id && a.status === "offered" && a.expiresOn >= input.date) || hash(`${week}:${club.id}:coach`)%3 !== 0) continue;
    const index = pool.findIndex(name => !managers.dismissals.some(d => d.clubId === club.id && d.coach === name));
    if (index < 0) continue;
    const [name] = pool.splice(index, 1);
    const appointed = appointManager(managers, club.id, name);
    if (appointed) { managers = appointed; record(`${club.name} contratou o técnico ${name}.`); }
  }
  world.events = world.events.slice(0,100);
  return { world, managers, negotiations, loans };
}
