// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TransfermarktSettings } from "./transfermarkt-settings";
afterEach(cleanup);
it("exposes the sync action, prevents duplicate clicks and reports persisted data", async () => {
  let finish!: (value: { clubs: number; players: number; collectedAt: string; cloudPending: boolean }) => void;
  const sync = vi.fn(() => new Promise<Parameters<typeof finish>[0]>(resolve => { finish = resolve; }));
  render(<TransfermarktSettings onSynchronize={sync} />);
  const button = screen.getByRole("button", { name: "Rodar importação — Séries A/B/C/D" });
  fireEvent.click(button); fireEvent.click(button);
  expect(sync).toHaveBeenCalledOnce();
  expect((button as HTMLButtonElement).disabled).toBe(true);
  finish({ clubs: 2, players: 60, collectedAt: "2026-11-03T12:00:00Z", cloudPending: true });
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("2 clubes e 60 jogadores"));
  expect(screen.getByRole("status").textContent).toContain("nuvem pendente");
  expect((button as HTMLButtonElement).disabled).toBe(false);
});
it("shows missing collection/network errors without claiming success and allows retry", async () => {
  const sync = vi.fn().mockRejectedValue(new Error("Nenhuma coleta publicada. Nada foi alterado."));
  render(<TransfermarktSettings onSynchronize={sync} />);
  fireEvent.click(screen.getByRole("button", { name: "Rodar importação — Séries A/B/C/D" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Nenhuma coleta publicada");
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Rodar importação — Séries A/B/C/D" }));
  await waitFor(() => expect(sync).toHaveBeenCalledTimes(2));
});
it("shows incremental progress and aborts on pause without claiming an applied catalog", async () => {
  const sync = vi.fn((progress: (message: string) => void, signal: AbortSignal) => new Promise<never>((_, reject) => {
    progress("42/156 clubes — Série C: Botafogo-PB…");
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }));
  render(<TransfermarktSettings onSynchronize={sync} />);
  fireEvent.click(screen.getByRole("button", { name: "Rodar importação — Séries A/B/C/D" }));
  expect(screen.getByRole("status").textContent).toContain("42/156");
  fireEvent.click(screen.getByRole("button", { name: "Pausar coleta" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Coleta pausada");
  expect(screen.queryByRole("status")).toBeNull();
});

it("distinguishes a new full refresh from resuming staging", async () => {
  const sync = vi.fn().mockRejectedValue(new Error("paused"));
  render(<TransfermarktSettings onSynchronize={sync}/>);
  fireEvent.click(screen.getByRole("button", { name: "Rodar importação — Séries A/B/C/D" }));
  await screen.findByRole("alert");
  expect(sync.mock.calls[0][2]).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Retomar coleta" }));
  await waitFor(() => expect(sync).toHaveBeenCalledTimes(2));
  expect(sync.mock.calls[1][2]).toBe(true);
});
