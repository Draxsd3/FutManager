"use client";

import styles from "./start-menu-screen.module.css";

export function StartMenuScreen({
  saveCount,
  syncLabel,
  onNewGame,
  onSaves,
  onEdit,
}: {
  saveCount: number;
  syncLabel: string;
  onNewGame: () => void;
  onSaves: () => void;
  onEdit: () => void;
}) {
  return (
    <main className={styles.screen}>
      <div className={styles.pitch} aria-hidden="true" />
      <div className={styles.stripes} aria-hidden="true" />
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.fieldLines} aria-hidden="true" />
      <header className={styles.topbar}>
        <span className={styles.topMark} aria-hidden="true">FM</span><strong>FutManager</strong><span className={styles.version}>v0.2</span><span className={styles.settings} aria-label="Opções em desenvolvimento">☼</span>
      </header>
      <section className={styles.panel} aria-label="Menu principal">
        <header className={styles.header}>
          <div className={styles.crest} aria-hidden="true"><span>FM</span></div><h1>FUT<span>MANAGER</span></h1><p>GERENCIADOR DE FUTEBOL BRASILEIRO</p><i aria-hidden="true" />
        </header>

        <nav className={styles.menu}>
          <MenuButton icon="⚽" title="NOVO JOGO" onClick={onNewGame} accent />
          <MenuButton icon="▣" title="CARREGAR JOGO" detail={saveCount ? `${saveCount} carreira${saveCount === 1 ? "" : "s"} disponível${saveCount === 1 ? "" : "is"}` : "Nenhuma carreira salva"} onClick={onSaves} />
          <MenuButton icon="♟" title="EDITOR DE TIMES" onClick={onEdit} />
          <MenuButton icon="⚙" title="OPÇÕES" disabled />
          <MenuButton icon="ⓘ" title="CRÉDITOS" disabled />
          <MenuButton icon="⇥" title="SAIR DO JOGO" disabled />
        </nav>
      </section>
      <footer className={styles.bottomBar}><div className={styles.nextMatch}><span className={styles.calendar} aria-hidden="true">⚽</span><span><small>CARREIRA</small><strong>{saveCount ? "Continue sua trajetória" : "Crie a sua primeira carreira"}</strong><em>{syncLabel}</em></span></div><span className={styles.support}><i aria-hidden="true">♟</i><span><small>TORCIDA FUTMANAGER</small><strong>Comando, estratégia e glória</strong></span></span></footer>
    </main>
  );
}

function MenuButton({ icon, title, detail, onClick, accent = false, disabled = false }: { icon: string; title: string; detail?: string; onClick?: () => void; accent?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={`${styles.menuButton} ${accent ? styles.accent : ""}`} onClick={onClick} disabled={disabled} title={disabled ? "Disponível em breve" : undefined}>
      <span className={styles.icon} aria-hidden="true">{icon}</span><span className={styles.copy}><strong>{title}</strong>{detail && <small>{detail}</small>}</span>{accent && <span className={styles.arrow} aria-hidden="true">›</span>}
    </button>
  );
}
