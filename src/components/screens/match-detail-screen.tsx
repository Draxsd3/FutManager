"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { clubThemes, type Player } from "@/lib/game/mock-data";
import { formations } from "@/lib/game/formations";
import { fifaPosition } from "@/lib/game/fifa-position";
import { PlayerJersey } from "@/components/ui/player-jersey";
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
  startersData: Player[];
  bench: Player[];
  substitutionsLeft: number;
  selectedPlayer: number | null;
  substitutionOut: number | null;
  onSelectPlayer: (id: number | null) => void;
  onSubstitute: (id: number) => void;
  onClose: () => void;
  isHalftime: boolean;
  returnFocusTo?: HTMLElement | null;
};

/** Quick match adjustments, not another full-screen lineup editor. */
export function MatchDetailScreen({ club, clubColors, opponent, homeScore, awayScore, minute,
  formation, setFormation, startersData, bench, substitutionsLeft, selectedPlayer,
  substitutionOut, onSelectPlayer, onSubstitute, onClose, isHalftime, returnFocusTo }: Props) {
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
  const outgoing = startersData.find((p) => p.id === substitutionOut);
  const incoming = bench.find((p) => p.id === selectedPlayer);
  const canSubstitute = substitutionsLeft > 0;
  const primary = clubColors?.primaryColor ?? (clubThemes[club] ?? clubThemes.Palmeiras).primary;
  const rgb = [1, 3, 5].map((offset) => parseInt(primary.slice(offset, offset + 2), 16));
  const theme = { "--team-primary": primary,
    "--team-text": rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 > 145 ? "#111111" : "#ffffff" } as CSSProperties;

  function close() {
    onSelectPlayer(null);
    onClose();
  }
  function playerRow(player: Player, reserve: boolean) {
    const chosen = reserve ? incoming?.id === player.id : outgoing?.id === player.id;
    return <button key={player.id} type="button" className={`${styles.player} ${chosen ? styles.selected : ""}`}
      data-reserve={reserve ? player.id : undefined} data-starter={reserve ? undefined : player.id}
      aria-pressed={chosen} disabled={!canSubstitute}
      aria-label={`${reserve ? "Entra" : "Sai"}: ${player.name}, camisa ${player.shirtNumber ?? player.id}, ${fifaPosition(player)}`}
      onClick={() => onSelectPlayer(chosen ? null : player.id)}>
      <PlayerJersey player={player} />
      <span className={styles.playerIdentity}><b>{player.name}</b><small>{fifaPosition(player)} · Energia {player.energy}%</small></span>
      <strong title="Força">{player.overall}</strong>
      <span className={styles.choice} aria-hidden="true">{chosen ? "✓" : "+"}</span>
    </button>;
  }

  return <div className={styles.backdrop} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="match-tactics-title"
      aria-describedby="match-tactics-description" className={styles.modal} style={theme}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
        if (event.key !== "Tab") return;
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), select',
        ) ?? []).filter((element) => element.getClientRects().length > 0);
        const first = controls[0], last = controls.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>AJUSTES RÁPIDOS · PARTIDA PAUSADA</p>
          <h1 id="match-tactics-title">Táticas da partida</h1>
          <p className={styles.score}>{club} <b>{homeScore} × {awayScore}</b> {opponent} <span>· {isHalftime ? "Intervalo" : `${minute}′`}</span></p>
        </div>
        <button ref={closeButton} type="button" className={styles.close} onClick={close} aria-label="Fechar táticas">×</button>
      </header>
      <div className={styles.formation}>
        <label>Formação<select value={formation} onChange={(event) => setFormation(event.target.value)}>
          {formations.map((item) => <option key={item}>{item}</option>)}
        </select></label>
        <div><small>SUBSTITUIÇÕES RESTANTES</small><strong>{substitutionsLeft}</strong></div>
      </div>
      <p id="match-tactics-description" className={styles.description}>{canSubstitute
        ? "Selecione quem sai e quem entra, em qualquer ordem. Confirme para efetivar a troca."
        : "Limite de substituições atingido. Você ainda pode alterar a formação."}</p>
      <div className={styles.lists}>
        <section className={styles.column} aria-label="Titulares"><h2>Quem sai <span>{startersData.length} titulares</span></h2>
          <div className={styles.players}>{startersData.map((player) => playerRow(player, false))}</div>
        </section>
        <section className={styles.column} aria-label="Reservas"><h2>Quem entra <span>{bench.length} reservas</span></h2>
          <div className={styles.players}>{bench.map((player) => playerRow(player, true))}
            {!bench.length && <p className={styles.empty}>Não há reservas disponíveis.</p>}</div>
        </section>
      </div>
      <footer className={styles.footer}>
        <p className={styles.pending} role="status">{outgoing && incoming
          ? <><span>Sai <b>{outgoing.name}</b></span><span>Entra <b>{incoming.name}</b></span></>
          : "A formação é aplicada ao selecionar. As trocas exigem confirmação."}</p>
        <div className={styles.actions}>
          {(outgoing || incoming) && <button type="button" className={styles.cancel} onClick={() => onSelectPlayer(null)}>Cancelar troca</button>}
          <button type="button" className={styles.confirm} disabled={!canSubstitute || !outgoing || !incoming}
            onClick={() => { if (canSubstitute && outgoing && incoming) onSubstitute(incoming.id); }}>Confirmar substituição</button>
          <button type="button" className={styles.return} onClick={close}>Voltar ao jogo</button>
        </div>
      </footer>
    </section>
  </div>;
}
