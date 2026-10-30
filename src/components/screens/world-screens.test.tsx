// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WorldScreens } from "./world-screens";
import { createDefaultDatabase, buildSquadFromDatabase } from "@/lib/game/editor-data";
afterEach(cleanup);
it("filtra o mercado e exige confirmação antes de contratar", () => {
  const database = createDefaultDatabase(), club = database.clubs[0], player = database.players.find((p) => p.clubId !== club.id)!;
  const recruit = vi.fn().mockReturnValue("Contratado"); const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  render(<WorldScreens section="search" database={database} club={club.name} coach="Treinador" squad={buildSquadFromDatabase(database, club.name)!} budget={100000} records={{}} historyView="players" onHistoryView={vi.fn()} onOpenPlayer={vi.fn()} onRecruit={recruit} onBack={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Buscar por nome"), { target: { value: player.name } });
  const hire = screen.getAllByRole("button", { name: "Contratar" })[0];
  fireEvent.click(hire); expect(recruit).not.toHaveBeenCalled();
  fireEvent.click(hire); expect(recruit).toHaveBeenCalled();
  confirm.mockRestore();
});
