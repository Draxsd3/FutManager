"use client";

import type { Player } from "@/lib/game/mock-data";
import { useEffect, useRef } from "react";
import { AppShell } from "@/components/ui/app-shell";
import { LineupScreen } from "./lineup-screen";
import board from "./lineup-screen.module.css";
import styles from "./match-detail-screen.module.css";
import type { ManualPosition } from "@/lib/game/career";
import { ClassicIcon } from "@/components/ui/classic-icon";

export type { MatchEvent } from "@/lib/game/live-match";
import type { MatchEvent } from "@/lib/game/live-match";

export function MatchDetailScreen({
  club,
  clubColors,
  opponent,
  homeScore,
  awayScore,
  minute,
  formation,
  setFormation,
  startersData,
  bench,
  onReorderBench,
  events,
  possession,
  shots,
  onGoal,
  tackles,
  passErrors,
  style,
  setStyle,
  marking,
  setMarking,
  focus,
  setFocus,
  substitutionsLeft,
  selectedPlayer,
  substitutionOut,
  onSelectPlayer,
  onSubstitute,
  onClose,
  isHalftime,
  manualPositions,
  onPlacePlayer,
  onResetPositions,
}: {
  club: string;
  clubColors?: { primaryColor: string; secondaryColor: string };
  opponent: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  formation: string;
  setFormation: (value: string) => void;
  startersData: Player[];
  bench: Player[];
  onReorderBench: (id: number, targetId: number) => void;
  events: MatchEvent[];
  possession: number;
  shots: number;
  onGoal: string;
  tackles: number;
  passErrors: number;
  style: string;
  setStyle: (value: string) => void;
  marking: string;
  setMarking: (value: string) => void;
  focus: string;
  setFocus: (value: string) => void;
  substitutionsLeft: number;
  selectedPlayer: number | null;
  substitutionOut: number | null;
  onSelectPlayer: (id: number | null) => void;
  onSubstitute: (id: number, point?: ManualPosition) => void;
  onClose: () => void;
  isHalftime: boolean;
  manualPositions: Record<number, ManualPosition>;
  onPlacePlayer: (id: number, slot: number, point?: ManualPosition) => void;
  onResetPositions: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const pending = useRef<{ id: number; out: number; point?: ManualPosition } | null>(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  const selected = [...startersData, ...bench].find((p) => p.id === selectedPlayer) ?? null;
  const outgoing = startersData.find((p) => p.id === substitutionOut);
  const incoming = bench.find((p) => p.id === selectedPlayer);

  function choose(id: number | null) {
    pending.current = null;
    onSelectPlayer(id);
  }
  function place(id: number, slot: number, point?: ManualPosition) {
    if (startersData.some((p) => p.id === id)) {
      choose(null);
      onPlacePlayer(id, slot, point);
      onSelectPlayer(id);
      return;
    }
    const out = startersData[slot];
    if (!out || substitutionsLeft <= 0) return;
    pending.current = { id, out: out.id, point };
    // Preparation only: the match controller commits the change on confirmation.
    onSelectPlayer(out.id);
    onSelectPlayer(id);
  }

  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-label="Táticas da partida"
      tabIndex={-1} className={styles.overlay}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), select, input, [tabindex="0"]',
        ) ?? []).filter((element) => element.getClientRects().length > 0);
        const first = controls[0], last = controls.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
          event.preventDefault(); first.focus();
        }
      }}>
      <AppShell nav={[]} teamName={club} clubColors={clubColors} date="" hideNav>
      <LineupScreen
        club={club} coach="" opponent={opponent} competition="" round={0}
        formation={formation} setFormation={(value) => { pending.current = null; setFormation(value); }}
        style={style} setStyle={setStyle} marking={marking} setMarking={setMarking}
        focus={focus} setFocus={setFocus} startersData={startersData} bench={bench} onReorderBench={onReorderBench}
        selectedPlayer={selected} onSelectPlayer={choose} onPlacePlayer={place}
        onPlay={onClose} onBack={onClose} manualPositions={manualPositions}
        onResetPositions={onResetPositions}
        match={{
          score: `${homeScore} × ${awayScore}`,
          period: isHalftime ? "Intervalo" : `${minute}′`,
          substitutionsLeft,
          panel: <section className={board.panel}>
            <p className={board.eyebrow}>LEITURA DA PARTIDA</p>
            <h2>Estatísticas e lances</h2>
            <dl className={styles.stats}>
              <div><dt>Posse de bola</dt><dd>{possession}%</dd></div>
              <div><dt>Finalizações</dt><dd>{shots}</dd></div>
              <div><dt>No gol / fora</dt><dd>{onGoal}</dd></div>
              <div><dt>Desarmes</dt><dd>{tackles}</dd></div>
              <div><dt>Erros de passe</dt><dd>{passErrors}</dd></div>
            </dl>
            <h3 className={styles.eventsTitle}>Últimos lances</h3>
            <ol className={styles.events}>
              {!events.length && <li>Nenhum evento ainda.</li>}
              {events.slice(-8).reverse().map((event, index) => <li key={index}>
                <ClassicIcon name={event.card === "yellow" ? "bullet_yellow" : event.card === "red" ? "flag_red_dull" : "sport_soccer"} />
                <span><b>{event.minute}′ · {event.half}º tempo</b>{event.text}</span>
              </li>)}
            </ol>
          </section>,
          substitutionActions: <div className={styles.substitution}>
            {!(outgoing && incoming) && <p className={styles.help}>{substitutionsLeft > 0
              ? "Escolha quem sai e quem entra, ou arraste um reserva até o campo. Confirme para efetivar."
              : "Sem substituições restantes. Você ainda pode ajustar a formação e reposicionar os titulares."}</p>}
            {outgoing && incoming && <>
              <p className={styles.exchange}><span>SAI <b>{outgoing.name}</b></span><span>ENTRA <b>{incoming.name}</b></span></p>
              <div className={styles.controls}><button className={styles.confirm} disabled={substitutionsLeft <= 0} onClick={() => {
                const prepared = pending.current;
                onSubstitute(incoming.id, prepared?.id === incoming.id && prepared.out === outgoing.id ? prepared.point : undefined);
                pending.current = null;
              }}>Confirmar substituição</button>
              <button className={styles.cancel} onClick={() => choose(null)}>Cancelar troca</button></div>
            </>}
          </div>,
        }}
      />
      </AppShell>
    </div>
  );
}
