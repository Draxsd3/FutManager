"use client";
import { standingsZones, standingsZone } from "@/lib/game/standings-zones";
import { CompetitionBracket, CompetitionGroups, CompetitionRounds, recentMatches } from "./competition-results";
import { WindowHeader } from "./window-header";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { competitionTrophyAsset } from "@/lib/game/competition-trophies";
import type {
  RoundFixture,
  TableRow,
  TopRating,
  TopScorer,
} from "@/lib/game/mock-data";

export type CareerCompetitionView = {
  type: "league" | "state" | "cup";
  seasonYear?: number;
  groups?: { name: string; table: TableRow[] }[];
  table: TableRow[];
  fixtures: RoundFixture[];
  topScorers: TopScorer[];
  topRatings: TopRating[];
  matchesPlayed: number;
  goals: number;
};
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
  activeCompetitionId,
  roundLabel,
  careerCompetitionData,
  database,
  table,
  topScorers,
  topRatings,
  fixtures,
  round,
  date,
  onClose,
}: {
  club: string;
  competition: string;
  activeCompetitionId?: string;
  roundLabel?: string;
  careerCompetitionData?: Record<string, CareerCompetitionView>;
  database: EditorDatabase;
  table: TableRow[];
  topScorers: TopScorer[];
  topRatings: TopRating[];
  fixtures: RoundFixture[];
  round: number;
  date?: string;
  onClose: () => void;
}) {
  const catalog = useMemo(() => buildCompetitionCatalog(database), [database]);
  const country =
    database.clubs.find((item) => item.name === club)?.country ?? "Brasil";
  const activeId = activeCompetitionId ?? `league:${country}:${competition}`;
  const [category, setCategory] = useState<CompetitionCategory>(activeId.startsWith("state:") ? "state" : "national");
  const [selectedId, setSelectedId] = useState(activeId);
  const [scope, setScope] = useState("table");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (searchOpen) searchInput.current?.focus(); }, [searchOpen]);
  const [search, setSearch] = useState("");
  const [formClub, setFormClub] = useState<string>();
  const [selectedRound, setSelectedRound] = useState("");
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
  const options = inCategory.filter(
    (item) =>
      item.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const selected = options.find((item) => item.id === selectedId) ?? options[0];
  const careerData = selected ? careerCompetitionData?.[selected.id] : undefined;
  const isActive = !!careerData || selected?.id === activeId;
  const effectiveTable = careerData?.table ?? table;
  const effectiveFixtures = careerData?.fixtures ?? fixtures;
  const effectiveScorers = careerData?.topScorers ?? topScorers;
  const effectiveRatings = careerData?.topRatings ?? topRatings;
  const isKnockout = careerData?.type === "cup" || selected?.id === "national:Copa do Brasil";
  const visibleScope = scope === "table" && isKnockout ? (careerData?.groups?.length ? "groups" : "bracket") : scope;
  const rows = selected
    ? [...(careerData?.type === "league" && careerData.table.length ? careerData.table.map(row => row.club) : selected.clubs)]
        .map((name) => ({
          club: name,
          result: isActive ? effectiveTable.find((row) => row.club === name) : undefined,
        }))
        .sort(
          (a, b) =>
            (b.result?.points ?? 0) - (a.result?.points ?? 0) ||
            (b.result?.wins ?? 0) - (a.result?.wins ?? 0) ||
            (b.result?.goalsFor ?? 0) -
              (b.result?.goalsAgainst ?? 0) -
              ((a.result?.goalsFor ?? 0) - (a.result?.goalsAgainst ?? 0)) ||
            (b.result?.goalsFor ?? 0) - (a.result?.goalsFor ?? 0) ||
            a.club.localeCompare(b.club, "pt-BR"),
        )
    : [];
  const zones = standingsZones(selected?.id ?? "", careerData?.seasonYear, careerData?.table.length ?? 0);
  const zoneFor = (index: number) => standingsZone(selected?.id ?? "", careerData?.seasonYear, careerData?.table.length ?? 0, index + 1);
  const showZones = zones.length > 0;
  const scorers = isActive
    ? effectiveScorers.filter((player) => player.goals > 0 && player.played > 0)
    : [];
  const ratings = isActive
    ? effectiveRatings.filter((player) => player.rating > 0 && player.played > 0)
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
        <WindowHeader title="O futebol além do seu clube" date={date} id="competitions-title" onClose={onClose} closeLabel="Fechar central de competições" closeRef={closeButton} />
        <nav
          className={styles.categories}
          aria-label="Categorias de competição"
        >
          {competitionCategories.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCategory(item.id);
                setSearch("");
                setScope("table"); setFormClub(undefined); setSelectedRound("");
              }}
              aria-current={category === item.id ? "page" : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.layout}>
          <aside className={styles.browser}>
            <div className={styles.searchTools}>
              <button type="button" className={styles.searchToggle} aria-label="Buscar campeonatos" title="Buscar campeonatos" aria-expanded={searchOpen} aria-controls="competition-search" onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) { setSearch(""); setFormClub(undefined); } }}>
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
              </button>
              <input id="competition-search" ref={searchInput} type="search" hidden={!searchOpen} aria-label="Buscar campeonato" value={search} onChange={(event) => { setSearch(event.target.value); setFormClub(undefined); }} placeholder="Buscar campeonato" />
            </div>
            <div className={styles.competitionList}>
              {options.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={selected?.id === item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setScope("table"); setFormClub(undefined); setSelectedRound("");
                  }}
                >
                  <span className={styles.trophy} aria-hidden="true">
                    {competitionTrophyAsset(item) ? <Image src={competitionTrophyAsset(item)!} alt="" width={34} height={40} unoptimized className={styles.trophyImage} /> : <ClassicIcon name="medal_award_gold" size={24} />}
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
          </aside>
          <section className={styles.content}>
            {selected ? (
              <>
                <header className={styles.competitionHeader}>
                  {competitionTrophyAsset(selected) ? <Image src={competitionTrophyAsset(selected)!} alt={`Troféu ${selected.name}`} width={64} height={84} unoptimized className={styles.headerTrophy} /> : <span className={styles.headerTrophy} aria-hidden="true"><ClassicIcon name="medal_award_gold" size={30} /></span>}
                  <h2>{selected.name}</h2>
                </header>
                <nav
                  className={styles.scopes}
                  aria-label="Detalhes da competição"
                >
                  {[
                    ...(!isKnockout ? [{ id: "table", label: "Classificação" }] : []),
                    ...(careerData?.groups?.length ? [{ id: "groups", label: "Fase de grupos" }] : []),
                    ...(isKnockout ? [{ id: "bracket", label: "Mata-mata" }] : []),
                    { id: "rounds", label: "Rodadas" },
                    { id: "stats", label: "Estatísticas" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setScope(item.id)}
                      aria-current={visibleScope === item.id ? "page" : undefined}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
                <div className={styles.dataGrid}>
                  <div className={styles.mainData}>
                    {visibleScope === "table" && (
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
                        {isActive && isKnockout ? (
                          <CompetitionBracket fixtures={effectiveFixtures} />
                        ) : rows.length ? (
                          <div className={`${styles.tableWrap} ${styles.standingsTable}`} role="region" aria-label="Tabela de classificação">
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
                                    "%",
                                    "Recentes",
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
                                    data-zone={zoneFor(index)}
                                    className={
                                      row.club === club ? styles.ownClub : ""
                                    }
                                  >
                                    <td>{isActive ? index + 1 : "—"}{zoneFor(index) && <span className={styles.srOnly}> · {zones.find(zone => zone.id === zoneFor(index))?.label} (faixa-base)</span>}</td>
                                    <th scope="row">
                                      <span>
                                        <Crest club={row.club} size="sm" />
                                        <span title={row.result ? `Gols pró ${row.result.goalsFor} · contra ${row.result.goalsAgainst} · saldo ${row.result.goalsFor - row.result.goalsAgainst}` : undefined}>{row.club}{row.result && <span className={styles.srOnly}>{` · Gols pró ${row.result.goalsFor}, contra ${row.result.goalsAgainst}, saldo ${row.result.goalsFor - row.result.goalsAgainst}`}</span>}</span>
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
                                      row.result ? row.result.goalsFor - row.result.goalsAgainst : undefined,
                                      row.result?.played ? Math.round(row.result.points / (row.result.played * 3) * 100) : undefined,
                                    ].map((value, i) => (
                                      <td key={i}>{value ?? "—"}</td>
                                    ))}
                                    <td><div className={styles.form} aria-label={`Últimas partidas de ${row.club}`}>
                                      {isActive && recentMatches(effectiveFixtures, row.club).map((match, index) => {
                                        const own = match.home === row.club ? match.homeScore : match.awayScore;
                                        const other = match.home === row.club ? match.awayScore : match.homeScore;
                                        const result = own === other ? "E" : own > other ? "V" : "D";
                                        const label = `${result === "V" ? "Vitória" : result === "D" ? "Derrota" : "Empate"}: ${match.home} ${match.homeScore} × ${match.awayScore} ${match.away}, ${match.roundLabel ?? "rodada registrada"}`;
                                        return <button key={index} data-result={result} data-latest={index === recentMatches(effectiveFixtures, row.club).length - 1 || undefined} title={label} aria-label={label} onClick={() => { setFormClub(row.club); setSelectedRound(match.roundLabel ?? "Rodada registrada"); }}>{result}</button>;
                                      })}
                                      {(!isActive || !recentMatches(effectiveFixtures, row.club).length) && <span aria-label="Sem partidas concluídas">—</span>}
                                    </div></td>
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
                        {showZones && <div className={styles.zoneLegend} aria-label="Legenda das faixas de classificação">{zones.map(zone => <span key={zone.id}><i data-zone={zone.id} aria-hidden="true" />{zone.label}</span>)}</div>}
                        <p className={styles.disclaimer}>
                          {showZones && (selected.id === "league:Brasil:Série A" ? "Faixas projetadas conforme as regras-base da Série A de 2026, também usadas como referência nas temporadas seguintes. Vagas podem mudar por outras competições; não representam classificação confirmada nem garantem implementação no jogo. " : "Faixas projetadas conforme as regras-base da Série B de 2026, também usadas como referência nas temporadas seguintes: 1º e 2º sobem diretamente, 3º ao 6º disputam playoffs e os quatro últimos são rebaixados. As faixas não garantem implementação desses desfechos no jogo. ")}
                          {isActive
                            ? "Recentes: V vitória · D derrota · E empate (da mais antiga à mais recente). Clique em um resultado para abrir a rodada ao lado. Classificação acumulada somente de partidas concluídas."
                            : "Clubes de outras divisões podem ser consultados. Pontuação, grupos e resultados só aparecem quando registrados para a competição."}
                        </p>
                      </>
                    )}
                    {visibleScope === "groups" && <CompetitionGroups groups={careerData?.groups ?? []} />}
                    {visibleScope === "bracket" && <CompetitionBracket fixtures={isActive ? effectiveFixtures : []} />}
                    {visibleScope === "rounds" && (
                      <>
                        <div className={styles.sectionTitle}>
                          <h3>Jogos e rodadas</h3>
                          <span>
                            {isActive ? roundLabel ?? `${round}ª rodada` : "Sem calendário"}
                          </span>
                        </div>
                        {isActive && effectiveFixtures.length ? <CompetitionRounds fixtures={effectiveFixtures} selectedRound={selectedRound} onRound={setSelectedRound} /> : <Empty title="Calendário não cadastrado" text="Os confrontos e resultados desta competição aparecerão aqui quando estiverem disponíveis." />}
                        <p className={styles.disclaimer}>
                          Confrontos e placares vêm do calendário persistido; jogos ainda não realizados permanecem sem resultado.
                        </p>
                      </>
                    )}
                    {visibleScope === "stats" && (
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
                            title="Notas registradas"
                            rows={ratings.map((item) => ({
                              name: item.name,
                              club: item.club,
                              value: item.rating.toFixed(1),
                            }))}
                          />
                        </div>
                        <p className={styles.disclaimer}>Notas individuais são registradas nas partidas disputadas pelo seu clube; jogos paralelos não recebem notas de atleta inventadas.</p>
                      </>
                    )}
                  </div>
                  <aside className={styles.sidebar}>
                    {formClub && isActive && visibleScope === "table" ? <><button className={styles.closeRounds} onClick={() => setFormClub(undefined)}>Fechar rodadas ×</button><CompetitionRounds fixtures={effectiveFixtures} club={formClub} selectedRound={selectedRound} onRound={setSelectedRound} /></> : <>
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
                      title="Notas registradas"
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
                    </>}
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
