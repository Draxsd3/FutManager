export function simulateGate(
  capacity: number,
  occupancy: number,
  ticketPrice: number,
  operatingCost: number,
) {
  const safe = (value: number) =>
    Number.isFinite(value) ? Math.max(0, value) : 0;
  const audience = Math.floor(
    (safe(capacity) * Math.min(100, safe(occupancy))) / 100,
  );
  const gross = audience * safe(ticketPrice);
  return { audience, gross, net: gross - safe(operatingCost) };
}

/** Simplified career model. Amounts are in reais; career budgets are in thousands of reais. */
export const STADIUM_SECTORS = [
  { id: "popular", name: "Popular", share: 50, initialPrice: 30 },
  { id: "arquibancada", name: "Arquibancada", share: 30, initialPrice: 50 },
  { id: "cadeiras", name: "Cadeiras", share: 15, initialPrice: 80 },
  { id: "camarotes", name: "Camarotes", share: 5, initialPrice: 150 },
] as const;
export type StadiumSector = typeof STADIUM_SECTORS[number]["id"];
export const EXPANSIONS = [
  { seats: 1000, cost: 1000000, days: 30 },
  { seats: 5000, cost: 5000000, days: 90 },
  { seats: 10000, cost: 10000000, days: 180 },
] as const;
export type GateReceipt = { fixtureId: string; date: string; opponent: string; audience: number; gross: number; costs: number; net: number };
export type StadiumState = {
  prices: Record<StadiumSector, number>;
  addedCapacity: number;
  construction?: { seats: number; cost: number; startedOn: string; endsOn: string };
  receipts: GateReceipt[];
};
export function newStadium(): StadiumState {
  return { prices: { popular: 30, arquibancada: 50, cadeiras: 80, camarotes: 150 }, addedCapacity: 0, receipts: [] };
}
export function finishConstruction(state: StadiumState, date: string): StadiumState {
  if (!state.construction || date < state.construction.endsOn) return state;
  return { ...state, addedCapacity: state.addedCapacity + state.construction.seats, construction: undefined };
}
export function stadiumCapacity(base: number, state: StadiumState, date: string): number {
  return Math.max(0, Math.floor(base || 0)) + finishConstruction(state, date).addedCapacity;
}
/** Sector capacity uses largest remainder so the split always adds up to the actual stadium capacity. */
export function sectorCapacities(capacity: number): Record<StadiumSector, number> {
  const total = Number.isFinite(capacity) ? Math.max(0, Math.floor(capacity)) : 0;
  const shares = STADIUM_SECTORS.map(sector => ({ id: sector.id, exact: total * sector.share / 100, seats: Math.floor(total * sector.share / 100) }));
  let remaining = total - shares.reduce((sum, item) => sum + item.seats, 0);
  for (const item of [...shares].sort((a, b) => (b.exact - b.seats) - (a.exact - a.seats))) {
    if (remaining-- <= 0) break;
    item.seats++;
  }
  return Object.fromEntries(shares.map(item => [item.id, item.seats])) as Record<StadiumSector, number>;
}
export function projectStadiumGate(capacity: number, prices: StadiumState["prices"], occupancy = 70) {
  const seats = sectorCapacities(capacity);
  const percent = Number.isFinite(occupancy) ? Math.max(0, Math.min(100, occupancy)) : 0;
  const sectors = STADIUM_SECTORS.map(sector => {
    const audience = Math.floor(seats[sector.id] * percent / 100);
    const price = Number.isFinite(prices[sector.id]) ? Math.max(0, prices[sector.id]) : 0;
    return { ...sector, capacity: seats[sector.id], audience, gross: Math.round(audience * price) };
  });
  const audience = sectors.reduce((sum, item) => sum + item.audience, 0);
  const gross = sectors.reduce((sum, item) => sum + item.gross, 0);
  const costs = Math.round(gross * 0.1);
  return { sectors, audience, gross, costs, net: gross - costs };
}
export function setSectorPrice(state: StadiumState, sector: StadiumSector, price: number): StadiumState {
  if (!STADIUM_SECTORS.some(item => item.id === sector) || !Number.isFinite(price) || price < 0 || price > 10000) return state;
  return { ...state, prices: { ...state.prices, [sector]: Math.round(price * 100) / 100 } };
}
export function startExpansion(state: StadiumState, seats: number, date: string, budget: number): { state: StadiumState; budget: number; error?: string } {
  const settled = finishConstruction(state, date);
  const option = EXPANSIONS.find(item => item.seats === seats);
  if (settled.construction) return { state, budget, error: "Já existe uma obra em andamento." };
  if (!option || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`))) return { state, budget, error: "Projeto ou data inválidos." };
  if (!Number.isFinite(budget) || budget * 1000 < option.cost) return { state, budget, error: "Caixa insuficiente para esta obra." };
  const end = new Date(`${date}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + option.days);
  return { state: { ...settled, construction: { ...option, startedOn: date, endsOn: end.toISOString().slice(0, 10) } }, budget: budget - option.cost / 1000 };
}
export function recordGate(state: StadiumState, baseCapacity: number, date: string, fixtureId: string, opponent: string): { state: StadiumState; receipt?: GateReceipt } {
  if (!fixtureId || state.receipts.some(item => item.fixtureId === fixtureId)) return { state };
  const settled = finishConstruction(state, date);
  const { audience, gross, costs, net } = projectStadiumGate(stadiumCapacity(baseCapacity, settled, date), settled.prices);
  const receipt = { fixtureId, date, opponent, audience, gross, costs, net };
  return { state: { ...settled, receipts: [...settled.receipts, receipt] }, receipt };
}
