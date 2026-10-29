import type { Player } from "@/lib/game/mock-data";
import Image from "next/image";
import { clubThemes, positionLabel } from "@/lib/game/mock-data";
import { clubCrestAsset } from "@/lib/game/assets";
import { InterfaceIcon } from "./interface-icon";
import styles from "./club-sidebar.module.css";

export function Crest({ club, size = "md" }: { club: string; size?: "sm" | "md" }) {
  const theme = clubThemes[club] ?? { primary: "#334155", secondary: "#64748b", text: "#ffffff", short: club.split(/\s+/).filter(Boolean).map((word) => word[0]).join("").slice(0, 3).toUpperCase() };
  const dims = size === "sm" ? "h-10 w-10 text-[9px]" : "h-14 w-14 text-[11px]";
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

export function ClubSidebar({ club, coach, budget, directorTrust, fanTrust, opponent, isHome,
  round, competition, selectedPlayer, ctaLabel, onCta, onQuickAction, onOpenPlayer }: {
  club: string; coach: string; budget: number; directorTrust: number; fanTrust: number;
  opponent: string; isHome: boolean; round: number; competition: string; selectedPlayer: Player | null;
  ctaLabel: string; onCta: () => void; onOpenPlayer?: (id: number) => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
}) {
  return <aside className={styles.sidebar} aria-label="Central do clube">
    <div className={styles.identity}><div className={styles.crest}><Crest club={club}/></div>
      <p className={styles.eyebrow}>SUA CARREIRA</p><h1>{club}</h1><p className={styles.coach}><InterfaceIcon name="user_suit" size={13}/>{coach}</p>
      <span className={styles.season}>TEMPORADA 2026 <i/> {round}ª RODADA</span>
    </div>
    <div className={styles.content}>
      <section className={styles.budget}><span><InterfaceIcon name="money" size={16}/>Caixa disponível</span><strong>R$ {(budget / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}<small> mi</small></strong></section>
      <section className={styles.nextMatch}>
        <div className={styles.sectionTitle}>PRÓXIMO DESAFIO <span>{isHome ? "CASA" : "FORA"}</span></div>
        <p className={styles.competition}>{competition} · {round}ª rodada</p>
        <div className={styles.opponent}><Crest club={opponent} size="sm"/><div><small>ADVERSÁRIO</small><strong>{opponent}</strong></div><InterfaceIcon name="chevron_right" size={16}/></div>
        <button type="button" className={styles.primary} onClick={onCta}><InterfaceIcon name="book" size={18}/>{ctaLabel}<InterfaceIcon name="arrow_up_right" size={17}/></button>
      </section>
      <section className={styles.focus}>
        <div className={styles.sectionTitle}>ATLETA EM FOCO <InterfaceIcon name="shield" size={14}/></div>
        {selectedPlayer ? <>
          <div className={styles.focusHeading}><div><strong>{selectedPlayer.name}</strong><p>{positionLabel[selectedPlayer.position]} · {selectedPlayer.age} anos</p></div><b>{selectedPlayer.overall}</b></div>
          <div className={styles.playerStats}><span>ENERGIA<b>{selectedPlayer.energy}%</b></span><span>GOLS<b>{selectedPlayer.goals}</b></span><span>ASSIST.<b>{selectedPlayer.assists}</b></span></div>
          {onOpenPlayer && <button type="button" className={styles.profile} onClick={() => onOpenPlayer(selectedPlayer.id)}>Ver perfil completo <InterfaceIcon name="arrow_up_right" size={14}/></button>}
        </> : <p className={styles.empty}>Selecione um atleta do elenco para acompanhar seus números.</p>}
      </section>
      <section className={styles.management}><div className={styles.sectionTitle}>GESTÃO DO CLUBE</div>
        <div className={styles.quickGrid}>{([['group','Elenco','roster'],['money','Finanças','finances'],['medal_award_gold','Troféus','trophies'],['activity','Treino','training']] as const).map(([icon,label,action]) => <button key={action} type="button" onClick={() => onQuickAction(action)}><InterfaceIcon name={icon} size={18}/><span>{label}</span></button>)}</div>
      </section>
      <section className={styles.trust} aria-label="Indicadores ilustrativos de confiança">
        {[['Diretoria',directorTrust],['Torcida',fanTrust]].map(([label,value]) => <div key={label}><span>{label}<b>{value}%</b></span><i><span style={{width:`${value}%`}}/></i></div>)}
        <small>Indicadores ilustrativos</small>
      </section>
    </div>
    <div className={styles.signature}><i/> CONSTRUA O SEU LEGADO.</div>
  </aside>;
}
