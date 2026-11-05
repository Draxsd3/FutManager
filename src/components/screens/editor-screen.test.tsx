// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import { EditorScreen } from "./editor-screen";
vi.mock("./kit-studio", () => ({
  KitStudio: ({ club, userId }: { club: { name: string }; userId: string }) => (
    <section aria-label="estúdio ativo">
      {userId}:{club.name}
    </section>
  ),
}));
afterEach(cleanup);
it("switches between clubs and kit studio while preserving squad/club editing", () => {
  function Wrapper() {
    const [database, setDatabase] = useState(createDefaultDatabase);
    return (
      <EditorScreen
        userId="alice"
        database={database}
        onChange={setDatabase}
        onBack={vi.fn()}
        syncLabel="Salvo"
      />
    );
  }
  render(<Wrapper />);
  expect(
    screen.getByRole("heading", { name: "Editar universo" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clubes e jogadores" }));
  fireEvent.click(screen.getByRole("button", { name: /Corinthians.*Brasil/ }));
  fireEvent.click(screen.getByRole("button", { name: /Estúdio de uniformes/ }));
  expect(screen.getByLabelText("estúdio ativo").textContent).toBe(
    "alice:Corinthians",
  );
  fireEvent.click(screen.getByRole("button", { name: /Palmeiras.*Brasil/ }));
  expect(screen.getByLabelText("estúdio ativo").textContent).toBe(
    "alice:Palmeiras",
  );
  fireEvent.click(screen.getByRole("button", { name: /Elenco e jogadores/ }));
  expect(screen.getByRole("table")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "editar" }));
  expect(screen.getByRole("dialog", { name: "Editar equipe" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: "Palmeiras FC" },
  });
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("Palmeiras FC", { selector: "strong" })).toBeTruthy();
});


it("prepares an uploaded Transfermarkt JSON without changing the active catalog", async () => {
  const { default: source } = await import("@/data/transfermarkt/brasileirao-2026.json");
  const save = vi.spyOn(await import("@/lib/importer/database-cache"), "saveTransfermarktCheckpoint").mockResolvedValue();
  const change = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<EditorScreen userId="alice" database={createDefaultDatabase()} syncLabel="Salvo" onChange={change} onBack={vi.fn()} onSynchronize={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Dados e importação" }));
  const file = new File(["file"], "base.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => JSON.stringify(source) });
  fireEvent.change(screen.getByLabelText("Selecionar JSON do Transfermarkt"), { target: { files: [file] } });
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save).toHaveBeenCalledWith("alice", expect.objectContaining({ collectionVersion: 2, members: expect.arrayContaining([expect.any(Object)]) }));
  expect(screen.getByText(/74 clubes válidos e 82 com pendências/)).toBeTruthy();
  expect(change).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

it("rejects invalid JSON and leaves catalog untouched", async () => {
  const change = vi.fn();
  render(<EditorScreen userId="alice" database={createDefaultDatabase()} syncLabel="Salvo" onChange={change} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Dados e importação" }));
  const file = new File(["{"], "bad.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => "{" });
  fireEvent.change(screen.getByLabelText("Selecionar JSON do Transfermarkt"), { target: { files: [file] } });
  expect(await screen.findByText(/Não foi possível preparar o JSON/)).toBeTruthy();
  expect(change).not.toHaveBeenCalled();
});
