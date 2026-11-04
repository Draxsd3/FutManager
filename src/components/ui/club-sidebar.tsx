import type { ClubConfidence } from "@/lib/game/confidence";
import styles from "./club-sidebar.module.css";
import Image from "next/image";
import { clubThemes } from "@/lib/game/mock-data";
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
      role="img"
      aria-label={`Escudo do ${club}`}
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

export function ClubSidebar({ confidence, club, coach, budget, opponent, competition, roundLabel, isHome, hasNextMatch, squadSize, ctaLabel, onCta, onQuickAction }: {
  confidence: ClubConfidence | null;
  club: string; coach: string; budget: number; opponent: string; competition: string; roundLabel: string;
  isHome: boolean; hasNextMatch: boolean; squadSize: number; ctaLabel: string; onCta: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
}) {
  const homeClub = isHome ? club : opponent;
  const awayClub = isHome ? opponent : club;
  return <aside className={styles.sidebar}>
    <div className={styles.club}><Crest club={club} size="sm"/><div><small>SEU CLUBE</small><h1>{club}</h1><p>Treinador · {coach}</p></div></div>
    <div className={styles.balance}><span>CAIXA DISPONÍVEL</span><b>R$ {(budget / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small>mi</small></b></div>
    <div className={styles.trust} aria-label="Confiança estimada na carreira"><span title="Estimativa: 60% situação financeira (caixa, folha e variação desde a chegada quando disponível) e 40% confiança da torcida.">Confiança diretoria <b>{confidence ? `${confidence.board}%` : "Indisponível"}</b></span><span title="Estimativa baseada nos resultados disponíveis da carreira neste clube, com maior peso aos últimos cinco jogos.">Confiança torcida <b>{confidence ? `${confidence.fans}%` : "Indisponível"}</b></span><small className={styles.trustNote}>{confidence ? confidence.matches ? `Estimativa da carreira · ${confidence.matches} jogo${confidence.matches === 1 ? "" : "s"}` : "Sem jogos · diretoria considera finanças" : "Histórico da carreira indisponível"}</small></div>
    <button type="button" onClick={onCta} className={styles.cta}><Image src="/icons/navigation/taticas.webp" alt="" aria-hidden="true" width={52} height={52} className={styles.tacticsIcon} unoptimized /><span><small>PREPARE SUA EQUIPE</small><strong>{ctaLabel}</strong></span><b aria-hidden="true">↗</b></button>
    <section className={styles.match} aria-label="Confronto">
      <div className={styles.matchHeader}><span>PRÓXIMO APITO</span><b>{hasNextMatch ? competition : "SEM JOGO AGENDADO"}</b></div>
      {hasNextMatch ? <>
        <p className={styles.round}>{roundLabel}</p>
        <div className={styles.teams}>
          <div className={styles.team}><Crest club={homeClub} size="sm"/><span>{homeClub}<small>CASA</small></span></div>
          <b className={styles.versus}>VS</b>
          <div className={`${styles.team} ${styles.away}`}><Crest club={awayClub} size="sm"/><span>{awayClub}<small>FORA</small></span></div>
        </div>
      </> : <p className={styles.noFixture}>A temporada aguarda o próximo confronto.</p>}
    </section>
    <div className={styles.quickHeading}><span>GESTÃO DO CLUBE</span><span>{squadSize}/35 atletas</span></div>
    <div className={styles.quick} role="group" aria-label="Ações do clube"><Quick icon="group" label="Elenco" onClick={() => onQuickAction("roster")} /><Quick icon="money" label="Finanças" image="/icons/navigation/financas.webp" onClick={() => onQuickAction("finances")} /><Quick icon="medal_award_gold" label="Troféus" image="/icons/navigation/trofeus.webp" onClick={() => onQuickAction("trophies")} /><Quick icon="chart_bar" label="Treino" image="/icons/navigation/treino.webp" onClick={() => onQuickAction("training")} /></div>
  </aside>;
}

function Quick({ icon, image, label, onClick }: { icon: ClassicIconName; image?: string; label: string; onClick: () => void }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick}>{image ? <Image src={image} alt="" aria-hidden="true" width={32} height={32} className={styles.quickImage} unoptimized /> : <ClassicIcon name={icon} size={21}/>}<span>{label}</span></button>;
}
