"use client";

import { useEffect, useRef } from "react";
import type { ManualPosition } from "@/lib/game/career";
import type { MatchStatistics } from "@/lib/game/live-match";
import type { Player } from "@/lib/game/mock-data";
import { formationSlots } from "@/lib/game/formations";
import { clubThemeStyle } from "@/components/ui/app-shell";
import { LineupScreen } from "./lineup-screen";
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
  onPlacePlayer?: (id: number, slot: number, point?: ManualPosition) => void;
  onResetPositions?: () => void;
  coach?: string;
  competition?: string;
  round?: number;
};

/** Paused match tactics with the live lineup on a rendered pitch. */
export function MatchDetailScreen({ club, clubColors, opponent, homeScore, awayScore, minute,
  formation, setFormation, style, setStyle, marking, setMarking, focus, setFocus, statistics,
  manualPositions, onMovePlayers, startersData, bench, substitutionsLeft, selectedPlayer,
  substitutionOut, onSelectPlayer, onSubstitute, onClose, onStartSecondHalf, isHalftime, returnFocusTo, onPlacePlayer, onResetPositions, coach = "", competition = "Partida", round = 1 }: Props) {
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
  const theme = clubThemeStyle(club, clubColors);

  function close() {
    onSelectPlayer(null);
    onClose();
  }

  return <div className={styles.backdrop} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="match-tactics-title"
      aria-describedby="match-tactics-description" className={`${styles.modal} ${styles.halftimeModal} ${styles.unifiedModal}`} style={theme}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
        if (event.key !== "Tab") return;
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), select, input:not(:disabled), [tabindex='0']") ?? []).filter((element) => element.getClientRects().length > 0);
        const first = controls[0], last = controls.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <h1 id="match-tactics-title" className={styles.srOnly}>Táticas</h1>
      <button ref={closeButton} type="button" className={`${styles.close} ${styles.modalClose}`} onClick={close} aria-label="Fechar táticas">×</button>

      <div className={styles.halftimeLineup}>
        <p id="match-tactics-description" className={styles.description}>{isHalftime ? "Intervalo. Ajuste a equipe antes do segundo tempo; confirme as substituições antes de continuar." : "Partida pausada. Ajuste a equipe e confirme as substituições antes de voltar ao jogo."}</p>
        <LineupScreen club={club} coach={coach} opponent={opponent} competition={competition} round={round}
          formation={formation} setFormation={setFormation} style={style} setStyle={setStyle}
          marking={marking} setMarking={setMarking} focus={focus} setFocus={setFocus}
          startersData={startersData} bench={bench} onReorderBench={() => {}}
          selectedPlayer={[...startersData, ...bench].find((player) => player.id === (selectedPlayer ?? substitutionOut)) ?? null}
          onSelectPlayer={onSelectPlayer} onPlacePlayer={onPlacePlayer ?? ((id, slot, point) => {
            if (startersData.some((player) => player.id === id)) onMovePlayers({ [id]: point ?? formationSlots[formation][slot] });
          })}
          onPlay={() => { if (isHalftime) { onSelectPlayer(null); void onStartSecondHalf(); } else close(); }} onBack={close}
          manualPositions={manualPositions} onResetPositions={onResetPositions ?? (() => setFormation(formation))}
          match={{ score: `${homeScore} × ${awayScore}`, period: isHalftime ? "INTERVALO" : `${minute}′`, substitutionsLeft, continueLabel: isHalftime ? "Continuar para o 2º tempo →" : "Voltar ao jogo →",
            panel: <div className={styles.statList}><StatRow label="Posse de bola" home={statistics.home.possession} away={statistics.away.possession} suffix="%" /><StatRow label="Finalizações" home={statistics.home.shots} away={statistics.away.shots} /><StatRow label="Passes certos" home={statistics.home.passesCompleted} away={statistics.away.passesCompleted} /></div>, substitutionActions: null }} />
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

function StatRow({ label, home, away, suffix = "", totalHome, totalAway }: { label: string; home: number; away: number; suffix?: string; totalHome?: number; totalAway?: number }) {
  const total = home + away;
  const left = total > 0 ? home / total * 100 : 50;
  return <div className={styles.statRow}>
    <div className={styles.statValues}><b>{home}{suffix}{totalHome !== undefined ? `/${totalHome}` : ""}</b><span>{label}</span><b>{away}{suffix}{totalAway !== undefined ? `/${totalAway}` : ""}</b></div>
    <div className={styles.statBar} aria-hidden="true"><i style={{ width: `${left}%` }} /><i style={{ width: `${100 - left}%` }} /></div>
  </div>;
}
