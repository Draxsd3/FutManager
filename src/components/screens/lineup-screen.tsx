"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Player } from "@/lib/game/mock-data";
import type { ManualPosition } from "@/lib/game/career";
import {
  formationSlots,
  formations,
  playerFitAtPosition,
} from "@/lib/game/formations";
import {
  fieldRegions,
  fieldBoundaries,
  fieldRoleLabels,
} from "@/lib/game/lineup";
import { fifaPosition } from "@/lib/game/fifa-position";
import { PlayerJersey } from "@/components/ui/player-jersey";
import { Crest } from "@/components/ui/club-sidebar";
import styles from "./lineup-screen.module.css";

type Props = {
  club: string;
  coach: string;
  opponent: string;
  round: number;
  competition: string;
  formation: string;
  setFormation: (value: string) => void;
  style: string;
  setStyle: (value: string) => void;
  marking: string;
  setMarking: (value: string) => void;
  focus: string;
  setFocus: (value: string) => void;
  startersData: Player[];
  bench: Player[];
  onReorderBench: (id: number, targetId: number) => void;
  selectedPlayer: Player | null;
  onSelectPlayer: (id: number | null) => void;
  onPlacePlayer: (id: number, slot: number, point?: ManualPosition) => void;
  onPlay: () => void | Promise<void>;
  isStartingMatch?: boolean;
  matchStartError?: string | null;
  onBack: () => void;
  manualPositions: Record<number, ManualPosition>;
  onResetPositions: () => void;
  match?: {
    score: string;
    period: string;
    substitutionsLeft: number;
    panel: ReactNode;
    substitutionActions: ReactNode;
  };
};

