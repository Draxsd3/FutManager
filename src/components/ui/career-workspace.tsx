"use client";

import { useEffect, useId, useRef, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ManagementIconName } from "./management-header";
import { WindowHeader, WindowHeaderContext } from "./window-header";
import { AppShell, clubThemeStyle } from "./app-shell";
import styles from "./career-workspace.module.css";

type Props = Omit<ComponentProps<typeof AppShell>, "children" | "hideNav" | "classicNav"> & {
  background: ReactNode;
  classicContent?: boolean;
  title?: string;
  titleIcon?: ManagementIconName;
  onClose: () => void;
  children?: ReactNode;
};

/** The roster remains mounted behind every career subwindow. */
export function CareerWorkspace({ background, title, titleIcon, onClose, children, classicContent = false, ...shell }: Props) {
  return <>
    <div inert={!!title} aria-hidden={title ? true : undefined} className={styles.workspace}>
      <AppShell {...shell} classicNav>{background}</AppShell>
    </div>
    {title && <CareerWindow titleIcon={titleIcon} title={title} onClose={onClose} classicContent={classicContent} style={clubThemeStyle(shell.teamName, shell.clubColors)}>{children}</CareerWindow>}
  </>;
}

export function CareerWindow({ title, onClose, children, style, classicContent }: { title: string; titleIcon?: ManagementIconName; onClose: () => void; children: ReactNode; style: CSSProperties; classicContent: boolean }) {
  const label = useId();
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(<div className={styles.overlay} style={style}>
    <section ref={panel} role="dialog" aria-modal="true" aria-labelledby={label} className={styles.window}
      onKeyDown={(event) => {
        // A nested dialog (e.g. player details in the lineup) handles its own keys.
        if ((event.target as HTMLElement).closest('[role="dialog"]') !== panel.current) return;
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
        if (event.key === "Tab") {
          const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? [])
            .filter((element) => !element.closest('[inert], [hidden], [aria-hidden="true"]') && element.getClientRects().length > 0);
          const first = controls[0], last = controls[controls.length - 1];
          if (!first) { event.preventDefault(); panel.current?.focus(); }
          else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }} tabIndex={-1}>
      <WindowHeader title={title} id={label} onClose={onClose} closeRef={closeButton} />
      <div className={`${styles.content} ${classicContent ? styles.classicContent : ""}`}><WindowHeaderContext.Provider value>{children}</WindowHeaderContext.Provider></div>
    </section>
  </div>, document.body);
}
