import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser: auth } }) }));
const request = (body: unknown, token = true) => new Request("https://game.example/api/transfermarkt/youth", { method: "POST", headers: token ? { Authorization: "Bearer session" } : {}, body: JSON.stringify(body) });
beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test"); auth.mockResolvedValue({ data: { user: { id: "u", is_anonymous: false } }, error: null }); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("requires authentication and disallows arbitrary URLs", async () => {
  expect((await POST(request({ club: "1" }, false))).status).toBe(401);
  expect((await POST(request({ club: "../private" }))).status).toBe(400);
});
it("only imports a uniquely identified Brazilian under-20 club, marking missing positions", async () => {
  const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/1/profile") ? { id: "1", name: "CR Flamengo" } : url.includes("/search/") ? { results: [{ id: "2", name: "CR Flamengo U20", country: "Brazil" }, { id: "3", name: "AA Flamengo U20", country: "Brazil" }], lastPageNumber: 1 } : { id: "2", players: [{ id: "42", name: "Lucas Lima", age: 18, position: null }] })));
  vi.stubGlobal("fetch", fetcher);
  const result = await POST(request({ club: "1" }));
  expect(result.status).toBe(200);
  expect((await result.json()).players).toMatchObject([{ id: "42", position: "M", positionEstimated: true }]);
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("does not guess when multiple youth clubs match", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/profile") ? { id: "1", name: "Clube" } : { results: [{ id: "2", name: "Clube U20", country: "Brazil" }, { id: "3", name: "Clube U20", country: "Brazil" }] }))));
  const body = await (await POST(request({ club: "1" }))).json();
  expect(body.players).toEqual([]); expect(body.reason).toMatch(/ambígua/);
});
