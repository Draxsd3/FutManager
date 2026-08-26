"use client";

import type { CareerSave } from "@/lib/game/editor-data";
import styles from "./workspace-screen.module.css";
import { ClassicIcon } from "@/components/ui/classic-icon";

export function SavesScreen({ saves, onLoad, onDelete, onBack }: { saves: CareerSave[]; onLoad: (save: CareerSave) => void; onDelete: (id: string) => void; onBack: () => void }) {
  return (
    <main className={styles.screen}>
      <section className={styles.window}>
        <TitleBar title="CARREIRAS SALVAS" onBack={onBack} />
        <div className={styles.body}>
          {saves.length === 0 ? (
            <div className={styles.empty}>
              <strong>Nenhuma carreira encontrada</strong>
              <p>Inicie um novo jogo para criar o primeiro save.</p>
            </div>
          ) : (
            <div className={styles.saveList}>
              {saves.map((save) => (
                <article className={styles.saveRow} key={save.id}>
                  <div className={styles.badge}>{save.clubName.slice(0, 3).toUpperCase()}</div>
                  <div>
                    <h2>{save.name}</h2>
                    <p>{save.managerName} · {save.clubName} · {save.division}</p>
                    <small>Rodada {save.round} · Atualizado em {new Date(save.updatedAt).toLocaleString("pt-BR")}</small>
                  </div>
                  <div className={styles.rowActions}>
                    <button className={styles.primaryButton} onClick={() => onLoad(save)}>CONTINUAR</button>
                    <button className={styles.dangerButton} onClick={() => onDelete(save.id)}>EXCLUIR</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className={styles.statusBar}>{saves.length} arquivo(s) de carreira</div>
      </section>
    </main>
  );
}

export function TitleBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className={styles.titleBar}>
      <strong>FUTMANAGER — {title}</strong>
      <button onClick={onBack} aria-label="Voltar ao menu"><ClassicIcon name="cancel" /></button>
    </header>
  );
}
