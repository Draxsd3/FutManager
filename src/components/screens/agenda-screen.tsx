"use client";

import { useState } from "react";
import type { RoundFixture } from "@/lib/game/mock-data";
import { Crest } from "@/components/ui/club-sidebar";
import styles from "./agenda-screen.module.css";

export type AgendaView = "matches" | "friendlies" | "jobs";
export const agendaOptions: { id: AgendaView; label: string; description: string }[] = [
  { id: "matches", label: "Jogos do seu time", description: "Calendário e próximo adversário" },
  { id: "friendlies", label: "Jogos amistosos", description: "Preparação e jogos sem competição" },
  { id: "jobs", label: "Central de empregos", description: "Sua carreira como treinador" },
];

export function AgendaScreen({ club, coach, competition, inGameDate, round, fixtures, view, onViewChange, onBack, onPrepare }: {
  club: string; coach: string; competition: string; inGameDate: string; round: number; fixtures: RoundFixture[];
  view: AgendaView; onViewChange: (view: AgendaView) => void; onBack: () => void; onPrepare: () => void;
}) {
  const [venue, setVenue] = useState("all");
  const date = new Date(`${inGameDate}T12:00:00`);
  const next = fixtures.find((fixture) => fixture.home === club || fixture.away === club);
  const isHome = next?.home === club;
  const visible = next && (venue === "all" || (venue === "home" && isHome) || (venue === "away" && !isHome));
  const title = agendaOptions.find((option) => option.id === view)!;

  return <section className={styles.screen} aria-labelledby="agenda-title">
    <div className={styles.container}>
      <header className={styles.header}><div><p className={styles.eyebrow}>CLUBE / AGENDA</p><h1 id="agenda-title">Cada jogo, um novo capítulo.</h1><p>Organize os compromissos do {club} e planeje seu próximo passo.</p></div><div className={styles.headerActions}><span className={styles.date}>{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span><button onClick={onBack}>← Voltar ao clube</button></div></header>
      <nav className={styles.tabs} aria-label="Seções da agenda">{agendaOptions.map((option, index) => <button key={option.id} type="button" aria-current={view === option.id ? "page" : undefined} onClick={() => onViewChange(option.id)}><span aria-hidden="true">0{index + 1}</span>{option.label}</button>)}</nav>

      {view === "matches" ? <>
        <div className={styles.overview}>
          <article className={styles.hero}><div className={styles.heroTop}><span className={styles.kicker}>PRÓXIMO COMPROMISSO</span>{next && <span className={styles.heroBadge}>{round}ª rodada · {isHome ? "Em casa" : "Fora de casa"}</span>}</div>
            {next ? <><p className={styles.competition}>{competition}</p><div className={styles.versus}><div><Crest club={next.home} /><strong>{next.home}</strong></div><span>×</span><div><Crest club={next.away} /><strong>{next.away}</strong></div></div><div className={styles.heroBottom}><div><strong>{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</strong><span>{next.stadium || "Estádio a definir"}</span></div><button onClick={onPrepare}>Preparar equipe <span aria-hidden="true">→</span></button></div></> : <div className={styles.heroEmpty}>Nenhum próximo compromisso disponível.</div>}
          </article>
          <aside className={styles.summary}><span className={styles.kicker}>SEU PLANEJAMENTO</span><h2>Foco na próxima rodada</h2><div className={styles.summaryRow}><span>Competição</span><strong>{competition}</strong></div><div className={styles.summaryRow}><span>Rodada atual</span><strong>{round}ª rodada</strong></div><div className={styles.summaryRow}><span>Treinador</span><strong>{coach}</strong></div><p className={styles.note}>Confira a escalação e a energia do elenco antes de entrar em campo.</p></aside>
        </div>
        <section className={styles.schedule} aria-labelledby="schedule-title"><div className={styles.sectionHeader}><div><p className={styles.eyebrow}>CALENDÁRIO DO CLUBE</p><h2 id="schedule-title">Jogos do seu time</h2></div><label>Mando de campo<select value={venue} onChange={(event) => setVenue(event.target.value)}><option value="all">Todos os jogos</option><option value="home">Em casa</option><option value="away">Fora de casa</option></select></label></div>
          <div className={styles.tableWrap}><table><caption className={styles.srOnly}>Compromissos disponíveis do {club}</caption><thead><tr><th>Data</th><th>Confronto</th><th>Competição</th><th>Mando</th><th>Situação</th><th><span className={styles.srOnly}>Ação</span></th></tr></thead><tbody>{visible && next ? <tr><td><strong>{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</strong><small>{round}ª rodada</small></td><td><strong>{next.home} <span className={styles.muted}>×</span> {next.away}</strong><small>{next.stadium}</small></td><td>{competition}</td><td><span className={styles.pill}>{isHome ? "Casa" : "Fora"}</span></td><td><span className={styles.upcoming}>A disputar</span></td><td><button className={styles.textButton} onClick={onPrepare}>Escalar →</button></td></tr> : <tr><td colSpan={6} className={styles.emptyRow}>Nenhum jogo disponível para este filtro.</td></tr>}</tbody></table></div><p className={styles.tableFoot}>Exibindo os compromissos disponíveis na carreira. As próximas datas ainda não foram definidas.</p>
        </section>
      </> : <section className={styles.emptySection} aria-labelledby="agenda-section-title"><p className={styles.eyebrow}>{view === "friendlies" ? "PREPARAÇÃO DO ELENCO" : "CARREIRA DO TREINADOR"}</p><h2 id="agenda-section-title">{title.label}</h2><div className={styles.emptySymbol} aria-hidden="true">{view === "friendlies" ? "⚽" : "◎"}</div><h3>{view === "friendlies" ? "Nenhum amistoso agendado" : "Nenhuma proposta de trabalho"}</h3><p>{view === "friendlies" ? "Os amistosos do clube ficarão reunidos aqui. O agendamento de novos amistosos ainda não está disponível." : `Você está no comando do ${club}. O sistema de ofertas de emprego ainda não está disponível nesta versão.`}</p><button onClick={() => onViewChange("matches")}>Ver jogos do seu time →</button></section>}
      <footer className={styles.footer}><span>FUTMANAGER / TEMPORADA {date.getFullYear()}</span><span>{club} · {title.label}</span></footer>
    </div>
  </section>;
}
