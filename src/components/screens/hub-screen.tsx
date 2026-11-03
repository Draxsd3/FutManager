"use client";

import { useMemo, useState } from "react";
import { positionLabel, type Player } from "@/lib/game/mock-data";
import type { PlayerCareerRecord } from "@/lib/game/career";
import { ClubSidebar } from "@/components/ui/club-sidebar";
import { fifaPosition, fifaPositionOrder } from "@/lib/game/fifa-position";
import { PlayerJersey } from "@/components/ui/player-jersey";
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
  const selectedRecord = selectedPlayer ? playerCareers[selectedPlayer.id] : undefined;
  const selectedSeason = selectedRecord?.seasons.find((item) => item.season === season && item.club === club);

  return <div className={styles.workspace}>
    <ClubSidebar club={club} coach={coach} budget={budget} opponent={opponent} competition={competition} roundLabel={roundLabel ?? `${round}ª rodada`} isHome={isHome} hasNextMatch={hasNextMatch} squadSize={squad.length} ctaLabel="Escalar Time" onCta={onEscalar} onQuickAction={onQuickAction} />
    <section className={styles.roster} aria-label="Elenco do clube">
      <div className={styles.toolbar}><div className={styles.rosterTitle}><b>Plantel</b><span>{visibleSquad.length} de {squad.length} atletas</span></div><div className={styles.filters}>
        <label className={styles.search}><span className={styles.visuallyHidden}>Buscar atleta</span><input aria-label="Buscar atleta" placeholder="Buscar atleta..." value={query} onChange={(event) => setQuery(event.target.value)}/></label>
        <label><span className={styles.visuallyHidden}>Filtrar posição</span><select aria-label="Filtrar posição" value={role} onChange={(event) => setRole(event.target.value)}><option value="all">Todas posições</option><option value="G">Goleiros</option><option value="L">Laterais</option><option value="Z">Zagueiros</option><option value="M">Meias</option><option value="A">Atacantes</option></select></label>
        <label><span className={styles.visuallyHidden}>Filtrar elenco</span><select aria-label="Filtrar elenco" value={group} onChange={(event) => setGroup(event.target.value)}><option value="all">Todo o elenco</option><option value="starters">Titulares</option><option value="reserves">Reservas</option></select></label>
        <label><span className={styles.visuallyHidden}>Ordenar elenco</span><select aria-label="Ordenar elenco" value={sort} onChange={(event) => setSort(event.target.value)}><option value="position">Por posição</option><option value="overall">Por força</option><option value="energy">Por energia</option><option value="name">Por nome</option></select></label>
      </div></div>
      <div className={styles.rosterBody}>
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
        <SquadInsights squad={squad} starters={starters} playerCareers={playerCareers} />
      </div>
      {selectedPlayer && <PlayerPreview player={selectedPlayer} record={selectedRecord} season={season} current={selectedSeason} onOpen={() => onOpenPlayer(selectedPlayer.id)} />}
      <footer className={styles.statusbar}><span>{visibleSquad.length} exibidos · {squad.length} / 35 jogadores</span><span>Selecione um atleta · duplo clique ou Enter abre a ficha</span></footer>
    </section>
  </div>;
}

function PlayerPreview({ player, record, season, current, onOpen }: { player: Player; record?: PlayerCareerRecord; season: number; current?: PlayerCareerRecord["seasons"][number]; onOpen: () => void }) {
  const contractUntil = record?.contractUntil ?? player.contractUntil;
  return <section className={styles.playerPreview} aria-label={`Prévia de ${player.name}`}>
    <div className={styles.previewJersey}><PlayerJersey player={player} /></div>
    <div className={styles.previewIdentity}><span className={styles.previewKicker}>ATLETA SELECIONADO</span><strong>{player.name}</strong><span>{positionLabel[player.position]} · {player.age} anos · Pé {player.foot === "D" ? "direito" : "esquerdo"}</span></div>
    <div className={styles.previewStat}><span>FORÇA</span><b>{player.overall}</b></div>
    <div className={styles.previewStat}><span>ENERGIA</span><b>{player.energy}%</b><i><i style={{ width: `${Math.max(0, Math.min(100, player.energy))}%` }} /></i></div>
    <div className={styles.previewStat}><span>TEMP. {season}</span><b>{current?.games ?? 0} J · {current?.goals ?? 0} G · {current?.assists ?? 0} A</b></div>
    <div className={styles.previewValue}><span>VALOR DE MERCADO</span><b>R$ {player.marketValue.toFixed(1)} mi</b><small>Salário {record?.salary ?? player.salary} mil{contractUntil ? ` · contrato até ${contractUntil}` : ""}</small></div>
    <button type="button" className={styles.previewButton} onClick={onOpen}>Ver ficha <span aria-hidden="true">↗</span></button>
  </section>;
}

