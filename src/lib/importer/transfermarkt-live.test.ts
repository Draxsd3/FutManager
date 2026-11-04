import { expect, it, vi } from "vitest";
import { collectNationalSnapshot, nationalCompetitions, normalizeLiveClub, resolveSeason, type LiveCheckpoint, type LiveRequest } from "./transfermarkt-live";
import { applyTransfermarktSnapshot } from "./transfermarkt";

function club(id = "614", count = 40) {
  return normalizeLiveClub({ id, name: `Club ${id}`, shortName: `C${id}`, colors: ["#ff0000", "#ffffff"], league: { countryName: "Brazil" }, stadium: null, coach: null },
    { id, players: Array.from({ length: count }, (_, i) => ({ id: String(Number(id) * 1000 + i + 1), name: `Player ${id}-${i}`, position: i ? "Central Midfield" : "Goalkeeper", age: null, dateOfBirth: "2000-12-10", shirtNumber: i + 1, foot: null, marketValue: null, contract: null })) }, id, "2026-11-04T12:00:00Z");
}
function source() {
  return vi.fn(async (body: LiveRequest): Promise<unknown> => {
    if (body.action === "seasons") return { id: body.competition, name: body.competition, seasons: [{ id: "2025", name: "2026" }, { id: "2024", name: "2025" }] };
    if (body.action === "members") {
      const index = nationalCompetitions.findIndex(c => c.id === body.competition);
      return { id: body.competition, name: body.competition, seasonId: body.season,
        clubs: Array.from({ length: nationalCompetitions[index].expected }, (_, i) => ({ id: String(index * 100 + i + 1), name: `Club ${index * 100 + i + 1}` })) };
    }
    if (body.action === "loans") return { loan: null };
    if (body.action === "honours") return [];
    return club(body.club, 11);
  });
}
it("resolves displayed 2026 to source ID 2025, never blindly passes the calendar year", () => {
  expect(resolveSeason({ id: "BRA1", name: "Série A", seasons: [{ id: "2025", name: "2026" }] }, "BRA1").seasonId).toBe("2025");
  expect(() => resolveSeason({ id: "BRA1", name: "A", seasons: [] }, "BRA1")).toThrow("ausente");
  expect(() => resolveSeason({ id: "BRA2", name: "B", seasons: [{ id: "2025", name: "2026" }] }, "BRA1")).toThrow("outra competição");
});
it("normalizes all 40 players, derives missing age from birth date and retains unknown facts", () => {
  const result = club();
  expect(result.players).toHaveLength(40);
  expect(result.players[0]).toMatchObject({ age: 25, foot: null, contractEndsOn: null, marketValueEur: null, dateOfBirth: "2000-12-10" });
  expect(result.colors).toEqual(["#ff0000", "#ffffff"]);
  expect(() => normalizeLiveClub({ id: "614", name: "Foreign", league: { countryName: "Argentina" } }, { id: "614", players: [] }, "614")).toThrow();
});
it("collects exactly 156 clubs from the four professional competitions with complete provenance", async () => {
  const request = source(), progress = vi.fn();
  const snapshot = await collectNationalSnapshot({ request, progress });
  expect(snapshot.clubs).toHaveLength(156);
  expect(snapshot.competitions?.map(c => c.seasonId)).toEqual(["2025", "2025", "2025", "2025"]);
  expect(request).toHaveBeenCalledTimes(164);
  expect(request.mock.calls.filter(([body]) => body.action !== "seasons").every(([body]) => "season" in body && body.season === "2025")).toBe(true);
  const imported = applyTransfermarktSnapshot({ clubs: [], players: [] }, snapshot, [], {});
  expect(imported.clubs).toHaveLength(156); expect(imported.players).toHaveLength(1716);
  expect(new Set(imported.players.map(p => p.overall)).size).toBeGreaterThan(10);
  expect(imported.players[0].transfermarkt?.modelVersion).toBe("provisional-national-v1");
  const again = applyTransfermarktSnapshot(imported, snapshot, [], {});
  expect(again.clubs).toEqual(imported.clubs); expect(again.players).toEqual(imported.players);
});
it("rejects missing membership before collecting any club", async () => {
  const request = source();
  request.mockImplementationOnce(async () => ({ id: "BRA1", name: "A", seasons: [{ id: "2025", name: "2026" }] }));
  request.mockImplementationOnce(async () => ({ id: "BRA1", name: "A", seasonId: "2025", clubs: [] }));
  await expect(collectNationalSnapshot({ request })).rejects.toThrow("esperados 20");
  expect(request).toHaveBeenCalledTimes(2);
});
it("keeps validated progress after failure and resumes without re-fetching completed clubs", async () => {
  const request = source();
  let saved: LiveCheckpoint | null = null;
  const good = source();
  request.mockImplementation(async body => {
    if (body.action === "club" && body.club === "3") throw new Error("HTTP 503");
    return good(body);
  });
  const save = async (value: LiveCheckpoint | null) => { saved = structuredClone(value); };
  await expect(collectNationalSnapshot({ request, save })).rejects.toThrow("retomar");
  expect(saved!.snapshot.clubs).toHaveLength(155);
  expect(saved!.issues).toEqual([{ clubId: "3", clubName: "Club 3", message: "HTTP 503" }]);
  const attempted = request.mock.calls.filter(([body]) => body.action === "club").map(([body]) => body.action === "club" ? body.club : "");
  expect(attempted.slice(-2)).toEqual(["396", "3"]);
  const resumed = source();
  const snapshot = await collectNationalSnapshot({ request: resumed, load: async () => saved, save });
  expect(snapshot.clubs).toHaveLength(156);
  expect(resumed.mock.calls[0][0]).toEqual({ action: "club", club: "3", season: "2025" });
  expect(resumed).toHaveBeenCalledTimes(1);
  expect(saved!.issues).toEqual([]);
});
it("honors cancellation before requests without publishing anything", async () => {
  const controller = new AbortController(); controller.abort();
  const request = source();
  await expect(collectNationalSnapshot({ request, signal: controller.signal })).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});
