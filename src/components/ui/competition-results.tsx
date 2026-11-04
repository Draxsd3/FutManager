import { useEffect, useRef, useState } from "react";
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
  const board = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => {
    const element = board.current;
    if (!element) return;
    function measure() {
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const cards = Array.from(element.querySelectorAll<HTMLElement>("[data-bracket-match]"));
      const lines: string[] = [];
      for (const source of cards) {
        const winner = source.dataset.winner;
        if (!winner) continue;
        const next = cards.find(card => Number(card.dataset.phase) === Number(source.dataset.phase) + 1 && [card.dataset.home, card.dataset.away].includes(winner));
        if (!next) continue;
        const a = source.getBoundingClientRect(), b = next.getBoundingClientRect();
        const x1 = a.right - bounds.left + element.scrollLeft, y1 = a.top + a.height / 2 - bounds.top;
        const x2 = b.left - bounds.left + element.scrollLeft, y2 = b.top + b.height / 2 - bounds.top;
        lines.push(`M ${x1} ${y1} H ${(x1 + x2) / 2} V ${y2} H ${x2}`);
      }
      setPaths(lines);
    }
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : undefined;
    observer?.observe(element);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [fixtures]);
  const final = fixtures.find(match => match.roundLabel?.toLocaleLowerCase("pt-BR") === "final" && match.played !== false && match.winner);
  return <section aria-label="Chave eliminatória"><p className={styles.disclaimer}>Confrontos por fase. As linhas ligam vencedores confirmados à próxima fase. Jogos bloqueados aguardam definição dos participantes; empates só têm vencedor com decisão registrada.</p>
    {phases.length ? <div className={styles.bracket} ref={board}><svg className={styles.bracketLines} aria-hidden="true">{paths.map((path, i) => <path key={i} d={path} />)}</svg>{phases.map((phase, phaseIndex) => <section className={styles.bracketPhase} key={phase}><h3>{phase}</h3><div>{fixtures.filter(match => (match.roundLabel ?? "Fase registrada") === phase).map((match, index) => <article className={styles.tie} key={index} data-bracket-match="" data-phase={phaseIndex} data-winner={match.played !== false && !match.participantsPending ? match.winner : undefined} data-home={!match.participantsPending ? match.home : undefined} data-away={!match.participantsPending ? match.away : undefined}>
      {[{ name: match.home, score: match.homeScore }, { name: match.away, score: match.awayScore }].map((team, teamIndex) => <div key={teamIndex} data-winner={!match.participantsPending && match.winner === team.name ? "true" : undefined}>{!match.participantsPending && <Crest club={team.name} size="sm" />}<span>{match.participantsPending ? "A definir" : team.name}</span><b>{match.played === false ? "—" : team.score}</b></div>)}
      <small>{match.participantsPending ? "Aguardando classificação" : match.played === false ? "A disputar" : "Encerrado"}</small>
    </article>)}</div></section>)}{final && <section className={styles.champion}><span>CAMPEÃO</span><Crest club={final.winner!} size="sm" /><strong>{final.winner}</strong></section>}</div> : <p>Chave ainda não cadastrada. As fases aparecerão quando os confrontos forem definidos.</p>}
  </section>;
}
export function CompetitionGroups({ groups }: { groups: { name: string; table: TableRow[] }[] }) {
  return <div className={styles.groupGrid}>{groups.map(group => <section className={styles.tableWrap} key={group.name}><h3>{group.name}</h3><table><caption className={styles.srOnly}>Classificação de {group.name}</caption><thead><tr>{["#", "Clube", "PTS", "J", "V", "E", "D", "SG"].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{group.table.map((row, index) => <tr key={row.club}><td>{index + 1}</td><th scope="row"><span><Crest club={row.club} size="sm" />{row.club}</span></th>{[row.points, row.played, row.wins, row.draws, row.losses, row.goalsFor - row.goalsAgainst].map((value, i) => <td key={i}>{value}</td>)}</tr>)}</tbody></table></section>)}</div>;
}
