"use client";

import type { ClubConfidence } from "@/lib/game/confidence";
import { positionLabel, type Player } from "@/lib/game/mock-data";
import type { PlayerCareerRecord } from "@/lib/game/career";
import { ClubSidebar } from "@/components/ui/club-sidebar";
import { fifaPosition } from "@/lib/game/fifa-position";
import { PlayerJersey } from "@/components/ui/player-jersey";
import { TRAINING_DAYS, trainingDrillLabel, trainingWeekSessions, type TrainingSessionRecord } from "@/lib/game/training";
import styles from "./hub-screen.module.css";

export function HubScreen({ kit = 1, club, coach, budget, opponent, round, competition, squad, starters, selectedPlayer, playerCareers = {}, confidence = null, trainingSessions = [], trainingWeek = round, season = 2026, isHome = true, hasNextMatch = true, roundLabel, loanReminder = 0, onLoans, onSelectPlayer, onOpenPlayer, onEscalar, onQuickAction }: {
  kit?: 1 | 2 | 3;
  loanReminder?: number;
  onLoans?: () => void;
  club: string; coach: string; budget: number; opponent: string; round: number; competition: string;
  squad: Player[]; starters: number[]; selectedPlayer: Player | null; playerCareers?: Record<number, PlayerCareerRecord>; trainingSessions?: TrainingSessionRecord[];
  confidence?: ClubConfidence | null;
  trainingWeek?: number; season?: number; isHome?: boolean; hasNextMatch?: boolean; roundLabel?: string;
  onSelectPlayer: (id: number) => void; onOpenPlayer: (id: number) => void; onEscalar: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
}) {
  const selectedRecord = selectedPlayer ? playerCareers[selectedPlayer.id] : undefined;
  const selectedSeason = selectedRecord?.seasons.find((item) => item.season === season && item.club === club);

  return <div className={styles.workspace}>
    <ClubSidebar confidence={confidence} club={club} coach={coach} budget={budget} opponent={opponent} competition={competition} roundLabel={roundLabel ?? `${round}ª rodada`} isHome={isHome} hasNextMatch={hasNextMatch} squadSize={squad.length} ctaLabel="Escalar Time" onCta={onEscalar} onQuickAction={onQuickAction} />
    <section className={styles.roster} aria-label="Elenco do clube">
      <div className={styles.toolbar}><div className={styles.rosterTitle}><b>Plantel</b><span>{squad.length} atletas · temporada {season}</span></div>{onLoans && <button type="button" className={styles.weekBadge} onClick={onLoans}>Empréstimos</button>}<span className={styles.weekBadge}>SEMANA {trainingWeek}</span></div>
      {loanReminder > 0 && <p role="status" className="px-4 py-2 text-xs font-bold text-amber-800">{loanReminder} empréstimo(s) vence(m) nas próximas quatro semanas. Abra Empréstimos para propor a prorrogação antes da devolução.</p>}
      <div className={styles.rosterBody}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead><tr><th scope="col" title="Posição">P</th><th scope="col">Nome</th><th scope="col" title="Pé dominante">Pé</th><th scope="col" title="Força">F</th><th scope="col">Energia</th><th scope="col">Salário</th><th scope="col">Valor</th><th scope="col" title="Jogos na temporada">J</th><th scope="col" title="Gols na temporada">G</th><th scope="col">Car.</th><th scope="col">Idade</th><th scope="col" title="Assistências na temporada">A</th><th scope="col" title="Nota média na temporada">NM</th><th scope="col">Mercado</th></tr></thead>
            <tbody>{squad.map((player) => {
              const record = playerCareers[player.id];
              const market = record?.marketStatus ?? player.marketAvailability ?? "normal";
              const marketLabel = player.acquisitionType === "loan" ? "Emprestado" : ({ sale: "À venda", loan: "Disponível p/ empréstimo", retiring: "Aposentadoria", normal: "—" } as Record<string, string>)[market] ?? "—";
              const current = record?.seasons.find((item) => item.season === season && item.club === club);
              return <tr key={player.id} onClick={() => onSelectPlayer(player.id)} onDoubleClick={() => onOpenPlayer(player.id)} className={selectedPlayer?.id === player.id ? styles.selected : undefined}>
                <td>{fifaPosition(player)}</td><td className={styles.name}><button type="button" onClick={(event) => { event.stopPropagation(); onSelectPlayer(player.id); }} onDoubleClick={(event) => { event.stopPropagation(); onOpenPlayer(player.id); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onOpenPlayer(player.id); } }} title="Selecione ou dê dois cliques para abrir a ficha">{player.name}</button>{starters.includes(player.id) && <span className={styles.starter} title="Titular">XI</span>}</td>
                <td>{player.foot}</td><td>{player.overall}</td><td><span className={styles.energy}><span style={{ width: `${Math.max(0, Math.min(100, player.energy))}%` }} /><b>{player.energy}%</b></span></td><td>{record?.salary ?? player.salary} mil</td><td>{player.marketValue.toFixed(1)}M</td><td>{current?.games ?? 0}</td><td>{current?.goals ?? 0}</td><td>{player.traits}</td><td>{player.age}</td><td>{current?.assists ?? 0}</td><td className={current?.average != null && current.average >= 7 ? styles.good : current?.average != null && current.average < 6 ? styles.low : undefined}>{current?.average?.toFixed(2).replace(".", ",") ?? "—"}</td><td>{marketLabel}</td>
              </tr>;
            })}</tbody>
          </table>
          {squad.length === 0 && <p className={styles.empty}>Nenhum atleta no elenco.</p>}
        </div>
        <SquadInsights squad={squad} season={season} week={trainingWeek} trainingSessions={trainingSessions} onOpenTraining={() => onQuickAction("training")} />
      </div>
      {selectedPlayer && <PlayerPreview kit={kit} club={club} player={selectedPlayer} record={selectedRecord} season={season} current={selectedSeason} onOpen={() => onOpenPlayer(selectedPlayer.id)} />}
      <footer className={styles.statusbar}><span>{squad.length} exibidos · {squad.length} / 35 jogadores</span><span>Selecione um atleta · duplo clique ou Enter abre a ficha</span></footer>
    </section>
  </div>;
}

