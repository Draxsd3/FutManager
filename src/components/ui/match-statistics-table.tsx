import type { MatchStatistics, MatchTeamStatistics } from "@/lib/game/live-match";
import styles from "./match-statistics-table.module.css";

type StatRow = {
  label: string;
  home: number;
  away: number;
  homeLabel?: string;
  awayLabel?: string;
};

function rowsFor(home: MatchTeamStatistics, away: MatchTeamStatistics, compact: boolean): StatRow[] {
  const rows: StatRow[] = [
    { label: "Posse de bola", home: home.possession, away: away.possession, homeLabel: `${home.possession}%`, awayLabel: `${away.possession}%` },
    { label: "Finalizações", home: home.shots, away: away.shots },
    { label: "Finalizações no alvo", home: home.shotsOnTarget, away: away.shotsOnTarget },
    { label: "Passes certos", home: home.passesCompleted, away: away.passesCompleted, homeLabel: `${home.passesCompleted}/${home.passes}`, awayLabel: `${away.passesCompleted}/${away.passes}` },
    { label: "Desarmes", home: home.tackles, away: away.tackles },
    { label: "Faltas", home: home.fouls, away: away.fouls },
  ];
  if (compact) return rows;
  return [...rows,
    { label: "Finalizações para fora", home: Math.max(0, home.shots - home.shotsOnTarget), away: Math.max(0, away.shots - away.shotsOnTarget) },
    { label: "Impedimentos", home: home.offsides, away: away.offsides },
    { label: "Cartões amarelos", home: home.yellowCards, away: away.yellowCards },
    { label: "Cartões vermelhos", home: home.redCards, away: away.redCards },
  ];
}

export function MatchStatisticsTable({ homeTeam, awayTeam, statistics, compact = false, className = "" }: {
  homeTeam: string;
  awayTeam: string;
  statistics: MatchStatistics;
  compact?: boolean;
  className?: string;
}) {
  const rows = rowsFor(statistics.home, statistics.away, compact);
  return <section className={`${styles.table} ${compact ? styles.compact : ""} ${className}`} aria-label={`Estatísticas de ${homeTeam} e ${awayTeam}`}>
    <header className={styles.heading}><span>{homeTeam}</span><strong>ESTATÍSTICAS</strong><span>{awayTeam}</span></header>
    <div className={styles.rows}>
      {rows.map((row) => {
        const total = row.home + row.away;
        const homeShare = total ? row.home / total * 100 : 50;
        const awayShare = total ? row.away / total * 100 : 50;
        return <div className={styles.row} key={row.label}>
          <b className={styles.homeValue}>{row.homeLabel ?? row.home}</b>
          <div className={`${styles.bar} ${styles.homeBar}`} aria-hidden="true"><i style={{ width: `${homeShare}%` }} /></div>
          <span className={styles.label}>{row.label}</span>
          <div className={`${styles.bar} ${styles.awayBar}`} aria-hidden="true"><i style={{ width: `${awayShare}%` }} /></div>
          <b className={styles.awayValue}>{row.awayLabel ?? row.away}</b>
        </div>;
      })}
    </div>
  </section>;
}
