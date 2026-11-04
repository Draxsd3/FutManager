"use client";

import { brazilianCalendarPeriods, formatCalendarDate } from "@/lib/game/brazilian-calendar";
import { ManagerJobs, type ManagerJobsProps } from "./manager-jobs";
import { useState } from "react";
import { nextCareerFixture, type CareerSeason, type SeasonFixture } from "@/lib/game/season";
import type { EditorDatabase } from "@/lib/game/editor-data";
import { Crest } from "@/components/ui/club-sidebar";
import styles from "./agenda-screen.module.css";

export type AgendaView = "matches" | "friendlies" | "jobs";
export const agendaOptions: { id: AgendaView; label: string; description: string }[] = [
  { id: "matches", label: "Jogos do seu time", description: "Calendário e próximo adversário" },
  { id: "friendlies", label: "Jogos amistosos", description: "Preparação e jogos sem competição" },
  { id: "jobs", label: "Central de empregos", description: "Sua carreira como treinador" },
];

export function AgendaScreen({ club, coach, competition, inGameDate, round, season, database, view, onViewChange, onBack, onPrepare, jobs }: {
  jobs?: ManagerJobsProps;
  club: string; coach: string; competition: string; inGameDate: string; round: number; season?: CareerSeason; database: EditorDatabase;
  view: AgendaView; onViewChange: (view: AgendaView) => void; onBack: () => void; onPrepare: () => void;
}) {
  const [venue, setVenue] = useState("all");
  const date = new Date(`${inGameDate}T12:00:00`);
  const next = nextCareerFixture(season);
  const isHome = next?.homeClubId === season?.clubId;
  const games = (season?.fixtures ?? []).filter((fixture) => fixture.season === season?.season && (fixture.homeClubId === season?.clubId || fixture.awayClubId === season?.clubId))
    .sort((a, b) => a.calendarRound - b.calendarRound || a.competitionRound - b.competitionRound || a.id.localeCompare(b.id));
  const visible = games.filter((fixture) => venue === "all" || (fixture.status !== "locked" && (venue === "home" ? fixture.homeClubId === season?.clubId : fixture.awayClubId === season?.clubId)));
  const stadium = (fixture: SeasonFixture) => database.clubs.find((team) => team.id === fixture.homeClubId)?.stadiumName || "Estádio a definir";
  const title = agendaOptions.find((option) => option.id === view)!;

  return <section className={styles.screen} aria-labelledby="agenda-title">
    <div className={styles.container}>
      <header className={styles.header}><div><p className={styles.eyebrow}>CLUBE / AGENDA</p><h1 id="agenda-title">Cada jogo, um novo capítulo.</h1><p>Organize os compromissos do {club} e planeje seu próximo passo.</p></div><div className={styles.headerActions}><span className={styles.date}>{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span><button onClick={onBack}>← Voltar ao clube</button></div></header>
      <nav className={styles.tabs} aria-label="Seções da agenda">{agendaOptions.map((option, index) => <button key={option.id} type="button" aria-current={view === option.id ? "page" : undefined} onClick={() => onViewChange(option.id)}><span aria-hidden="true">0{index + 1}</span>{option.label}</button>)}</nav>

      {view === "matches" ? <>
        <div className={styles.overview}>
          <article className={styles.hero}><div className={styles.heroTop}><span className={styles.kicker}>PRÓXIMO COMPROMISSO</span>{next && <span className={styles.heroBadge}>{next.roundLabel} · {isHome ? "Em casa" : "Fora de casa"}</span>}</div>
            {next ? <><p className={styles.competition}>{next.competitionName}</p><div className={styles.versus}><div><Crest club={next.home} size="sm" /><strong>{next.home}</strong></div><span>×</span><div><Crest club={next.away} size="sm" /><strong>{next.away}</strong></div></div><div className={styles.heroBottom}><div><strong>{formatCalendarDate(next.scheduledDate)}</strong><span>{stadium(next)}</span></div><button onClick={onPrepare}>Preparar equipe <span aria-hidden="true">→</span></button></div></> : <div className={styles.heroEmpty}>Nenhum próximo compromisso disponível.</div>}
          </article>
          <aside className={styles.summary}><span className={styles.kicker}>SEU PLANEJAMENTO</span><h2>Foco na próxima rodada</h2><div className={styles.summaryRow}><span>Competição</span><strong>{next?.competitionName ?? competition}</strong></div><div className={styles.summaryRow}><span>Próxima fase</span><strong>{next?.roundLabel ?? `${round}ª rodada`}</strong></div><div className={styles.summaryRow}><span>Treinador</span><strong>{coach}</strong></div><p className={styles.note}>Confira a escalação e a energia do elenco antes de entrar em campo.</p></aside>
        </div>
        <section className={styles.schedule} aria-labelledby="schedule-title"><div className={styles.sectionHeader}><div><p className={styles.eyebrow}>CALENDÁRIO DO CLUBE</p><h2 id="schedule-title">Jogos do seu time</h2></div><label>Mando de campo<select value={venue} onChange={(event) => setVenue(event.target.value)}><option value="all">Todos os jogos</option><option value="home">Em casa</option><option value="away">Fora de casa</option></select></label></div>
          <div className={styles.tableWrap} role="region" aria-label="Lista de jogos" tabIndex={0}><table><caption className={styles.srOnly}>Compromissos disponíveis do {club}</caption><thead><tr><th>Data</th><th>Confronto</th><th>Competição</th><th>Mando</th><th>Situação</th><th><span className={styles.srOnly}>Ação</span></th></tr></thead><tbody>{visible.length ? visible.map((fixture) => {
            const uncertain = fixture.status === "locked";
            const home = fixture.homeClubId === season?.clubId;
            const played = fixture.status === "played";
            const result = played && Number.isInteger(fixture.homeScore) && Number.isInteger(fixture.awayScore) ? `${fixture.homeScore} × ${fixture.awayScore}` : null;
            return <tr key={fixture.id}>
              <td><strong>{formatCalendarDate(fixture.scheduledDate)}</strong><small>{fixture.roundLabel}{fixture.scheduledDate ? " · Prevista no jogo" : " · Sem data"}</small></td>
              <td><strong>{uncertain ? `${club} · adversário a definir` : <>{fixture.home} <span className={styles.muted}>×</span> {fixture.away}</>}</strong><small>{uncertain ? "Confronto condicionado à classificação" : stadium(fixture)}</small></td>
              <td>{fixture.competitionName}</td><td><span className={styles.pill}>{uncertain ? "A definir" : home ? "Casa" : "Fora"}</span></td>
              <td><span className={styles.upcoming}>{fixture.status === "cancelled" ? "Cancelado" : uncertain ? "Condicionado" : result ? `Finalizado · ${result}` : played ? "Finalizado · placar indisponível" : "A disputar"}</span></td>
              <td>{fixture.id === next?.id && <button className={styles.textButton} onClick={onPrepare}>Escalar →</button>}</td>
            </tr>;
          }) : <tr><td colSpan={6} className={styles.emptyRow}>Nenhum jogo disponível para este filtro.</td></tr>}</tbody></table></div><p className={styles.tableFoot}>Temporada {season?.season ?? date.getFullYear()} · partidas em ordem do calendário. Calendário CBF compartilhado entre carreiras do mesmo catálogo. Datas de confrontos simuladas dentro dos períodos brasileiros, não a tabela oficial de jogos. Fases condicionadas dependem da classificação.</p>
          {!!season?.calendarIssues?.length && <p role="status" className={styles.tableFoot}>O formato atual excede as datas disponíveis em: {season.calendarIssues.join(", ")}. Esses jogos ficam sem data; não foram colocados fora do período da competição.</p>}
          <details className={styles.calendarDetails}><summary>Calendário brasileiro · {season?.season ?? 2026}{season?.season && season.season !== 2026 ? " (projeção da referência 2026)" : " (referência CBF 2026)"}</summary>
            <div className={styles.calendarPopover}><p>Períodos de referência; esta lista não inscreve o clube em novas competições. Janelas de transferências são informativas, sem alterar as regras de negociação.</p>
            <ul>{brazilianCalendarPeriods(season?.season ?? 2026).map(period => <li key={period.name}>{period.name}: {formatCalendarDate(period.start)} a {formatCalendarDate(period.end)}</li>)}</ul>
            {(season?.season ?? 2026) === 2026 && <p>Série A: interrupção após as 18 primeiras rodadas, retorno em 22/07. Série B: sem pausa para a Copa; playoffs previstos em 21 e 28/11. Datas FIFA e seleções não incluídas.</p>}</div>
          </details>
        </section>
      </> : view === "jobs" && jobs ? <ManagerJobs {...jobs} /> : <section className={styles.emptySection} aria-labelledby="agenda-section-title"><p className={styles.eyebrow}>{view === "friendlies" ? "PREPARAÇÃO DO ELENCO" : "CARREIRA DO TREINADOR"}</p><h2 id="agenda-section-title">{title.label}</h2><div className={styles.emptySymbol} aria-hidden="true">{view === "friendlies" ? "⚽" : "◎"}</div><h3>{view === "friendlies" ? "Agendamento ainda indisponível" : "Ofertas ainda indisponíveis"}</h3><p>{view === "friendlies" ? "O agendamento de amistosos ainda não está disponível. É necessário integrar a disponibilidade dos clubes e a negociação ao calendário da carreira." : `Você está no comando do ${club}. As ofertas ainda não estão disponíveis: o mercado de técnicos precisa ser integrado à carreira.`}</p><button onClick={() => onViewChange("matches")}>Ver jogos do seu time →</button></section>}
      <footer className={styles.footer}><span>FUTMANAGER / TEMPORADA {date.getFullYear()}</span><span>{club} · {title.label}</span></footer>
    </div>
  </section>;
}
