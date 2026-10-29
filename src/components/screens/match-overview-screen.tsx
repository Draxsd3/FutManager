"use client";

import type { RoundFixture, Player } from "@/lib/game/mock-data";
import type { ManualPosition } from "@/lib/game/career";
import { formationSlots } from "@/lib/game/formations";
import { fieldPoint, isHighlight } from "@/lib/game/live-match";
import { LiveBall } from "./live-ball";
import type { MatchEvent } from "@/components/screens/match-detail-screen";
import { Crest } from "@/components/ui/club-sidebar";
import styles from "./match-overview-screen.module.css";

export function MatchOverviewScreen({ competition, round, minute, half, club, opponent, homeScore, awayScore, possession, shots, onGoal, tackles, passErrors, fixtures, events, running, speed, halftimeWaiting, onToggleRunning, onSpeedChange, onOpenDetail, formation, starters, manualPositions }: {
  competition: string; round: number; minute: number; half: "1º tempo" | "2º tempo" | "fim";
  club: string; opponent: string; homeScore: number; awayScore: number; possession: number; shots: number;
  onGoal: string; tackles: number; passErrors: number; fixtures: RoundFixture[]; events: MatchEvent[];
  running: boolean; speed: 1 | 2 | 4; halftimeWaiting: boolean; onToggleRunning: () => void;
  onSpeedChange: (speed: 1 | 2 | 4) => void; onOpenDetail: () => void;
  formation: string; starters: Player[]; manualPositions: Record<number, ManualPosition>;
}) {
  const status = running ? "AO VIVO" : halftimeWaiting ? "INTERVALO" : minute >= 90 ? "ENCERRADA" : "PARTIDA PAUSADA";
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  const currentEvent = [...events].reverse().find((event) => event.minute === minute && event.scene);
  const scene = currentEvent?.scene;
  const highlights = events.filter(isHighlight);
  return <main className={styles.page}>
    <section className={styles.shell}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>CENTRAL DA PARTIDA</span><h1>{competition}</h1><span className={styles.muted}>{round}ª rodada</span></div>
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
        <div className={styles.actions}>{minute < 90 && <button className={styles.primary} onClick={onToggleRunning}>{running ? "❚❚  Pausar" : halftimeWaiting ? "▶  Iniciar 2º tempo" : "▶  Continuar"}</button>}<button className={styles.secondary} onClick={onOpenDetail}>Escalação e táticas ↗</button></div>
      </div>
      <div className={styles.content}>
        <section className={styles.pitchCard} aria-label="Visualização da partida simulada">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>VISÃO DE JOGO</span><h2>Dentro de campo</h2></div><span className={styles.badge}>{formation}</span></div>
          <div className={styles.pitch} role="img" aria-label={`Campo simulado: ${club} em ${formation}, contra ${opponent}`}>
            <div className={styles.fieldLine} /><div className={styles.midline} /><div className={styles.circle} /><div className={styles.boxLeft} /><div className={styles.boxRight} /><div className={styles.goalLeft} /><div className={styles.goalRight} />
            {starters.slice(0, 11).map((player, index) => {
              const point = fieldPoint(manualPositions[player.id] ?? slots[index] ?? { left: 50, top: 50 }, false);
              const active = scene?.team === "home" && scene.actorIndex === index;
              const confronted = scene?.team === "away" && (scene.action === "foul" || scene.action === "discussion" || scene.action === "tackle") && index === scene.targetIndex;
              const receiving = scene?.team === "home" && scene.action === "pass" && index === scene.targetIndex;
              const location = confronted || receiving ? scene.to : active ? scene.from : point;
              return <span key={player.id} className={`${styles.player} ${styles.homePlayer} ${active || confronted ? styles.activePlayer : ""}`} style={{ left: `${location.x}%`, top: `${location.y}%`, transitionDuration: `${running ? 700 / speed : 0}ms` }} title={`${player.name} · ${player.position}`}><span>{player.shirtNumber ?? player.id}</span></span>;
            })}
            {slots.map((pos, index) => { const point = fieldPoint(pos, true); const active = scene?.team === "away" && scene.actorIndex === index; const confronted = scene?.team === "home" && (scene.action === "foul" || scene.action === "discussion" || scene.action === "tackle") && index === scene.targetIndex; const receiving = scene?.team === "away" && scene.action === "pass" && index === scene.targetIndex; const location = confronted || receiving ? scene.to : active ? scene.from : point; return <span key={index} className={`${styles.player} ${styles.awayPlayer} ${active || confronted ? styles.activePlayer : ""}`} style={{ left: `${location.x}%`, top: `${location.y}%`, transitionDuration: `${running ? 700 / speed : 0}ms` }} />; })}
            <LiveBall target={scene?.to} running={running} speed={speed} />
            {currentEvent && isHighlight(currentEvent) && <div className={styles.actionCaption} aria-live="polite"><strong>{scene?.action === "goal" ? "GOL" : scene?.action === "shot" ? "FINALIZAÇÃO" : scene?.action === "foul" ? "FALTA" : "DISCUSSÃO"}</strong> {currentEvent.text}</div>}
          </div>
          <div className={styles.legend}><span><i className={styles.homeKey} />{club}</span><span><i className={styles.awayKey} />{opponent}</span><span className={styles.note}>Lances simulados em campo · adversário em formação genérica</span></div>
        </section>
        <aside className={styles.sidebar}>
          <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ACOMPANHE</span><h2>Melhores momentos</h2></div><span className={styles.badge}>{highlights.length}</span></div>
            <div className={styles.events}>{highlights.length === 0 ? <p className={styles.empty}>Ainda não há melhores momentos.</p> : highlights.slice(-10).reverse().map((event, index) => <div className={styles.event} key={`${event.minute}-${index}`}><b>{event.minute}&apos;</b><span>{event.card ? (event.card === "yellow" ? "🟨" : "🟥") : event.text.startsWith("Gol") ? "⚽" : "↗"} &nbsp;{event.text}</span></div>)}</div>
            <p className={styles.note}>{passErrors} erros de passe registrados</p>
          </section>
          <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>PELOS ESTÁDIOS</span><h2>Jogos da rodada</h2></div></div>
            <div className={styles.fixtures}>{fixtures.map(fixture => <div className={styles.fixture} key={`${fixture.home}-${fixture.away}`}><div className={fixture.live ? styles.fixtureLive : ""}><span>{fixture.home}</span><b>{fixture.homeScore} - {fixture.awayScore}</b><span>{fixture.away}</span></div><small>{fixture.live ? "Sua partida" : "Resultado simulado"}</small></div>)}</div>
          </section>
        </aside>
      </div>
    </section>
  </main>;
}
