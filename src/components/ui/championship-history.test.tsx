// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChampionshipHistory, TrophyGallery } from "./championship-history";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import type { ChampionshipRecord } from "@/lib/game/honours";
afterEach(cleanup);
const record: ChampionshipRecord = { id: "2026:league", season: 2026, competitionId: "league", competition: "Brasileirão", category: "national", championId: "club", champion: "Campeão", runnerUpId: "vice", runnerUp: "Vice", coach: "Renan", scorers: [{ name: "Artilheiro", club: "Campeão", goals: 19 }] };
it("shows the reference columns and filters categories without inventing international winners", () => {
  render(<ChampionshipHistory records={[record]}/>);
  for (const label of ["Ano", "Campeão", "Vice", "Artilheiro", "Técnico campeão"]) expect(screen.getByRole("columnheader", { name: label })).toBeTruthy();
  expect(screen.getByText("Renan")).toBeTruthy(); expect(screen.getByText(/19 g/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Internacional" }));
  expect(screen.queryByText("Renan")).toBeNull(); expect(screen.getByText(/Nenhum campeão registrado/)).toBeTruthy();
});
it("each club has a gallery and imported titles never become career championships", () => {
  const db = createDefaultDatabase(); db.clubs[0].honours = [{ title: "Copa histórica", count: 3, details: [{ season: { name: "2023", id: "2022" } }] }];
  render(<TrophyGallery database={db} club={db.clubs[0].name} records={[]}/>);
  expect(screen.getByText("3× Copa histórica")).toBeTruthy();
  expect(screen.getByText("Nenhum título conquistado nesta carreira.")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Clube da galeria"), { target: { value: db.clubs[1].name } });
  expect(screen.queryByText("3× Copa histórica")).toBeNull(); expect(screen.getByText(/Histórico ainda não coletado/)).toBeTruthy();
});
