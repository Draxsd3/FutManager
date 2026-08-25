import type { Player } from "@/lib/game/mock-data";
import Image from "next/image";
import { clubThemes, positionLabel } from "@/lib/game/mock-data";
import { clubCrestAsset } from "@/lib/game/assets";
import { ClassicIcon, type ClassicIconName } from "./classic-icon";

export function Crest({ club, size = "md" }: { club: string; size?: "sm" | "md" }) {
  const theme = clubThemes[club] ?? clubThemes.Palmeiras;
  const dims = size === "sm" ? "h-10 w-9 text-[9px]" : "h-20 w-16 text-[11px]";
  const asset = clubCrestAsset(club, size === "sm");
  if (asset) {
    return <Image src={asset} alt={`Escudo do ${club}`} width={80} height={80} unoptimized className={`${dims} shrink-0 object-contain drop-shadow-lg`} />;
  }
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${theme.primary} 0 52%, ${theme.secondary} 52%)`,
        color: theme.text,
        clipPath: "polygon(8% 0,92% 0,100% 68%,50% 100%,0 68%)",
      }}
      className={`flex shrink-0 items-center justify-center border-2 border-white font-black drop-shadow-lg ${dims}`}
    >
      {theme.short}
    </div>
  );
}

function Meter({ title, value }: { title: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-[#425349]">{title}</p>
      <div className="relative mt-1 h-[12px] overflow-hidden rounded-full bg-[#041108]">
        <div
          className="h-full bg-[#16c864]"
          style={{ width: `${value}%` }}
        />
        <b className="absolute inset-0 text-center text-[9px] leading-3 text-white">{value}%</b>
      </div>
    </div>
  );
}

export function ClubSidebar({
  club,
  coach,
  budget,
  directorTrust,
  fanTrust,
  opponent,
  isHome,
  round,
  competition,
  selectedPlayer,
  ctaLabel,
  onCta,
  onQuickAction,
}: {
  club: string;
  coach: string;
  budget: number;
  directorTrust: number;
  fanTrust: number;
  opponent: string;
  isHome: boolean;
  round: number;
  competition: string;
  selectedPlayer: Player | null;
  ctaLabel: string;
  onCta: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
}) {
  return (
    <aside className="relative flex min-h-[calc(100vh-78px)] flex-col border-r border-[#c8d6ca] bg-[#fbfcf9] text-[#25362a] shadow-[2px_0_12px_rgba(26,49,34,.08)]">
      <div className="h-1.5 shrink-0 bg-[var(--team-accent)]" />
      <div className="flex items-center gap-3 border-b border-[#d5e0d6] bg-white px-4 py-4">
        <Crest club={club} />
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[.13em] text-[var(--team-accent)]">Seu clube</p>
          <h1 className="mt-1 truncate text-[17px] font-black leading-tight">{club}</h1>
          <p className="mt-1 truncate text-[11px] text-[#607267]">Técnico: <b className="text-[#25362a]">{coach}</b></p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-[#d5e0d6] bg-[#d5e0d6]">
        <div className="bg-[#f2f6f1] px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-wide text-[#718278]">Caixa disponível</p><p className="mt-1 text-[14px] font-black text-[#25362a]">R$ {(budget / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}M</p></div>
        <div className="bg-[#f2f6f1] px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-wide text-[#718278]">Temporada</p><p className="mt-1 text-[14px] font-black text-[#25362a]">{round}ª rodada</p></div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-[#d5e0d6] bg-white px-4 py-3">
        <Meter title="Confiança diretoria" value={directorTrust} />
        <Meter title="Confiança torcida" value={fanTrust} />
      </div>

      <div className="mx-3 mt-4 rounded-lg border border-[#b8ceb9] bg-[#f2f7f0] p-3 text-[#25362a]">
        <div className="flex items-center justify-between"><b className="text-[10px] uppercase tracking-wide text-[var(--team-accent)]">Próximo jogo</b><span className="rounded bg-white px-2 py-0.5 text-[9px] font-bold text-[#607267]">{isHome ? "CASA" : "FORA"}</span></div>
        <div className="mt-3 flex items-center gap-3">
          <Crest club={opponent} size="sm" />
          <div><p className="text-[14px] font-bold">{opponent}</p>
          <p className="mt-0.5 text-[10px] text-[#607267]">
          {competition} · {round}ª rodada
          </p></div>
        </div>
      </div>

      <button
        onClick={onCta}
        className="mx-3 mt-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-lg border border-[var(--team-accent)] bg-[var(--team-accent)] py-3 text-[13px] font-bold text-[var(--team-accent-text)] hover:brightness-110"
      >
        <ClassicIcon name="sport_soccer" size={32} />{ctaLabel}
      </button>

      {selectedPlayer && <div className="mx-3 mt-3 rounded-lg border border-[#c9d9ca] bg-white p-3 text-[11px]"><div className="flex items-center justify-between border-b border-[#d9e5d9] pb-2"><b className="uppercase tracking-wide text-[var(--team-accent)]">Jogador selecionado</b><b>F:{selectedPlayer.overall}</b></div><p className="mt-2 text-[13px] font-bold">{selectedPlayer.name}</p><p className="mt-1 text-[#607267]">{positionLabel[selectedPlayer.position]} · {selectedPlayer.age} anos · R$ {selectedPlayer.marketValue}M</p><div className="mt-3 grid grid-cols-3 border-t border-[#d9e5d9] pt-2 text-center"><b>Energia<br />{selectedPlayer.energy}%</b><b>Gols<br />{selectedPlayer.goals}</b><b>Assist.<br />{selectedPlayer.assists}</b></div></div>}

      <div className="mt-auto border-t border-[#d5e0d6] bg-[#f0f5f0] p-3">
        <div className="mb-3 flex items-center justify-between text-[10px]"><b className="text-[var(--team-accent)]">GESTÃO DO CLUBE</b><span className="text-[#718278]">Acesso rápido</span></div>
        <div className="grid grid-cols-2 gap-2">
          <Quick icon="group" label="Elenco" onClick={() => onQuickAction("roster")} />
          <Quick icon="money" label="Finanças" onClick={() => onQuickAction("finances")} />
          <Quick icon="medal_award_gold" label="Troféus" onClick={() => onQuickAction("trophies")} />
          <Quick icon="chart_bar" label="Treino" onClick={() => onQuickAction("training")} />
        </div>
      </div>
      <div className="h-2 shrink-0 bg-[var(--team-accent)]" />
    </aside>
  );
}

function Quick({ icon, label, onClick }: { icon: ClassicIconName; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-16 items-center gap-2 rounded-lg border border-[#bfd0c0] bg-white px-3 py-2 text-left hover:bg-[#e9f1e9]"><ClassicIcon name={icon} size={32} className="text-[var(--team-accent)]" /><span className="text-[10px] font-bold">{label}</span></button>;
}
