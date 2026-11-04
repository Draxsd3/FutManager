// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TransfermarktCorrections } from "./transfermarkt-corrections";
import { readTransfermarktCorrections, saveTransfermarktCorrections } from "@/lib/importer/database-cache";
import { fetchCorrectedSeed } from "@/lib/importer/transfermarkt-corrections";
vi.mock("@/lib/importer/database-cache", () => ({ readTransfermarktCorrections: vi.fn(), saveTransfermarktCorrections: vi.fn() }));
vi.mock("@/lib/importer/transfermarkt-corrections", async original => ({ ...await original<typeof import("@/lib/importer/transfermarkt-corrections")>(), fetchCorrectedSeed: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const preview = () => ({ checkpoint: { snapshot: { version: 2 as const, generatedAt: "2026-11-04T00:00:00Z", seasonId: "2026", clubs: [] }, members: [], issues: [{ clubId: "4064", clubName: "Figueirense", message: "Maiky: posição não informada" }] }, report: { validClubs: 74, pendingClubs: 82, playerIssues: [{ clubId: "4064", playerId: "1355436", message: "posição não informada" }] }, reviewPlayers: [{ clubId: "4064", playerId: "1355436", playerName: "Maiky", clubName: "Figueirense", message: "posição não informada", dateOfBirth: "2005-03-31", position: null }] });
it("opens the game modal, selects a missing field and saves only an explicit manual overlay", async () => {
  vi.mocked(readTransfermarktCorrections).mockResolvedValue([]);
  vi.mocked(saveTransfermarktCorrections).mockResolvedValue();
  vi.mocked(fetchCorrectedSeed).mockResolvedValue(preview());
  const close = vi.fn();
  render(<TransfermarktCorrections userId="alice" onClose={close} />);
  expect(await screen.findByText(/Na fonte: nascimento/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Posição"), { target: { value: "Central Midfield" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
  await waitFor(() => expect(saveTransfermarktCorrections).toHaveBeenCalledWith("alice", [expect.objectContaining({ clubId: "4064", playerId: "1355436", position: "Central Midfield" })]));
  const saved = vi.mocked(saveTransfermarktCorrections).mock.calls[0][1][0];
  expect(saved.dateOfBirth).toBeUndefined();
  expect(await screen.findByRole("status")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fechar Corrigir pendências Transfermarkt" }));
  expect(close).toHaveBeenCalledOnce();
});
it("does not claim a correction was saved if local persistence fails", async () => {
  vi.mocked(readTransfermarktCorrections).mockResolvedValue([]);
  vi.mocked(fetchCorrectedSeed).mockResolvedValue(preview());
  vi.mocked(saveTransfermarktCorrections).mockRejectedValue(new Error("Armazenamento indisponível"));
  render(<TransfermarktCorrections userId="alice" onClose={() => {}} />);
  await screen.findByText(/Na fonte: nascimento/);
  fireEvent.change(screen.getByLabelText("Posição"), { target: { value: "Central Midfield" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Armazenamento indisponível");
  expect(screen.queryByText(/Correções salvas neste dispositivo/)).toBeNull();
});
it("can remove a saved manual correction to restore the original source", async () => {
  vi.mocked(readTransfermarktCorrections).mockResolvedValue([{ clubId: "4064", playerId: "1355436", position: "Central Midfield", correctedAt: "2026-11-04T00:00:00Z" }]);
  vi.mocked(fetchCorrectedSeed).mockResolvedValue(preview());
  vi.mocked(saveTransfermarktCorrections).mockResolvedValue();
  render(<TransfermarktCorrections userId="alice" onClose={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Remover correção manual" }));
  await waitFor(() => expect(saveTransfermarktCorrections).toHaveBeenCalledWith("alice", []));
});
