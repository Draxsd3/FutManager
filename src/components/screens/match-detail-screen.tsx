"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { ManualPosition } from "@/lib/game/career";
import type { MatchStatistics } from "@/lib/game/live-match";
import type { Player } from "@/lib/game/mock-data";
import { clubThemes } from "@/lib/game/mock-data";
import { formations } from "@/lib/game/formations";
import { Crest } from "@/components/ui/club-sidebar";
import { Pitch } from "@/components/ui/pitch";
import styles from "./match-detail-screen.module.css";

export type { MatchEvent } from "@/lib/game/live-match";

type Props = {
  club: string;
  clubColors?: { primaryColor: string; secondaryColor: string };
  opponent: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  formation: string;
  setFormation: (value: string) => void;
  style: string;
  setStyle: (value: string) => void;
  marking: string;
  setMarking: (value: string) => void;
  focus: string;
  setFocus: (value: string) => void;
  statistics: MatchStatistics;
  manualPositions: Record<number, ManualPosition>;
  onMovePlayers: (positions: Record<number, ManualPosition>) => void;
  startersData: Player[];
  bench: Player[];
  substitutionsLeft: number;
  selectedPlayer: number | null;
  substitutionOut: number | null;
  onSelectPlayer: (id: number | null) => void;
  onSubstitute: (id: number) => void;
  onClose: () => void;
  onStartSecondHalf: () => void | Promise<void>;
  isHalftime: boolean;
  returnFocusTo?: HTMLElement | null;
};

