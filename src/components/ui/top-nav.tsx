"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClassicIcon, type ClassicIconName } from "./classic-icon";
import styles from "./top-nav.module.css";

export type NavItem = { icon: ClassicIconName; label: string; onClick: () => void; active?: boolean; children?: { label: string; description: string; onClick: () => void }[] };

export function TopNav({ items, date, classic = false }: { items: NavItem[]; date: string; classic?: boolean }) {
  return (
    <header className={styles.topbar} data-compact={classic || undefined}>
      <div className={styles.brand} aria-label="FutManager">
        <span className={styles.brandMark} aria-hidden="true">F<span /></span>
        <span className={styles.brandCopy}>FUTMANAGER<small>MODO CARREIRA</small></span>
      </div>
      <nav aria-label="Navegação do clube" className={styles.nav}>
        {items.map((item) => <NavButton key={item.label} item={item} />)}
      </nav>
      <div className={styles.date}><span>CALENDÁRIO</span><b>{date}</b></div>
    </header>
  );
}

function NavButton({ item }: { item: NavItem }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    function outside(event: PointerEvent) {
      if (!menu.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) setPosition(null);
    }
    function close() { setPosition(null); }
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [position]);

  function toggle() {
    if (!item.children?.length) return item.onClick();
    const rect = button.current!.getBoundingClientRect();
    setPosition(position ? null : { top: rect.bottom + 8, left: Math.max(8, Math.min(rect.left, window.innerWidth - 312)) });
  }

  return <>
    <button ref={button} type="button" onClick={toggle} title={item.label} aria-haspopup={item.children ? "menu" : undefined} aria-expanded={item.children ? !!position : undefined} aria-controls={position ? id : undefined} aria-current={item.active ? "page" : undefined}
      onKeyDown={(event) => { if (item.children && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); if (!position) toggle(); } }}
      className={styles.navButton} data-active={item.active || !!position || undefined}>
      <ClassicIcon name={item.icon} size={19} /><span>{item.label}</span>{item.children && <span aria-hidden="true" className={styles.chevron}>⌄</span>}
    </button>
    {position && createPortal(<div ref={menu} id={id} role="menu" aria-label={item.label} style={{ position: "fixed", top: position.top, left: position.left, width: "min(300px, calc(100vw - 16px))", zIndex: 200 }} className={styles.menu}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); setPosition(null); button.current?.focus(); }
        const options = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
        const index = options.indexOf(document.activeElement as HTMLButtonElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
          options[next]?.focus();
        }
        if (event.key === "Tab") setPosition(null);
      }}>
      <p className={styles.menuTitle}>{item.label.toLocaleUpperCase("pt-BR")}</p>
      {item.children?.map((child, index) => <button key={child.label} type="button" role="menuitem" onClick={() => { setPosition(null); button.current?.focus(); child.onClick(); }} className={styles.menuItem}><span aria-hidden="true" className={styles.menuIndex}>0{index + 1}</span><span><strong>{child.label}</strong><small>{child.description}</small></span><span aria-hidden="true" className={styles.menuArrow}>↗</span></button>)}
    </div>, document.body)}
  </>;
}
