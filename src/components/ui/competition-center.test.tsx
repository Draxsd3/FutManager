// @vitest-environment jsdom
import { readFileSync } from "node:fs";
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

  expect(screen.getByRole("region", { name: "Confrontos do mata-mata" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Regional" }));
  expect(screen.getByText("Tabela ainda não disponível")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Copa do Nordeste/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Copa Verde/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Estadual" }));
  fireEvent.click(screen.getByRole("button", { name: "Buscar campeonatos" }));
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
  expect(screen.getByRole("region", { name: "Confrontos do mata-mata" })).toBeTruthy();
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


it("keeps only trophy and competition title above the table with icon-only search and close", () => {
  const database = createDefaultDatabase();
  const close = vi.fn();
  render(<CompetitionCenter club={database.clubs[0].name} competition={database.clubs[0].division} database={database} fixtures={[]} table={[]} topScorers={[]} topRatings={[]} round={1} onClose={close} />);
  expect(screen.queryByText("Clubes cadastrados")).toBeNull();
  expect(screen.queryByText("Média de gols")).toBeNull();
  expect(screen.queryByText("EXPLORAR CAMPEONATOS")).toBeNull();
  expect(screen.queryByText("País / região")).toBeNull();
  expect(screen.getByRole("heading", { level: 2 }).parentElement?.textContent).toBe(screen.getByRole("heading", { level: 2 }).textContent);
  expect(screen.queryByRole("searchbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Buscar campeonatos" }));
  const search = screen.getByRole("searchbox", { name: "Buscar campeonato" });
  expect(document.activeElement).toBe(search);
  fireEvent.change(search, { target: { value: "não existe" } });
  expect(screen.getByText("Nenhuma competição encontrada")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Buscar campeonatos" }));
  expect(screen.getByRole("table")).toBeTruthy();
  const button = screen.getByRole("button", { name: "Fechar central de competições" });
  expect(button.textContent).toBe("×");
  fireEvent.click(button);
  expect(close).toHaveBeenCalledOnce();
});

it("shows accessible 2026 base bands for a real twenty-team Série A table only", () => {
  const database = createDefaultDatabase();
  const clubs = Array.from({ length: 20 }, (_, i) => ({ club: `Clube ${String(i + 1).padStart(2, "0")}`, played: 1, wins: 0, draws: 1, losses: 0, goalsFor: 1, goalsAgainst: 1, points: 20 - i }));
  const data = { type: "league" as const, seasonYear: 2026, table: clubs, fixtures: [{ home: clubs[0].club, away: clubs[1].club, stadium: "Campo", attendance: 0, homeScore: 1, awayScore: 1, played: true, roundLabel: "1ª rodada" }], topScorers: [], topRatings: [], matchesPlayed: 1, goals: 2 };
  const props = { club: clubs[0].club, competition: "Série A", database, table: [], fixtures: [], topScorers: [], topRatings: [], round: 1, onClose: vi.fn() };
  const view = render(<CompetitionCenter {...props} careerCompetitionData={{ "league:Brasil:Série A": data }} />);
  const rows = screen.getByRole("table").querySelectorAll("tbody tr");
  expect(rows).toHaveLength(20);
  expect([...rows].map(row => row.getAttribute("data-zone"))).toEqual(["libertadores-grupos", "libertadores-grupos", "libertadores-grupos", "libertadores-grupos", "libertadores-preliminar", ...Array(6).fill("sul-americana"), ...Array(5).fill(null), ...Array(4).fill("rebaixamento")]);
  expect(screen.getByLabelText("Legenda das faixas de classificação")).toBeTruthy();
  expect(screen.getByText(/Vagas podem mudar por outras competições/)).toBeTruthy();
  expect(rows[0].textContent).toContain("Libertadores · fase de grupos (faixa-base)");
  expect(screen.getAllByLabelText(/Empate: Clube 01 1 × 1 Clube 02/)[0]).toBeTruthy();
  view.rerender(<CompetitionCenter {...props} careerCompetitionData={{ "league:Brasil:Série A": { ...data, seasonYear: 2027 } }} />);
  expect(screen.getByLabelText("Legenda das faixas de classificação")).toBeTruthy();
  expect(screen.getByText(/também usadas como referência nas temporadas seguintes/)).toBeTruthy();
  view.rerender(<CompetitionCenter {...props} careerCompetitionData={{ "league:Brasil:Série A": { ...data, table: clubs.slice(0, 19) } }} />);
  expect(screen.queryByLabelText("Legenda das faixas de classificação")).toBeNull();
  view.rerender(<CompetitionCenter {...props} careerCompetitionData={{ "league:Brasil:Série A": { ...data, table: clubs.map(row => ({ ...row, played: 0 })) } }} />);
  expect(screen.getByLabelText("Legenda das faixas de classificação")).toBeTruthy();
  expect(screen.getByRole("table").querySelector("tbody tr")?.getAttribute("data-zone")).toBe("libertadores-grupos");
});

it("shows Série B direct promotion, playoffs and relegation even before the first round", () => {
  const database = createDefaultDatabase();
  const clubs = Array.from({ length: 20 }, (_, i) => ({ club: `Clube B ${String(i + 1).padStart(2, "0")}`, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }));
  const data = { type: "league" as const, seasonYear: 2026, table: clubs, fixtures: [], topScorers: [], topRatings: [], matchesPlayed: 0, goals: 0 };
  render(<CompetitionCenter club={clubs[0].club} competition="Série B" database={database} table={[]} fixtures={[]} topScorers={[]} topRatings={[]} round={1} onClose={vi.fn()} careerCompetitionData={{ "league:Brasil:Série B": data }} />);
  const rows = screen.getByRole("table").querySelectorAll("tbody tr");
  expect([...rows].map(row => row.getAttribute("data-zone"))).toEqual(["acesso", "acesso", ...Array(4).fill("playoff-acesso"), ...Array(10).fill(null), ...Array(4).fill("rebaixamento")]);
  expect(screen.getByLabelText("Legenda das faixas de classificação").textContent).toContain("Playoff de acesso");
  expect(screen.getByText(/não garantem implementação desses desfechos/)).toBeTruthy();
});

it("renders the full standings table without an internal vertical scroll container", () => {
  const database = createDefaultDatabase();
  const clubs = Array.from({ length: 20 }, (_, i) => ({ club: `Clube ${String(i + 1).padStart(2, "0")}`, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }));
  const data = { type: "league" as const, seasonYear: 2026, table: clubs, fixtures: [], topScorers: [], topRatings: [], matchesPlayed: 0, goals: 0 };
  render(<CompetitionCenter club={clubs[0].club} competition="Série A" database={database} table={[]} fixtures={[]} topScorers={[]} topRatings={[]} round={2} onClose={vi.fn()} careerCompetitionData={{ "league:Brasil:Série A": data }} />);
  const region = screen.getByRole("region", { name: "Tabela de classificação" });
  expect(region.getAttribute("tabindex")).toBeNull();
  expect(region.querySelectorAll("tbody tr")).toHaveLength(20);
  const css = readFileSync("src/components/ui/competition-center.module.css", "utf8");
  const rule = css.match(/\.standingsTable\s*\{[^}]*\}/)?.[0] ?? "";
  expect(rule).toContain("max-height:none");
  expect(rule).not.toMatch(/overflow(?:-y)?\s*:\s*(?:auto|scroll)/);
});
