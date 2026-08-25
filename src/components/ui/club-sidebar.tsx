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
      <div className="flex items-center gap-3 border-b border-[#d5e0d6] bg-white px-4 py-3">
        <Crest club={club} />
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-bold leading-tight">{club}</h1>
          <p className="mt-2 truncate text-[12px] font-bold">{coach}</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_42px] border-b border-[#d5e0d6] bg-[#f2f6f1]">
        <p className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold">
          <span className="grid h-5 w-7 place-items-center rounded border border-[#acc4b0] bg-white text-[9px] text-[var(--team-accent)]">R$</span>
          {(budget / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} milhões
        </p>
        <div className="grid place-items-center border-l border-[#d5e0d6] text-[10px]"><b>1</b><span className="sr-only">mensagem</span>▣</div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-[#d5e0d6] bg-white px-4 py-3">
        <Meter title="Confiança diretoria" value={directorTrust} />
        <Meter title="Confiança torcida" value={fanTrust} />
      </div>

      <div className="mx-3 mt-3 rounded border border-[#b8ceb9] bg-[#f2f7f0] p-3 text-[#25362a]">
        <b className="text-xs uppercase tracking-wide text-[var(--team-accent)]">
          Próximo jogo · {isHome ? "Casa" : "Fora"}
        </b>
        <div className="mt-3 flex items-center gap-3">
          <Crest club={opponent} size="sm" />
          <div><p className="text-[14px] font-bold">{opponent}</p>
          <p className="text-xs opacity-90">
          {competition} · {round}ª rodada
          </p></div>
        </div>
      </div>

      <button
        onClick={onCta}
        className="mx-3 mt-3 w-[calc(100%-1.5rem)] rounded border border-[var(--team-accent)] bg-[var(--team-accent)] py-2.5 text-[12px] font-bold text-[var(--team-accent-text)] hover:brightness-110"
      >
        <ClassicIcon name="sport_soccer" className="mr-1.5 align-middle" />{ctaLabel}
      </button>

      <div className="mx-3 mt-3 min-h-[145px] rounded border border-[#c9d9ca] bg-white p-3 text-[11px]">
        <b className="block border-b border-[#d9e5d9] pb-2 text-[10px] uppercase tracking-wide text-[var(--team-accent)]">
          Jogador selecionado
        </b>
        {selectedPlayer ? (
          <div className="mt-2 space-y-1">
            <p className="border-b border-[#c9d9ca] bg-[#eef5ee] px-1 py-1 text-[12px] font-bold text-[#25362a]">{selectedPlayer.name} <span className="float-right">F:{selectedPlayer.overall}</span></p>
            <p className="opacity-90">
              {positionLabel[selectedPlayer.position]} · {selectedPlayer.age} anos
            </p>
            <p className="opacity-90">Força: {selectedPlayer.overall}</p>
            <p className="opacity-90">Valor: R$ {selectedPlayer.marketValue}M</p>
            <div className="mt-3 grid grid-cols-3 border-t border-[#d9e5d9] pt-2 text-center"><b>Energia<br />{selectedPlayer.energy}%</b><b>Gols<br />{selectedPlayer.goals}</b><b>Assist.<br />{selectedPlayer.assists}</b></div>
          </div>
        ) : (
          <p className="mt-2 opacity-70">Clique em um jogador para ver detalhes.</p>
        )}
      </div>

      <div className="mt-auto border-t border-[#d5e0d6] bg-[#f0f5f0] p-3">
        <div className="mb-2 flex items-center justify-between text-[10px]"><b className="text-[var(--team-accent)]">GESTÃO DO CLUBE</b><span>Elenco principal</span></div>
        <div className="grid grid-cols-4 gap-1">
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
  return <button type="button" onClick={onClick} className="rounded border border-[#bfd0c0] bg-white px-1 py-2 text-center hover:bg-[#e9f1e9]"><ClassicIcon name={icon} className="mx-auto" /><span className="mt-1 block text-[9px] font-bold">{label}</span></button>;
}
