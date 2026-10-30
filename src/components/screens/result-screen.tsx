"use client";

import { useState } from "react";
import type { Player, RoundFixture } from "@/lib/game/mock-data";
import { isHighlight, type MatchEvent, type MatchPlayerRating, type MatchStatistics, type MatchWeather } from "@/lib/game/live-match";
import { formationSlotRoles, formationSlots } from "@/lib/game/formations";
import { Crest } from "@/components/ui/club-sidebar";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { MatchStatisticsTable } from "@/components/ui/match-statistics-table";
import styles from "./result-screen.module.css";

type ResultTab = "events" | "statistics" | "formations";

function eventLabel(event: MatchEvent) {
  if (event.card === "red") return "CARTÃO VERMELHO";
  if (event.card === "yellow") return "CARTÃO AMARELO";
  if (event.scene?.action === "goal") return "GOL";
  if (event.text.toLocaleLowerCase("pt-BR").includes("entrou no lugar")) return "SUBSTITUIÇÃO";
  if (event.text.toLocaleLowerCase("pt-BR").includes("formação alterada")) return "AJUSTE TÁTICO";
  switch (event.scene?.action) {
    case "shot": return event.outcome === "saved" ? "DEFESA DO GOLEIRO" : "FINALIZAÇÃO";
    case "foul": return "FALTA";
    case "offside": return "IMPEDIMENTO";
    case "turnover": return "RECUPERAÇÃO DE POSSE";
    case "discussion": return "DISCUSSÃO";
    default: return "MOMENTO DA PARTIDA";
  }
}

function eventIcon(event: MatchEvent) {
  if (event.card === "red") return "🟥";
  if (event.card === "yellow") return "🟨";
  if (event.scene?.action === "goal") return "⚽";
  if (event.text.toLocaleLowerCase("pt-BR").includes("entrou no lugar")) return "↔";
  if (event.text.toLocaleLowerCase("pt-BR").includes("formação alterada")) return "♟";
  switch (event.scene?.action) {
    case "shot": return "◎";
    case "foul": return "✋";
    case "offside": return "⚑";
    case "turnover": return "◈";
    case "discussion": return "!";
    default: return "•";
  }
}

function FormationCard({ club, players, formation, ratings }: { club: string; players: Player[]; formation: string; ratings: MatchPlayerRating[] }) {
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  const roles = formationSlotRoles[formation] ?? formationSlotRoles["4-3-3"];
  return <section className={styles.formationCard} aria-label={`${club}, formação ${formation}`}>
    <header><div className={styles.formationClub}><Crest club={club} size="sm" /><div><h3>{club}</h3><span>FORMAÇÃO {formation}</span></div></div><InterfaceIcon name="tactics" size={18} /></header>
    <div className={styles.pitch} role="img" aria-label={`Formação estática de ${club}: ${formation}`}>
      <i className={styles.pitchBorder} /><i className={styles.pitchMidline} /><i className={styles.pitchCircle} />
      <i className={styles.penaltyTop} /><i className={styles.penaltyBottom} />
      {slots.map((slot, index) => {
        const player = players[index];
        if (!player) return null;
        const rating = ratings.find((item) => item.playerId === player.id)?.rating;
        const shirt = player.shirtNumber ?? index + 1;
        return <div className={styles.playerMark} style={{ left: `${slot.left}%`, top: `${slot.top}%` }} key={`${player.id}-${index}`}>
          <span className={styles.playerNumber}>{shirt}</span>
          <span className={styles.playerName} title={player.name}>{player.name}</span>
          <span className={styles.playerPosition}>{roles[index]}{rating !== undefined ? ` · ${rating.toFixed(1)}` : ""}</span>
        </div>;
      })}
    </div>
  </section>;
}

