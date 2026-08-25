import { ClassicIcon, type ClassicIconName } from "./classic-icon";

export type NavItem = { icon: ClassicIconName; label: string; onClick: () => void; active?: boolean };

export function TopNav({ items, date }: { items: NavItem[]; date: string }) {
  return (
    <header className="grid h-[78px] grid-cols-[minmax(0,920px)_1fr_auto] items-stretch overflow-x-auto border-b-2 border-[#e7c84d] bg-[#06120a] px-3 text-white shadow-[0_3px_18px_rgba(0,0,0,.4)]">
      <nav className="grid min-w-[680px] grid-flow-col auto-cols-fr">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            title={item.label}
            className={[
              "group relative flex min-w-[72px] flex-col items-center justify-center border-x border-transparent px-1 text-center text-[11px] font-bold hover:bg-[#123c20]",
              item.active ? "bg-[#1a6c36] text-[#f1d457]" : "text-[#e5eee5]",
            ].join(" ")}
          >
            <ClassicIcon name={item.icon} size={32} className="drop-shadow-[0_1px_0_#000]" />
            <span className="mt-1.5 leading-none">{item.label}</span>
            <i className="absolute inset-x-4 bottom-0 hidden h-[3px] bg-[#f1d457] group-hover:block" />
          </button>
        ))}
      </nav>
      <div />
      <div className="flex min-w-[118px] items-center justify-end border-l border-white/10 px-4">
        <div className="text-right">
          <small className="block text-[8px] uppercase tracking-[.18em] text-[#b7cdb8]">Temporada 2026</small>
          <b className="mt-1 block text-[11px] font-bold">{date}</b>
        </div>
      </div>
    </header>
  );
}
