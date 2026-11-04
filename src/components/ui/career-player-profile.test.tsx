// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CareerPlayerProfile } from "./career-player-profile";
import { createPlayerCareer } from "@/lib/game/career";
import { squad } from "@/lib/game/mock-data";
afterEach(cleanup);
it("exibe partidas registradas e permite selecionar ações reais de mercado", () => {
  const player = squad[0];
  const record = { ...createPlayerCareer(player, "Clube"), matches: [{ key: "1", round: 1, opponent: "Rival", homeScore: 2, awayScore: 0, minutes: 90, goals: 1 }] };
  const onMarketAction = vi.fn();
  render(<CareerPlayerProfile player={player} club="Clube" record={record} onMarketAction={onMarketAction} onPhotoChange={vi.fn()} onClose={vi.fn()}/>);
  fireEvent.click(screen.getByRole("button", { name: "Temporada" }));
  expect(screen.getByText("Clube 2 × 0 Rival")).toBeTruthy();
  expect(screen.getByText("Rodada 1 · 90 min")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Mercado" }));
  const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  fireEvent.click(screen.getByRole("button", { name: "Colocar à venda" }));
  expect(onMarketAction).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Colocar à venda" }));
  expect(onMarketAction).toHaveBeenCalledWith({ type: "list" });
  confirm.mockRestore();
});

it("permite adicionar e remover foto, mantendo o botão acessível", async () => {
  const { preparePlayerPhoto } = await import("@/lib/game/player-photo");
  const photoModule = await import("@/lib/game/player-photo");
  const processor = vi.spyOn(photoModule, "preparePlayerPhoto").mockResolvedValue("data:image/webp;base64,abc");
  expect(preparePlayerPhoto).toBeDefined();
  const player = squad[0];
  const onPhotoChange = vi.fn();
  const props = { player, club: "Clube", record: createPlayerCareer(player, "Clube"), onPhotoChange, onMarketAction: vi.fn(), onClose: vi.fn() };
  const view = render(<CareerPlayerProfile {...props} />);
  fireEvent.change(screen.getByLabelText("Adicionar foto"), { target: { files: [new File(["foto"], "foto.png", { type: "image/png" })] } });
  expect(await screen.findByText("Foto adicionada à carreira.")).toBeTruthy();
  expect(onPhotoChange).toHaveBeenCalledWith("data:image/webp;base64,abc");
  view.rerender(<CareerPlayerProfile {...props} player={{ ...player, photoDataUrl: "data:image/webp;base64,abc" }} />);
  expect(screen.getByLabelText("Alterar foto")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remover foto" }));
  expect(onPhotoChange).toHaveBeenLastCalledWith(null);
  processor.mockRestore();
});

it("apresenta erro sem trocar a foto para arquivos inválidos", async () => {
  const player = squad[0], onPhotoChange = vi.fn();
  render(<CareerPlayerProfile player={player} club="Clube" record={createPlayerCareer(player, "Clube")} onPhotoChange={onPhotoChange} onMarketAction={vi.fn()} onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Adicionar foto"), { target: { files: [new File(["texto"], "arquivo.txt", { type: "text/plain" })] } });
  expect(await screen.findByText("Escolha uma imagem JPG, PNG ou WebP.")).toBeTruthy();
  expect(onPhotoChange).not.toHaveBeenCalled();
});
