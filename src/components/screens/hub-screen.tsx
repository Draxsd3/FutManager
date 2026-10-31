"use client";

import type { Player } from "@/lib/game/mock-data";
import type { PlayerCareerRecord } from "@/lib/game/career";
import { ClubSidebar } from "@/components/ui/club-sidebar";
import { fifaPosition, fifaPositionOrder } from "@/lib/game/fifa-position";
import styles from "./hub-screen.module.css";

export function HubScreen({ club, coach, budget, opponent, round, competition, squad, starters, selectedPlayer, playerCareers = {}, season = 2026, isHome = true, hasNextMatch = true, roundLabel, onSelectPlayer, onOpenPlayer, onEscalar, onQuickAction }: {
  club: string; coach: string; budget: number; opponent: string; round: number; competition: string;
  squad: Player[]; starters: number[]; selectedPlayer: Player | null; playerCareers?: Record<number, PlayerCareerRecord>;
  season?: number; isHome?: boolean; hasNextMatch?: boolean; roundLabel?: string;
  onSelectPlayer: (id: number) => void; onOpenPlayer: (id: number) => void; onEscalar: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
}) {
  const visibleSquad = [...squad].sort((a, b) => fifaPositionOrder(a) - fifaPositionOrder(b) || b.overall - a.overall || a.name.localeCompare(b.name, "pt-BR"));
  return <div className={styles.workspace}>
    <ClubSidebar club={club} coach={coach} budget={budget} opponent={opponent} isHome={isHome} hasNextMatch={hasNextMatch} round={round} roundLabel={roundLabel} competition={competition} selectedPlayer={selectedPlayer} record={selectedPlayer ? playerCareers[selectedPlayer.id] : undefined} season={season} squadSize={squad.length} ctaLabel="Escalar Time" onCta={onEscalar} onQuickAction={onQuickAction} />
    <section className={styles.roster} aria-labelledby="roster-heading">
      <div className={styles.tableScroll}>
        <h2 id="roster-heading" className={styles.visuallyHidden}>ELENCO</h2>
        <table className={styles.table}>
          <thead><tr><th scope="col" title="Posição">P</th><th scope="col">Nome</th><th scope="col" title="Pé dominante">Pé</th><th scope="col" title="Força">F</th><th scope="col">Energia</th><th scope="col">Salário</th><th scope="col">Valor</th><th scope="col" title="Jogos na temporada">J</th><th scope="col" title="Gols na temporada">G</th><th scope="col">Car.</th><th scope="col">Idade</th><th scope="col" title="Assistências na temporada">A</th><th scope="col" title="Nota média na temporada">NM</th></tr></thead>
          <tbody>{visibleSquad.map((player) => {
            const record = playerCareers[player.id];
            const current = record?.seasons.find((item) => item.season === season && item.club === club);
            return <tr key={player.id} onClick={() => onSelectPlayer(player.id)} onDoubleClick={() => onOpenPlayer(player.id)} className={selectedPlayer?.id === player.id ? styles.selected : undefined}>
              <td>{fifaPosition(player)}</td><td className={styles.name}><button type="button" onClick={(event) => { event.stopPropagation(); onSelectPlayer(player.id); }} onDoubleClick={(event) => { event.stopPropagation(); onOpenPlayer(player.id); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onOpenPlayer(player.id); } }} title="Selecione ou dê dois cliques para abrir a ficha">{player.name}</button>{starters.includes(player.id) && <span className={styles.starter} title="Titular">XI</span>}</td>
              <td>{player.foot}</td><td>{player.overall}</td><td><span className={styles.energy}><span style={{ width: `${Math.max(0, Math.min(100, player.energy))}%` }} /><b>{player.energy}%</b></span></td><td>{record?.salary ?? player.salary} mil</td><td>{player.marketValue.toFixed(1)}M</td><td>{current?.games ?? 0}</td><td>{current?.goals ?? 0}</td><td>{player.traits}</td><td>{player.age}</td><td>{current?.assists ?? 0}</td><td className={current?.average != null && current.average >= 7 ? styles.good : current?.average != null && current.average < 6 ? styles.low : undefined}>{current?.average?.toFixed(2).replace(".", ",") ?? "—"}</td>
            </tr>;
          })}</tbody>
        </table>
        {squad.length === 0 && <p className={styles.empty}>Nenhum atleta no elenco.</p>}
      </div>
      <footer className={styles.statusbar}><span>{squad.length} / 35 jogadores</span><span>Selecione um atleta · duplo clique ou Enter abre a ficha</span></footer>
    </section>
  </div>;
}
