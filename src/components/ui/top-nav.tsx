"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ClassicIconName } from "./classic-icon";
import { InterfaceIcon } from "./interface-icon";
import styles from "./top-nav.module.css";

export type NavItem = { icon: ClassicIconName; label: string; onClick: () => void; active?: boolean; children?: { label: string; description: string; onClick: () => void }[] };

export function TopNav({ items, date }: { items: NavItem[]; date: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.brand} aria-label="FutManager"><b>FM<span>·</span></b><small>CAREER<br/>CONTROL</small></div>
      <nav aria-label="Navegação do clube" className={styles.nav}>
        {items.map((item) => <NavButton key={item.label} item={item} />)}
      </nav>
      <div className={styles.date}><span className={styles.online}/><div><small>TEMPORADA 2026</small><b>{date}</b></div></div>
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
    setPosition(position ? null : { top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)) });
  }

  return <>
    <button ref={button} type="button" onClick={toggle} title={item.label} aria-haspopup={item.children ? "menu" : undefined} aria-expanded={item.children ? !!position : undefined} aria-controls={position ? id : undefined}
      onKeyDown={(event) => { if (item.children && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); if (!position) toggle(); } }}
      aria-current={item.active ? "page" : undefined}
      className={`${styles.navButton} ${item.active || position ? `${styles.active} bg-[var(--team-accent)]` : ""}`}>
      <InterfaceIcon name={item.icon} size={19} /><span>{item.label}{item.children && <span aria-hidden="true" className={styles.chevron}>⌄</span>}</span>
    </button>
    {position && createPortal(<div ref={menu} id={id} role="menu" aria-label={item.label} style={{ position: "fixed", top: position.top, left: position.left, width: "min(284px, calc(100vw - 16px))", zIndex: 200 }} className={styles.menu}
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
      <p className={styles.menuTitle}>AGENDA DO CLUBE</p>
      {item.children?.map((child, index) => <button key={child.label} type="button" role="menuitem" onClick={() => { setPosition(null); button.current?.focus(); child.onClick(); }} className={styles.menuItem}><span aria-hidden="true" className="text-xs text-[#92a398]">0{index + 1}</span><span><strong className="block text-xs">{child.label}</strong><small className="mt-1 block text-[10px] text-[#9aa6a1]">{child.description}</small></span><span aria-hidden="true" className="ml-auto">›</span></button>)}
    </div>, document.body)}
  </>;
}
