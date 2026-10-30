"use client";

import { useEffect, useRef, useState } from "react";
import type { RoundFixture } from "@/lib/game/mock-data";
import type { MatchEvent, MatchWeather } from "@/lib/game/live-match";
import { Crest } from "@/components/ui/club-sidebar";
import styles from "./match-overview-screen.module.css";

export function MatchOverviewScreen({ competition, round, minute, half, club, opponent, homeScore, awayScore, possession, shots, onGoal, tackles, passErrors, fixtures, events, running, speed, halftimeWaiting, onToggleRunning, onSpeedChange, onOpenDetail, onRequestExit, weather, motivationHome, motivationAway, rulesLoading, rulesError }: {
  competition: string; round: number; minute: number; half: "1º tempo" | "2º tempo" | "fim";
  club: string; opponent: string; homeScore: number; awayScore: number; possession: number; shots: number;
  onGoal: string; tackles: number; passErrors: number; fixtures: RoundFixture[]; events: MatchEvent[];
  running: boolean; speed: 1 | 2 | 4; halftimeWaiting: boolean; onToggleRunning: () => void | Promise<void>;
  onSpeedChange: (speed: 1 | 2 | 4) => void; onOpenDetail: () => void; onRequestExit: () => void;
  weather?: MatchWeather; motivationHome?: number; motivationAway?: number; rulesLoading: boolean; rulesError: string | null;
}) {
  const [exitConfirmationOpen, setExitConfirmationOpen] = useState(false);
  const exitTriggerRef = useRef<HTMLButtonElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const logEnd = useRef<HTMLDivElement>(null);
  const status = running ? "AO VIVO" : halftimeWaiting ? "INTERVALO" : minute >= 90 ? "ENCERRADA" : "PARTIDA PAUSADA";

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
  }, [events.length]);

  const recentEvents = events.slice(-36);
  const fouls = events.filter((event) => event.scene?.action === "foul").length;
  const cards = events.filter((event) => event.card).length;
  return <main className={styles.page}>
    <section className={styles.shell}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>CENTRAL DA PARTIDA · RELATO TEXTUAL</span><h1>{competition}</h1><span className={styles.muted}>{round}ª rodada</span></div>
        <div className={styles.status}><span className={running ? styles.liveDot : styles.dot} /><span>{status}</span><strong>{minute}&apos; <small>· {halftimeWaiting ? "Intervalo" : half}</small></strong></div>
      </header>
      <div className={styles.progress}><div style={{ width: `${Math.min(100, minute / 90 * 100)}%` }} /></div>
      <div className={styles.scoreboard}>
        <div className={styles.team}><Crest club={club} size="sm" /><strong>{club}</strong><span>SEU CLUBE</span></div>
        <div className={styles.score}><span>{homeScore}</span><i>:</i><span>{awayScore}</span></div>
        <div className={styles.team}><Crest club={opponent} size="sm" /><strong>{opponent}</strong><span>ADVERSÁRIO</span></div>
      </div>
      <div className={styles.stats}>
        {[{ label: "Posse de bola", value: `${possession}%` }, { label: "Finalizações", value: shots }, { label: "No gol / fora", value: onGoal }, { label: "Desarmes", value: tackles }].map(stat => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
      </div>
      <div className={styles.controls}>
        <div className={styles.speeds}><span>VELOCIDADE</span>{([1, 2, 4] as const).map(value => <button key={value} aria-pressed={speed === value} onClick={() => onSpeedChange(value)}>{value}x</button>)}</div>
        <div className={styles.actions}>{minute < 90 && <button className={styles.primary} onClick={onToggleRunning} disabled={rulesLoading}>{rulesLoading ? "Lendo regras…" : running ? "❚❚  Pausar" : halftimeWaiting ? "▶  Iniciar 2º tempo" : "▶  Continuar"}</button>}<button className={styles.secondary} onClick={onOpenDetail}>Escalação e táticas ↗</button><button ref={exitTriggerRef} className={styles.exitButton} onClick={() => setExitConfirmationOpen(true)}>Menu inicial</button></div>
      </div>
      {rulesError && <p role="alert" className={styles.rulesError}>{rulesError} A partida permanece pausada.</p>}
      {exitConfirmationOpen && <div className={styles.dialogBackdrop}><section className={styles.exitDialog} role="alertdialog" aria-modal="true" aria-labelledby="exit-match-title" aria-describedby="exit-match-description"><span className={styles.eyebrow}>{minute < 90 ? "PARTIDA EM ANDAMENTO" : "PARTIDA FINALIZADA"}</span><h2 id="exit-match-title">{minute < 90 ? "Sair da partida?" : "Voltar ao menu inicial?"}</h2><p id="exit-match-description">{minute < 90 ? "Seu progresso será salvo neste minuto. Ao continuar esta carreira, a partida será retomada pausada." : "O resultado foi preservado. Você poderá continuar esta carreira quando quiser."}</p><div className={styles.dialogActions}><button ref={continueButtonRef} onClick={() => setExitConfirmationOpen(false)}>Continuar partida</button><button className={styles.confirmExit} onClick={onRequestExit}>Sair e salvar</button></div></section></div>}
      <div className={styles.content}>
        <section className={styles.reportCard} aria-label="Relato textual da partida">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>RELATO DA PARTIDA</span><h2>O jogo minuto a minuto</h2></div><span className={styles.badge}>{events.length} lances</span></div>
          <div className={styles.weather} aria-label="Condições simuladas da partida">
            <strong>CLIMA SIMULADO</strong>
            <span>{weather ? `${weather.label} · ${weather.temperatureC} °C · vento ${weather.windKmh} km/h` : "Lendo regras antes do início…"}</span>
            {weather?.rainIntensity ? <small>Intensidade da chuva: {Math.round(weather.rainIntensity * 100)}%</small> : <small>Condição reproduzível desta partida</small>}
          </div>
          <div className={styles.matchFacts}>
            <span>{fouls} faltas</span><span>{passErrors} passes interceptados</span><span>{cards} cartões</span><span>Motivação estimada / 100 · {club} {motivationHome ?? "—"} · {opponent} {motivationAway ?? "—"}</span>
          </div>
          <div className={styles.timeline} role="log" aria-label="Lances da partida" aria-live="polite" aria-relevant="additions text">
            {recentEvents.length === 0 ? <p className={styles.empty}>{rulesError ? "A partida não iniciou porque as regras não puderam ser lidas." : "Aguardando o apito inicial…"}</p> : recentEvents.map((event, index) => <article className={`${styles.timelineEvent} ${event.scene?.action === "goal" ? styles.goalEvent : ""}`} key={`${event.minute}-${index}`}>
              <strong>{event.minute}&apos;</strong><span aria-hidden="true">{event.card === "red" ? "🟥" : event.card === "yellow" ? "🟨" : event.scene?.action === "goal" ? "⚽" : event.scene?.action === "tackle" ? "◈" : event.scene?.action === "foul" ? "✋" : event.scene?.action === "shot" ? "◎" : event.scene?.action === "offside" ? "⚑" : "·"}</span><p>{event.text}</p>
            </article>)}
            <div ref={logEnd} />
          </div>
          <p className={styles.note}>Relato e estatísticas vêm dos mesmos eventos que definem placar, posse e desempenho.</p>
        </section>
        <aside className={styles.sidebar}>
          <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ACOMPANHE</span><h2>Resumo da rodada</h2></div></div>
            <div className={styles.fixtures}>{fixtures.map(fixture => <div className={styles.fixture} key={`${fixture.home}-${fixture.away}`}><div className={fixture.live ? styles.fixtureLive : ""}><span>{fixture.home}</span><b>{fixture.homeScore} - {fixture.awayScore}</b><span>{fixture.away}</span></div><small>{fixture.live ? "Sua partida" : "Resultado simulado"}</small></div>)}</div>
          </section>
          <section className={styles.panel}><span className={styles.eyebrow}>PLANO DE JOGO</span><p className={styles.tacticalText}>Técnica, energia, motivação, organização tática e clima influenciam cada lance. A superioridade aumenta as chances, sem tornar o resultado automático.</p></section>
        </aside>
      </div>
    </section>
  </main>;
}