export function LineupScreen(props: Props) {
  const {
    club,
    coach,
    opponent,
    round,
    competition,
    formation,
    setFormation,
    style,
    setStyle,
    marking,
    setMarking,
    focus,
    setFocus,
    startersData,
    bench,
    onReorderBench,
    selectedPlayer,
    onSelectPlayer,
    onPlacePlayer,
    onPlay,
    isStartingMatch = false,
    matchStartError = null,
    onBack,
    manualPositions,
    onResetPositions,
    match,
  } = props;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showSectors, setShowSectors] = useState(false);
  const [message, setMessage] = useState(
    "Arraste livremente ou selecione uma camisa e clique no campo.",
  );
  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null);
  const detailClose = useRef<HTMLButtonElement>(null);
  const detailOrigin = useRef<HTMLElement | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (detailPlayer) detailClose.current?.focus();
    else detailOrigin.current?.focus();
  }, [detailPlayer]);
  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);
  const [dragId, setDragId] = useState<number | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const field = useRef<HTMLDivElement>(null),
    ghost = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    pointer: number;
    x: number;
    y: number;
    moved: boolean;
    dx: number;
    dy: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  const players = [...startersData, ...bench];
  const active = players.find((p) => p.id === (dragId ?? selectedPlayer?.id));
  const visibleBench = bench.filter(
    (p) =>
      (filter === "all" || p.position === filter) &&
      p.name
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const positions = startersData.map(
    (p, i) => manualPositions[p.id] ?? slots[i],
  );
  const fits = startersData.map((p, i) =>
    playerFitAtPosition(p, formation, positions[i], i),
  );
  const average = (values: number[]) =>
    values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
  const energy = average(startersData.map((p) => p.energy));
  const overall = average(
    startersData.map((p, i) => Math.max(1, p.overall - fits[i].penalty)),
  );
  const warnings = startersData.filter(
    (p, i) => p.energy < 65 || fits[i].label !== "Natural",
  );

  function select(id: number) {
    if (suppressClick.current) return;
    const target = players.find((p) => p.id === id);
    if (!target) return;
    if (selectedPlayer?.id === id) {
      onSelectPlayer(null);
      setMessage("Seleção limpa. Escolha outra camisa para continuar.");
      return;
    }
    if (match) {
      onSelectPlayer(id);
      setMessage(startersData.some((p) => p.id === id)
        ? `${target.name} selecionado. Arraste para reposicionar ou escolha um reserva.`
        : `${target.name} selecionado. Escolha quem sai e confirme a substituição.`);
      return;
    }
    if (
      selectedPlayer &&
      selectedPlayer.id !== id &&
      startersData.some((p) => p.id === id)
    ) {
      deploy(
        selectedPlayer.id,
        startersData.findIndex((p) => p.id === id),
      );
    } else {
      onSelectPlayer(selectedPlayer?.id === id ? null : id);
      setMessage(
        `${target.name} selecionado. Escolha um setor ou uma camisa titular para trocar.`,
      );
    }
  }
  function deploy(id: number, slot: number, point?: ManualPosition) {
    const player = players.find((p) => p.id === id);
    if (!player || slot < 0 || slot >= startersData.length) return;
    if (match && !startersData.some((p) => p.id === id)) {
      if (match.substitutionsLeft <= 0) {
        setMessage("Sem substituições restantes. Os titulares ainda podem ser reposicionados.");
        return;
      }
      onPlacePlayer(id, slot, point);
      setMessage(`${player.name}: substituição preparada. Confirme na barra de substituição.`);
      return;
    }
    onPlacePlayer(id, slot, point);
    setMessage(
      `${player.name}: ${point ? "posição personalizada aplicada" : "troca de posição concluída"}. Escalação atualizada.`,
    );
  }
  function deployPoint(id: number, point: ManualPosition) {
    const player = players.find((p) => p.id === id);
    if (!player) return;
    const origin = startersData.findIndex((p) => p.id === id);
    const slot =
      origin >= 0
        ? origin
        : positions.reduce(
            (best, pos, index) =>
              Math.hypot(pos.left - point.left, pos.top - point.top) <
              Math.hypot(
                positions[best].left - point.left,
                positions[best].top - point.top,
              )
                ? index
                : best,
            0,
          );
    deploy(id, slot, point);
  }
  function down(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || event.isPrimary === false) return;
    const button = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-player]",
    );
    if (!button) return;
    const bounds = button.getBoundingClientRect();
    suppressClick.current = false;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    gesture.current = {
      id: Number(button.dataset.player),
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      dx: bounds.width ? bounds.left + bounds.width / 2 - event.clientX : 0,
      dy: bounds.height ? bounds.top + bounds.height / 2 - event.clientY : 0,
    };
    if (bench.some((player) => player.id === Number(button.dataset.player))) {
      const host = event.currentTarget;
      holdTimer.current = setTimeout(() => {
        const current = gesture.current;
        if (!current || current.moved) return;
        current.moved = true;
        host.setPointerCapture?.(current.pointer);
        setDragId(current.id);
        if (ghost.current) ghost.current.style.transform = `translate3d(${current.x + current.dx}px,${current.y + current.dy}px,0) translate(-50%, -50%)`;
        setMessage("Reserva selecionado. Arraste para o campo ou para outro lugar no banco.");
      }, 350);
    }
  }
  function move(event: PointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (
      !current.moved &&
      Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6
    )
      return;
    if (!current.moved) {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      current.moved = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDragId(current.id);
    }
    if (ghost.current)
      ghost.current.style.transform = `translate3d(${event.clientX + current.dx}px,${event.clientY + current.dy}px,0) translate(-50%, -50%)`;
    const target = document
      .elementFromPoint?.(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-slot]");
    setHoverSlot(target ? Number(target.dataset.slot) : null);
  }
  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    gesture.current = null;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragId(null);
    setHoverSlot(null);
    if (!current.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    if (cancelled) {
      setMessage("Movimento cancelado. Escalação preservada.");
      return;
    }
    const reserveTarget = document.elementFromPoint?.(event.clientX, event.clientY)?.closest<HTMLElement>("[data-reserve]");
    if (reserveTarget && bench.some((player) => player.id === current.id)) {
      const targetId = Number(reserveTarget.dataset.reserve);
      if (targetId !== current.id) {
        onReorderBench(current.id, targetId);
        setMessage("Ordem dos reservas atualizada.");
      } else setMessage("Reserva mantido no mesmo lugar.");
      return;
    }
    const rect = field.current?.getBoundingClientRect();
    if (
      !rect ||
      !rect.width ||
      !rect.height ||
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      setMessage("Solte dentro do campo para aplicar. Escalação preservada.");
      return;
    }
    const target = document
      .elementFromPoint?.(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-slot]");
    if (target && Number(target.dataset.player) !== current.id)
      deploy(current.id, Number(target.dataset.slot));
    else
      deployPoint(current.id, {
        left: Math.max(
          0,
          Math.min(
            100,
            ((event.clientX + current.dx - rect.left) / rect.width) * 100,
          ),
        ),
        top: Math.max(
          0,
          Math.min(
            100,
            ((event.clientY + current.dy - rect.top) / rect.height) * 100,
          ),
        ),
      });
  }

  return (
    <section
      className={styles.screen}
      data-mode={match ? "match" : "prematch"}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={(e) => finish(e)}
      onPointerCancel={(e) => finish(e, true)}
      onLostPointerCapture={(e) => {
        if (e.target === e.currentTarget && gesture.current) finish(e, true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (detailPlayer) { setDetailPlayer(null); return; }
          if (holdTimer.current) clearTimeout(holdTimer.current);
          const current = gesture.current;
          gesture.current = null;
          if (current?.moved) e.currentTarget.releasePointerCapture?.(current.pointer);
          onSelectPlayer(null);
          setDragId(null);
          setHoverSlot(null);
          setMessage("Movimento cancelado.");
        }
      }}
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <p className={styles.eyebrow}>FUTMANAGER <span>/</span> {competition} · {round}ª RODADA</p>
            <h1>{match ? "Táticas da partida" : `ESCALAR TIME · ${formation}`}</h1>
            <div className={styles.fixture}>
              <span><Crest club={club} size="sm" />{club}</span>
              <b>VS</b>
              <span><Crest club={opponent} size="sm" />{opponent}</span>
              {match && <strong>{match.score} <small>· {match.period} · PAUSADO</small></strong>}
              {!match && <small>{coach} · COMISSÃO TÉCNICA</small>}
            </div>
          </div>
          <div className={styles.headerActions}>
            {!match && <button className={styles.backButton} onClick={onBack}>← <span>Voltar ao clube</span></button>}
            <button
              className={styles.primary}
              onClick={() => { void onPlay(); }}
              disabled={startersData.length !== 11 || isStartingMatch}
            >
              {isStartingMatch ? "Lendo regras…" : match ? "Voltar ao jogo →" : "Ir para a partida →"}
            </button>
            {matchStartError && <p role="alert" className={styles.errorMessage}>{matchStartError}</p>}
          </div>
        </header>

        <div className={styles.summary} aria-label="Resumo da escalação">
          {match ? [
            ["PLACAR", match.score], ["TEMPO", match.period],
            ["SUBSTITUIÇÕES", String(match.substitutionsLeft)], ["ESQUEMA", formation], ["ENERGIA MÉDIA", `${energy}%`],
          ].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>) : <>
            <div><small>ESQUEMA</small><strong>{formation}</strong></div>
            <div><small>TITULARES</small><strong>{startersData.length}<em>/11</em></strong></div>
            <div><small>FORÇA AJUSTADA</small><strong>{overall}<em> OVR</em></strong></div>
            <div><small>ENERGIA MÉDIA</small><strong>{energy}<em>%</em></strong></div>
            <div><small>PONTOS A REVISAR</small><strong>{warnings.length}<em>{warnings.length === 1 ? " alerta" : " alertas"}</em></strong></div>
          </>}
        </div>

        <section className={styles.tacticsBar} aria-label="Configurações da equipe">
          <span className={styles.tacticsLabel}>PLANO DE JOGO</span>
          <Select label="Formação" value={formation} onChange={setFormation} options={formations} />
          <Select label="Estilo de jogo" value={style} onChange={setStyle} options={["Equilibrado", "Ofensivo", "Defensivo"]} />
          <Select label="Marcação / pressão" value={marking} onChange={setMarking} options={["Leve", "Normal", "Pesada"]} />
          <Select label="Concentração de ataque" value={focus} onChange={setFocus} options={["Pelo meio", "Pelas laterais"]} />
        </section>

        <main className={styles.layout}>
          <section className={styles.board} aria-label="Prancheta tática">
            <div className={styles.boardHeader}>
              <div><p className={styles.eyebrow}>PRANCHETA TÁTICA</p><h2>Organize os titulares</h2></div>
              <div className={styles.boardTools}>
                <label className={styles.toggle}><input aria-label="Mostrar setores" type="checkbox" checked={showSectors} onChange={(e) => setShowSectors(e.target.checked)} />
                  <span>Setores</span>
                </label>
                <button aria-label="Restaurar posições" className={styles.resetButton} onClick={() => {
                  onResetPositions();
                  setMessage("Posições do esquema restauradas. Titulares preservados.");
                }}>↺ <span>Restaurar posições</span></button>
              </div>
            </div>
            <div className={styles.fieldViewport}>
              <div
                ref={field}
                className={`${styles.field} ${dragId !== null ? styles.dragging : ""}`}
                onClick={(event) => {
                  if (suppressClick.current || !selectedPlayer || (event.target as HTMLElement).closest("button")) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  deployPoint(selectedPlayer.id, {
                    left: ((event.clientX - rect.left) / rect.width) * 100,
                    top: ((event.clientY - rect.top) / rect.height) * 100,
                  });
                }}
                aria-label="Campo de escalação"
              >
                <span className={styles.direction}>ATAQUE <b>↑</b></span>
                <svg className={styles.pitchLines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <rect x="3" y="2" width="94" height="96" rx="1" />
                  <line x1="3" y1="50" x2="97" y2="50" />
                  <circle cx="50" cy="50" r="9" />
                  <circle className={styles.centerSpot} cx="50" cy="50" r=".7" />
                  <rect x="25" y="2" width="50" height="15" />
                  <rect x="38" y="2" width="24" height="6" />
                  <rect x="25" y="83" width="50" height="15" />
                  <rect x="38" y="92" width="24" height="6" />
                  <path d="M 40 17 Q 50 23 60 17 M 40 83 Q 50 77 60 83" />
                </svg>
                {showSectors && <svg className={styles.regionBorders} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {fieldBoundaries.map((edge, index) => <line key={index} x1={edge.from.left} y1={edge.from.top} x2={edge.to.left} y2={edge.to.top} vectorEffect="non-scaling-stroke" />)}
                </svg>}
                {showSectors && fieldRegions.map((sector) => <button
                  key={sector.name}
                  className={`${styles.sector} ${styles[sector.group]} ${active ? styles.valid : ""}`}
                  style={{ clipPath: `polygon(${sector.polygon.map((point) => `${point.left}% ${point.top}%`).join(",")})` }}
                  title={`${sector.short} · ${sector.name}`}
                  aria-label={`Posicionar em ${sector.name}`}
                  aria-disabled={!active}
                  onClick={() => {
                    if (suppressClick.current) return;
                    if (active) deployPoint(active.id, sector);
                    else setMessage("Selecione um jogador antes de escolher o setor.");
                  }}
                ><span style={{ left: `${sector.left}%`, top: `${sector.top}%` }}>{sector.short}</span></button>)}
                {showSectors && <div className={styles.roleLabels} aria-hidden="true">{fieldRoleLabels.map((label) => <span key={label.short} style={{ left: `${label.left}%`, top: `${label.top}%` }}>{label.short}</span>)}</div>}
                {startersData.map((player, index) => <button
                  key={player.id}
                  data-player={player.id}
                  data-slot={index}
                  aria-label={`${player.name}, camisa ${player.shirtNumber ?? player.id}, titular, ${fits[index].label}`}
                  aria-pressed={selectedPlayer?.id === player.id}
                  className={`${styles.player} ${selectedPlayer?.id === player.id ? styles.selected : ""} ${dragId === player.id ? styles.source : ""} ${hoverSlot === index ? styles.hovered : ""}`}
                  style={{ left: `clamp(25px, ${positions[index].left}%, calc(100% - 25px))`, top: `clamp(32px, ${positions[index].top}%, calc(100% - 32px))` }}
                  onClick={() => select(player.id)}
                >
                  <PlayerJersey player={player} />
                  <b>{player.name}</b>
                  <small>{fifaPosition(player)} · {Math.max(1, player.overall - fits[index].penalty)} <span className={fits[index].label === "Natural" ? styles.natural : styles.warning}>{fits[index].label}</span></small>
                  <i className={styles.energy}><span style={{ width: `${player.energy}%` }} /></i>
                </button>)}
              </div>
            </div>
            <div className={styles.boardFooter}>
              <span><i /> Titulares <b>·</b> Arraste ou selecione para reposicionar</span>
              <p role="status" className={styles.feedback}>{message}</p>
            </div>
          </section>

          <aside className={styles.sidebar} aria-label="Banco e análise">
            {match?.panel}
            <section className={`${styles.panel} ${styles.benchPanel}`}>
              <div className={styles.panelHeading}>
                <div><p className={styles.eyebrow}>ELENCO DISPONÍVEL</p><h2>Banco de reservas</h2></div>
                <span className={styles.count}>{bench.length}</span>
              </div>
              <div className={styles.benchFilters}>
                <label className={styles.search}><span>Buscar reserva</span><input type="search" placeholder="Nome do jogador" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
                <Select label="Filtrar setor" value={filter} onChange={setFilter} options={["all", "G", "L", "Z", "M", "A"]} labels={["Todas", "Goleiros", "Laterais", "Zagueiros", "Meio-campistas", "Atacantes"]} />
              </div>
              <button className={styles.detailButton} disabled={!selectedPlayer || !bench.some((p) => p.id === selectedPlayer.id)} onClick={(event) => { detailOrigin.current = event.currentTarget; setDetailPlayer(selectedPlayer); }}>Ver ficha do reserva selecionado</button>
              <div className={styles.bench}>
                {visibleBench.map((player) => <button
                  key={player.id}
                  onClick={() => select(player.id)}
                  onDoubleClick={(event) => { detailOrigin.current = event.currentTarget; setDetailPlayer(player); }}
                  onKeyDown={(event) => { if (event.key.toLowerCase() === "i") { event.preventDefault(); detailOrigin.current = event.currentTarget; setDetailPlayer(player); } }}
                  data-player={player.id} data-reserve={player.id}
                  title="Dois cliques para detalhes; segure e arraste para mover"
                  aria-label={`${player.name}, ${fifaPosition(player)}, força ${player.overall}. Dois cliques ou tecla I para detalhes`}
                  aria-pressed={selectedPlayer?.id === player.id}
                  className={`${styles.reserve} ${selectedPlayer?.id === player.id ? styles.reserveSelected : ""}`}
                >
                  <span data-player={player.id} className={styles.handle} title="Arrastar jogador"><PlayerJersey player={player} /></span>
                  <span className={styles.reserveInfo}><b>{player.name}</b><small>{fifaPosition(player)} · ENERGIA {player.energy}%</small></span>
                  <strong>{player.overall}</strong>
                </button>)}
                {!visibleBench.length && <p className={styles.emptyBench}>Nenhum reserva para este filtro.</p>}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeading}><div><p className={styles.eyebrow}>LEITURA DA EQUIPE</p><h2>Força por setor</h2></div></div>
              <div className={styles.strengthGrid}>
                {[
                  { label: "Ataque", roles: ["A"] }, { label: "Meio", roles: ["M"] },
                  { label: "Defesa", roles: ["L", "Z"] }, { label: "Gol", roles: ["G"] },
                ].map((sector) => {
                  const value = average(startersData.map((p, i) => ({ p, i })).filter(({ i }) => sector.roles.includes(fits[i].role)).map(({ p, i }) => (Math.max(1, p.overall - fits[i].penalty) * p.energy) / 100));
                  return <div className={styles.strength} key={sector.label}><span>{sector.label}</span><b>{value}</b><i><span style={{ width: `${Math.min(100, value)}%` }} /></i></div>;
                })}
              </div>
            </section>
            {warnings.length > 0 && <section className={`${styles.panel} ${styles.warningPanel}`}>
              <div className={styles.panelHeading}><div><p className={styles.eyebrow}>ANTES DO APITO</p><h2>Revisar escalação</h2></div><span className={styles.warningCount}>{warnings.length}</span></div>
              <div className={styles.alerts}>{warnings.slice(0, 3).map((p) => {
                const i = startersData.indexOf(p);
                return <p key={p.id}><b>{p.name}</b><span>{p.energy < 65 ? `Energia baixa · ${p.energy}%` : `Função ${fits[i].label.toLowerCase()}`}</span></p>;
              })}</div>
            </section>}
          </aside>
        </main>
        <footer className={`${styles.footer} ${match ? styles.matchFooter : ""}`}>
          {match ? match.substitutionActions : <><span>FUTMANAGER <b>·</b> {competition} {round}ª rodada</span><span>Organize. Ajuste. Entre em campo.</span></>}
        </footer>
      </div>
      {detailPlayer && <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailPlayer(null); }}>
        <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="reserve-detail-title" onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
          if (!buttons.length) return;
          if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
          else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
        }}>
          <header><div><p className={styles.eyebrow}>FICHA DO RESERVA</p><h2 id="reserve-detail-title">{detailPlayer.name}</h2></div><button ref={detailClose} onClick={() => setDetailPlayer(null)} aria-label="Fechar ficha">×</button></header>
          <div className={styles.detailGrid}>
            <p><span>Posição</span><strong>{fifaPosition(detailPlayer)}</strong></p><p><span>Força</span><strong>{detailPlayer.overall}</strong></p><p><span>Energia</span><strong>{detailPlayer.energy}%</strong></p><p><span>Idade</span><strong>{detailPlayer.age} anos</strong></p><p><span>Gols</span><strong>{detailPlayer.goals}</strong></p><p><span>Assistências</span><strong>{detailPlayer.assists}</strong></p><p><span>Nota média</span><strong>{detailPlayer.avgRating?.toFixed(1) ?? "—"}</strong></p><p><span>Contrato até</span><strong>{detailPlayer.contractUntil}</strong></p>
          </div>
          <p className={styles.note}>Qualidades: {detailPlayer.traits || "Não informadas"}</p>
          <div className={styles.modalActions}>
            <button disabled={bench.findIndex((p) => p.id === detailPlayer.id) <= 0} onClick={() => { const i = bench.findIndex((p) => p.id === detailPlayer.id); if (i > 0) onReorderBench(detailPlayer.id, bench[i - 1].id); }}>← Mover no banco</button>
            <button disabled={bench.findIndex((p) => p.id === detailPlayer.id) >= bench.length - 1} onClick={() => { const i = bench.findIndex((p) => p.id === detailPlayer.id); if (i >= 0 && i < bench.length - 1) onReorderBench(detailPlayer.id, bench[i + 1].id); }}>Mover no banco →</button>
          </div>
        </section>
      </div>}
      <div ref={ghost} className={styles.ghost} style={{ visibility: dragId === null ? "hidden" : "visible" }} aria-hidden="true">
        {active && <><PlayerJersey player={active} /><b>{active.name}</b></>}
      </div>
    </section>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: string[];
}) {
  return (
    <label className={styles.select}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option, i) => (
          <option key={option} value={option}>
            {labels?.[i] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
