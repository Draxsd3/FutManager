"use client";

import { useMemo, useState } from "react";
import type { Player, PositionCode } from "@/lib/game/mock-data";
import { ClassicIcon } from "@/components/ui/classic-icon";
import { ClubSidebar } from "@/components/ui/club-sidebar";

type SortKey = "name" | "overall" | "energy" | "marketValue" | "salary" | "rating";

export function HubScreen({ club, coach, budget, opponent, round, competition, squad, starters, selectedPlayer, onSelectPlayer, onOpenPlayer, onEscalar, onQuickAction }: {
  club: string; coach: string; budget: number; opponent: string; round: number; competition: string;
  squad: Player[]; starters: number[]; selectedPlayer: Player | null;
  onSelectPlayer: (id: number) => void; onOpenPlayer: (id: number) => void; onEscalar: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
}) {
  const [position, setPosition] = useState<"Todos" | PositionCode>("Todos");
  const [availability, setAvailability] = useState("Todos os jogadores");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("overall");
  const visibleSquad = useMemo(() => squad
    .filter((player) => position === "Todos" || player.position === position)
    .filter((player) => availability === "Todos os jogadores" || (availability === "Titulares" ? starters.includes(player.id) : player.energy < 80))
    .filter((player) => player.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "pt-BR") : valueFor(b, sort) - valueFor(a, sort)),
  [availability, position, query, sort, squad, starters]);
  const totalMarketValue = squad.reduce((total, player) => total + player.marketValue, 0);
  const monthlyPayroll = squad.reduce((total, player) => total + player.salary, 0);
  const averageOverall = squad.length ? Math.round(squad.reduce((total, player) => total + player.overall, 0) / squad.length) : 0;

  return <div className="grid h-full min-h-0 grid-cols-[minmax(180px,260px)_minmax(0,1fr)] bg-transparent">
    <ClubSidebar club={club} coach={coach} budget={budget} directorTrust={95} fanTrust={85} opponent={opponent} isHome round={round} competition={competition} selectedPlayer={selectedPlayer} ctaLabel="Escalar Time" onCta={onEscalar} onQuickAction={onQuickAction} />
    <section className="flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(rgba(255,255,255,.9),rgba(250,252,249,.94)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-center text-[#22352a]">
      <header className="border-b-2 border-[var(--team-accent)] bg-white/95 shadow-sm">
        <div className="flex flex-wrap items-stretch gap-x-6 gap-y-2 px-4 py-2.5">
          <div className="min-w-[130px]"><h2 className="text-lg font-black tracking-tight text-[var(--team-accent)]">ELENCO</h2><p className="text-[10px] text-[#64746a]">Gerencie atletas e opções táticas</p></div>
          <SquadMetric icon="group" value={String(squad.length)} label="Jogadores" />
          <SquadMetric icon="chart_bar" value={String(averageOverall)} label="Força média" />
          <SquadMetric icon="money" value={`R$ ${totalMarketValue.toFixed(1)}M`} label="Valor do elenco" />
          <SquadMetric icon="house" value={`R$ ${(monthlyPayroll / 1000).toFixed(2)}M`} label="Folha mensal" />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-[#e2ebe3] bg-[#f4f8f4] px-4 py-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar jogador" className="h-8 min-w-[170px] rounded border border-[#c4d2c6] bg-white px-2 text-[11px] outline-none placeholder:text-[#8a978e] focus:border-[var(--team-accent)]" />
          <Filter value={availability} onChange={setAvailability} options={["Todos os jogadores", "Titulares", "Energia abaixo de 80%"]} />
          <Filter value={position} onChange={(value) => setPosition(value as "Todos" | PositionCode)} options={["Todos", "G", "L", "Z", "M", "A"]} />
          <Filter value={sort} onChange={(value) => setSort(value as SortKey)} options={["overall", "energy", "marketValue", "salary", "rating", "name"]} labels={{ overall: "Ordenar: força", energy: "Ordenar: energia", marketValue: "Ordenar: valor", salary: "Ordenar: salário", rating: "Ordenar: nota", name: "Ordenar: nome" }} />
          <span className="ml-auto text-[10px] font-bold text-[#5c6d61]">{visibleSquad.length} de {squad.length} jogadores</span>
        </div>
      </header>
      <div className="min-w-0 flex-1 overflow-auto px-3 pb-3 pt-2">
        <table className="w-full border-separate border-spacing-y-1 text-left text-[11px]">
          <thead className="sticky top-0 z-10 bg-[#f8fbf8] text-[9px] font-black uppercase tracking-wide text-[#607267]"><tr><Th>Pos.</Th><Th align="left">Nome</Th><Th>Pé</Th><Th>Idade</Th><Th>Força</Th><Th align="left">Características</Th><Th>Forma</Th><Th>Satisf.</Th><Th align="left">Energia</Th><Th align="right">Valor</Th><Th align="right">Salário</Th><Th>Final</Th><Th>J</Th><Th>G</Th><Th>A</Th><Th>Nota</Th></tr></thead>
          <tbody>{visibleSquad.map((player) => {
            const starter = starters.includes(player.id);
            return <tr key={player.id} onClick={() => onSelectPlayer(player.id)} onDoubleClick={() => onOpenPlayer(player.id)} className={`cursor-pointer shadow-[0_1px_0_rgba(29,57,36,.04)] transition hover:bg-[#edf7ef] ${selectedPlayer?.id === player.id ? "bg-[#dff1e3] ring-1 ring-inset ring-[var(--team-accent)]" : "bg-white/90"}`}>
              <td className="rounded-l px-2 py-2 text-center"><PositionBadge position={player.position} /></td>
              <td className="px-2 py-2 font-bold"><span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--team-accent)] text-[8px] text-white">{club.slice(0, 1)}</span><span className="ml-2">{player.name}</span>{starter && <span className="ml-2 rounded bg-[#dff5e5] px-1 text-[8px] text-[#18783b]">XI</span>}</td>
              <Td>{player.foot}</Td><Td>{player.age}</Td><Td className="font-black text-[var(--team-accent)]">{player.overall}</Td><td className="px-2 py-2 text-[#62736a]">{player.traits}</td><td className="px-2 py-2"><FormBars player={player} /></td><td className="px-2 py-2 text-center"><Satisfaction player={player} /></td><td className="px-2 py-2"><Energy value={player.energy} /></td><td className="px-2 py-2 text-right font-bold">R$ {player.marketValue.toFixed(1)}M</td><td className="px-2 py-2 text-right">{player.salary} mil</td><Td>{player.contractUntil}</Td><Td>{player.goals + player.assists}</Td><Td>{player.goals}</Td><Td>{player.assists}</Td><td className="rounded-r px-2 py-2 text-center font-black"><Rating value={player.avgRating} /></td>
            </tr>;
          })}{!visibleSquad.length && <tr><td colSpan={16} className="py-12 text-center text-[#718177]">Nenhum jogador encontrado para estes filtros.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  </div>;
}