function PlayerPreview({ kit, club, player, record, season, current, onOpen }: { kit: 1 | 2 | 3; club: string; player: Player; record?: PlayerCareerRecord; season: number; current?: PlayerCareerRecord["seasons"][number]; onOpen: () => void }) {
  const contractUntil = record?.contractUntil ?? player.contractUntil;
  return <section className={styles.playerPreview} aria-label={`Prévia de ${player.name}`}>
    <div className={styles.previewJersey}><PlayerJersey kit={kit} club={club} player={player} /></div>
    <div className={styles.previewIdentity}><span className={styles.previewKicker}>ATLETA SELECIONADO</span><strong>{player.name}</strong><span>{positionLabel[player.position]} · {player.age} anos · Pé {player.foot === "D" ? "direito" : "esquerdo"}</span></div>
    <div className={styles.previewStat}><span>FORÇA</span><b>{player.overall}</b></div>
    <div className={styles.previewStat}><span>ENERGIA</span><b>{player.energy}%</b><i><i style={{ width: `${Math.max(0, Math.min(100, player.energy))}%` }} /></i></div>
    <div className={styles.previewStat}><span>TEMP. {season}</span><b>{current?.games ?? 0} J · {current?.goals ?? 0} G · {current?.assists ?? 0} A</b></div>
    <div className={styles.previewValue}><span>VALOR DE MERCADO</span><b>R$ {player.marketValue.toFixed(1)} mi</b><small>Salário {record?.salary ?? player.salary} mil{contractUntil ? ` · contrato até ${contractUntil}` : ""}</small></div>
    <button type="button" className={styles.previewButton} onClick={onOpen}>Ver ficha <span aria-hidden="true">↗</span></button>
  </section>;
}

