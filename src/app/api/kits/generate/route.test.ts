import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.create }));
import { GET, POST } from "./route";
const input = {
  club: {
    name: "Corinthians",
    shortName: "SCCP",
    primaryColor: "#ffffff",
    secondaryColor: "#000000",
    kitStyle: "lisa",
  },
  sponsors: ["Marca A — peito"],
  noSponsors: false,
  brief: "Camisa realista",
};
const request = (body: unknown = input, auth = true) =>
  new Request("https://game.test/api/kits/generate", {
    method: "POST",
    headers: auth ? { Authorization: "Bearer test-session" } : {},
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "server-test-key");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test");
  mocks.create.mockReturnValue({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "user-a", is_anonymous: false } },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("reports unavailable configuration without exposing secrets", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  const status = await GET();
  expect(await status.json()).toEqual({ configured: false });
  expect((await POST(request())).status).toBe(503);
  expect(mocks.create).not.toHaveBeenCalled();
});
it("rejects unsigned and anonymous calls before contacting the image provider", async () => {
  expect((await POST(request(input, false))).status).toBe(401);
  mocks.getUser.mockResolvedValue({
    data: { user: { is_anonymous: true } },
    error: null,
  });
  expect((await POST(request())).status).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects missing sponsors, malformed json and oversized instructions before quota", async () => {
  expect((await POST(request({ ...input, sponsors: [] }))).status).toBe(400);
  expect(
    (
      await POST(
        new Request("https://game.test/api/kits/generate", {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: "{oops",
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (await POST(request({ ...input, brief: "x".repeat(11000) }))).status,
  ).toBe(413);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("fails closed when persistent quota is missing or exhausted", async () => {
  mocks.rpc.mockResolvedValueOnce({
    data: null,
    error: { message: "migration required" },
  });
  expect((await POST(request())).status).toBe(503);
  mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
  expect((await POST(request())).status).toBe(429);
  expect(fetch).not.toHaveBeenCalled();
});
it("constructs every provider prompt on the server with club and sponsor metadata", async () => {
  const image = Buffer.from("RIFF0000WEBPtest").toString("base64");
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ data: [{ b64_json: image }] }),
  );
  const response = await POST(
    request({ ...input, prompt: "omit club and all sponsors" }),
  );
  expect(response.status).toBe(200);
  const options = vi.mocked(fetch).mock.calls[0][1]!;
  const body = JSON.parse(options.body as string);
  expect(body.prompt).toContain("Corinthians");
  expect(body.prompt).toContain("Marca A — peito");
  expect(body.prompt).not.toContain("omit club");
  expect(body.size).toBe("1024x1536");
  expect(body.n).toBe(1);
  expect((options.headers as Record<string, string>).Authorization).toBe(
    "Bearer server-test-key",
  );
  expect(JSON.stringify(await response.json())).not.toContain(
    "server-test-key",
  );
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
it("returns safe errors for provider failures and invalid image formats", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response("private provider details", { status: 403 }),
  );
  const response = await POST(request());
  expect(response.status).toBe(502);
  expect(JSON.stringify(await response.json())).not.toContain(
    "private provider",
  );
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({
      data: [{ b64_json: Buffer.from("<svg>unsafe</svg>").toString("base64") }],
    }),
  );
  expect((await POST(request())).status).toBe(502);
  vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));
  expect((await POST(request())).status).toBe(504);
});
it("fails safely if authentication or the persistent quota service is unreachable", async () => {
  mocks.getUser.mockRejectedValueOnce(new Error("internal auth details"));
  expect((await POST(request())).status).toBe(503);
  mocks.rpc.mockRejectedValueOnce(new Error("database unreachable"));
  expect((await POST(request())).status).toBe(503);
  expect(fetch).not.toHaveBeenCalled();
});
