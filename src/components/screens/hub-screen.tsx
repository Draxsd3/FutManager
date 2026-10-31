"use client";

import { useMemo, useState } from "react";
import type { Player } from "@/lib/game/mock-data";
import type { PlayerCareerRecord } from "@/lib/game/career";
import { ClubSidebar } from "@/components/ui/club-sidebar";
import { fifaPosition, fifaPositionOrder } from "@/lib/game/fifa-position";
import styles from "./hub-screen.module.css";

export function HubScreen({ club, coach, budget, opponent, round, competition, squad, starters, selectedPlayer, playerCareers = {}, season = 2026, isHome = true, hasNextMatch = true, roundLabel, onSelectPlayer, onOpenPlayer, onEscalar, onQuickAction }: {
  club: string; coach: string; budget: number; opponent: string; round: number; competition: string;
  squad: Player[]; starters: number[]; selectedPlayer: Player | null; playerCareers?: Record<number, PlayerCareerRecord>;
  season?: number; isHome?: boolean; hasNextMatch?: boolean; roundLabel?: string;
  onSelectPlayer: (id: number) => void; onOpenPlayer: (id: number) => void; onEscalar: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [group, setGroup] = useState("all");
  const [sort, setSort] = useState("position");
  const visibleSquad = useMemo(() => squad.filter((player) => player.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")) && (role === "all" || player.position === role) && (group === "all" || (group === "starters" ? starters.includes(player.id) : !starters.includes(player.id))))
    .sort((a, b) => sort === "overall" ? b.overall - a.overall || a.name.localeCompare(b.name, "pt-BR") : sort === "energy" ? b.energy - a.energy || a.name.localeCompare(b.name, "pt-BR") : sort === "name" ? a.name.localeCompare(b.name, "pt-BR") : fifaPositionOrder(a) - fifaPositionOrder(b) || b.overall - a.overall || a.name.localeCompare(b.name, "pt-BR")), [squad, starters, query, role, group, sort]);
  const average = squad.length ? Math.round(squad.reduce((sum, player) => sum + player.overall, 0) / squad.length) : 0;
  const lowEnergy = squad.filter((player) => player.energy < 60).length;
  const payroll = squad.reduce((sum, player) => sum + (playerCareers[player.id]?.salary ?? player.salary), 0);
  const listed = squad.filter((player) => ["sale", "loan"].includes(playerCareers[player.id]?.marketStatus ?? player.marketAvailability ?? "normal")).length;
  return <div className={styles.workspace}>
    <ClubSidebar club={club} coach={coach} budget={budget} opponent={opponent} isHome={isHome} hasNextMatch={hasNextMatch} round={round} roundLabel={roundLabel} competition={competition} selectedPlayer={selectedPlayer} record={selectedPlayer ? playerCareers[selectedPlayer.id] : undefined} season={season} squadSize={squad.length} onOpenPlayer={onOpenPlayer} ctaLabel="Escalar Time" onCta={onEscalar} onQuickAction={onQuickAction} />
    <section className={styles.roster} aria-labelledby="roster-heading">
      <header className={styles.rosterHeader}>
        <div><p className={styles.eyebrow}>CENTRAL DO CLUBE / TEMPORADA {season}</p><h2 id="roster-heading" aria-label="ELENCO">ELENCO <span>profissional</span></h2><p className={styles.subtitle}>Sua equipe, pronta para o próximo desafio.</p></div>
        <div className={styles.headerActions}><button type="button" onClick={() => onQuickAction("training")}>Treinamento</button><button type="button" className={styles.primaryAction} onClick={onEscalar}>Táticas <span aria-hidden="true">→</span></button></div>
      </header>
      <div className={styles.metrics} aria-label="Resumo do elenco"><div><span>Jogadores</span><strong>{squad.length}<small> / 35</small></strong></div><div><span>Força média</span><strong>{average || "—"}</strong></div><div><span>Energia abaixo de 60%</span><strong>{lowEnergy}</strong></div><div><span>Folha mensal</span><strong>R$ {(payroll / 1000).toFixed(2).replace(".", ",")} <small>mi</small></strong></div><div><span>No mercado</span><strong>{listed}</strong></div></div>
      <div className={styles.toolbar}><div className={styles.rosterTitle}><b>Plantel</b><span>{visibleSquad.length} de {squad.length} atletas</span></div><div className={styles.filters}>
        <label className={styles.search}><span className={styles.visuallyHidden}>Buscar atleta</span><input aria-label="Buscar atleta" placeholder="Buscar atleta..." value={query} onChange={(event) => setQuery(event.target.value)}/></label>
        <label><span className={styles.visuallyHidden}>Filtrar posição</span><select aria-label="Filtrar posição" value={role} onChange={(event) => setRole(event.target.value)}><option value="all">Todas posições</option><option value="G">Goleiros</option><option value="L">Laterais</option><option value="Z">Zagueiros</option><option value="M">Meias</option><option value="A">Atacantes</option></select></label>
        <label><span className={styles.visuallyHidden}>Filtrar elenco</span><select aria-label="Filtrar elenco" value={group} onChange={(event) => setGroup(event.target.value)}><option value="all">Todo o elenco</option><option value="starters">Titulares</option><option value="reserves">Reservas</option></select></label>
        <label><span className={styles.visuallyHidden}>Ordenar elenco</span><select aria-label="Ordenar elenco" value={sort} onChange={(event) => setSort(event.target.value)}><option value="position">Por posição</option><option value="overall">Por força</option><option value="energy">Por energia</option><option value="name">Por nome</option></select></label>
      </div></div>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead><tr><th scope="col" title="Posição">P</th><th scope="col">Nome</th><th scope="col" title="Pé dominante">Pé</th><th scope="col" title="Força">F</th><th scope="col">Energia</th><th scope="col">Salário</th><th scope="col">Valor</th><th scope="col" title="Jogos na temporada">J</th><th scope="col" title="Gols na temporada">G</th><th scope="col">Car.</th><th scope="col">Idade</th><th scope="col" title="Assistências na temporada">A</th><th scope="col" title="Nota média na temporada">NM</th><th scope="col">Mercado</th></tr></thead>
          <tbody>{visibleSquad.map((player) => {
            const record = playerCareers[player.id];
            const market = record?.marketStatus ?? player.marketAvailability ?? "normal";
            const marketLabel = ({ sale: "À venda", loan: "Empréstimo", retiring: "Aposentadoria", normal: "—" } as Record<string, string>)[market] ?? "—";
            const current = record?.seasons.find((item) => item.season === season && item.club === club);
            return <tr key={player.id} onClick={() => onSelectPlayer(player.id)} onDoubleClick={() => onOpenPlayer(player.id)} className={selectedPlayer?.id === player.id ? styles.selected : undefined}>
              <td>{fifaPosition(player)}</td><td className={styles.name}><button type="button" onClick={(event) => { event.stopPropagation(); onSelectPlayer(player.id); }} onDoubleClick={(event) => { event.stopPropagation(); onOpenPlayer(player.id); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onOpenPlayer(player.id); } }} title="Selecione ou dê dois cliques para abrir a ficha">{player.name}</button>{starters.includes(player.id) && <span className={styles.starter} title="Titular">XI</span>}</td>
              <td>{player.foot}</td><td>{player.overall}</td><td><span className={styles.energy}><span style={{ width: `${Math.max(0, Math.min(100, player.energy))}%` }} /><b>{player.energy}%</b></span></td><td>{record?.salary ?? player.salary} mil</td><td>{player.marketValue.toFixed(1)}M</td><td>{current?.games ?? 0}</td><td>{current?.goals ?? 0}</td><td>{player.traits}</td><td>{player.age}</td><td>{current?.assists ?? 0}</td><td className={current?.average != null && current.average >= 7 ? styles.good : current?.average != null && current.average < 6 ? styles.low : undefined}>{current?.average?.toFixed(2).replace(".", ",") ?? "—"}</td><td>{marketLabel}</td>
            </tr>;
          })}</tbody>
        </table>
        {visibleSquad.length === 0 && <p className={styles.empty}>{squad.length ? "Nenhum atleta encontrado para os filtros." : "Nenhum atleta no elenco."}</p>}
      </div>
      <footer className={styles.statusbar}><span>{visibleSquad.length} exibidos · {squad.length} / 35 jogadores</span><span>Selecione um atleta · duplo clique ou Enter abre a ficha</span></footer>
    </section>
  </div>;
}