function SquadInsights({ squad, season, week, trainingSessions, onOpenTraining }: { squad: Player[]; season: number; week: number; trainingSessions: TrainingSessionRecord[]; onOpenTraining: () => void }) {
  const averageEnergy = squad.length ? Math.round(squad.reduce((sum, player) => sum + player.energy, 0) / squad.length) : 0;
  const lowEnergy = [...squad].filter((player) => player.energy < 60).sort((a, b) => a.energy - b.energy);
  const weeklySessions = trainingWeekSessions(trainingSessions, season, week);
  const trainedIds = new Set(weeklySessions.flatMap((session) => session.playerIds));
  const totalEnergySpent = weeklySessions.reduce((sum, session) => sum + session.energySpent, 0);
  const totalEnergyRecovered = weeklySessions.reduce((sum, session) => sum + session.energyRecovered, 0);
  const standouts = [...squad].sort((a, b) => b.overall - a.overall || b.energy - a.energy || a.name.localeCompare(b.name, "pt-BR")).slice(0, 3);

  return <aside aria-label="Resumo do elenco" className={styles.insights} tabIndex={0}>
    <section className={`${styles.insightCard} ${styles.trainingCard}`}>
      <div className={styles.insightHeading}><div><span className={styles.insightLabel}>TREINO</span><h3>Semana {week}</h3></div><span className={styles.insightPill}>{weeklySessions.length}/6 sessões</span></div>
      <div className={styles.trainingWeek} aria-label={`Semana ${week}: ${weeklySessions.length} de 6 sessões concluídas`}>
        {TRAINING_DAYS.map((day) => {
          const session = weeklySessions.find((item) => item.day === day);
          return <span key={day} className={session ? styles.trainingDayDone : styles.trainingDay} aria-label={session ? `${day}: treino concluído — ${trainingDrillLabel(session.drill)}` : `${day}: sem treino`} title={session ? `${day}: ${trainingDrillLabel(session.drill)}` : `${day}: sem treino`}>{day.slice(0, 3).toLocaleUpperCase("pt-BR")}{session ? " ✓" : ""}</span>;
        })}
      </div>
      {weeklySessions.length ? <>
        <div className={styles.trainingSummary}><b>{trainedIds.size}</b><span>atletas treinados</span><i>·</i><b>{weeklySessions.reduce((sum, session) => sum + session.overallImprovements, 0)}</b><span>evoluções</span></div>
        <p className={styles.trainingLoad}>{totalEnergySpent ? `−${totalEnergySpent} pts de energia` : "Sem desgaste"}{totalEnergyRecovered ? ` · +${totalEnergyRecovered} pts recuperados` : ""}</p>
        <ul className={styles.trainingLog} aria-label="Sessões de treino da semana" tabIndex={weeklySessions.length > 3 ? 0 : undefined}>{[...weeklySessions].reverse().map((session) => <li key={session.id}><span><b>{session.day.slice(0, 3)}</b> {trainingDrillLabel(session.drill)}</span><small>{session.playerIds.length} atletas</small></li>)}</ul>
      </> : <p className={styles.trainingEmpty}>Monte a semana e acompanhe aqui a carga e a evolução do elenco.</p>}
      <button type="button" className={styles.trainingButton} onClick={onOpenTraining}>Abrir centro de treino <span aria-hidden="true">↗</span></button>
    </section>

    <section className={styles.insightCard}>
      <div className={styles.insightHeading}><div><span className={styles.insightLabel}>CONDIÇÃO</span><h3>Energia do plantel</h3></div><b className={styles.averageEnergy}>{averageEnergy}%</b></div>
      <div className={styles.energyBar} role="img" aria-label={`Energia média do elenco: ${averageEnergy}%`}><i style={{ width: `${averageEnergy}%` }} /></div>
      <p className={styles.lowEnergyCaption}>{lowEnergy.length ? "Atletas que pedem atenção" : "Nenhum atleta abaixo de 60% de energia"}</p>
      {lowEnergy.length > 0 && <ul className={styles.lowEnergyList}>{lowEnergy.slice(0, 3).map((player) => <li key={player.id}><span>{player.name}</span><b>{player.energy}%</b></li>)}</ul>}
    </section>

    <section className={styles.insightCard}>
      <div className={styles.insightHeading}><div><span className={styles.insightLabel}>DESTAQUES</span><h3>Pilares do elenco</h3></div><span className={styles.insightPill}>{squad.length} atletas</span></div>
      <ol className={styles.standouts}>{standouts.map((player, index) => <li key={player.id}><span className={styles.standoutRank}>0{index + 1}</span><span className={styles.standoutName}>{player.name}<small>{fifaPosition(player)} · {player.energy}% energia</small></span><b>{player.overall}</b></li>)}</ol>
    </section>
  </aside>;
}