function valueFor(player: Player, key: Exclude<SortKey, "name">) { return key === "rating" ? player.avgRating ?? 0 : player[key]; }
function SquadMetric({ icon, value, label }: { icon: Parameters<typeof ClassicIcon>[0]["name"]; value: string; label: string }) { return <div className="flex items-center gap-2"><ClassicIcon name={icon} size={32} /><div><b className="block text-sm leading-none">{value}</b><span className="text-[9px] text-[#6d7e72]">{label}</span></div></div>; }
function Filter({ value, onChange, options, labels = {} }: { value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-8 rounded border border-[#c4d2c6] bg-white px-2 text-[11px] font-bold text-[#45584a] outline-none focus:border-[var(--team-accent)]">{options.map((option) => <option key={option} value={option}>{labels[option] ?? option}</option>)}</select>; }
function Th({ children, align = "center" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) { return <th className={`border-b border-[#d4e1d6] px-2 py-2 ${align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center"}`}>{children}</th>; }
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <td className={`px-2 py-2 text-center ${className}`}>{children}</td>; }
function PositionBadge({ position }: { position: PositionCode }) { const colors: Record<PositionCode, string> = { G: "bg-[#c59d24]", L: "bg-[#547eaf]", Z: "bg-[#557f99]", M: "bg-[#239557]", A: "bg-[#be584f]" }; return <span className={`inline-grid h-5 min-w-5 place-items-center rounded border border-black/15 px-1 text-[9px] font-black text-white ${colors[position]}`}>{position}</span>; }
function FormBars({ player }: { player: Player }) { const levels = [player.overall - 10, player.overall - 3, player.overall + (player.id % 8), player.overall - 6, player.overall - 13]; return <span className="flex h-5 items-end justify-center gap-[2px]">{levels.map((level, index) => <i key={index} style={{ height: `${Math.max(20, Math.min(100, level))}%` }} className={level >= 78 ? "w-1.5 bg-[#1dbd63]" : level >= 65 ? "w-1.5 bg-[#f1b83b]" : "w-1.5 bg-[#e47b4d]"} />)}</span>; }
function Satisfaction({ player }: { player: Player }) { const satisfied = player.energy >= 80; return <span title={satisfied ? "Satisfeito" : "Atenção"} className={`inline-grid h-5 w-5 place-items-center rounded-full text-[10px] text-white ${satisfied ? "bg-[#38a856]" : "bg-[#e5a62d]"}`}>{satisfied ? "●" : "!"}</span>; }
function Energy({ value }: { value: number }) { const tone = value > 70 ? "bg-[#25b95e]" : value > 40 ? "bg-[#eab439]" : "bg-[#d75b4f]"; return <div className="flex items-center gap-1.5"><span className="h-2 w-14 overflow-hidden rounded-full bg-[#e1eae2]"><i style={{ width: `${value}%` }} className={`block h-full rounded-full ${tone}`} /></span><small>{value}%</small></div>; }
function Rating({ value }: { value: number | null }) { if (value === null) return <span className="text-[#9aa8a0]">—</span>; return <span className={value >= 7 ? "text-[#15934f]" : value < 6 ? "text-[#cc4f49]" : "text-[#b77a18]"}>{value.toFixed(1)}</span>; }
