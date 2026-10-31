import type { Player } from "@/lib/game/mock-data";
import type { PlayerCareerRecord } from "@/lib/game/career";
import styles from "./club-sidebar.module.css";
import Image from "next/image";
import { clubThemes, positionLabel } from "@/lib/game/mock-data";
import { clubCrestAsset } from "@/lib/game/assets";
import { ClassicIcon, type ClassicIconName } from "./classic-icon";

export function Crest({ club, size = "md" }: { club: string; size?: "sm" | "md" }) {
  const theme = clubThemes[club] ?? { primary: "#334155", secondary: "#64748b", text: "#ffffff", short: club.split(/\s+/).filter(Boolean).map((word) => word[0]).join("").slice(0, 3).toUpperCase() };
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

export function ClubSidebar({ club, coach, budget, opponent, isHome, hasNextMatch, round, roundLabel, competition, selectedPlayer, record, season, squadSize, ctaLabel, onCta, onQuickAction }: {
  club: string; coach: string; budget: number; opponent: string; isHome: boolean; hasNextMatch: boolean; round: number; roundLabel?: string; competition: string;
  selectedPlayer: Player | null; record?: PlayerCareerRecord; season: number; squadSize: number; ctaLabel: string; onCta: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
}) {
  const current = record?.seasons.find((item) => item.season === season && item.club === club);
  const totals = (record?.seasons ?? []).reduce((sum, item) => ({ games: sum.games + item.games, goals: sum.goals + item.goals, assists: sum.assists + item.assists }), { games: 0, goals: 0, assists: 0 });
  return <aside className={styles.sidebar}>
    <div className={styles.club}><Crest club={club} size="sm"/><div><h1>{club}</h1><p>{coach}</p></div></div>
    <div className={styles.balance}><ClassicIcon name="money" size={18}/><b>R$ {(budget / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} milhões</b></div>
    <div className={styles.trust}><span>Confiança diretoria <b>—</b></span><span>Confiança torcida <b>—</b></span></div>
    <section className={styles.next}><h2>Próximo jogo · {hasNextMatch ? (isHome ? "Casa" : "Fora") : "—"}</h2>{hasNextMatch ? <div className={styles.opponent}><Crest club={opponent} size="sm"/><div><b>{opponent}</b><p>{competition} · {roundLabel ?? `${round}ª rodada`}</p></div></div> : <p className={styles.noMatch}>Nenhum jogo agendado.</p>}</section>
    <button type="button" onClick={onCta} className={styles.cta}><ClassicIcon name="sport_soccer" size={20}/>{ctaLabel}</button>
    <section className={styles.player}><h2>{selectedPlayer ? <>{selectedPlayer.name} <span>F: {selectedPlayer.overall}</span></> : "Jogador selecionado"}</h2>{selectedPlayer ? <div className={styles.playerBody}><p>{positionLabel[selectedPlayer.position]} · {selectedPlayer.foot === "D" ? "Direito" : "Esquerdo"} · {selectedPlayer.age} anos</p><p>Contrato até: {record?.contractUntil ?? selectedPlayer.contractUntil}</p><p><b>Valor:</b> R$ {selectedPlayer.marketValue.toFixed(1)} mi &nbsp; <b>Salário:</b> {record?.salary ?? selectedPlayer.salary} mil</p><table><thead><tr><th></th><th>Temporada {season}</th><th>Carreira</th></tr></thead><tbody><tr><th>Jogos</th><td>{current?.games ?? 0}</td><td>{totals.games}</td></tr><tr><th>Gols</th><td>{current?.goals ?? 0}</td><td>{totals.goals}</td></tr><tr><th>Assistências</th><td>{current?.assists ?? 0}</td><td>{totals.assists}</td></tr><tr><th>Nota média</th><td>{current?.average?.toFixed(2).replace(".", ",") ?? "—"}</td><td>—</td></tr></tbody></table></div> : <p className={styles.noMatch}>Selecione um jogador na tabela.</p>}</section>
    <div className={styles.quick} aria-label="Ações do clube"><Quick icon="group" label="Elenco" onClick={() => onQuickAction("roster")} /><Quick icon="money" label="Finanças" onClick={() => onQuickAction("finances")} /><Quick icon="medal_award_gold" label="Troféus" onClick={() => onQuickAction("trophies")} /><Quick icon="chart_bar" label="Treino" onClick={() => onQuickAction("training")} /><span>{squadSize}/35</span></div>
  </aside>;
}
function Quick({ icon, label, onClick }: { icon: ClassicIconName; label: string; onClick: () => void }) { return <button type="button" title={label} aria-label={label} onClick={onClick}><ClassicIcon name={icon} size={23}/></button>; }