it("keeps UUIDs and custom assets after source names change, using durable external IDs", () => {
  const incoming = club();
  const snapshot = { version: 2, seasonId: "2026", generatedAt: incoming.fetchedAt,
    competitions: [{ id: "BRA1", name: "A", division: "Série A", seasonId: "2025" }],
    clubs: [{ ...incoming, competitionId: "BRA1", division: "Série A", country: "Brasil" }] };
  const first = applyTransfermarktSnapshot({ clubs: [], players: [] }, snapshot, [], {});
  first.clubs[0].name = "My custom club";
  first.clubs[0].primaryColor = "#000000";
  first.players[0].name = "Edited name";
  const second = applyTransfermarktSnapshot(first, snapshot, [], {});
  expect(second.clubs[0].id).toBe(first.clubs[0].id);
  expect(second.clubs[0].name).toBe("My custom club");
  expect(second.clubs[0].primaryColor).toBe("#000000");
  expect(second.players[0].id).toBe(first.players[0].id);
});
it("uses state and the source short name to distinguish Botafogo-PB from Botafogo-RJ", async () => {
  const { createDefaultDatabase } = await import("@/lib/game/editor-data");
  const base = createDefaultDatabase().clubs[0];
  const database = { clubs: [{ ...base, id: "rj", name: "Botafogo", state: "Rio de Janeiro" }, { ...base, id: "pb", name: "Botafogo PB", state: "Paraíba" }], players: [] };
  const incoming = { ...club("17964"), name: "Botafogo FC", shortName: "Botafogo-PB", state: "Paraíba", competitionId: "BRA3", division: "Série C", country: "Brasil" };
  const result = applyTransfermarktSnapshot(database, { version: 2, seasonId: "2026", generatedAt: incoming.fetchedAt, clubs: [incoming], competitions: [{ id: "BRA3", name: "C", division: "Série C", seasonId: "2025" }] }, [], {});
  expect(result.clubs).toHaveLength(2);
  expect(result.players.every(player => player.clubId === "pb")).toBe(true);
  expect(result.clubs.find(club => club.id === "rj")).toEqual(database.clubs[0]);
});

