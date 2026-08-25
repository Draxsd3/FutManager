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
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.shade} aria-hidden="true" />
      <section className={styles.panel} aria-label="Menu principal">
        <header className={styles.header}>
          <div className={styles.eyebrow}><span className={styles.liveDot} aria-hidden="true" /><p>SIMULADOR DE FUTEBOL</p><span>CARREIRA</span></div>
          <h1><span>FUT</span>MANAGER</h1>
          <div className={styles.editionRow}><span>EDIÇÃO 2026</span><i aria-hidden="true" /><small>COMANDO. ESTRATÉGIA. GLÓRIA.</small></div>
        </header>

        <nav className={styles.menu}>
          <MenuButton index="01" icon="▶" title="INICIAR NOVO JOGO" detail="Escolha um clube e construa seu legado" onClick={onNewGame} accent />
          <MenuButton index="02" icon="▣" title="CONTINUAR CARREIRA" detail={`${saveCount} carreira${saveCount === 1 ? "" : "s"} disponível${saveCount === 1 ? "" : "is"}`} onClick={onSaves} badge={saveCount > 0 ? String(saveCount) : undefined} />
          <MenuButton index="03" icon="✦" title="EDITOR DE MUNDO" detail="Clubes, jogadores, uniformes e estádios" onClick={onEdit} />
        </nav>

        <footer className={styles.footer}>
          <span>FUTMANAGER <b>v0.2</b></span>
          <span className={styles.sync}><i aria-hidden="true" />{syncLabel}</span>
        </footer>
      </section>
    </main>
  );
}

function MenuButton({ index, icon, title, detail, onClick, accent = false, badge }: { index: string; icon: string; title: string; detail: string; onClick: () => void; accent?: boolean; badge?: string }) {
  return (
    <button type="button" className={`${styles.menuButton} ${accent ? styles.accent : ""}`} onClick={onClick}>
      <span className={styles.index}>{index}<i>{icon}</i></span>
      <span className={styles.copy}>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      {badge && <span className={styles.badge}>{badge}</span>}
      <span className={styles.arrow} aria-hidden="true">↗</span>
    </button>
  );
}
