"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClassicIcon, type ClassicIconName } from "./classic-icon";

export type NavItem = { icon: ClassicIconName; label: string; onClick: () => void; active?: boolean; children?: { label: string; description: string; onClick: () => void }[] };

export function TopNav({ items, date, classic = false }: { items: NavItem[]; date: string; classic?: boolean }) {
  return (
    <header className={classic ? "relative z-30 flex h-[58px] shrink-0 items-stretch bg-black px-2 text-white" : "relative z-30 grid h-[90px] shrink-0 grid-cols-[minmax(0,980px)_1fr_auto] items-stretch border-b-2 border-[var(--team-accent)] bg-white px-3 text-[#243229] shadow-[0_3px_18px_rgba(23,43,31,.12)]"}>
      <nav aria-label="Navegação do clube" className={classic ? "flex min-w-0 overflow-x-auto" : "grid min-w-0 grid-flow-col auto-cols-fr overflow-x-auto"}>
        {items.map((item) => <NavButton key={item.label} item={item} classic={classic} />)}
      </nav>
      {!classic && <div />}
      <div className={classic ? "hidden items-center px-4 text-[10px] text-white sm:flex" : "hidden min-w-[118px] items-center justify-end border-l border-[#d9e3da] px-4 md:flex"}><div className="text-right">{!classic && <small className="block text-[8px] uppercase tracking-[.18em] text-[#6d8073]">Temporada 2026</small>}<b className="mt-1 block text-[11px] font-bold">{date}</b></div></div>
    </header>
  );
}

function NavButton({ item, classic }: { item: NavItem; classic: boolean }) {
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
    <button ref={button} type="button" onClick={toggle} title={item.label} aria-haspopup={item.children ? "menu" : undefined} aria-expanded={item.children ? !!position : undefined} aria-controls={position ? id : undefined} aria-current={item.active ? "page" : undefined}
      onKeyDown={(event) => { if (item.children && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); if (!position) toggle(); } }}
      className={classic ? `relative flex min-w-[62px] flex-col items-center justify-center px-1 text-[10px] font-bold text-white hover:bg-[#333] focus-visible:outline-2 focus-visible:outline-white ${item.active || position ? "bg-[#282828]" : ""}` : `group relative flex min-w-[82px] flex-col items-center justify-center border-x border-transparent px-1 text-center text-[11px] font-bold hover:bg-[#eef4ee] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#168249] ${item.active || position ? "bg-[var(--team-accent)] text-[var(--team-accent-text)]" : "text-[#425349]"}`}>
      <ClassicIcon name={item.icon} size={classic ? 25 : 38} /><span className={classic ? "mt-1 leading-none" : "mt-2 leading-none"}>{item.label}{item.children && <span aria-hidden="true" className="ml-1 text-[9px]">⌄</span>}</span>
    </button>
    {position && createPortal(<div ref={menu} id={id} role="menu" aria-label={item.label} style={{ position: "fixed", top: position.top, left: position.left, width: "min(284px, calc(100vw - 16px))", zIndex: 200 }} className="overflow-hidden rounded-xl border border-[#dce5df] bg-white p-1.5 text-[#243229] shadow-[0_16px_40px_#13291d30]"
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
      <p className="px-3 py-2 text-[9px] font-bold tracking-[.16em] text-[#7b8b80]">{item.label.toLocaleUpperCase("pt-BR")}</p>
      {item.children?.map((child, index) => <button key={child.label} type="button" role="menuitem" onClick={() => { setPosition(null); button.current?.focus(); child.onClick(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-[#eff5f0] focus:bg-[#e7f2e9] focus:outline-none"><span aria-hidden="true" className="text-xs text-[#92a398]">0{index + 1}</span><span><strong className="block text-xs">{child.label}</strong><small className="mt-1 block text-[10px] text-[#718077]">{child.description}</small></span><span aria-hidden="true" className="ml-auto">›</span></button>)}
    </div>, document.body)}
  </>;
}
