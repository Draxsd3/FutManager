"use client";

import { InterfaceIcon } from "@/components/ui/interface-icon";
import styles from "./start-menu-screen.module.css";

export function StartMenuScreen({
  email,
  onSignOut,
  onLogin,
  saveCount,
  syncLabel,
  onNewGame,
  onSaves,
  onEdit,
}: {
  email?: string;
  onSignOut?: () => Promise<void>;
  onLogin?: () => void;
  saveCount: number;
  syncLabel: string;
  onNewGame: () => void;
  onSaves: () => void;
  onEdit: () => void;
}) {
  return (
    <div className={styles.screen} data-menu-version="minimal-v1">
      <div className={styles.backdrop} aria-hidden="true" />
      <header className={styles.topbar}>
        <a className={styles.brand} href="#menu-principal" aria-label="FutManager — menu principal">
          <span className={styles.brandMark} aria-hidden="true">FM<span /></span>
          <span>FUTMANAGER<span className={styles.brandDot}>.</span></span>
        </a>
        <div className={styles.account}>{email ? <><span title={email}>{email}</span><button type="button" onClick={() => void onSignOut?.()}>Sair da conta ↗</button></> : <button type="button" onClick={onLogin}>Entrar / Criar conta ↗</button>}</div>
        <span className={styles.edition}>FUTEBOL BRASILEIRO <span>/</span> 2026</span>
      </header>

      <section className={styles.content} id="menu-principal" aria-label="Menu principal">
        <div className={styles.eyebrow}><span /> O JOGO COMEÇA NO SEU COMANDO</div>
        <h1 className={styles.title}>SEU CLUBE.<br />SUAS REGRAS.<br /><span>SUA HISTÓRIA.</span></h1>
        <p className={styles.description}>O talento entra em campo. A estratégia vem de você.<br />Assuma o comando e construa o seu legado.</p>

        <nav className={styles.menu} aria-label="Ações da carreira">
          <button type="button" className={styles.primary} onClick={onNewGame}>
            <span className={styles.buttonNumber} aria-hidden="true">01</span>
            <span>INICIAR NOVA CARREIRA</span>
            <Arrow />
          </button>
          <button type="button" className={styles.secondary} onClick={onSaves}>
            <span className={styles.buttonNumber} aria-hidden="true">02</span>
            <span className={styles.buttonCopy}>CARREGAR CARREIRA<small>{saveCount ? `${saveCount} carreira${saveCount === 1 ? " salva" : "s salvas"}` : email ? "Nenhuma carreira salva" : "Entre para acessar suas carreiras"}</small></span>
            <Arrow />
          </button>
          <button type="button" className={styles.editor} onClick={onEdit}>
            <InterfaceIcon name="book" />
            EDITOR DE CLUBES <span aria-hidden="true">↗</span>
          </button>
        </nav>
      </section>

      <aside className={styles.touchline} aria-label="Filosofia do jogo">
        <span className={styles.coordinate}>23° S / 46° W</span>
        <span className={styles.touchlineRule} />
        <p>90 MINUTOS EM CAMPO.<br /><strong>UMA VIDA PELO CLUBE.</strong></p>
      </aside>

      <footer className={styles.footer}>
        <span className={styles.sync} role="status"><span aria-hidden="true" />{syncLabel}</span>
        <span className={styles.footerMotto}>GESTÃO. PAIXÃO. FUTEBOL. <span className={styles.build}>Build {process.env.NEXT_PUBLIC_BUILD_REVISION ?? "local"}</span></span>
      </footer>
    </div>
  );
}

function Arrow() {
  return <InterfaceIcon name="arrow_right" className={styles.arrow} />;
}
