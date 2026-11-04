import { useState } from "react";
import type { RoundFixture, TableRow } from "@/lib/game/mock-data";
import { Crest } from "./club-sidebar";
import styles from "./competition-center.module.css";

export function recentMatches(fixtures: RoundFixture[], club: string) {
  return fixtures.filter(match => match.played !== false && !match.participantsPending && (match.home === club || match.away === club)).sort((a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "")).slice(-5);
}
export function CompetitionRounds({ fixtures, club, selectedRound, onRound }: { fixtures: RoundFixture[]; club?: string; selectedRound: string; onRound: (round: string) => void }) {
  const rounds = [...new Set(fixtures.map(match => match.roundLabel ?? "Rodada registrada"))];
  const active = rounds.includes(selectedRound) ? selectedRound : rounds.find(label => fixtures.some(match => (match.roundLabel ?? "Rodada registrada") === label && match.played === false)) ?? rounds.at(-1);
  return <section className={styles.roundPanel} aria-label="Rodadas do campeonato">
    <h3>Jogos e rodadas</h3>
    {club && <p>Últimos resultados de {club}. Selecione uma rodada para ver todos os jogos.</p>}
    {rounds.length ? <><label>Rodada / fase<select value={active} onChange={event => onRound(event.target.value)}>{rounds.map(label => <option key={label}>{label}</option>)}</select></label>
      {fixtures.filter(match => (match.roundLabel ?? "Rodada registrada") === active).map((match, index) => <article className={styles.roundMatch} key={index}>
        <span>{!match.participantsPending && <Crest club={match.home} size="sm" />}{match.participantsPending ? "A definir" : match.home}</span><b>{match.played === false ? "—" : `${match.homeScore} × ${match.awayScore}`}</b><span>{!match.participantsPending && <Crest club={match.away} size="sm" />}{match.participantsPending ? "A definir" : match.away}</span><small>{match.played === false ? "A disputar" : "Encerrado"} · {match.stadium}</small>
      </article>)}</> : <p>Calendário não cadastrado</p>}
  </section>;
}
export function CompetitionBracket({ fixtures }: { fixtures: RoundFixture[] }) {
  const phases = [...new Set(fixtures.map(match => match.roundLabel ?? "Fase registrada"))];
  const [selectedPhase, setSelectedPhase] = useState("");
  const active = phases.includes(selectedPhase) ? selectedPhase : phases.find(phase => fixtures.some(match => (match.roundLabel ?? "Fase registrada") === phase && match.played === false && !match.participantsPending)) ?? phases[0];
  const matches = fixtures.filter(match => (match.roundLabel ?? "Fase registrada") === active);
  const final = fixtures.find(match => match.roundLabel?.toLocaleLowerCase("pt-BR") === "final" && match.played !== false && !match.participantsPending && match.winner);
  return <section aria-label="Confrontos do mata-mata">
    {phases.length ? <>
      <div className={styles.knockoutHeading}><label>Fase <select aria-label="Fase do mata-mata" value={active} onChange={event => setSelectedPhase(event.target.value)}>{phases.map(phase => <option key={phase}>{phase}</option>)}</select></label><span>{matches.length} confronto{matches.length === 1 ? "" : "s"}</span></div>
      {final && <p className={styles.knockoutChampion}><strong>Campeão:</strong> {final.winner}</p>}
      <div className={styles.knockoutList} role="region" aria-label={`Confrontos de ${active}`} tabIndex={0}>
        {matches.map((match, index) => {
          const pending = !!match.participantsPending;
          const played = !pending && match.played !== false;
          return <article className={styles.knockoutMatch} key={index}>
            <div className={styles.knockoutTeam} data-winner={played && match.winner === match.home ? "true" : undefined}>
              {!pending && <Crest club={match.home} size="sm" />}<span>{pending ? "A definir" : match.home}</span>
            </div>
            <strong className={styles.knockoutScore}>{played ? `${match.homeScore} × ${match.awayScore}` : "— × —"}</strong>
            <div className={`${styles.knockoutTeam} ${styles.knockoutAway}`} data-winner={played && match.winner === match.away ? "true" : undefined}>
              {!pending && <Crest club={match.away} size="sm" />}<span>{pending ? "A definir" : match.away}</span>
            </div>
            <small>{pending ? "Aguardando classificação" : played ? match.winner ? `Encerrado · Classificado: ${match.winner}` : "Encerrado" : "A disputar"}</small>
          </article>;
        })}
      </div>
      <p className={styles.disclaimer}>Jogos pendentes aguardam a definição dos participantes; empates só têm vencedor quando a decisão estiver registrada.</p>
    </> : <p>Confrontos ainda não cadastrados. As fases aparecerão quando forem definidas.</p>}
  </section>;
}
export function CompetitionGroups({ groups }: { groups: { name: string; table: TableRow[] }[] }) {
  return <div className={styles.groupGrid}>{groups.map(group => <section className={styles.tableWrap} key={group.name}><h3>{group.name}</h3><table><caption className={styles.srOnly}>Classificação de {group.name}</caption><thead><tr>{["#", "Clube", "PTS", "J", "V", "E", "D", "SG"].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{group.table.map((row, index) => <tr key={row.club}><td>{index + 1}</td><th scope="row"><span><Crest club={row.club} size="sm" />{row.club}</span></th>{[row.points, row.played, row.wins, row.draws, row.losses, row.goalsFor - row.goalsAgainst].map((value, i) => <td key={i}>{value}</td>)}</tr>)}</tbody></table></section>)}</div>;
}
