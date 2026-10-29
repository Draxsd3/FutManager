"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
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
  selectedPlayer: Player | null;
  onSelectPlayer: (id: number | null) => void;
  onPlacePlayer: (id: number, slot: number, point?: ManualPosition) => void;
  onPlay: () => void;
  onBack: () => void;
  manualPositions: Record<number, ManualPosition>;
  onResetPositions: () => void;
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
    selectedPlayer,
    onSelectPlayer,
    onPlacePlayer,
    onPlay,
    onBack,
    manualPositions,
    onResetPositions,
  } = props;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showSectors, setShowSectors] = useState(false);
  const [message, setMessage] = useState(
    "Arraste livremente ou selecione uma camisa e clique no campo.",
  );
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
    gesture.current = {
      id: Number(button.dataset.player),
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      dx: bounds.width ? bounds.left + bounds.width / 2 - event.clientX : 0,
      dy: bounds.height ? bounds.top + bounds.height / 2 - event.clientY : 0,
    };
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
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={(e) => finish(e)}
      onPointerCancel={(e) => finish(e, true)}
      onLostPointerCapture={(e) => {
        if (e.target === e.currentTarget && gesture.current) finish(e, true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          const current = gesture.current;
          gesture.current = null;
          if (current?.moved)
            e.currentTarget.releasePointerCapture?.(current.pointer);
          onSelectPlayer(null);
          setDragId(null);
          setHoverSlot(null);
          setMessage("Movimento cancelado.");
        }
      }}
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>CENTRO TÁTICO / {club}</p>
            <h1>Escalação &amp; Tática</h1>
            <p>
              {coach} · {competition} · {round}ª rodada · Adversário: {opponent}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.settingsToggle}
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              Plano tático
            </button>
            <button onClick={onBack}>← Voltar ao clube</button>
            <button
              className={styles.primary}
              onClick={onPlay}
              disabled={startersData.length !== 11}
            >
              Ir para a partida →
            </button>
          </div>
        </header>
        <div className={styles.summary}>
          <div>
            <small>ESQUEMA</small>
            <strong>{formation}</strong>
          </div>
          <div>
            <small>TITULARES</small>
            <strong>
              {startersData.length}
              <em>/11</em>
            </strong>
          </div>
          <div>
            <small>FORÇA AJUSTADA</small>
            <strong>{overall}</strong>
          </div>
          <div>
            <small>ENERGIA MÉDIA</small>
            <strong>
              {energy}
              <em>%</em>
            </strong>
          </div>
          <div>
            <small>ADAPTAÇÃO / CONDIÇÃO</small>
            <strong>
              {warnings.length}
              <em> alertas</em>
            </strong>
          </div>
        </div>
        <div className={styles.layout}>
          <aside
            className={`${styles.sidebar} ${styles.settings} ${settingsOpen ? styles.open : ""}`}
            aria-label="Ajustes e análise tática"
          >
            <section className={styles.panel}>
              <p className={styles.eyebrow}>IDENTIDADE DE JOGO</p>
              <h2>Plano tático</h2>
              <Select
                label="Esquema tático"
                value={formation}
                onChange={setFormation}
                options={formations}
              />
              <p className={styles.note}>
                Alterar o esquema reorganiza automaticamente os titulares e
                restaura as posições.
              </p>
              <Select
                label="Estilo de jogo"
                value={style}
                onChange={setStyle}
                options={["Equilibrado", "Ofensivo", "Defensivo"]}
              />
              <Select
                label="Marcação / pressão"
                value={marking}
                onChange={setMarking}
                options={["Leve", "Normal", "Pesada"]}
              />
              <Select
                label="Concentração de ataque"
                value={focus}
                onChange={setFocus}
                options={["Pelo meio", "Pelas laterais"]}
              />
            </section>
            <section className={styles.panel}>
              <p className={styles.eyebrow}>LEITURA DA EQUIPE</p>
              <h2>Força por setor</h2>
              {[
                { label: "Ataque", roles: ["A"] },
                { label: "Meio-campo", roles: ["M"] },
                { label: "Defesa", roles: ["L", "Z"] },
                { label: "Gol", roles: ["G"] },
              ].map((sector) => {
                const value = average(
                  startersData
                    .map((p, i) => ({ p, i }))
                    .filter(({ i }) => sector.roles.includes(fits[i].role))
                    .map(
                      ({ p, i }) =>
                        (Math.max(1, p.overall - fits[i].penalty) * p.energy) /
                        100,
                    ),
                );
                return (
                  <div className={styles.strength} key={sector.label}>
                    <span>{sector.label}</span>
                    <b>{value}</b>
                    <i>
                      <span style={{ width: `${Math.min(100, value)}%` }} />
                    </i>
                  </div>
                );
              })}
              <p className={styles.note}>
                Estimativa com adaptação à função e energia. Não é uma previsão
                do placar.
              </p>
            </section>
            <section className={styles.panel}>
              <h2>Como organizar</h2>
              <ol className={styles.instructions}>
                <li>Arraste a camisa com mouse ou toque.</li>
                <li>Solte sobre outra camisa para trocar.</li>
                <li>Solte em área livre para personalizar.</li>
                <li>Ou selecione e clique em um setor.</li>
              </ol>
              <p className={styles.note}>
                Teclado: Tab para navegar e Enter para selecionar jogador e
                destino. Esc cancela o arraste.
              </p>
            </section>
            <section className={styles.panel}>
              <p className={styles.eyebrow}>ATLETA EM FOCO</p>
              {active ? (
                <>
                  <div className={styles.identity}>
                    <PlayerJersey player={active} />
                    <div>
                      <h2>{active.name}</h2>
                      <p>
                        {fifaPosition(active)} · Pé{" "}
                        {active.foot === "D" ? "direito" : "esquerdo"}
                      </p>
                    </div>
                  </div>
                  <div className={styles.facts}>
                    <span>
                      Força <b>{active.overall}</b>
                    </span>
                    <span>
                      Energia <b>{active.energy}%</b>
                    </span>
                    <span>
                      Idade <b>{active.age}</b>
                    </span>
                  </div>
                  <p className={styles.note}>
                    A adaptação considera a função mais próxima do esquema.
                    Amarelo indica função secundária ou improvisada.
                  </p>
                </>
              ) : (
                <p className={styles.note}>
                  Selecione uma camisa no campo ou no banco para ver seus dados
                  e opções de destino.
                </p>
              )}
            </section>
            <section className={styles.panel}>
              <h2>Alertas da escalação</h2>
              <div className={styles.alerts}>
                {warnings.length ? (
                  warnings.map((p) => {
                    const i = startersData.indexOf(p);
                    return (
                      <p key={p.id}>
                        <b>{p.name}</b>
                        <span>
                          {p.energy < 65
                            ? `Energia baixa: ${p.energy}%`
                            : `Adaptação: ${fits[i].label}`}
                        </span>
                      </p>
                    );
                  })
                ) : (
                  <p className={styles.note}>
                    Sem alertas de adaptação ou energia.
                  </p>
                )}
              </div>
            </section>
          </aside>
          <section className={styles.board}>
            <div className={styles.boardHeader}>
              <div>
                <p className={styles.eyebrow}>PRANCHETA / TITULARES</p>
                <h2>Seu jogo começa aqui.</h2>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={showSectors}
                  onChange={(e) => setShowSectors(e.target.checked)}
                />{" "}
                Mostrar setores
              </label>
            </div>
            <div className={styles.fieldViewport}>
              <div
                ref={field}
                className={`${styles.field} ${dragId !== null ? styles.dragging : ""}`}
                onClick={(event) => {
                  if (
                    suppressClick.current ||
                    !selectedPlayer ||
                    (event.target as HTMLElement).closest("button")
                  )
                    return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  deployPoint(selectedPlayer.id, {
                    left: ((event.clientX - rect.left) / rect.width) * 100,
                    top: ((event.clientY - rect.top) / rect.height) * 100,
                  });
                }}
                aria-label="Campo de escalação"
              >
                <div className={styles.lines}>
                  <i className={styles.half} />
                  <i className={styles.circle} />
                  <i className={styles.topBox} />
                  <i className={styles.bottomBox} />
                </div>
                <span className={styles.direction}>ATAQUE ↑</span>
                {showSectors && (
                  <svg
                    className={styles.regionBorders}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {fieldBoundaries.map((edge, index) => (
                      <line
                        key={index}
                        x1={edge.from.left}
                        y1={edge.from.top}
                        x2={edge.to.left}
                        y2={edge.to.top}
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </svg>
                )}
                {showSectors &&
                  fieldRegions.map((sector) => {
                    const allowed = !!active;
                    return (
                      <button
                        key={sector.name}
                        className={`${styles.sector} ${styles[sector.group]} ${active && allowed ? styles.valid : ""}`}
                        style={{
                          clipPath: `polygon(${sector.polygon.map((point) => `${point.left}% ${point.top}%`).join(",")})`,
                        }}
                        title={`${sector.short} · ${sector.name}`}
                        aria-label={`Posicionar em ${sector.name}`}
                        aria-disabled={!active || !allowed}
                        onClick={() => {
                          if (suppressClick.current) return;
                          if (active) deployPoint(active.id, sector);
                          else
                            setMessage(
                              "Selecione um jogador antes de escolher o setor.",
                            );
                        }}
                      >
                        <span
                          style={{
                            left: `${sector.left}%`,
                            top: `${sector.top}%`,
                          }}
                        >
                          {sector.short}
                        </span>
                      </button>
                    );
                  })}
                {showSectors && (
                  <div className={styles.roleLabels} aria-hidden="true">
                    {fieldRoleLabels.map((label) => (
                      <span
                        key={label.short}
                        style={{ left: `${label.left}%`, top: `${label.top}%` }}
                      >
                        {label.short}
                      </span>
                    ))}
                  </div>
                )}
                {startersData.map((player, index) => (
                  <button
                    key={player.id}
                    data-player={player.id}
                    data-slot={index}
                    aria-label={`${player.name}, camisa ${player.shirtNumber ?? player.id}, titular, ${fits[index].label}`}
                    aria-pressed={selectedPlayer?.id === player.id}
                    className={`${styles.player} ${selectedPlayer?.id === player.id ? styles.selected : ""} ${dragId === player.id ? styles.source : ""} ${hoverSlot === index ? styles.hovered : ""}`}
                    style={{
                      left: `clamp(22px, ${positions[index].left}%, calc(100% - 22px))`,
                      top: `clamp(30px, ${positions[index].top}%, calc(100% - 30px))`,
                    }}
                    onClick={() => select(player.id)}
                  >
                    <PlayerJersey player={player} />
                    <b>{player.name}</b>
                    <small>
                      {fifaPosition(player)} ·{" "}
                      {Math.max(1, player.overall - fits[index].penalty)}{" "}
                      <span
                        className={
                          fits[index].label === "Natural"
                            ? styles.natural
                            : styles.warning
                        }
                      >
                        {fits[index].label}
                      </span>
                    </small>
                    <i className={styles.energy}>
                      <span style={{ width: `${player.energy}%` }} />
                    </i>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.boardFooter}>
              <span>
                ↑ Ataque <span>·</span> ↓ Defesa <span>·</span> Camisas
                douradas: goleiros
              </span>
              <button
                onClick={() => {
                  onResetPositions();
                  setMessage(
                    "Posições do esquema restauradas. Titulares preservados.",
                  );
                }}
              >
                Restaurar posições
              </button>
            </div>
            <p role="status" className={styles.feedback}>
              {message}
            </p>
          </section>
          <aside className={styles.sidebar}>
            <section className={`${styles.panel} ${styles.benchPanel}`}>
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.eyebrow}>OPÇÕES PARA O JOGO</p>
                  <h2>Banco de reservas</h2>
                </div>
                <span className={styles.count}>{bench.length}</span>
              </div>
              <label className={styles.search}>
                Buscar reserva
                <input
                  type="search"
                  placeholder="Nome do jogador"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <Select
                label="Filtrar setor"
                value={filter}
                onChange={setFilter}
                options={["all", "G", "L", "Z", "M", "A"]}
                labels={[
                  "Todos os setores",
                  "Goleiros",
                  "Laterais",
                  "Zagueiros",
                  "Meio-campistas",
                  "Atacantes",
                ]}
              />
              <div
                className={styles.bench}
                style={
                  {
                    "--bench-count": Math.max(1, visibleBench.length),
                    "--bench-rows": Math.max(
                      1,
                      Math.ceil(visibleBench.length / 2),
                    ),
                  } as CSSProperties
                }
              >
                {visibleBench.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => select(player.id)}
                    aria-pressed={selectedPlayer?.id === player.id}
                    className={styles.reserve}
                  >
                    <span
                      data-player={player.id}
                      className={styles.handle}
                      title="Arrastar jogador"
                    >
                      <PlayerJersey player={player} />
                    </span>
                    <span>
                      <b>{player.name}</b>
                      <small>
                        {fifaPosition(player)} · {player.age} anos · Energia{" "}
                        {player.energy}%
                      </small>
                      <i className={styles.energy}>
                        <span style={{ width: `${player.energy}%` }} />
                      </i>
                    </span>
                    <strong>{player.overall}</strong>
                  </button>
                ))}
                {!visibleBench.length && (
                  <p className={styles.note}>
                    Nenhum reserva para este filtro.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
        <footer className={styles.footer}>
          FUTMANAGER / CENTRO TÁTICO{" "}
          <span>Organize. Ajuste. Entre em campo.</span>
        </footer>
      </div>
      <div
        ref={ghost}
        className={styles.ghost}
        style={{ visibility: dragId === null ? "hidden" : "visible" }}
        aria-hidden="true"
      >
        {active && (
          <>
            <PlayerJersey player={active} />
            <b>{active.name}</b>
          </>
        )}
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
