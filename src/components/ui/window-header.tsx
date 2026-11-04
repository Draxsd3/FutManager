"use client";

import { createContext, useContext, useId, type Ref } from "react";
import styles from "./window-header.module.css";

/** Content inside a career window must not repeat its primary title or back bar. */
export const WindowHeaderContext = createContext(false);

/** Nested dialogs inside a career window inherit the active career date automatically. */
export const WindowDateContext = createContext<string | undefined>(undefined);

export function formatWindowDate(date?: string): string | undefined {
  if (!date?.trim()) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  const parsed = iso ? new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`) : slash ? new Date(`${slash[3]}-${slash[2]}-${slash[1]}T12:00:00`) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }
  return date.trim();
}

/** Shared chrome for every career window and nested dialog. */
export function WindowHeader({ title, date, id, level = 1, onClose, closeLabel = `Fechar ${title}`, closeRef }: {
  title: string; date?: string; id?: string; level?: 1 | 2; onClose: () => void;
  closeLabel?: string; closeRef?: Ref<HTMLButtonElement>;
}) {
  const generatedId = useId();
  const inheritedDate = useContext(WindowDateContext);
  const formattedDate = formatWindowDate(date ?? inheritedDate);
  const Heading = level === 1 ? "h1" : "h2";
  return <header className={styles.bar} data-window-header>
    <span className={styles.dot} aria-hidden="true" />
    <Heading id={id ?? generatedId} className={styles.title}>{title}</Heading>
    {formattedDate && <span className={styles.date} data-window-date>{formattedDate}</span>}
    <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={closeLabel} title={`${closeLabel} (Esc)`}><span aria-hidden="true">×</span></button>
  </header>;
}
