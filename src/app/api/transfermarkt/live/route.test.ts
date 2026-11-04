import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser: auth } }) }));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
  auth.mockResolvedValue({ data: { user: { id: "test", is_anonymous: false } }, error: null });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
const request = (body: unknown, token = true) => new Request("https://game.example/api/transfermarkt/live", { method: "POST", headers: token ? { Authorization: "Bearer session" } : {}, body: JSON.stringify(body) });
it("requires authenticated non-anonymous accounts", async () => {
  expect((await POST(request({ action: "seasons", competition: "BRA1" }, false))).status).toBe(401);
  auth.mockResolvedValue({ data: { user: { id: "test", is_anonymous: true } } });
  expect((await POST(request({ action: "seasons", competition: "BRA1" }))).status).toBe(401);
});
it("does not proxy arbitrary URLs or competitions outside A/B/C/D", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect((await POST(request({ action: "seasons", competition: "CB20", url: "http://localhost/secret" }))).status).toBe(400);
  expect((await POST(request({ action: "club", club: "../../secret", season: "2025" }))).status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
it("queries only the fixed deployed API host, with source season IDs, bounded timeout and no redirects", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ clubs: [] })));
  vi.stubGlobal("fetch", fetcher);
  const response = await POST(request({ action: "members", competition: "BRA1", season: "2025" }));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(fetcher).toHaveBeenCalledWith("https://transfermarkt-api-umber.vercel.app/competitions/BRA1/clubs?season_id=2025", expect.objectContaining({ cache: "no-store", redirect: "error", signal: expect.any(AbortSignal) }));
});
it("reports upstream failure instead of returning a successful empty catalog", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("limited", { status: 429 })));
  const response = await POST(request({ action: "seasons", competition: "BRA1" }));
  expect(response.status).toBe(502);
  expect((await response.json()).error).toContain("429");
});

it("enriches loans from a single authenticated fixed-host history query, not a guessed contract end", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "1", transfers: [{ clubFrom: { id: "10", name: "Origem" }, clubTo: { id: "20", name: "Destino" }, date: "2025-07-01", transferType: "loan", contractUntil: "2030-12-31" }] })));
  vi.stubGlobal("fetch", fetcher);
  const response = await POST(request({ action: "loans", player: "1" }));
  expect(response.status).toBe(200); expect((await response.json()).loan.endsOn).toBeNull();
  expect(fetcher).toHaveBeenCalledWith("https://transfermarkt-api-umber.vercel.app/players/1/transfers", expect.objectContaining({ redirect: "error" }));
  expect((await POST(request({ action: "loans", player: "../secret" }))).status).toBe(400);
});
