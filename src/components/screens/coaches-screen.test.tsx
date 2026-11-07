// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { CoachesScreen, sourceCoachProfile } from "./coaches-screen";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import { createManagerMarket } from "@/lib/game/manager-market";
import type { CareerSeason } from "@/lib/game/season";

afterEach(cleanup);
function fixture() {
  const db = createDefaultDatabase();
  const own = { ...db.clubs[0], name: "Clube próprio", division: "Série B" as const };
  const team = { ...db.clubs[1], name: "Palmeiras", coachName: "Abel Ferreira", division: "Série A" as const, level: 16, transfermarkt: { id: "1023", collectedAt: "2026-11-04T00:00:00Z", season: "2026" } };
  const empty = { ...db.clubs[2], name: "Clube sem técnico", coachName: "" };
  db.clubs = [own, team, empty];
  const managerMarket = createManagerMarket(db, { fixtures: [] } as unknown as CareerSeason);
  managerMarket.clubs[team.id].history = [3, 1, 0].map((points, index) => ({ id: `j${index}`, clubId: team.id, points: points as 0 | 1 | 3, season: 2026, round: index, competitionRound: index }));
  return { db, own, team, empty, managerMarket };
}
it("exibe dados da fonte com vínculo confirmado e resultados disponíveis da carreira", () => {
  const { db, own, team, managerMarket } = fixture();
  render(<CoachesScreen database={db} club={own.name} coach="Meu técnico" managerMarket={managerMarket} date="2026-01-12" />);
  fireEvent.click(screen.getByRole("button", { name: /Abel Ferreira/ }));
  const profile = screen.getByRole("article", { name: "Perfil do técnico" });
  expect(within(profile).getByText("Portugal")).toBeTruthy();
  expect(within(profile).getByText("22/12/1978")).toBeTruthy();
  expect(within(profile).getByText("47 anos")).toBeTruthy();
  expect(within(profile).getByText("Licença UEFA PRO")).toBeTruthy();
  expect(within(profile).getByText("R$ 1.600.000")).toBeTruthy();
  expect(within(profile).getByText(/Estimativa visual baseada no nível/)).toBeTruthy();
  expect(within(profile).getByText(/coleta Transfermarkt de 04\/11\/2026/)).toBeTruthy();
  expect(within(profile).getByText("44%")).toBeTruthy();
  expect(within(profile).getByText(/Resultados registrados nesta carreira/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Clube sem técnico/ })).toBeNull();
  expect(sourceCoachProfile(team, "Outro treinador", false)).toBeUndefined();
  expect(sourceCoachProfile(team, "Abel Ferreira", true)).toBeUndefined();
});
it("pesquisa por clube ou nome, filtra divisão e não atribui dados por nome sozinho", () => {
  const { db, own, team, managerMarket } = fixture();
  managerMarket.clubs[team.id].coach = "Novo técnico";
  render(<CoachesScreen database={db} club={own.name} coach="Meu técnico" managerMarket={managerMarket}/>);
  fireEvent.change(screen.getByLabelText("Buscar técnico"), { target: { value: "Palmeiras" } });
  expect(screen.getByRole("button", { name: /Novo técnico/ })).toBeTruthy();
  const profile = screen.getByRole("article", { name: "Perfil do técnico" });
  expect(within(profile).queryByText("22/12/1978")).toBeNull();
  fireEvent.change(screen.getByLabelText("Filtrar divisão dos técnicos"), { target: { value: "Série B" } });
  expect(screen.getByText(/Nenhum técnico encontrado/)).toBeTruthy();
  expect(screen.getByText(/Nenhum perfil para mostrar/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Filtrar divisão dos técnicos"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Buscar técnico"), { target: { value: "Meu técnico" } });
  expect(within(profile).getByText("SEU TREINADOR")).toBeTruthy();
});
it("não apresenta resultados do técnico anterior depois de uma troca", () => {
  const { db, own, team, managerMarket } = fixture();
  managerMarket.clubs[team.id].coach = null;
  render(<CoachesScreen database={db} club={own.name} coach="Teste" managerMarket={managerMarket}/>);
  expect(screen.queryByRole("button", { name: /Abel Ferreira/ })).toBeNull();
});

it("funciona em bases antigas e vazias sem o mercado de técnicos", () => {
  const { db, own } = fixture();
  const { rerender } = render(<CoachesScreen database={db} club={own.name} coach="Meu técnico" />);
  fireEvent.change(screen.getByLabelText("Buscar técnico"), { target: { value: "meu tecnico" } });
  expect(screen.getByRole("button", { name: /Meu técnico/ })).toBeTruthy();
  rerender(<CoachesScreen database={{ clubs: [], players: [] }} club={own.name} coach="Meu técnico" />);
  expect(screen.getByText(/Nenhum técnico encontrado/)).toBeTruthy();
});
