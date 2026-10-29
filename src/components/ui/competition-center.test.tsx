// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CompetitionCenter } from "./competition-center";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import { buildCompetitionCatalog } from "@/lib/game/competitions";

afterEach(cleanup);
it("browses other divisions and categories without fabricating results or registrations", () => {
  const database = createDefaultDatabase();
  const other = {
    ...database.clubs[0],
    id: "other",
    name: "Clube Visitante",
    division: "Série B" as const,
  };
  database.clubs.push(other);
  const catalog = buildCompetitionCatalog(database);
  expect(new Set(catalog.map((entry) => entry.id)).size).toBe(catalog.length);
  expect(catalog.filter((entry) => entry.category === "state")).toHaveLength(
    27,
  );
  const close = vi.fn();
  render(
    <CompetitionCenter
      club={database.clubs[0].name}
      competition={database.clubs[0].division}
      database={database}
      table={[]}
      topScorers={[]}
      topRatings={[]}
      fixtures={[]}
      round={1}
      onClose={close}
    />,
  );
  expect(screen.getByRole("dialog")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: /Brasileirão · Série B/ }),
  );
  expect(screen.getByRole("table").textContent).toContain("Clube Visitante");
  expect(
    screen.getByRole("table").querySelector("tbody tr td")?.textContent,
  ).toBe("—");
  fireEvent.click(screen.getByRole("button", { name: "Internacional" }));
  fireEvent.click(
    screen.getByRole("button", { name: /CONMEBOL Libertadores/ }),
  );
  expect(screen.getByText("Tabela ainda não disponível")).toBeTruthy();
  expect(screen.queryByRole("table")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Rodadas" }));
  expect(screen.getByText("Calendário não cadastrado")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Seleções" }));
  expect(screen.getByRole("button", { name: /Copa do Mundo/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Estadual" }));
  fireEvent.change(screen.getByLabelText("Buscar campeonato"), {
    target: { value: "Paulista" },
  });
  expect(
    screen.getByRole("heading", { name: "Campeonato Paulista" }),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Buscar campeonato"), {
    target: { value: "xxxx" },
  });
  expect(screen.getByText("Nenhuma competição encontrada")).toBeTruthy();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalledOnce();
});
it("restores focus and body scrolling after closing", () => {
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  const database = createDefaultDatabase();
  const view = render(
    <CompetitionCenter
      club={database.clubs[0].name}
      competition={database.clubs[0].division}
      database={database}
      table={[]}
      topScorers={[]}
      topRatings={[]}
      fixtures={[]}
      round={1}
      onClose={vi.fn()}
    />,
  );
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Fechar central de competições" }),
  );
  expect(document.body.style.overflow).toBe("hidden");
  view.unmount();
  expect(document.activeElement).toBe(trigger);
  expect(document.body.style.overflow).toBe("");
  trigger.remove();
});
