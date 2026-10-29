"use client";

import { useState } from "react";
import type { Player } from "@/lib/game/mock-data";
import { ClubSidebar } from "@/components/ui/club-sidebar";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { fifaPosition, fifaPositionOrder } from "@/lib/game/fifa-position";
import styles from "./hub-screen.module.css";

type Props = {
  club: string; coach: string; budget: number; opponent: string; round: number; competition: string;
  squad: Player[]; starters: number[]; selectedPlayer: Player | null;
  onSelectPlayer: (id: number) => void; onOpenPlayer: (id: number) => void; onEscalar: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
};
export function HubScreen({ club, coach, budget, opponent, round, competition, squad, starters,
  selectedPlayer, onSelectPlayer, onOpenPlayer, onEscalar, onQuickAction }: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [position, setPosition] = useState("all");
  const [sort, setSort] = useState("position");
  const [view, setView] = useState("overview");
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const visibleSquad = squad.filter((player) =>
    (group === "all" || (group === "starters" ? starters.includes(player.id) : !starters.includes(player.id))) &&
    (position === "all" || player.position === position) &&
    normalize(`${player.name} ${fifaPosition(player)}`).includes(normalize(query.trim())),
  ).sort((a,b) => {
    const name = a.name.localeCompare(b.name, "pt-BR");
    if (sort === "name") return name;
    if (sort === "overall") return b.overall - a.overall || name;
    if (sort === "energy") return b.energy - a.energy || name;
    if (sort === "value") return b.marketValue - a.marketValue || name;
    return fifaPositionOrder(a) - fifaPositionOrder(b) || b.overall - a.overall || name;
  });
  const totalMarketValue = squad.reduce((n,p) => n+p.marketValue,0);
  const monthlyPayroll = squad.reduce((n,p) => n+p.salary,0);
  const averageOverall = squad.length ? Math.round(squad.reduce((n,p) => n+p.overall,0)/squad.length) : 0;
  const number = (n: number, digits = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });

  return <div className={styles.screen}>
    <ClubSidebar club={club} coach={coach} budget={budget} directorTrust={95} fanTrust={85} opponent={opponent}
      isHome round={round} competition={competition} selectedPlayer={selectedPlayer} ctaLabel="Escalar Time"
      onCta={onEscalar} onQuickAction={onQuickAction} onOpenPlayer={onOpenPlayer}/>
    <section className={styles.main} aria-label="Gestão do elenco">
      <header className={styles.hero}>
        <div className={styles.heroTop}><p className={styles.eyebrow}><span/>CENTRO DE COMANDO <i>/</i> SEU CLUBE, SUA HISTÓRIA</p><span className={styles.careerTag}><InterfaceIcon name="shield" size={13}/>MODO CARREIRA</span></div>
        <div className={styles.heroHeading}><div><h2>Gestão de <em>elenco.</em></h2><p>O talento entra em campo. A estratégia começa aqui.</p></div><div className={styles.round}><small>{competition}</small><b>{String(round).padStart(2,"0")}<span> / RODADA</span></b></div></div>
        <div className={styles.metrics}>
          <Metric icon="group" label="ATLETAS NO ELENCO" value={String(squad.length)} detail={`${starters.length} no time titular`}/>
          <Metric icon="activity" label="FORÇA MÉDIA" value={String(averageOverall)} detail="Média geral dos atletas"/>
          <Metric icon="money" label="VALOR DO ELENCO" value={`R$ ${number(totalMarketValue)}`} unit="mi" detail="Valor de mercado total"/>
          <Metric icon="chart_bar" label="FOLHA MENSAL" value={`R$ ${number(monthlyPayroll/1000,2)}`} unit="mi" detail="Salários do elenco"/>
        </div>
      </header>
      <section className={styles.roster} aria-label="Lista de jogadores">
        <div className={styles.sectionHeader}><div className={styles.sectionHeading}><InterfaceIcon name="group" size={18}/><h3>Central do elenco</h3><span>{squad.length}</span></div><div className={styles.views} aria-label="Visualização do elenco">
          <button type="button" aria-pressed={view === "overview"} onClick={() => setView("overview")}>Visão geral</button>
          <button type="button" aria-pressed={view === "performance"} onClick={() => setView("performance")}>Desempenho</button>
        </div></div>
        <div className={styles.toolbar}>
          <div className={styles.tabs} aria-label="Grupo de jogadores">{([['all','Todos',squad.length],['starters','Titulares',starters.length],['bench','Reservas',squad.filter(p=>!starters.includes(p.id)).length]] as const).map(([value,label,count]) => <button key={value} type="button" aria-pressed={group===value} onClick={() => setGroup(value)}>{label}<span>{count}</span></button>)}</div>
          <label className={styles.search}><InterfaceIcon name="search" size={16}/><input aria-label="Buscar jogador" type="search" placeholder="Buscar atleta ou posição" value={query} onChange={e=>setQuery(e.target.value)}/></label>
          <label className={styles.filter}><span className={styles.srOnly}>Filtrar posição</span><select aria-label="Filtrar posição" value={position} onChange={e=>setPosition(e.target.value)}>{[['all','Todas as posições'],['G','Goleiros'],['L','Laterais'],['Z','Zagueiros'],['M','Meio-campistas'],['A','Atacantes']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label className={styles.sort}>Ordenar por<select aria-label="Ordenar jogadores" value={sort} onChange={e=>setSort(e.target.value)}>{[['position','Posição'],['overall','Força'],['name','Nome'],['energy','Energia'],['value','Valor']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        </div>
        <div className={styles.tableViewport}>
          <table className={styles.table}><caption className={styles.srOnly}>Elenco do {club} · {view === "overview" ? "Visão geral" : "Desempenho"}</caption>
            <thead><tr><th scope="col">POS.</th><th scope="col" className={styles.nameHeading}>JOGADOR</th><th scope="col">GERAL</th><th scope="col">IDADE</th>
              {view === "overview" ? <><th scope="col">PÉ</th><th scope="col">ENERGIA</th><th scope="col">VALOR DE MERCADO</th><th scope="col">SALÁRIO / MÊS</th><th scope="col">CONTRATO ATÉ</th></> : <><th scope="col">CARACTERÍSTICAS</th><th scope="col">GOLS</th><th scope="col">ASSISTÊNCIAS</th><th scope="col">NOTA MÉDIA</th></>}<th scope="col"><span className={styles.srOnly}>Perfil</span></th>
            </tr></thead>
            <tbody>{visibleSquad.map((player) => {
              const starter = starters.includes(player.id), selected = selectedPlayer?.id === player.id;
              return <tr key={player.id} tabIndex={0} aria-selected={selected} data-player-row={player.id} className={selected ? styles.selected : undefined}
                onClick={()=>onSelectPlayer(player.id)} onDoubleClick={()=>onOpenPlayer(player.id)}
                onKeyDown={event=>{if(event.target !== event.currentTarget)return;if(event.key === "Enter"){event.preventDefault();onOpenPlayer(player.id);}if(event.key === " "){event.preventDefault();onSelectPlayer(player.id);}}}>
                <td><span className={`${styles.position} ${styles[`role${player.position}`]}`}>{fifaPosition(player)}</span></td>
                <td className={styles.playerName}><div className={styles.identity}><span className={styles.number}>{String(player.shirtNumber ?? player.id).padStart(2,"0")}</span><div><button type="button" className={styles.nameButton} onClick={event=>{event.stopPropagation();onOpenPlayer(player.id);}}>{player.name}</button><small>{starter ? <><i/>TITULAR</> : "RESERVA"}</small></div></div></td>
                <td><span className={`${styles.overall} ${player.overall>=80 ? styles.highOverall : ""}`}>{player.overall}</span></td><td>{player.age}</td>
                {view === "overview" ? <><td className={styles.muted}>{player.foot === "D" ? "Direito" : "Esquerdo"}</td><td><Energy value={player.energy}/></td><td className={styles.money}>R$ {number(player.marketValue)} mi</td><td className={styles.muted}>R$ {number(player.salary,0)} mil</td><td className={styles.contract}>{formatDate(player.contractUntil)}</td></> : <><td className={styles.traits}>{player.traits || "—"}</td><td>{player.goals}</td><td>{player.assists}</td><td><span className={styles.rating}>{player.avgRating === null ? "—" : number(player.avgRating)}</span></td></>}
                <td><button type="button" className={styles.openProfile} aria-label={`Abrir perfil de ${player.name}`} onClick={event=>{event.stopPropagation();onOpenPlayer(player.id);}}><InterfaceIcon name="arrow_up_right" size={16}/></button></td>
              </tr>;
            })}</tbody>
          </table>
          {!visibleSquad.length && <div className={styles.empty}><InterfaceIcon name="search" size={28}/><h4>Nenhum atleta encontrado</h4><p>Tente outro nome, posição ou grupo.</p><button type="button" onClick={()=>{setQuery("");setGroup("all");setPosition("all");}}>Limpar filtros</button></div>}
        </div>
        <footer className={styles.tableFooter}><span role="status"><b>{visibleSquad.length}</b> de {squad.length} atletas</span><p>Selecione para analisar <i>·</i> Enter ou duplo clique para abrir o perfil</p><span className={styles.live}><i/>ELENCO DA CARREIRA</span></footer>
      </section>
      <div className={styles.signature}><span>FUTMANAGER <b> / </b> CAREER EXPERIENCE</span><span>O próximo capítulo é seu.</span></div>
    </section>
  </div>;
}
function Metric({icon,label,value,detail,unit}:{icon:Parameters<typeof InterfaceIcon>[0]['name'];label:string;value:string;detail:string;unit?:string}) {
  return <div className={styles.metric}><div><span>{label}</span><InterfaceIcon name={icon} size={17}/></div><strong>{value}<small>{unit}</small></strong><p>{detail}</p></div>;
}
function Energy({value}:{value:number}) {
  return <div className={styles.energy}><i><span style={{width:`${Math.max(0,Math.min(100,value))}%`,background:value>70?"#b7e776":value>40?"#e8c276":"#ed9181"}}/></i><span>{value}%</span></div>;
}
function formatDate(value:string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}