it("defers an incomplete player until all other clubs finish, then succeeds if the final retry resolves it", async () => {
  const good = source(), progress = vi.fn();
  let failedOnce = false;
  const request = vi.fn(async (body: LiveRequest) => {
    if (body.action === "club" && body.club === "201" && !failedOnce) {
      failedOnce = true;
      throw new Error("Figueirense / Maiky: idade/nascimento ou posição não informados.");
    }
    return good(body);
  });
  const result = await collectNationalSnapshot({ request, progress });
  expect(result.clubs).toHaveLength(156);
  const attempts = request.mock.calls.filter(([body]) => body.action === "club");
  expect(attempts).toHaveLength(157);
  expect(attempts.at(-1)?.[0]).toEqual({ action: "club", club: "201", season: "2025" });
  expect(progress.mock.calls.some(([message]) => message.includes("separado para revisão"))).toBe(true);
});
it("reports all persistent failures together and keeps healthy clubs staged without returning a partial snapshot", async () => {
  const good = source(); let saved: LiveCheckpoint | null = null;
  const request = vi.fn(async (body: LiveRequest) => {
    if (body.action === "club" && ["1", "201"].includes(body.club)) throw new Error(`Player ${body.club}: missing birth date`);
    return good(body);
  });
  await expect(collectNationalSnapshot({ request, save: async value => { saved = structuredClone(value); } })).rejects.toThrow(/154\/156.*2 clube/);
  expect(saved!.snapshot.clubs).toHaveLength(154);
  expect(saved!.issues?.map(issue => issue.clubId)).toEqual(["1", "201"]);
  const attempts = request.mock.calls.filter(([body]) => body.action === "club").map(([body]) => body.action === "club" ? body.club : "");
  expect(attempts.slice(-2)).toEqual(["1", "201"]);
});
it("stops immediately on pause during a club request without misclassifying it as a pending club", async () => {
  const controller = new AbortController(), good = source();
  let saved: LiveCheckpoint | null = null;
  const request = vi.fn(async (body: LiveRequest) => {
    if (body.action === "club" && body.club === "2") { controller.abort(); controller.signal.throwIfAborted(); }
    return good(body);
  });
  await expect(collectNationalSnapshot({ request, signal: controller.signal, save: async value => { saved = structuredClone(value); } })).rejects.toThrow();
  expect(saved!.snapshot.clubs).toHaveLength(1);
  expect(saved!.issues).toEqual([]);
  expect(request.mock.calls.filter(([body]) => body.action === "club")).toHaveLength(2);
});

it("checks all loan contracts automatically, defers failures and resumes only unverified identities", async () => {
  const good = source(); let saved: LiveCheckpoint | null = null;
  const request = vi.fn(async (body: LiveRequest) => {
    if (body.action === "loans" && body.player === "1001") throw new Error("API indisponível");
    return good(body);
  });
  const options = { request, enrichLoans: true, save: async (value: LiveCheckpoint | null) => { saved = structuredClone(value); } };
  await expect(collectNationalSnapshot(options)).rejects.toThrow("Contratos ainda não confirmados (1)");
  expect(request.mock.calls.filter(([body]) => body.action === "loans")).toHaveLength(1716);
  expect(saved!.loanChecks).toHaveLength(1715);
  const resumed = source();
  const snapshot = await collectNationalSnapshot({ ...options, request: resumed, load: async () => saved });
  expect(resumed).toHaveBeenCalledTimes(1); expect(resumed).toHaveBeenCalledWith({ action: "loans", player: "1001" }, undefined);
  expect(snapshot.clubs.every(club => club.players.every(player => player.loan === null))).toBe(true);
});
it("resolves loan owner/borrower local IDs without creating foreign clubs or mixing ordinary contracts", () => {
  const incoming = club("614", 11);
  incoming.players[0].loan = { owner: { externalId: "999", name: "Proprietário estrangeiro" }, borrower: { externalId: "614", name: incoming.name }, startsOn: "2025-07-01", endsOn: "2026-06-30", status: "active", source: "transfermarkt" };
  const db = applyTransfermarktSnapshot({ clubs: [], players: [] }, { version: 2, seasonId: "2026", generatedAt: incoming.fetchedAt, clubs: [{ ...incoming, competitionId: "BRA1", division: "Série A", country: "Brasil" }], competitions: [{ id: "BRA1", name: "A", division: "Série A", seasonId: "2025" }] }, [], {});
  expect(db.clubs).toHaveLength(1);
  expect(db.players[0].loan).toMatchObject({ owner: { externalId: "999" }, borrower: { clubId: db.clubs[0].id }, endsOn: "2026-06-30" });
  expect(db.players[0].loan?.owner.clubId).toBeUndefined();
  expect(db.players[0].contractEndsOn).not.toBe("2026-06-30");
});

it("collects every club gallery, defers a failure and resumes just the missing history", async () => {
  const good = source(); let saved: LiveCheckpoint | null = null;
  const request = vi.fn(async (body: LiveRequest) => {
    if (body.action === "honours" && body.club === "1") throw new Error("Fonte indisponível");
    return good(body);
  });
  const save = async (value: LiveCheckpoint | null) => { saved = structuredClone(value); };
  await expect(collectNationalSnapshot({ request, save, enrichHonours: true })).rejects.toThrow("Galerias pendentes (1)");
  expect(request.mock.calls.filter(([body]) => body.action === "honours")).toHaveLength(156);
  const resumed = source();
  const snapshot = await collectNationalSnapshot({ request: resumed, save, load: async () => saved, enrichHonours: true });
  expect(resumed).toHaveBeenCalledTimes(1);
  expect(snapshot.clubs.every(club => Array.isArray(club.honours))).toBe(true);
});
