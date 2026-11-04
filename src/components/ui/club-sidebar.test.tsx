// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ClubSidebar } from "./club-sidebar";

afterEach(cleanup);
const props = { confidence: null, club: "Corinthians", coach: "Renan", budget: 1000, opponent: "São Bernardo", competition: "Campeonato Paulista", roundLabel: "2ª rodada", hasNextMatch: true, squadSize: 25, ctaLabel: "Escalar time", onCta: vi.fn(), onQuickAction: vi.fn() };
it.each([true, false])("preserves complete names and correct home/away labels (home=%s)", isHome => {
  render(<ClubSidebar {...props} isHome={isHome} />);
  const card = screen.getByRole("region", { name: "Confronto" });
  const home = within(card).getByText("CASA").parentElement!;
  const away = within(card).getByText("FORA").parentElement!;
  expect(home.textContent).toContain(isHome ? "Corinthians" : "São Bernardo");
  expect(away.textContent).toContain(isHome ? "São Bernardo" : "Corinthians");
  expect(within(card).getAllByRole("img")).toHaveLength(2);
  expect(within(card).getByText("Campeonato Paulista")).toBeTruthy();
});
it("does not render a stale opponent when no match is scheduled", () => {
  render(<ClubSidebar {...props} isHome hasNextMatch={false} />);
  const card = screen.getByRole("region", { name: "Confronto" });
  expect(within(card).getByText("SEM JOGO AGENDADO")).toBeTruthy();
  expect(within(card).queryByText("São Bernardo")).toBeNull();
});