export function ResultScreen({
  competition,
  round,
  fixtures,
  club,
  opponent,
  homeScore,
  awayScore,
  homeFormation,
  awayFormation,
  homeFormationPlayers,
  awayFormationPlayers,
  ratingPlayers,
  events,
  weather,
  motivationHome,
  motivationAway,
  homePlayerRatings,
  awayPlayerRatings,
  statistics,
  onContinue,
}: {
  competition: string;
  round: number;
  fixtures: RoundFixture[];
  club: string;
  opponent: string;
  homeScore: number;
  awayScore: number;
  homeFormation: string;
  awayFormation: string;
  homeFormationPlayers: Player[];
  awayFormationPlayers: Player[];
  ratingPlayers: Player[];
  events: MatchEvent[];
  weather?: MatchWeather;
  motivationHome?: number;
  motivationAway?: number;
  homePlayerRatings: MatchPlayerRating[];
  awayPlayerRatings: MatchPlayerRating[];
  statistics: MatchStatistics;
  onContinue: () => void;
}) {
  const [tab, setTab] = useState<ResultTab>("events");
  const scoredEvents = [...events].filter(isHighlight).map((event, index) => ({ event, index }))
    .sort((a, b) => b.event.minute - a.event.minute || b.index - a.index);
  const homeScorers = events.filter((event) => event.scene?.team === "home" && event.scene.action === "goal").map((event) => `${event.minute}′ ${event.scorer ?? event.text}`);
  const awayScorers = events.filter((event) => event.scene?.team === "away" && event.scene.action === "goal").map((event) => `${event.minute}′ ${event.scorer ?? event.text}`);

  return <main className={styles.page}>
    <div className={styles.layout}>
      <section className={styles.matchCard}>
        <header className={styles.header}>
          <span className={styles.trophy} role="img" aria-label="Troféu do campeonato"><InterfaceIcon name="trophy" size={26} /></span>
          <div><span className={styles.eyebrow}>FIM DE JOGO · {round}ª RODADA</span><h1>{competition}</h1><span className={styles.dateLabel}>Resumo da partida</span></div>
        </header>
        <section className={styles.scoreboard} aria-label={`Resultado final: ${club} ${homeScore}, ${opponent} ${awayScore}`}>
          <div className={styles.scoreTeam}><Crest club={club} size="md" /><b>{club}</b><small>MANDANTE</small></div>
          <div className={styles.scoreCenter}><strong>{homeScore}<i>–</i>{awayScore}</strong><span>ENCERRADO</span></div>
          <div className={styles.scoreTeam}><Crest club={opponent} size="md" /><b>{opponent}</b><small>VISITANTE</small></div>
          {(homeScorers.length > 0 || awayScorers.length > 0) && <div className={styles.goalSummary}>
            <div>{homeScorers.map((goal) => <span key={goal}>⚽ {goal}</span>)}</div><div>{awayScorers.map((goal) => <span key={goal}>⚽ {goal}</span>)}</div>
          </div>}
        </section>
        <div className={styles.matchMeta}>
          <span><b>CLIMA SIMULADO</b> · {weather ? `${weather.label}, ${weather.temperatureC} °C, vento ${weather.windKmh} km/h` : "indisponível"}</span>
          <span>Motivação estimada · {motivationHome ?? "—"} × {motivationAway ?? "—"}</span>
        </div>
        <nav className={styles.tabs} role="tablist" aria-label="Detalhes do resultado">
          {([{ id: "events", label: "Eventos" }, { id: "statistics", label: "Estatísticas" }, { id: "formations", label: "Formações" }] as const).map((item) => <button key={item.id} role="tab" id={`result-tab-${item.id}`} aria-selected={tab === item.id} aria-controls="result-panel" onClick={() => setTab(item.id)}>{item.label}</button>)}
        </nav>
        <div className={styles.tabPanel} id="result-panel" role="tabpanel" aria-labelledby={`result-tab-${tab}`}>
          {tab === "events" && <section aria-label="Eventos da partida" className={styles.timeline}>
            {scoredEvents.length === 0 ? <p className={styles.noEvents}>Nenhum evento decisivo foi registrado nesta partida.</p> : scoredEvents.map(({ event, index }) => {
              const side = event.team ?? event.scene?.team;
              const content = <div className={`${styles.eventCard} ${side === "home" ? styles.homeEvent : styles.awayEvent} ${event.scene?.action === "goal" ? styles.goalEvent : ""}`}>
                <span aria-hidden="true">{eventIcon(event)}</span><div><b>{eventLabel(event)}</b><p>{event.text}</p></div>
              </div>;
              return side
                ? <article className={`${styles.eventRow} ${side === "home" ? styles.homeRow : styles.awayRow}`} key={`${event.minute}-${index}`}>
                    {side === "home" ? content : <div />}
                    <time>{event.minute}&apos;</time>
                    {side === "away" ? content : <div />}
                  </article>
                : <article className={styles.neutralRow} key={`${event.minute}-${index}`}><time>{event.minute}&apos;</time>{content}</article>;
            })}
          </section>}
          {tab === "statistics" && <div className={styles.statisticsPanel}><MatchStatisticsTable homeTeam={club} awayTeam={opponent} statistics={statistics} /><p className={styles.statFootnote}>Estatísticas calculadas a partir dos eventos registrados nesta partida.</p></div>}
          {tab === "formations" && <section className={styles.formationsPanel} aria-label="Formações das equipes">
            <div className={styles.formationGrid}>
              <FormationCard club={club} players={homeFormationPlayers} formation={homeFormation} ratings={homePlayerRatings} />
              <FormationCard club={opponent} players={awayFormationPlayers} formation={awayFormation} ratings={awayPlayerRatings} />
            </div>
            <section className={styles.ratingsPanel} aria-label="Notas dos atletas">
              <h2>Notas dos atletas</h2>
              <div className={styles.ratingsGrid}>{ratingPlayers.map((player) => {
                const rating = homePlayerRatings.find((item) => item.playerId === player.id);
                return <div className={styles.ratingRow} key={player.id}><span>{player.position} · {player.name}</span><b>{rating?.rating.toFixed(1) ?? "—"}</b></div>;
              })}</div>
            </section>
          </section>}
        </div>
        <footer className={styles.footer}><p>Relato, estatísticas e placar vêm dos mesmos eventos da partida.</p><button onClick={onContinue}>Voltar ao hub <span aria-hidden="true">→</span></button></footer>
      </section>
      <aside className={styles.fixturesPanel} aria-label="Todos os jogos da rodada">
        <header><span className={styles.eyebrow}>MESMA DATA</span><h2>Jogos da rodada</h2><p>Resultados da competição</p></header>
        <div className={styles.fixtureList}>{fixtures.map((fixture) => {
          const current = fixture.home === club && fixture.away === opponent;
          return <article key={`${fixture.home}-${fixture.away}`} className={`${styles.fixture} ${current ? styles.currentFixture : ""}`}>
            <div className={styles.fixtureTeams}><span title={fixture.home}>{fixture.home}</span><b>{fixture.homeScore}</b></div>
            <div className={styles.fixtureTeams}><span title={fixture.away}>{fixture.away}</span><b>{fixture.awayScore}</b></div>
            <small>{current ? "Sua partida · finalizada" : "Placar simulado"}</small>
          </article>;
        })}{fixtures.length === 0 && <p className={styles.noFixtures}>Nenhum outro jogo cadastrado.</p>}</div>
      </aside>
    </div>
  </main>;
}
