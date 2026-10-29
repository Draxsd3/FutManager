"use client";

import type { RoundFixture, Player } from "@/lib/game/mock-data";
import type { ManualPosition } from "@/lib/game/career";
import { formationSlots } from "@/lib/game/formations";
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
        <section className={styles.pitchCard} aria-label="Visualização ilustrativa da partida">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>VISÃO DE JOGO</span><h2>Dentro de campo</h2></div><span className={styles.badge}>{formation}</span></div>
          <div className={styles.pitch} role="img" aria-label={`Campo ilustrativo: ${club} em ${formation}, contra ${opponent}`}>
            <div className={styles.fieldLine} /><div className={styles.midline} /><div className={styles.circle} /><div className={styles.boxLeft} /><div className={styles.boxRight} /><div className={styles.goalLeft} /><div className={styles.goalRight} />
            {starters.slice(0, 11).map((player, index) => {
              const pos = manualPositions[player.id] ?? slots[index] ?? { left: 50, top: 50 };
              const point = playerPoint(pos, minute, index, false);
              return <span key={player.id} className={`${styles.player} ${styles.homePlayer}`} style={{ left: `${point.x}%`, top: `${point.y}%`, transitionDuration: `${running ? 700 / speed : 0}ms` }} title={`${player.name} · ${player.position}`}><span>{player.shirtNumber ?? player.id}</span></span>;
            })}
            {slots.map((pos, index) => { const point = playerPoint(pos, minute, index, true); return <span key={index} className={`${styles.player} ${styles.awayPlayer}`} style={{ left: `${point.x}%`, top: `${point.y}%`, transitionDuration: `${running ? 700 / speed : 0}ms` }} />; })}
            <span className={styles.ball} style={{ left: `${50 + Math.sin(minute * .31) * 25}%`, top: `${50 + Math.cos(minute * .43) * 23}%`, transitionDuration: `${running ? 700 / speed : 0}ms` }} />
          </div>
          <div className={styles.legend}><span><i className={styles.homeKey} />{club}</span><span><i className={styles.awayKey} />{opponent}</span><span className={styles.note}>Movimentação ilustrativa · adversário em formação genérica · não representa os lances do motor</span></div>
        </section>
        <aside className={styles.sidebar}>
          <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ACOMPANHE</span><h2>Últimos lances</h2></div><span className={styles.badge}>{events.length}</span></div>
            <div className={styles.events}>{events.length === 0 ? <p className={styles.empty}>Ainda não há lances registrados.</p> : events.slice(-5).reverse().map((event, index) => <div className={styles.event} key={`${event.minute}-${index}`}><b>{event.minute}&apos;</b><span>{event.card ? (event.card === "yellow" ? "🟨" : "🟥") : event.text.startsWith("Gol") ? "⚽" : "↗"} &nbsp;{event.text}</span></div>)}</div>
            <p className={styles.note}>{passErrors} erros de passe registrados</p>
          </section>
          <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>PELOS ESTÁDIOS</span><h2>Jogos da rodada</h2></div></div>
            <div className={styles.fixtures}>{fixtures.map(fixture => <div className={styles.fixture} key={`${fixture.home}-${fixture.away}`}><div className={fixture.live ? styles.fixtureLive : ""}><span>{fixture.home}</span><b>{fixture.homeScore} - {fixture.awayScore}</b><span>{fixture.away}</span></div><small>{fixture.stadium} · {fixture.attendance.toLocaleString("pt-BR")} pessoas</small></div>)}</div>
          </section>
        </aside>
      </div>
    </section>
  </main>;
}

// O motor não fornece trajetórias: deslocamentos pequenos mantêm cada atleta próximo da posição tática.
function playerPoint(pos: ManualPosition, minute: number, index: number, away: boolean) {
  const x = away ? pos.top : 100 - pos.top;
  const y = away ? 100 - pos.left : pos.left;
  const movement = index === 10 ? 1 : 3;
  return { x: Math.max(3, Math.min(97, x + Math.sin(minute * .42 + index * 1.7) * movement)), y: Math.max(4, Math.min(96, y + Math.cos(minute * .35 + index * 1.3) * movement)) };
}
