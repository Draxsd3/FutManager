// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createDefaultDatabase } from "@/lib/game/editor-data";
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  session: vi.fn(),
}));
vi.mock("@/lib/kits/storage", () => ({
  readKitProject: mocks.read,
  writeKitProject: mocks.write,
}));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({ auth: { getSession: mocks.session } }),
}));
import { KitStudio } from "./kit-studio";
const club = createDefaultDatabase().clubs.find(
  (c) => c.name === "Corinthians",
)!;
beforeEach(() => {
  mocks.read.mockResolvedValue({ sponsors: [], noSponsors: false, kits: [] });
  mocks.write.mockResolvedValue(undefined);
  mocks.session.mockResolvedValue({
    data: { session: { access_token: "browser-test-session" } },
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(Response.json({ configured: false })),
      ),
  );
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
it("preserves the three existing kits and honestly disables unconfigured AI", async () => {
  render(<KitStudio club={club} userId="alice" />);
  await screen.findByText(/Biblioteca local pronta/);
  expect(screen.getAllByAltText(/Uniforme .* existente/)).toHaveLength(3);
  expect(screen.getByText(/IA não configurada/)).toBeTruthy();
  expect(
    (
      screen.getByRole("button", {
        name: /Gerar novo modelo/,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(mocks.read).toHaveBeenCalledWith("alice", club.id);
  expect(screen.getByText("CRIADOR MANUAL / NÃO É IA")).toBeTruthy();
});
it("requires sponsor confirmation, saves a manual model and includes club/sponsors in the visible prompt", async () => {
  render(<KitStudio club={club} userId="alice" />);
  await screen.findByText(/Biblioteca local pronta/);
  fireEvent.click(screen.getByRole("button", { name: "Adicionar à coleção" }));
  expect(screen.getByRole("status").textContent).toContain(
    "Confirme os patrocínios",
  );
  fireEvent.change(screen.getByLabelText("Patrocínios e posições"), {
    target: { value: "Marca A — peito\nMarca B — mangas" },
  });
  const prompt = screen.getByLabelText(
    "Prompt completo",
  ) as HTMLTextAreaElement;
  expect(prompt.value).toContain("Corinthians");
  expect(prompt.value).toContain("Marca A — peito");
  expect(prompt.value).toContain("Marca B — mangas");
  fireEvent.change(screen.getByLabelText("Nome do modelo"), {
    target: { value: "Conceito da torcida" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar à coleção" }));
  await screen.findByText(
    "Modelo adicionado à coleção local. Os três uniformes existentes não foram substituídos.",
  );
  expect(mocks.write).toHaveBeenCalledWith(
    "alice",
    club.id,
    expect.objectContaining({
      sponsors: ["Marca A — peito", "Marca B — mangas"],
      kits: [
        expect.objectContaining({
          name: "Conceito da torcida",
          source: "manual",
          image: expect.stringContaining("data:image/svg+xml"),
        }),
      ],
    }),
  );
  expect(screen.getAllByAltText(/Uniforme .* existente/)).toHaveLength(3);
});
it("sends structured identity data instead of a replaceable free-form prompt and stages AI for review", async () => {
  vi.mocked(fetch).mockImplementation((_url, options) =>
    Promise.resolve(
      Response.json(
        options?.method === "POST"
          ? {
              image: "data:image/webp;base64,UklGRjAwMDBXRUJQdGVzdA==",
              prompt: "Corinthians + Marca A",
            }
          : { configured: true },
      ),
    ),
  );
  render(<KitStudio club={club} userId="alice" />);
  await screen.findByText(/Biblioteca local pronta/);
  fireEvent.change(screen.getByLabelText("Patrocínios e posições"), {
    target: { value: "Marca A" },
  });
  const button = screen.getByRole("button", { name: /Gerar novo modelo/ });
  await waitFor(() =>
    expect((button as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(button);
  await screen.findByText("CONCEITO GERADO POR IA");
  const calls = vi
    .mocked(fetch)
    .mock.calls.filter(([, options]) => options?.method === "POST");
  expect(calls).toHaveLength(1);
  const body = JSON.parse(calls[0][1]!.body as string);
  expect(body.club.name).toBe("Corinthians");
  expect(body.sponsors).toEqual(["Marca A"]);
  expect(body.prompt).toBeUndefined();
  expect(
    mocks.write.mock.calls.every(([, , project]) => project.kits.length === 0),
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Adicionar à coleção" }));
  await waitFor(() =>
    expect(mocks.write).toHaveBeenLastCalledWith(
      "alice",
      club.id,
      expect.objectContaining({
        kits: [
          expect.objectContaining({
            source: "ai",
            prompt: "Corinthians + Marca A",
          }),
        ],
      }),
    ),
  );
});
it("does not announce a successful save when browser storage fails", async () => {
  mocks.write.mockRejectedValue(new Error("quota exceeded"));
  render(<KitStudio club={club} userId="bob" />);
  await screen.findByText(/Biblioteca local pronta/);
  fireEvent.click(
    screen.getByLabelText("Confirmo que este modelo não terá patrocinadores"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Adicionar à coleção" }));
  await screen.findByText(/Não foi possível salvar/);
  expect(screen.queryByText(/Modelo adicionado/)).toBeNull();
});
