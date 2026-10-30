"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { RoundFixture } from "@/lib/game/mock-data";
import { isHighlight, type MatchEvent, type MatchStatistics, type MatchWeather } from "@/lib/game/live-match";
import { Crest } from "@/components/ui/club-sidebar";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { MatchStatisticsTable } from "@/components/ui/match-statistics-table";
import styles from "./match-overview-screen.module.css";

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

function TimelineCard({ event, home }: { event: MatchEvent; home: boolean }) {
  return <div className={`${styles.eventCard} ${home ? styles.homeEventCard : styles.awayEventCard} ${event.scene?.action === "goal" ? styles.goalEvent : ""}`}>
    <span className={styles.eventIcon} aria-hidden="true">{eventIcon(event)}</span>
    <div><strong>{eventLabel(event)}</strong><p>{event.text}</p></div>
  </div>;
}

export function MatchOverviewScreen({ competition, trophyAsset, round, roundLabel, minute, half, club, opponent, homeScore, awayScore, statistics, fixtures, events, running, speed, halftimeWaiting, onToggleRunning, onSpeedChange, onOpenDetail, onRequestExit, weather, motivationHome, motivationAway, rulesLoading, rulesError }: {
  competition: string; trophyAsset?: string | null; round: number; roundLabel?: string; minute: number; half: "1º tempo" | "2º tempo" | "fim";
  club: string; opponent: string; homeScore: number; awayScore: number; statistics: MatchStatistics; fixtures: RoundFixture[]; events: MatchEvent[];
  running: boolean; speed: 1 | 2 | 4; halftimeWaiting: boolean; onToggleRunning: () => void | Promise<void>;
  onSpeedChange: (speed: 1 | 2 | 4) => void; onOpenDetail: () => void; onRequestExit: () => void;
  weather?: MatchWeather; motivationHome?: number; motivationAway?: number; rulesLoading: boolean; rulesError: string | null;
}) {
  const [exitConfirmationOpen, setExitConfirmationOpen] = useState(false);
  const exitTriggerRef = useRef<HTMLButtonElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const logEnd = useRef<HTMLDivElement>(null);
  const status = running ? "AO VIVO" : halftimeWaiting ? "INTERVALO" : minute >= 90 ? "ENCERRADA" : "PARTIDA PAUSADA";
  const keyMoments = events.filter(isHighlight).slice(-24);

  useEffect(() => {
    if (!exitConfirmationOpen) return;
    const exitTrigger = exitTriggerRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExitConfirmationOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    continueButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      exitTrigger?.focus();
    };
  }, [exitConfirmationOpen]);
  useEffect(() => {
    if (typeof logEnd.current?.scrollIntoView === "function") logEnd.current.scrollIntoView({ block: "nearest" });
  }, [keyMoments.length]);

  const fouls = statistics.home.fouls + statistics.away.fouls;
  const cards = statistics.home.yellowCards + statistics.away.yellowCards + statistics.home.redCards + statistics.away.redCards;
  return <main className={styles.page}>
    <section className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.competitionTitle}>
          <span className={styles.trophy}>{trophyAsset ? <Image src={trophyAsset} alt={`Troféu ${competition}`} width={38} height={42} unoptimized style={{ width: "80%", height: "88%", objectFit: "contain" }} /> : <span role="img" aria-label={`Troféu ${competition}`}><InterfaceIcon name="trophy" size={30} /></span>}</span>
          <div><span className={styles.eyebrow}>CENTRAL DA PARTIDA · RELATO TEXTUAL</span><h1>{competition}</h1><span className={styles.muted}>{roundLabel ?? `${round}ª rodada`}</span></div>
        </div>
        <div className={styles.status}><span className={running ? styles.liveDot : styles.dot} /><span>{status}</span><strong>{minute}&apos; <small>· {halftimeWaiting ? "Intervalo" : half}</small></strong></div>
      </header>
      <div className={styles.progress}><div style={{ width: `${Math.min(100, minute / 90 * 100)}%` }} /></div>
      <div className={styles.scoreboard}>
        <div className={styles.team}><Crest club={club} size="sm" /><strong>{club}</strong><span>MANDANTE</span></div>
        <div className={styles.score}><span>{homeScore}</span><i>:</i><span>{awayScore}</span></div>
        <div className={styles.team}><Crest club={opponent} size="sm" /><strong>{opponent}</strong><span>VISITANTE</span></div>
      </div>
      <MatchStatisticsTable homeTeam={club} awayTeam={opponent} statistics={statistics} compact />
      <div className={styles.controls}>
        <div className={styles.speeds}><span>VELOCIDADE</span>{([1, 2, 4] as const).map(value => <button key={value} aria-pressed={speed === value} onClick={() => onSpeedChange(value)}>{value}x</button>)}</div>
        <div className={styles.actions}>{minute < 90 && <button className={styles.primary} onClick={onToggleRunning} disabled={rulesLoading}>{rulesLoading ? "Lendo regras…" : running ? "❚❚  Pausar" : halftimeWaiting ? "▶  Iniciar 2º tempo" : "▶  Continuar"}</button>}<button className={styles.secondary} onClick={onOpenDetail}>Escalação e táticas ↗</button><button ref={exitTriggerRef} className={styles.exitButton} onClick={() => setExitConfirmationOpen(true)}>Menu inicial</button></div>
      </div>
      {rulesError && <p role="alert" className={styles.rulesError}>{rulesError} A partida permanece pausada.</p>}
      {exitConfirmationOpen && <div className={styles.dialogBackdrop}><section className={styles.exitDialog} role="alertdialog" aria-modal="true" aria-labelledby="exit-match-title" aria-describedby="exit-match-description"><span className={styles.eyebrow}>{minute < 90 ? "PARTIDA EM ANDAMENTO" : "PARTIDA FINALIZADA"}</span><h2 id="exit-match-title">{minute < 90 ? "Sair da partida?" : "Voltar ao menu inicial?"}</h2><p id="exit-match-description">{minute < 90 ? "Seu progresso será salvo neste minuto. Ao continuar esta carreira, a partida será retomada pausada." : "O resultado foi preservado. Você poderá continuar esta carreira quando quiser."}</p><div className={styles.dialogActions}><button ref={continueButtonRef} onClick={() => setExitConfirmationOpen(false)}>Continuar partida</button><button className={styles.confirmExit} onClick={onRequestExit}>Sair e salvar</button></div></section></div>}
      <div className={styles.content}>
        <section className={styles.reportCard} aria-label="Relato textual da partida">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ACONTECIMENTOS-CHAVE</span><h2>Minuto a minuto</h2></div><span className={styles.badge}>{keyMoments.length} momentos</span></div>
          <div className={styles.weather} aria-label="Condições simuladas da partida">
            <strong>CLIMA SIMULADO</strong>
            <span>{weather ? `${weather.label} · ${weather.temperatureC} °C · vento ${weather.windKmh} km/h` : "Lendo regras antes do início…"}</span>
            {weather?.rainIntensity ? <small>Intensidade da chuva: {Math.round(weather.rainIntensity * 100)}%</small> : <small>Condição reproduzível desta partida</small>}
            <span className={styles.weatherDivider} aria-hidden="true" />
            <small>Motivação estimada · {club} {motivationHome ?? "—"} · {opponent} {motivationAway ?? "—"}</small>
          </div>
          <div className={styles.matchFacts}><span>{fouls} faltas somadas</span><span>{statistics.home.passes + statistics.away.passes} passes contabilizados</span><span>{cards} cartões</span></div>
          <div className={styles.timeline} role="log" aria-label="Lances importantes da partida" aria-live="polite" aria-relevant="additions text">
            {keyMoments.length === 0 ? <p className={styles.empty}>{rulesError ? "A partida não iniciou porque as regras não puderam ser lidas." : "Aguardando os primeiros lances importantes…"}</p> : keyMoments.map((event, index) => {
              const side = event.team ?? event.scene?.team;
              return side
                ? <article className={`${styles.timelineEvent} ${side === "home" ? styles.homeTimelineEvent : styles.awayTimelineEvent}`} key={`${event.minute}-${event.text}-${index}`}>
                    {side === "home" ? <TimelineCard event={event} home /> : <div className={styles.timelineBlank} />}
                    <time>{event.minute}&apos;</time>
                    {side === "away" ? <TimelineCard event={event} home={false} /> : <div className={styles.timelineBlank} />}
                  </article>
                : <article className={styles.neutralTimelineEvent} key={`${event.minute}-${event.text}-${index}`}><time>{event.minute}&apos;</time><TimelineCard event={event} home /></article>;
            })}
            <div ref={logEnd} />
          </div>
          <p className={styles.note}>O relato destaca gols, finalizações, cartões, faltas, impedimentos e substituições. A circulação rotineira da bola permanece nas estatísticas.</p>
        </section>
        <aside className={styles.sidebar}>
          <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>MESMA RODADA</span><h2>Todos os jogos</h2></div><span className={styles.badge}>{fixtures.length} partidas</span></div>
            <div className={styles.fixtures}>{fixtures.map(fixture => <div className={styles.fixture} key={`${fixture.home}-${fixture.away}`}><div className={fixture.live ? styles.fixtureLive : ""}><span>{fixture.home}</span><b>{fixture.played === false ? "—" : `${fixture.homeScore} - ${fixture.awayScore}`}</b><span>{fixture.away}</span></div><small>{fixture.live ? "Sua partida · ao vivo" : fixture.played === false ? "Agendada" : "Resultado registrado"}</small></div>)}</div>
          </section>
        </aside>
      </div>
    </section>
  </main>;
}