/** Paused match tactics with the live lineup on a rendered pitch. */
export function MatchDetailScreen({ club, clubColors, opponent, homeScore, awayScore, minute,
  formation, setFormation, style, setStyle, marking, setMarking, focus, setFocus, statistics,
  manualPositions, onMovePlayers, startersData, bench, substitutionsLeft, selectedPlayer,
  substitutionOut, onSelectPlayer, onSubstitute, onClose, onStartSecondHalf, isHalftime, returnFocusTo }: Props) {
  const dialog = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = returnFocusTo ?? document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [returnFocusTo]);
  const outgoing = startersData.find((player) => player.id === substitutionOut);
  const incoming = bench.find((player) => player.id === selectedPlayer);
  const canSubstitute = substitutionsLeft > 0;
  const primary = clubColors?.primaryColor ?? (clubThemes[club] ?? clubThemes.Palmeiras).primary;
  const rgb = [1, 3, 5].map((offset) => parseInt(primary.slice(offset, offset + 2), 16));
  const theme = { "--team-primary": primary,
    "--team-text": rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 > 145 ? "#111111" : "#ffffff" } as CSSProperties;

  function close() {
    onSelectPlayer(null);
    onClose();
  }

  return <div className={styles.backdrop} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="match-tactics-title"
      aria-describedby="match-tactics-description" className={styles.modal} style={theme}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
        if (event.key !== "Tab") return;
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), select") ?? []).filter((element) => element.getClientRects().length > 0);
        const first = controls[0], last = controls.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <header className={styles.header}>
        <div className={styles.scoreboard}>
          <div className={styles.team}><Crest club={club} size="sm" /><b>{club}</b></div>
          <strong className={styles.score} aria-label={`Placar ${homeScore} a ${awayScore}`}>{homeScore}<i>×</i>{awayScore}</strong>
          <div className={styles.team}><Crest club={opponent} size="sm" /><b>{opponent}</b></div>
        </div>
        <div className={styles.matchState}><span className={styles.eyebrow}>AJUSTES DE PARTIDA</span><h1 id="match-tactics-title">Táticas</h1><strong>{isHalftime ? "INTERVALO" : `${minute}′ · PAUSADO`}</strong></div>
        <button ref={closeButton} type="button" className={styles.close} onClick={close} aria-label="Fechar táticas">×</button>
      </header>

      <div className={styles.toolbar}>
        <Select label="Formação" value={formation} onChange={setFormation} options={formations} />
        <Select label="Estilo de jogo" value={style} onChange={setStyle} options={["Equilibrado", "Ofensivo", "Defensivo"]} />
        <Select label="Marcação" value={marking} onChange={setMarking} options={["Leve", "Normal", "Pesada"]} />
        <Select label="Foco de ataque" value={focus} onChange={setFocus} options={["Pelo meio", "Pelas laterais"]} />
        <div className={styles.subCount}><span>SUBSTITUIÇÕES</span><b>{substitutionsLeft}</b></div>
      </div>

      <p id="match-tactics-description" className={styles.description}>{isHalftime
        ? "Intervalo. Ajuste a equipe antes do segundo tempo; alterações táticas são aplicadas à partida."
        : "Partida pausada. Selecione um titular no campo e uma reserva para preparar uma substituição."}</p>

      <div className={styles.content}>
        <aside className={styles.benchPanel} aria-label="Banco de reservas">
          <div className={styles.panelHeading}><span><b>Banco</b><small>Escolha quem entra</small></span><strong>{bench.length}</strong></div>
          <div className={styles.benchList}>
            {bench.map((player) => {
              const chosen = incoming?.id === player.id;
              return <button key={player.id} type="button" className={`${styles.player} ${chosen ? styles.selected : ""}`}
                data-reserve={player.id} aria-pressed={chosen} disabled={!canSubstitute}
                aria-label={`Entra: ${player.name}, camisa ${player.shirtNumber ?? player.id}, força ${player.overall}`}
                onClick={() => onSelectPlayer(chosen ? null : player.id)}>
                <span className={styles.position}>{player.position}</span><span className={styles.playerIdentity}><b>{player.name}</b><small>{player.position} · {player.energy}% energia</small></span><strong>{player.overall}</strong>
              </button>;
            })}
            {!bench.length && <p className={styles.empty}>Não há reservas disponíveis.</p>}
          </div>
        </aside>

        <section className={styles.pitchPanel} aria-label="Campo tático">
          <div className={styles.pitchHeading}><span><b>Campo</b><small>{formation} · toque em um titular para selecioná-lo</small></span><span className={styles.pitchLegend}><i /> Titular</span></div>
          <div className={styles.pitchFrame}>
            <Pitch club={club} formation={formation} starters={startersData}
              selectedPlayer={substitutionOut ?? null} onSelect={onSelectPlayer}
              manualPositions={manualPositions} onMovePlayers={onMovePlayers} tactical />
          </div>
          <p className={styles.pitchHint}>Arraste as camisas para reorganizar a equipe. Solte em outro atleta para trocar suas posições.</p>
        </section>

        <aside className={styles.statsPanel} aria-label="Placar e estatísticas da partida">
          <div className={styles.panelHeading}><span><b>Partida</b><small>Dados ao vivo até {minute}′</small></span><span className={styles.liveTag}>{isHalftime ? "INTERVALO" : "PAUSADA"}</span></div>
          <div className={styles.miniScore}><div><Crest club={club} size="sm" /><b>{club}</b><strong>{homeScore}</strong></div><div><Crest club={opponent} size="sm" /><b>{opponent}</b><strong>{awayScore}</strong></div></div>
          <div className={styles.statList}>
            <StatRow label="Posse de bola" home={statistics.home.possession} away={statistics.away.possession} suffix="%" />
            <StatRow label="Finalizações" home={statistics.home.shots} away={statistics.away.shots} />
            <StatRow label="No gol" home={statistics.home.shotsOnTarget} away={statistics.away.shotsOnTarget} />
            <StatRow label="Passes certos" home={statistics.home.passesCompleted} away={statistics.away.passesCompleted} totalHome={statistics.home.passes} totalAway={statistics.away.passes} />
            <StatRow label="Desarmes" home={statistics.home.tackles} away={statistics.away.tackles} />
            <StatRow label="Faltas" home={statistics.home.fouls} away={statistics.away.fouls} />
          </div>
          <p className={styles.statFootnote}>Estatísticas atuais da simulação.</p>
        </aside>
      </div>

      <footer className={styles.footer}>
        <p className={styles.pending} role="status">{outgoing && incoming
          ? <><span>Sai <b>{outgoing.name}</b></span><span>Entra <b>{incoming.name}</b></span></>
          : canSubstitute ? "Selecione um titular no campo e uma reserva para preparar a troca." : "Limite de substituições atingido. Tática e formação continuam disponíveis."}</p>
        <div className={styles.actions}>
          {(outgoing || incoming) && <button type="button" className={styles.cancel} onClick={() => onSelectPlayer(null)}>Cancelar troca</button>}
          <button type="button" className={styles.confirm} disabled={!canSubstitute || !outgoing || !incoming}
            onClick={() => { if (canSubstitute && outgoing && incoming) onSubstitute(incoming.id); }}>Confirmar substituição</button>
          <button type="button" className={styles.return} onClick={() => { if (isHalftime) { onSelectPlayer(null); onStartSecondHalf(); } else close(); }}>{isHalftime ? "Iniciar 2º tempo →" : "Voltar ao jogo"}</button>
        </div>
      </footer>
    </section>
  </div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  const id = `match-tactic-${label.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}`;
  return <label htmlFor={id} className={styles.tacticControl}><span>{label}</span><select id={id} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function StatRow({ label, home, away, suffix = "", totalHome, totalAway }: { label: string; home: number; away: number; suffix?: string; totalHome?: number; totalAway?: number }) {
  const total = home + away;
  const left = total > 0 ? home / total * 100 : 50;
  return <div className={styles.statRow}>
    <div className={styles.statValues}><b>{home}{suffix}{totalHome !== undefined ? `/${totalHome}` : ""}</b><span>{label}</span><b>{away}{suffix}{totalAway !== undefined ? `/${totalAway}` : ""}</b></div>
    <div className={styles.statBar} aria-hidden="true"><i style={{ width: `${left}%` }} /><i style={{ width: `${100 - left}%` }} /></div>
  </div>;
}
