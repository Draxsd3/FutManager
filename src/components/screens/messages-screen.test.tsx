// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import type { CareerSave, EditorDatabase } from "@/lib/game/editor-data";
import { careerMessages, type CareerMessage } from "@/lib/game/messages";
import { MessagesScreen } from "./messages-screen";
vi.mock("@/lib/game/messages", () => ({
  MAJOR_TRANSFER_BRL: 5_000_000,
  careerMessages: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const row = (
  id: string,
  category: CareerMessage["category"] = "market",
): CareerMessage => ({
  id,
  category,
  sender: "Mercado da Bola",
  subject: `Assunto ${id}`,
  body: `Conteúdo ${id}`,
  date: "2026-01-10",
});
function Inbox() {
  const [read, setRead] = useState<string[]>([]);
  return (
    <MessagesScreen
      save={{ id: "career" } as CareerSave}
      database={{} as EditorDatabase}
      readIds={read}
      onRead={(ids) => setRead((old) => [...new Set([...old, ...ids])])}
    />
  );
}
it("filtra por categoria e pesquisa; abre e marca a mensagem como lida", () => {
  vi.mocked(careerMessages).mockReturnValue([row("1"), row("2", "team")]);
  render(<Inbox />);
  fireEvent.click(screen.getByRole("button", { name: /Time/ }));
  expect(screen.queryByRole("button", { name: /Assunto 1/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Assunto 2/ }));
  expect(
    within(screen.getByRole("article")).getByText("Conteúdo 2"),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: /Time/ }).textContent).toBe(
    "Time 0",
  );
  fireEvent.click(screen.getByRole("button", { name: /Todas/ }));
  fireEvent.change(
    screen.getByRole("textbox", { name: "Pesquisar mensagens" }),
    { target: { value: "Assunto 1" } },
  );
  expect(screen.getByRole("button", { name: /Assunto 1/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Assunto 2/ })).toBeNull();
});
it("marca apenas o filtro atual e mostra somente não lidas", () => {
  vi.mocked(careerMessages).mockReturnValue([row("1"), row("2", "board")]);
  render(<Inbox />);
  fireEvent.click(
    within(screen.getByRole("navigation")).getByRole("button", {
      name: /Mercado da Bola/,
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Marcar seleção filtrada como lida" }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Todas/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Só não lidas" }));
  expect(screen.queryByRole("button", { name: /Assunto 1/ })).toBeNull();
  expect(screen.getByRole("button", { name: /Assunto 2/ })).toBeTruthy();
});
it("pagina a caixa de entrada e mantém o conteúdo no painel de leitura", () => {
  vi.mocked(careerMessages).mockReturnValue(
    Array.from({ length: 21 }, (_, i) => row(String(i + 1))),
  );
  render(<Inbox />);
  expect(screen.queryByRole("button", { name: /Assunto 21 / })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Próxima →" }));
  fireEvent.click(screen.getByRole("button", { name: /Assunto 21 / }));
  expect(screen.getByText("Conteúdo 21")).toBeTruthy();
});
it("aceita estado de leitura restaurado sem modificar a carreira", () => {
  vi.mocked(careerMessages).mockReturnValue([row("1")]);
  const onRead = vi.fn();
  render(
    <MessagesScreen
      save={{ id: "another" } as CareerSave}
      database={{} as EditorDatabase}
      readIds={["1"]}
      onRead={onRead}
    />,
  );
  expect(screen.getByRole("button", { name: /Todas/ }).textContent).toBe(
    "Todas 0",
  );
  expect(onRead).not.toHaveBeenCalled();
});
