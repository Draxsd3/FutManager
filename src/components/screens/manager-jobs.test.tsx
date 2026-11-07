// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ManagerJobs } from "./manager-jobs";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import { createCareerSeason } from "@/lib/game/season";
import { applyForManagerJob, initializeCareerMarket } from "@/lib/game/manager-jobs";
afterEach(cleanup);
function setup() {
  const database = createDefaultDatabase(), club = database.clubs[0], target = database.clubs[1];
  target.coachName = ""; target.level = club.level;
  const market = initializeCareerMarket(database, createCareerSeason(database, club.id, 2026)!, "Técnico", 9000);
  return { database, club, target, market };
}
it("lista vagas reais da simulação e envia a candidatura sem trocar de clube", async () => {
  const { database, club, target, market } = setup();
  const onApply = vi.fn(), onAccept = vi.fn();
  render(<ManagerJobs database={database} market={market} currentClubId={club.id} date="2026-03-10" onApply={onApply} onDecline={vi.fn()} onAccept={onAccept} />);
  fireEvent.click(screen.getByRole("button", { name: `Candidatar-se ao ${target.name}` }));
  expect(onApply).toHaveBeenCalledWith(target.id);
  expect(onAccept).not.toHaveBeenCalled();
  expect((await screen.findByRole("status")).textContent).toMatch(/Candidatura analisada/);
});
it("exige confirmação, permite cancelar e só aceita a proposta no segundo passo", async () => {
  const { database, club, target, market } = setup();
  const applied = applyForManagerJob(market, database, club.id, target.id, "2026-03-10").market;
  const onAccept = vi.fn().mockResolvedValue(undefined);
  render(<ManagerJobs database={database} market={applied} currentClubId={club.id} date="2026-03-10" onApply={vi.fn()} onDecline={vi.fn()} onAccept={onAccept} />);
  fireEvent.click(screen.getByRole("button", { name: `Aceitar proposta do ${target.name}` }));
  expect(onAccept).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar mudança" }));
  expect(screen.queryByRole("button", { name: "Confirmar mudança de clube" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: `Aceitar proposta do ${target.name}` }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar mudança de clube" }));
  await waitFor(() => expect(onAccept).toHaveBeenCalledWith(applied.applications![0].id));
});
it("mostra expiração e não oferece ações em proposta vencida", () => {
  const { database, club, target, market } = setup();
  const applied = applyForManagerJob(market, database, club.id, target.id, "2026-03-10").market;
  render(<ManagerJobs database={database} market={applied} currentClubId={club.id} date="2026-03-18" onApply={vi.fn()} onDecline={vi.fn()} onAccept={vi.fn()} />);
  expect(screen.getByText("Proposta expirada")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Aceitar proposta/ })).toBeNull();
});
it("exibe estado vazio honesto, sem inventar propostas", () => {
  const { database, club, market } = setup();
  for (const entry of Object.values(market.clubs)) entry.coach = "Ocupado";
  render(<ManagerJobs database={database} market={market} currentClubId={club.id} date="2026-03-10" onApply={vi.fn()} onDecline={vi.fn()} onAccept={vi.fn()} />);
  expect(screen.getByText(/Nenhuma vaga aberta/)).toBeTruthy();
  expect(screen.getByText("Você ainda não enviou candidaturas.")).toBeTruthy();
});
