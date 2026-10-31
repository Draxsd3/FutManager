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
  expect(screen.getByRole("img", { name: /Troféu Brasileirão · Série A/ }).getAttribute("src")).toContain("tr_nacional_BRA_d1.png");
  fireEvent.click(
    screen.getByRole("button", { name: /Brasileirão · Série B/ }),
  );
  expect(screen.getByRole("table").textContent).toContain("Clube Visitante");
  expect(
    screen.getByRole("table").querySelector("tbody tr td")?.textContent,
  ).toBe("—");

  expect(screen.queryByRole("button", { name: "Internacional" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Seleções" })).toBeNull();
  for (const division of ["C", "D"]) {
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`Brasileirão · Série ${division}`) }));
    expect(screen.getByRole("table")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Rodadas" }));
    expect(screen.getByText("Calendário não cadastrado")).toBeTruthy();
  }
  fireEvent.click(screen.getByRole("button", { name: /Copa do Brasil/ }));
  expect(screen.getByRole("img", { name: "Troféu Copa do Brasil" }).getAttribute("src")).toContain("tr_copa_BRA.png");

  expect(screen.getByRole("table")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Regional" }));
  expect(screen.getByText("Tabela ainda não disponível")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Copa do Nordeste/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Copa Verde/ })).toBeTruthy();
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
it("shows only persisted career results for an active knockout competition", () => {
  const database = createDefaultDatabase();
  render(
    <CompetitionCenter
      club="Flamengo"
      competition="Série A"
      activeCompetitionId="national:Copa do Brasil"
      careerCompetitionData={{
        "national:Copa do Brasil": {
          type: "cup",
          table: [],
          fixtures: [
            { home: "Flamengo", away: "Palmeiras", stadium: "Maracanã", attendance: 0, homeScore: 2, awayScore: 1, played: true, roundLabel: "Oitavas de final" },
            { home: "Santos", away: "Bahia", stadium: "Vila Belmiro", attendance: 0, homeScore: 0, awayScore: 0, played: false, roundLabel: "Oitavas de final" },
          ],
          topScorers: [{ name: "Atacante", club: "Flamengo", goals: 2, played: 1 }],
          topRatings: [],
          matchesPlayed: 1,
          goals: 3,
        },
      }}
      database={database}
      table={[]}
      topScorers={[]}
      topRatings={[]}
      fixtures={[]}
      round={1}
      onClose={vi.fn()}
    />,
  );
  expect(screen.getByText("Mata-mata sem tabela de pontos")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Rodadas" }));
  expect(screen.getByText("2 × 1")).toBeTruthy();
  expect(screen.getByText("—")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Estatísticas" }));
  expect(screen.getByText("Artilharia")).toBeTruthy();
  expect(screen.getAllByText("Atacante")).toHaveLength(2);
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