function SquadInsights({ squad, starters, playerCareers }: { squad: Player[]; starters: number[]; playerCareers: Record<number, PlayerCareerRecord> }) {
  const defenders = squad.filter((player) => player.position === "L" || player.position === "Z").length;
  const sectors = [
    { label: "Goleiros", count: squad.filter((player) => player.position === "G").length, color: "#c59d24" },
    { label: "Defesa", count: defenders, color: "#547eaf" },
    { label: "Meio-campo", count: squad.filter((player) => player.position === "M").length, color: "#239557" },
    { label: "Ataque", count: squad.filter((player) => player.position === "A").length, color: "#be584f" },
  ];
  const averageEnergy = squad.length ? Math.round(squad.reduce((sum, player) => sum + player.energy, 0) / squad.length) : 0;
  const lowEnergy = [...squad].filter((player) => player.energy < 60).sort((a, b) => a.energy - b.energy);
  const starterCount = squad.filter((player) => starters.includes(player.id)).length;
  const forSale = squad.filter((player) => (playerCareers[player.id]?.marketStatus ?? player.marketAvailability) === "sale").length;
  const forLoan = squad.filter((player) => (playerCareers[player.id]?.marketStatus ?? player.marketAvailability) === "loan").length;

  return <aside aria-label="Resumo do elenco" className={styles.insights}>
    <section className={styles.insightCard}>
      <div className={styles.insightHeading}><div><span className={styles.insightLabel}>COMPOSIÇÃO</span><h3>Profundidade por setor</h3></div><span className={styles.insightPill}>{squad.length} atletas</span></div>
      <div className={styles.insightStats}><div><b>{starterCount}</b><span>Titulares</span></div><div><b>{squad.length - starterCount}</b><span>Reservas</span></div></div>
      <div className={styles.sectorList}>{sectors.map((sector) => <div className={styles.sectorRow} key={sector.label}>
        <div><span>{sector.label}</span><b>{sector.count}</b></div>
        <div className={styles.sectorBar} role="img" aria-label={`${sector.label}: ${sector.count} de ${squad.length}`}><i style={{ width: `${squad.length ? sector.count / squad.length * 100 : 0}%`, backgroundColor: sector.color }} /></div>
      </div>)}</div>
    </section>

    <section className={styles.insightCard}>
      <div className={styles.insightHeading}><div><span className={styles.insightLabel}>CONDIÇÃO</span><h3>Energia do plantel</h3></div><b className={styles.averageEnergy}>{averageEnergy}%</b></div>
      <div className={styles.energyBar} role="img" aria-label={`Energia média do elenco: ${averageEnergy}%`}><i style={{ width: `${averageEnergy}%` }} /></div>
      <p className={styles.lowEnergyCaption}>{lowEnergy.length ? "Atletas que pedem atenção" : "Nenhum atleta abaixo de 60% de energia"}</p>
      {lowEnergy.length > 0 && <ul className={styles.lowEnergyList}>{lowEnergy.slice(0, 3).map((player) => <li key={player.id}><span>{player.name}</span><b>{player.energy}%</b></li>)}</ul>}
    </section>

    <section className={styles.insightCard}>
      <div className={styles.insightHeading}><div><span className={styles.insightLabel}>MERCADO</span><h3>Disponibilidade</h3></div></div>
      <div className={styles.marketPills}><span>À venda · {forSale}</span><span>Empréstimo · {forLoan}</span></div>
    </section>
  </aside>;
}
