"use client";

import { createContext, useId, type Ref } from "react";
import styles from "./window-header.module.css";

/** Content inside a career window must not repeat its primary title. */
export const WindowHeaderContext = createContext(false);

/** Shared chrome for every career window and nested dialog. */
export function WindowHeader({ title, id, level = 1, onClose, closeLabel = `Fechar ${title}`, closeRef }: {
  title: string; id?: string; level?: 1 | 2; onClose: () => void;
  closeLabel?: string; closeRef?: Ref<HTMLButtonElement>;
}) {
  const generatedId = useId();
  const Heading = level === 1 ? "h1" : "h2";
  return <header className={styles.bar} data-window-header>
    <span className={styles.dot} aria-hidden="true" />
    <Heading id={id ?? generatedId} className={styles.title}>{title}</Heading>
    <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={closeLabel} title={`${closeLabel} (Esc)`}><span aria-hidden="true">×</span></button>
  </header>;
}
