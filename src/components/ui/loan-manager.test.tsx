// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LoanManager } from "./loan-manager";
import { PlayerMarket } from "./player-market";
import { buildSquadFromDatabase, createDefaultDatabase } from "@/lib/game/editor-data";
import { createPlayerCareer } from "@/lib/game/career";
import type { LoanContract } from "@/lib/game/loans";
const loan: LoanContract = { owner: { name: "Origem", clubId: "owner" }, borrower: { name: "Destino", clubId: "borrower" }, startsOn: "2025-07-01", endsOn: "2026-06-30", status: "active", source: "transfermarkt" };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("shows real ownership and loan end, submits only after confirmation and reports the result", () => {
  vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  const onPropose = vi.fn().mockReturnValue("Prorrogação aceita"), close = vi.fn();
  const player = { ...createDefaultDatabase().players[0], loan };
  render(<LoanManager players={[player]} clubId="borrower" date="2026-06-01" onPropose={onPropose} onClose={close}/>);
  expect(screen.getByText(/Proprietário: Origem/)).toBeTruthy();
  const send = screen.getByRole("button", { name: "Propor prorrogação" });
  fireEvent.click(send); expect(onPropose).not.toHaveBeenCalled();
  fireEvent.click(send); expect(onPropose).toHaveBeenCalledWith(player.id, 6, Math.round(player.salaryMonthlyBrl * 1.5), 50);
  expect(screen.getByRole("status").textContent).toBe("Prorrogação aceita");
  fireEvent.click(screen.getByRole("button", { name: "Fechar" })); expect(close).toHaveBeenCalledOnce();
});
it("does not offer renewal with unknown end or after expiration", () => {
  const player = createDefaultDatabase().players[0];
  render(<LoanManager players={[{ ...player, loan: { ...loan, endsOn: null } }]} clubId="borrower" date="2026-06-01" onPropose={vi.fn()} onClose={vi.fn()}/>);
  expect(screen.getByText("Prazo não informado na fonte")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Propor prorrogação" })).toBeNull();
});
it("borrowed players cannot be listed, sold, re-loaned or renew definitive contracts in player market", () => {
  const db = createDefaultDatabase(), player = { ...buildSquadFromDatabase(db, db.clubs[0].name)![0], loan, acquisitionType: "loan" as const };
  render(<PlayerMarket player={player} record={createPlayerCareer(player, "Destino")} club="Destino" clubs={["Origem", "Destino"]} onAction={vi.fn()}/>);
  expect(screen.getByText("Contrato de empréstimo")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Colocar à venda" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Enviar proposta" })).toBeNull();
});
