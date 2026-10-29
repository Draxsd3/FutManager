"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { GameBoard } from "./game-board";
import { StartMenuScreen } from "./screens/start-menu-screen";
import styles from "./screens/account-screen.module.css";

export function AccountGame() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [configurationError, setConfigurationError] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;
    try {
      const client = createBrowserSupabaseClient();
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        receivedAuthEvent = true;
        setUser(session?.user && !session.user.is_anonymous ? session.user : null);
        setReady(true);
      });
      void client.auth.getSession().then(({ data, error }) => {
        if (!active || receivedAuthEvent) return;
        if (error) setLogoutError("Não foi possível recuperar sua sessão. Entre novamente.");
        setUser(data.session?.user && !data.session.user.is_anonymous ? data.session.user : null);
        setReady(true);
      }).catch(() => {
        if (!active || receivedAuthEvent) return;
        setLogoutError("Não foi possível recuperar sua sessão. Entre novamente.");
        setReady(true);
      });
      return () => { active = false; subscription.unsubscribe(); };
    } catch {
      queueMicrotask(() => { if (active) { setConfigurationError(true); setReady(true); } });
      return () => { active = false; };
    }
  }, []);

  function requestAccount() {
    setAuthOpen(true);
  }

  async function signOut() {
    if (!window.confirm("Sair da conta? Suas carreiras salvas permanecerão disponíveis ao entrar novamente.")) return;
    const { error } = await createBrowserSupabaseClient().auth.signOut();
    if (error) { setLogoutError("Não foi possível sair. Tente novamente."); return; }
    setAuthOpen(false);
    setUser(null);
  }

  if (ready && user) {
    return <>{logoutError && <p role="alert" className={styles.notice}>{logoutError}</p>}<GameBoard key={user.id} userId={user.id} email={user.email ?? "Minha conta"} onSignOut={signOut} initialPage="menu" /></>;
  }

  if (authOpen) {
    return <AccountScreen unavailable={configurationError} onBack={() => { setAuthOpen(false); }} />;
  }

  return <StartMenuScreen saveCount={0} syncLabel={!ready ? "Verificando sua conta..." : "Entre para salvar e continuar suas carreiras"} onNewGame={requestAccount} onSaves={requestAccount} onEdit={requestAccount} onLogin={requestAccount} />;
}

function AccountScreen({ onBack, unavailable }: { onBack: () => void; unavailable: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || unavailable) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = createBrowserSupabaseClient();
      if (mode === "register") {
        const { data, error: authError } = await client.auth.signUp({ email, password });
        if (authError) throw authError;
        if (!data.session) setMessage("Cadastro solicitado. Verifique seu email para confirmar a conta e depois entre aqui.");
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      setError(code === "invalid_credentials" ? "Email ou senha incorretos." : code === "email_not_confirmed" ? "Confirme seu email antes de entrar." : code === "weak_password" ? "Escolha uma senha mais forte, com pelo menos 8 caracteres." : code === "user_already_exists" ? "Este email já possui uma conta. Use a opção Entrar." : "Não foi possível concluir. Confira os dados e tente novamente. Se acabou de criar a conta, verifique seu email.");
    } finally { setBusy(false); }
  }

  return <section className={styles.screen} aria-labelledby="account-title">
    <div className={styles.card}>
      <button className={styles.back} onClick={onBack} disabled={busy}>← Voltar ao início</button>
      <span className={styles.eyebrow}>FUTMANAGER / SUA CONTA</span>
      <h1 id="account-title">{mode === "login" ? "Seu próximo capítulo." : "Seu legado começa aqui."}</h1>
      <p>Uma conta, várias carreiras. Continue seu progresso em qualquer dispositivo.</p>
      <div className={styles.tabs} aria-label="Acesso à conta">
        <button type="button" aria-pressed={mode === "login"} disabled={busy} onClick={() => { setMode("login"); setError(""); setMessage(""); }}>Entrar</button>
        <button type="button" aria-pressed={mode === "register"} disabled={busy} onClick={() => { setMode("register"); setError(""); setMessage(""); }}>Criar conta</button>
      </div>
      {unavailable && <p role="alert" className={styles.error}>O login ainda não foi configurado neste ambiente. Configure a URL e a chave pública do Supabase para habilitar as contas.</p>}
      <form onSubmit={submit}>
        <label htmlFor="account-email">Email</label>
        <input id="account-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy || unavailable} />
        <label htmlFor="account-password">Senha {mode === "register" && <small>(mínimo 8 caracteres)</small>}</label>
        <input id="account-password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 8 : 1} required disabled={busy || unavailable} />
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {message && <p role="status" className={styles.success}>{message}</p>}
        <button className={styles.submit} type="submit" disabled={busy || unavailable}>{busy ? "Aguarde..." : mode === "login" ? "ENTRAR EM CAMPO →" : "CRIAR MINHA CONTA →"}</button>
      </form>
      <small className={styles.privacy}>Suas carreiras ficam vinculadas exclusivamente à sua conta.</small>
    </div>
  </section>;
}
