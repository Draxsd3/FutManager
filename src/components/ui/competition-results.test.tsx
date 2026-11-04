// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { RoundFixture } from "@/lib/game/mock-data";
import { CompetitionBracket, CompetitionGroups, CompetitionRounds, recentMatches } from "./competition-results";
import { CompetitionCenter } from "./competition-center";
import { createDefaultDatabase } from "@/lib/game/editor-data";
afterEach(cleanup);
const fixture = (overrides: Partial<RoundFixture> = {}): RoundFixture => ({ home: "Flamengo", away: "Palmeiras", stadium: "Maracanã", attendance: 0, homeScore: 2, awayScore: 1, played: true, roundLabel: "1ª rodada", ...overrides });
it("takes the last five concluded games in date order, excluding future, locked and other clubs", () => {
  const games = Array.from({ length: 7 }, (_, i) => fixture({ scheduledDate: `2026-02-0${i + 1}` })).reverse();
  expect(recentMatches([...games, fixture({ played: false }), fixture({ home: "Santos", away: "Bahia" }), fixture({ participantsPending: true })], "Flamengo").map(game => game.scheduledDate)).toEqual(["2026-02-03", "2026-02-04", "2026-02-05", "2026-02-06", "2026-02-07"]);
});
it("selects rounds and leaves upcoming scores blank", () => {
  const onRound = vi.fn();
  const { rerender } = render(<CompetitionRounds fixtures={[fixture(), fixture({ played: false, roundLabel: "2ª rodada" })]} selectedRound="1ª rodada" onRound={onRound} />);
  expect(screen.getByText("2 × 1")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "2ª rodada" } });
  expect(onRound).toHaveBeenCalledWith("2ª rodada");
  rerender(<CompetitionRounds fixtures={[fixture({ played: false, roundLabel: "2ª rodada" })]} selectedRound="2ª rodada" onRound={onRound} />);
  expect(screen.getByText("—")).toBeTruthy();
  expect(screen.queryByText("0 × 0")).toBeNull();
});
it("keeps undecided entrants private and shows only an explicitly decided champion", () => {
  const { rerender } = render(<CompetitionBracket fixtures={[fixture({ participantsPending: true, played: false, roundLabel: "Final" })]} />);
  expect(screen.getAllByText("A definir")).toHaveLength(2);
  expect(screen.queryByText("Flamengo")).toBeNull();
  expect(screen.queryByText("CAMPEÃO")).toBeNull();
  rerender(<CompetitionBracket fixtures={[fixture({ roundLabel: "Final", homeScore: 1, awayScore: 1 })]} />);
  expect(screen.queryByText("CAMPEÃO")).toBeNull();
  rerender(<CompetitionBracket fixtures={[fixture({ roundLabel: "Final", homeScore: 1, awayScore: 1, winner: "Flamengo" })]} />);
  expect(screen.getByText("CAMPEÃO")).toBeTruthy();
});
it("renders separate real group standings without mixing points into the knockout", () => {
  render(<CompetitionGroups groups={[{ name: "Grupo A", table: [{ club: "Flamengo", points: 3, played: 1, wins: 1, draws: 0, losses: 0, goalsFor: 2, goalsAgainst: 1 }] }, { name: "Grupo B", table: [] }]} />);
  expect(screen.getByRole("table", { name: "Classificação de Grupo A" }).textContent).toContain("Flamengo");
  expect(screen.getAllByRole("table")).toHaveLength(2);
});
it("opens the clicked result's round alongside standings, including away wins, draws and defeats", () => {
  const database = createDefaultDatabase();
  render(<CompetitionCenter club="Flamengo" competition="Série A" database={database} table={[]} fixtures={[fixture(), fixture({ home: "Palmeiras", away: "Flamengo", homeScore: 0, awayScore: 1, roundLabel: "2ª rodada" }), fixture({ homeScore: 1, awayScore: 1, roundLabel: "3ª rodada" }), fixture({ homeScore: 0, awayScore: 1, roundLabel: "4ª rodada" }), fixture({ played: false, roundLabel: "5ª rodada" })]} topScorers={[]} topRatings={[]} round={5} onClose={vi.fn()} />);
  const form = screen.getByLabelText("Últimas partidas de Flamengo");
  expect(within(form).getAllByRole("button")).toHaveLength(4);
  fireEvent.click(within(form).getByRole("button", { name: /Vitória: Palmeiras/ }));
  expect(screen.getByRole("table")).toBeTruthy();
  expect((within(screen.getByRole("region", { name: "Rodadas do campeonato" })).getByRole("combobox") as HTMLSelectElement).value).toBe("2ª rodada");
  expect(screen.getByText("0 × 1")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fechar rodadas ×" }));
  expect(screen.queryByRole("region", { name: "Rodadas do campeonato" })).toBeNull();
});
