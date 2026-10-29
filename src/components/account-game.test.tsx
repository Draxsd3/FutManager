// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AccountGame } from "./account-game";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
  onAuthStateChange: vi.fn(), listener: null as null | ((event: string, session: unknown) => void),
}));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabaseClient: () => ({ auth }) }));
vi.mock("./game-board", () => ({ GameBoard: ({ userId, initialPage, onSignOut }: { userId: string; initialPage: string; onSignOut: () => void }) => <div>Conta {userId} / tela {initialPage}<button onClick={onSignOut}>Sair</button></div> }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  auth.signInWithPassword.mockResolvedValue({ error: null });
  auth.onAuthStateChange.mockImplementation((callback) => { auth.listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; });
});

describe("account entry", () => {
  it("shows the public menu and requires login before continuing a career", async () => {
    render(<AccountGame />);
    await screen.findByText("Entre para salvar e continuar suas carreiras");
    fireEvent.click(screen.getByRole("button", { name: /CARREGAR CARREIRA/ }));
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Senha")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "treinador@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "test-password" } });
    fireEvent.click(screen.getByRole("button", { name: /ENTRAR EM CAMPO/ }));
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "treinador@example.com", password: "test-password" }));
    act(() => auth.listener?.("SIGNED_IN", { user: { id: "alice", email: "treinador@example.com" } }));
    expect(await screen.findByText("Conta alice / tela saves")).toBeTruthy();
  });

  it("always starts on the menu even with a persisted authenticated session", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: "alice", email: "alice@example.com" } } } });
    render(<AccountGame />);
    expect(await screen.findByText("Conta alice / tela menu")).toBeTruthy();
  });

  it("shows email confirmation instructions after registration", async () => {
    render(<AccountGame />);
    fireEvent.click(screen.getByRole("button", { name: /INICIAR NOVA CARREIRA/ }));
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "novo@example.com" } });
    fireEvent.change(screen.getByLabelText(/Senha/), { target: { value: "test-password" } });
    fireEvent.click(screen.getByRole("button", { name: /CRIAR MINHA CONTA/ }));
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(auth.signUp).toHaveBeenCalledWith({ email: "novo@example.com", password: "test-password" });
  });

  it("rejects legacy anonymous sessions instead of exposing a career", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: "anon", is_anonymous: true } } } });
    render(<AccountGame />);
    expect(await screen.findByText("Entre para salvar e continuar suas carreiras")).toBeTruthy();
    expect(screen.queryByText(/Conta anon/)).toBeNull();
  });

  it("reports login errors without opening the game", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });
    render(<AccountGame />);
    fireEvent.click(screen.getByRole("button", { name: /Entrar \/ Criar conta/ }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /ENTRAR EM CAMPO/ }));
    expect((await screen.findByRole("alert")).textContent).toBe("Email ou senha incorretos.");
  });
});
