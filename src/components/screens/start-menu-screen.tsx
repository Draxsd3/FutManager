"use client";

import { InterfaceIcon } from "@/components/ui/interface-icon";
import styles from "./start-menu-screen.module.css";

export function StartMenuScreen({ email, onSignOut, onLogin, saveCount, syncLabel, onNewGame, onSaves, onEdit }: {
  email?: string;
  onSignOut?: () => Promise<void>;
  onLogin?: () => void;
  saveCount: number;
  syncLabel: string;
  onNewGame: () => void;
  onSaves: () => void;
  onEdit: () => void;
}) {
  return <main className={styles.screen} data-menu-version="field-v2">
    <div className={styles.backdrop} aria-hidden="true" />
    <header className={styles.topbar}>
      <a className={styles.brand} href="#menu-principal" aria-label="FutManager — menu principal"><span className={styles.brandMark} aria-hidden="true">F<span /></span><span>FUTMANAGER<span className={styles.brandDot}>.</span></span></a>
      <span className={styles.edition}>BRASIL <i>·</i> TEMPORADA 2026</span>
      <div className={styles.account}>{email ? <><span title={email}>{email}</span><button type="button" onClick={() => void onSignOut?.()}>Sair ↗</button></> : <button type="button" onClick={onLogin}>Entrar / Criar conta ↗</button>}</div>
    </header>

    <div className={styles.hero} id="menu-principal">
      <section className={styles.content} aria-label="Menu principal">
        <div className={styles.eyebrow}><span /> O APITO INICIAL É SEU</div>
        <h1 className={styles.title}>90 MINUTOS.<br/>UM <em>CLUBE.</em><br/>UMA VIDA.</h1>
        <p className={styles.description}>Escolha as cores. Monte o time. Mude o destino.<br/>Cada temporada começa com uma decisão.</p>
        <nav className={styles.menu} aria-label="Ações da carreira">
          <button type="button" className={styles.primary} onClick={onNewGame}><span className={styles.buttonNumber} aria-hidden="true">01</span><span>INICIAR NOVA CARREIRA</span><Arrow/></button>
          <button type="button" className={styles.secondary} onClick={onSaves}><span className={styles.buttonNumber} aria-hidden="true">02</span><span className={styles.buttonCopy}>CONTINUAR JOGANDO<small>{saveCount ? `${saveCount} carreira${saveCount === 1 ? " salva" : "s salvas"}` : email ? "Nenhuma carreira salva" : "Entre para acessar suas carreiras"}</small></span><Arrow/></button>
          <button type="button" className={styles.editor} onClick={onEdit}><InterfaceIcon name="book"/> EDITAR O UNIVERSO <span aria-hidden="true">↗</span></button>
        </nav>
      </section>

      <aside className={styles.arena} aria-label="O campo está pronto">
        <div className={styles.arenaHeader}><span>O CAMPO ESTÁ PRONTO</span><span><i/> 00 : 00</span></div>
        <div className={styles.pitch} aria-hidden="true"><span className={styles.pitchCircle}/><i className={styles.pitchBoxTop}/><i className={styles.pitchBoxBottom}/><b className={styles.ball}/><span className={styles.routeOne}/><span className={styles.routeTwo}/><span className={styles.playerOne}/><span className={styles.playerTwo}/><span className={styles.playerThree}/></div>
        <div className={styles.arenaFooter}><span>BRASIL · 2026</span><b>O próximo lance<br/>é seu.</b></div>
        <span className={styles.arenaNumber} aria-hidden="true">01—90</span>
      </aside>
    </div>

    <footer className={styles.footer}>
      <span className={styles.sync} role="status"><i aria-hidden="true"/>{syncLabel}</span>
      <span className={styles.footerMotto}>ESTRATÉGIA É OUTRA FORMA DE JOGAR. <span className={styles.build}>FM / 26</span></span>
    </footer>
  </main>;
}

function Arrow() { return <InterfaceIcon name="arrow_right" className={styles.arrow}/>; }
