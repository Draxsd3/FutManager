// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AgendaScreen } from "./agenda-screen";
import type { CareerSeason, SeasonFixture } from "@/lib/game/season";
import type { EditorDatabase } from "@/lib/game/editor-data";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const fixture = (id: string, overrides: Partial<SeasonFixture> = {}): SeasonFixture => ({ id, season: 2026, competitionId: "league", competitionName: "Brasileirão Série A", type: "league", competitionRound: 1, calendarRound: 1, roundLabel: "1ª rodada", homeClubId: "fla", home: "Flamengo", awayClubId: "bot", away: "Botafogo", status: "scheduled", ...overrides });
const season: CareerSeason = { version: 1, season: 2026, clubId: "fla", clubName: "Flamengo", division: "Série A", fixtures: [
  fixture("played", { status: "played", homeScore: 2, awayScore: 1 }),
  fixture("next", { calendarRound: 2, competitionRound: 2, roundLabel: "2ª rodada", homeClubId: "bot", home: "Botafogo", awayClubId: "fla", away: "Flamengo" }),
  fixture("future", { calendarRound: 3, competitionRound: 3, roundLabel: "3ª rodada" }),
  fixture("cup", { calendarRound: 4, competitionId: "cup", competitionName: "Copa", type: "cup", status: "locked", away: "Candidato hipotético" }),
  fixture("other", { calendarRound: 5, homeClubId: "third", awayClubId: "bot" }),
] };
const database = { clubs: [{ id: "fla", stadiumName: "Maracanã" }, { id: "bot", stadiumName: "Nilton Santos" }], players: [] } as unknown as EditorDatabase;
const props = { club: "Flamengo", coach: "Renan", competition: "Estadual", inGameDate: "2026-01-22", round: 1, database, season, view: "matches" as const, onViewChange: vi.fn(), onBack: vi.fn(), onPrepare: vi.fn() };

it("shows the season's played and future matches, and prepares only the actual next game", () => {
  render(<AgendaScreen {...props} />);
  const table = screen.getByRole("table");
  expect(table.querySelectorAll("tbody tr")).toHaveLength(4);
  expect(within(table).getByText("Finalizado · 2 × 1")).toBeTruthy();
  expect(within(table).getAllByText("A disputar")).toHaveLength(2);
  expect(within(table).getByText("Condicionado")).toBeTruthy();
  expect(screen.queryByText("Candidato hipotético")).toBeNull();
  expect(within(table).getAllByRole("button", { name: /Escalar/ })).toHaveLength(1);
  expect(screen.getByText(/Calendário CBF compartilhado entre carreiras/)).toBeTruthy();
  expect(screen.queryByText("22/01")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Preparar equipe/ }));
  expect(props.onPrepare).toHaveBeenCalledOnce();
});

it("filters all known games by venue rather than filtering only the next match", () => {
  render(<AgendaScreen {...props} />);
  fireEvent.change(screen.getByLabelText("Mando de campo"), { target: { value: "away" } });
  expect(screen.getByRole("table").querySelectorAll("tbody tr")).toHaveLength(1);
  expect(within(screen.getByRole("table")).getByText("Nilton Santos")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Mando de campo"), { target: { value: "home" } });
  expect(screen.getByRole("table").querySelectorAll("tbody tr")).toHaveLength(2);
  expect(within(screen.getByRole("table")).queryByText("Condicionado")).toBeNull();
});

it("handles a missing season without inventing fixtures or enabling match preparation", () => {
  render(<AgendaScreen {...props} season={undefined} />);
  expect(screen.getByText("Nenhum próximo compromisso disponível.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Preparar equipe/ })).toBeNull();
  expect(screen.getByText("Nenhum jogo disponível para este filtro.")).toBeTruthy();
});

 it("exibe datas persistidas e a referência brasileira sem revelar adversários condicionados", () => {
  const dated = { ...season, calendarVersion: 1, fixtures: season.fixtures.map(f => ({ ...f, scheduledDate: "2026-04-22", dateSource: "cbf-window" as const })) };
  render(<AgendaScreen {...props} season={dated} />);
  expect(screen.getAllByText("22/04/2026").length).toBeGreaterThan(1);
  expect(screen.getByText(/Calendário brasileiro · 2026/)).toBeTruthy();
  expect(screen.queryByText("Candidato hipotético")).toBeNull();
 });

it("keeps the fixture list in a keyboard-focusable scrolling region and preserves calendar details", () => {
  render(<AgendaScreen {...props} />);
  const list = screen.getByRole("region", { name: "Lista de jogos" });
  expect(list.getAttribute("tabindex")).toBe("0");
  expect(within(list).getByRole("table")).toBeTruthy();
  const details = screen.getByText(/Calendário brasileiro · 2026/).closest("details")!;
  expect(details.open).toBe(false);
  fireEvent.click(within(details).getByText(/Calendário brasileiro · 2026/));
  expect(details.open).toBe(true);
  expect(within(details).getByText(/Períodos de referência/)).toBeTruthy();
});

it.each(["friendlies", "jobs"] as const)("explains when %s is not implemented rather than showing fake offers", (view) => {
  render(<AgendaScreen {...props} view={view} />);
  expect(screen.getByText(/ainda não est[áã]o disponíveis|ainda não está disponível/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Ver jogos do seu time/ }));
  expect(props.onViewChange).toHaveBeenCalledWith("matches");
});
