import { ClassicIcon, type ClassicIconName } from "./classic-icon";

export type NavItem = { icon: ClassicIconName; label: string; onClick: () => void; active?: boolean };

export function TopNav({ items, date }: { items: NavItem[]; date: string }) {
  return (
    <header className="grid h-[90px] grid-cols-[minmax(0,980px)_1fr_auto] items-stretch overflow-x-auto border-b-2 border-[var(--team-accent)] bg-white px-3 text-[#243229] shadow-[0_3px_18px_rgba(23,43,31,.12)]">
      <nav className="grid min-w-[760px] grid-flow-col auto-cols-fr">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            title={item.label}
            className={[
              "group relative flex min-w-[82px] flex-col items-center justify-center border-x border-transparent px-1 text-center text-[11px] font-bold hover:bg-[#eef4ee]",
              item.active ? "bg-[var(--team-accent)] text-[var(--team-accent-text)]" : "text-[#425349]",
            ].join(" ")}
          >
            <ClassicIcon name={item.icon} size={42} className="drop-shadow-[0_1px_0_#000]" />
            <span className="mt-2 leading-none">{item.label}</span>
            <i className="absolute inset-x-4 bottom-0 hidden h-[3px] bg-[var(--team-accent)] group-hover:block" />
          </button>
        ))}
      </nav>
      <div />
      <div className="flex min-w-[118px] items-center justify-end border-l border-[#d9e3da] px-4">
        <div className="text-right">
          <small className="block text-[8px] uppercase tracking-[.18em] text-[#6d8073]">Temporada 2026</small>
          <b className="mt-1 block text-[11px] font-bold">{date}</b>
        </div>
      </div>
    </header>
  );
}
