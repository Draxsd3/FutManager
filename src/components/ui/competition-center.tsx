"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  RoundFixture,
  TableRow,
  TopRating,
  TopScorer,
} from "@/lib/game/mock-data";
import type { EditorDatabase } from "@/lib/game/editor-data";
import {
  buildCompetitionCatalog,
  competitionCategories,
  type CompetitionCategory,
} from "@/lib/game/competitions";
import { Crest } from "./club-sidebar";
import { ClassicIcon } from "./classic-icon";
import styles from "./competition-center.module.css";

export function CompetitionCenter({
  club,
  competition,
  database,
  table,
  topScorers,
  topRatings,
  fixtures,
  round,
  onClose,
}: {
  club: string;
  competition: string;
  database: EditorDatabase;
  table: TableRow[];
  topScorers: TopScorer[];
  topRatings: TopRating[];
  fixtures: RoundFixture[];
  round: number;
  onClose: () => void;
}) {
  const catalog = useMemo(() => buildCompetitionCatalog(database), [database]);
  const country =
    database.clubs.find((item) => item.name === club)?.country ?? "Brasil";
  const activeId = `league:${country}:${competition}`;
  const [category, setCategory] = useState<CompetitionCategory>("national");
  const [selectedId, setSelectedId] = useState(activeId);
  const [scope, setScope] = useState("table");
  const [location, setLocation] = useState("all");
  const [search, setSearch] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab") {
        const options = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input, select, [tabindex="0"]',
          ) ?? [],
        );
        const first = options[0],
          last = options[options.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  const inCategory = catalog.filter((item) => item.category === category);
  const locations = [...new Set(inCategory.map((item) => item.location))];
  const options = inCategory.filter(
    (item) =>
      (location === "all" || item.location === location) &&
      item.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const selected = options.find((item) => item.id === selectedId) ?? options[0];
  const isActive = selected?.id === activeId;
  const rows = selected
    ? [...selected.clubs]
        .map((name) => ({
          club: name,
          result: isActive ? table.find((row) => row.club === name) : undefined,
        }))
        .sort(
          (a, b) =>
            (b.result?.points ?? 0) - (a.result?.points ?? 0) ||
            (b.result?.goalsFor ?? 0) -
              (b.result?.goalsAgainst ?? 0) -
              ((a.result?.goalsFor ?? 0) - (a.result?.goalsAgainst ?? 0)) ||
            a.club.localeCompare(b.club, "pt-BR"),
        )
    : [];
  const goals = isActive
    ? table.reduce((sum, row) => sum + row.goalsFor, 0)
    : null;
  const games = isActive
    ? table.reduce((sum, row) => sum + row.played, 0) / 2
    : null;
  const scorers = isActive
    ? topScorers.filter((player) => player.goals > 0 && player.played > 0)
    : [];
  const ratings = isActive
    ? topRatings.filter((player) => player.rating > 0 && player.played > 0)
    : [];

  return (
    <div className={styles.overlay}>
      <div
        ref={panel}
        className={styles.window}
        role="dialog"
        aria-modal="true"
        aria-labelledby="competitions-title"
      >
        <header className={styles.header}>
          <div>
            <p>CENTRAL DE COMPETIÇÕES / 2026</p>
            <h1 id="competitions-title">
              O futebol além do seu clube<span>.</span>
            </h1>
          </div>
          <button
            ref={closeButton}
            onClick={onClose}
            aria-label="Fechar central de competições"
          >
            Fechar <span aria-hidden="true">×</span>
          </button>
        </header>
        <nav
          className={styles.categories}
          aria-label="Categorias de competição"
        >
          {competitionCategories.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCategory(item.id);
                setLocation("all");
                setSearch("");
                setScope("table");
              }}
              aria-current={category === item.id ? "page" : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.layout}>
          <aside className={styles.browser}>
            <p className={styles.eyebrow}>EXPLORAR CAMPEONATOS</p>
            <label>
              Buscar campeonato
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome da competição"
              />
            </label>
            <label>
              País / região
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              >
                <option value="all">Todos</option>
                {locations.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <div className={styles.competitionList}>
              {options.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={selected?.id === item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setScope("table");
                  }}
                >
                  <span className={styles.trophy} aria-hidden="true">
                    <ClassicIcon name="medal_award_gold" size={24} />
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.location}</small>
                  </span>
                  {item.clubs.includes(club) && (
                    <i
                      title="Seu clube está nesta divisão"
                      aria-label="Divisão do seu clube"
                    >
                      ●
                    </i>
                  )}
                </button>
              ))}
            </div>
            <p className={styles.catalogNote}>
              {options.length} competição(ões) no catálogo.
              <br />
              Catálogo não significa inscrição confirmada.
            </p>
          </aside>
          <section className={styles.content}>
            {selected ? (
              <>
                <header className={styles.competitionHeader}>
                  <div>
                    <p className={styles.eyebrow}>
                      {selected.location} / TEMPORADA 2026
                    </p>
                    <h2>{selected.name}</h2>
                    <p>
                      {selected.format} <span>·</span>{" "}
                      {rows.length
                        ? `${rows.length} clubes cadastrados na divisão`
                        : "Participantes ainda não cadastrados"}
                    </p>
                  </div>
                  <span className={styles.badge}>
                    {isActive ? "DADOS DA CARREIRA" : "CATÁLOGO"}
                  </span>
                </header>
                <div className={styles.metrics}>
                  <Metric
                    label="Clubes cadastrados"
                    value={rows.length ? String(rows.length) : "—"}
                  />
                  <Metric
                    label="Partidas registradas"
                    value={games === null ? "—" : String(games)}
                  />
                  <Metric
                    label="Gols registrados"
                    value={goals === null ? "—" : String(goals)}
                  />
                  <Metric
                    label="Média de gols"
                    value={
                      games && goals !== null ? (goals / games).toFixed(2) : "—"
                    }
                  />
                </div>
                <nav
                  className={styles.scopes}
                  aria-label="Detalhes da competição"
                >
                  {[
                    { id: "table", label: "Classificação" },
                    { id: "rounds", label: "Rodadas" },
                    { id: "stats", label: "Estatísticas" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setScope(item.id)}
                      aria-current={scope === item.id ? "page" : undefined}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
                <div className={styles.dataGrid}>
                  <div className={styles.mainData}>
                    {scope === "table" && (
                      <>
                        <div className={styles.sectionTitle}>
                          <h3>
                            {selected.format === "Liga"
                              ? "Classificação geral"
                              : "Fases e grupos"}
                          </h3>
                          <span>
                            {isActive
                              ? `Rodada ${round}`
                              : "Resultados não integrados"}
                          </span>
                        </div>
                        {rows.length ? (
                          <div className={styles.tableWrap}>
                            <table>
                              <caption className={styles.srOnly}>
                                Classificação de {selected.name}
                              </caption>
                              <thead>
                                <tr>
                                  {[
                                    "#",
                                    "Clube",
                                    "PTS",
                                    "J",
                                    "V",
                                    "E",
                                    "D",
                                    "GP",
                                    "GC",
                                    "SG",
                                  ].map((title) => (
                                    <th key={title} scope="col">
                                      {title}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row, index) => (
                                  <tr
                                    key={row.club}
                                    className={
                                      row.club === club ? styles.ownClub : ""
                                    }
                                  >
                                    <td>{isActive ? index + 1 : "—"}</td>
                                    <th scope="row">
                                      <span>
                                        <Crest club={row.club} size="sm" />
                                        {row.club}
                                        {row.club === club && (
                                          <small>SEU CLUBE</small>
                                        )}
                                      </span>
                                    </th>
                                    {[
                                      row.result?.points,
                                      row.result?.played,
                                      row.result?.wins,
                                      row.result?.draws,
                                      row.result?.losses,
                                      row.result?.goalsFor,
                                      row.result?.goalsAgainst,
                                      row.result
                                        ? row.result.goalsFor -
                                          row.result.goalsAgainst
                                        : undefined,
                                    ].map((value, i) => (
                                      <td key={i}>{value ?? "—"}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <Empty
                            title="Tabela ainda não disponível"
                            text="Participantes, fases e grupos desta competição ainda não foram cadastrados na carreira. Não há classificação para exibir."
                          />
                        )}
                        <p className={styles.disclaimer}>
                          {isActive
                            ? "Resumo atualmente disponível no motor da carreira. Histórico acumulado de temporadas ainda não integrado."
                            : "Clubes de outras divisões podem ser consultados. Pontuação, grupos e resultados só aparecem quando registrados para a competição."}
                        </p>
                      </>
                    )}
                    {scope === "rounds" && (
                      <>
                        <div className={styles.sectionTitle}>
                          <h3>Jogos e rodadas</h3>
                          <span>
                            {isActive ? `${round}ª rodada` : "Sem calendário"}
                          </span>
                        </div>
                        {isActive && fixtures.length ? (
                          fixtures.map((match, i) => (
                            <article
                              className={styles.fixture}
                              key={`${match.home}-${i}`}
                            >
                              <span>
                                {round}ª rodada <small>{match.stadium}</small>
                              </span>
                              <strong>{match.home}</strong>
                              <b>×</b>
                              <strong>{match.away}</strong>
                            </article>
                          ))
                        ) : (
                          <Empty
                            title="Calendário não cadastrado"
                            text="Os confrontos e resultados desta competição aparecerão aqui quando estiverem disponíveis."
                          />
                        )}
                        <p className={styles.disclaimer}>
                          Confrontos disponíveis na rodada. Resultados passados
                          não são presumidos.
                        </p>
                      </>
                    )}
                    {scope === "stats" && (
                      <>
                        <div className={styles.sectionTitle}>
                          <h3>Estatísticas da competição</h3>
                        </div>
                        <div className={styles.statGrid}>
                          <Rank
                            title="Artilharia"
                            rows={scorers.map((item) => ({
                              name: item.name,
                              club: item.club,
                              value: `${item.goals} gols`,
                            }))}
                          />
                          <Rank
                            title="Melhores notas"
                            rows={ratings.map((item) => ({
                              name: item.name,
                              club: item.club,
                              value: item.rating.toFixed(1),
                            }))}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <aside className={styles.sidebar}>
                    <Rank
                      title="Artilheiros"
                      rows={scorers
                        .slice(0, 5)
                        .map((item) => ({
                          name: item.name,
                          club: item.club,
                          value: String(item.goals),
                        }))}
                    />
                    <Rank
                      title="Melhores notas"
                      rows={ratings
                        .slice(0, 5)
                        .map((item) => ({
                          name: item.name,
                          club: item.club,
                          value: item.rating.toFixed(1),
                        }))}
                    />
                    <section className={styles.history}>
                      <p className={styles.eyebrow}>ESTATÍSTICAS E HISTÓRIA</p>
                      <h3>Um título, muitas histórias.</h3>
                      <dl>
                        <dt>Último campeão</dt>
                        <dd>Não registrado</dd>
                        <dt>Maior vencedor</dt>
                        <dd>Não registrado</dd>
                        <dt>Maior goleada</dt>
                        <dd>Não registrada</dd>
                      </dl>
                    </section>
                  </aside>
                </div>
              </>
            ) : (
              <Empty
                title="Nenhuma competição encontrada"
                text="Altere o nome pesquisado ou o filtro de região."
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.empty}>
      <span aria-hidden="true">◎</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Rank({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; club: string; value: string }[];
}) {
  return (
    <section className={styles.rank}>
      <h3>{title}</h3>
      {rows.length ? (
        <ol>
          {rows.map((row, index) => (
            <li key={`${row.name}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{row.name}</strong>
                <small>{row.club}</small>
              </div>
              <b>{row.value}</b>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.noStats}>Sem estatísticas registradas.</p>
      )}
    </section>
  );
}
