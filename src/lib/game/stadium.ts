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
