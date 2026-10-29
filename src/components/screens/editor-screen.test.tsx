// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    screen.getByRole("heading", { name: "Editor de clubes." }),
  ).toBeTruthy();
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
