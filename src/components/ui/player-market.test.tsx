// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PlayerMarket } from "./player-market";
import { createPlayerCareer } from "@/lib/game/career";
import { squad } from "@/lib/game/mock-data";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("exibe dados reais e mantém listagem, renovação e registro de proposta acessíveis", () => {
  const player = squad[0];
  const record = { ...createPlayerCareer(player, "Clube"), marketStatus: "sale" as const, releaseClause: 12 };
  const onAction = vi.fn().mockReturnValue("Operação registrada");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<PlayerMarket player={player} record={record} club="Clube" clubs={["Clube", "Rival"]} onAction={onAction}/>);
  expect(screen.getByText("Disponível para venda")).toBeTruthy();
  expect(screen.getByText("R$ 12,00 mi")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Retirar da venda" }));
  expect(onAction).toHaveBeenCalledWith({ type: "unlist" });
  fireEvent.click(screen.getByRole("button", { name: "Renovação" }));
  fireEvent.change(screen.getByLabelText("Duração (anos)"), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar proposta" }));
  expect(screen.getByRole("alert").textContent).toMatch(/1 a 5/);
  fireEvent.change(screen.getByLabelText("Duração (anos)"), { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar proposta" }));
  expect(onAction).toHaveBeenCalledWith({ type: "contract", offer: { salary: record.salary, years: 3, releaseClause: 12 } });
  fireEvent.click(screen.getByRole("button", { name: "Propostas" }));
  fireEvent.click(screen.getByRole("button", { name: "Registrar proposta" }));
  expect(screen.getByRole("alert").textContent).toMatch(/Selecione/);
  fireEvent.change(screen.getByLabelText("Clube interessado"), { target: { value: "Rival" } });
  fireEvent.click(screen.getByRole("button", { name: "Registrar proposta" }));
  expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ type: "offer", club: "Rival", fee: player.marketValue }));
});
it("mostra propostas pendentes e permite recusar ou aceitar com confirmação", () => {
  const player = squad[0], onAction = vi.fn().mockReturnValue("Ok");
  const record = { ...createPlayerCareer(player, "Clube"), marketStatus: "sale" as const, transferOffers: [{ id: "1", club: "Rival", fee: 4, status: "pending" as const }] };
  render(<PlayerMarket player={player} record={record} club="Clube" clubs={["Rival"]} onAction={onAction}/>);
  fireEvent.click(screen.getByRole("button", { name: "Propostas (1)" }));
  fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
  expect(onAction).toHaveBeenCalledWith({ type: "reject", id: "1" });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Aceitar" }));
  expect(onAction).toHaveBeenCalledWith({ type: "accept", id: "1" });
});
