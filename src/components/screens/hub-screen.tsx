"use client";

import type { Player, PositionCode } from "@/lib/game/mock-data";
import type { PlayerCareerRecord } from "@/lib/game/career";
import { ClassicIcon } from "@/components/ui/classic-icon";
import { ClubSidebar } from "@/components/ui/club-sidebar";
import { fifaPosition, fifaPositionOrder } from "@/lib/game/fifa-position";

export function HubScreen({ club, coach, budget, opponent, round, competition, squad, starters, records, selectedPlayer, onSelectPlayer, onOpenPlayer, onEscalar, onQuickAction }: {
  club: string; coach: string; budget: number; opponent: string; round: number; competition: string;
  squad: Player[]; starters: number[]; records: Record<number, PlayerCareerRecord>; selectedPlayer: Player | null;
  onSelectPlayer: (id: number) => void; onOpenPlayer: (id: number) => void; onEscalar: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
}) {
  const visibleSquad = [...squad].sort((a, b) => fifaPositionOrder(a) - fifaPositionOrder(b) || b.overall - a.overall || a.name.localeCompare(b.name, "pt-BR"));
  const totalMarketValue = squad.reduce((total, player) => total + player.marketValue, 0);
  const monthlyPayroll = squad.reduce((total, player) => total + player.salary, 0);
  const averageOverall = squad.length ? Math.round(squad.reduce((total, player) => total + player.overall, 0) / squad.length) : 0;
  const availableCount = squad.filter((player) => {
    const status = records[player.id]?.marketStatus ?? player.marketAvailability;
    return status === "sale" || status === "loan";
  }).length;

  return <div className="grid h-full min-h-0 grid-cols-[minmax(180px,260px)_minmax(0,1fr)] bg-transparent">
    <ClubSidebar club={club} coach={coach} budget={budget} directorTrust={95} fanTrust={85} opponent={opponent} isHome round={round} competition={competition} selectedPlayer={selectedPlayer} selectedPlayerRecord={selectedPlayer ? records[selectedPlayer.id] : undefined} ctaLabel="Escalar Time" onCta={onEscalar} onQuickAction={onQuickAction} />
    <section className="flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(rgba(255,255,255,.92),rgba(249,252,249,.96)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-center text-[#22352a]">
      <header className="border-b-2 border-[var(--team-accent)] bg-white/95 shadow-sm">
        <div className="flex flex-wrap items-stretch gap-x-6 gap-y-2 px-4 py-2.5">
          <div className="min-w-[130px]"><h2 className="text-lg font-black tracking-tight text-[var(--team-accent)]">ELENCO</h2><p className="text-[10px] text-[#64746a]">Plantel, desempenho e mercado</p></div>
          <SquadMetric icon="group" value={String(squad.length)} label="Jogadores" />
          <SquadMetric icon="chart_bar" value={String(averageOverall)} label="Força média" />
          <SquadMetric icon="money" value={`R$ ${totalMarketValue.toFixed(1)}M`} label="Valor do elenco" />
          <SquadMetric icon="house" value={`R$ ${(monthlyPayroll / 1000).toFixed(2)}M`} label="Folha mensal" />
          <SquadMetric icon="magnifier" value={String(availableCount)} label="No mercado" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e2ebe3] bg-[#f4f8f4] px-4 py-2 text-[10px] font-bold text-[#5c6d61]"><span>{visibleSquad.length} jogadores · clique para selecionar · duplo clique para abrir a ficha</span><span>Valores registrados na carreira</span></div>
      </header>
      <div className="min-w-0 flex-1 overflow-auto px-3 pb-3 pt-2">
        <table className="w-full min-w-[1050px] border-separate border-spacing-y-1 text-left text-[11px]">
          <thead className="sticky top-0 z-10 bg-[#f8fbf8] text-[9px] font-black uppercase tracking-wide text-[#607267]"><tr><Th>Pos.</Th><Th>#</Th><Th align="left">Nome</Th><Th>Pé</Th><Th>Idade</Th><Th>Força</Th><Th align="left">Pontos fortes</Th><Th align="left">Energia</Th><Th align="right">Valor</Th><Th align="right">Salário/mês</Th><Th>Contrato</Th><Th>J</Th><Th>G</Th><Th>A</Th><Th>Nota</Th><Th align="left">Mercado</Th></tr></thead>
          <tbody>{visibleSquad.map((player) => {
            const starter = starters.includes(player.id);
            const stats = careerTotals(records[player.id]);
            return <tr key={player.id} onClick={() => onSelectPlayer(player.id)} onDoubleClick={() => onOpenPlayer(player.id)} className={`cursor-pointer shadow-[0_1px_0_rgba(29,57,36,.04)] transition hover:bg-[#edf7ef] ${selectedPlayer?.id === player.id ? "bg-[#dff1e3] ring-1 ring-inset ring-[var(--team-accent)]" : "bg-white/95"}`}>
              <td className="rounded-l px-2 py-2 text-center"><PositionBadge player={player} /></td>
              <td className="px-2 py-2 text-center text-[#718177]">{player.shirtNumber ?? player.id}</td>
              <td className="px-2 py-2 font-bold"><span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--team-accent)] text-[8px] text-white">{club.slice(0, 1)}</span><span className="ml-2">{player.name}</span>{starter && <span className="ml-2 rounded bg-[#dff5e5] px-1 text-[8px] text-[#18783b]">XI</span>}</td>
              <Td>{player.foot}</Td><Td>{player.age}</Td><Td className="font-black text-[var(--team-accent)]">{player.overall}</Td><td className="px-2 py-2 text-[#62736a]">{player.traits}</td><td className="px-2 py-2"><Energy value={player.energy} /></td><td className="px-2 py-2 text-right font-bold">R$ {player.marketValue.toFixed(1)}M</td><td className="px-2 py-2 text-right whitespace-nowrap">R$ {records[player.id]?.salary ?? player.salary} mil</td><td className="px-2 py-2 text-center text-[10px]">{records[player.id]?.contractUntil ?? player.contractUntil}</td><Td>{stats.games}</Td><Td>{stats.goals}</Td><Td>{stats.assists}</Td><td className="px-2 py-2 text-center font-black"><Rating value={stats.rating} /></td><td className="rounded-r px-2 py-2">{marketStatus(records[player.id]?.marketStatus ?? player.marketAvailability)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  </div>;
}

function careerTotals(record?: PlayerCareerRecord) {
  const seasons = record?.seasons ?? [];
  const rated = seasons.filter((season) => season.average !== null && (season.ratedGames ?? season.games) > 0);
  const ratedCount = rated.reduce((sum, season) => sum + (season.ratedGames ?? season.games), 0);
  const rating = ratedCount ? rated.reduce((sum, season) => sum + season.average! * (season.ratedGames ?? season.games), 0) / ratedCount : null;
  return {
    games: seasons.reduce((sum, season) => sum + season.games, 0),
    goals: seasons.reduce((sum, season) => sum + season.goals, 0),
    assists: seasons.reduce((sum, season) => sum + season.assists, 0),
    rating,
  };
}

function marketStatus(status: PlayerCareerRecord["marketStatus"] | Player["marketAvailability"]) {
  if (status === "sale") return <span className="rounded-full bg-[#e7f4e9] px-2 py-1 text-[9px] font-bold text-[#2d7147]">À venda</span>;
  if (status === "loan") return <span className="rounded-full bg-[#e9efff] px-2 py-1 text-[9px] font-bold text-[#354e93]">Empréstimo</span>;
  if (status === "retiring") return <span className="rounded-full bg-[#fff3df] px-2 py-1 text-[9px] font-bold text-[#987222]">Aposentadoria</span>;
  return <span className="text-[10px] text-[#a1ada4]">—</span>;
}

function SquadMetric({ icon, value, label }: { icon: Parameters<typeof ClassicIcon>[0]["name"]; value: string; label: string }) { return <div className="flex items-center gap-2"><ClassicIcon name={icon} size={30} /><div><b className="block text-sm leading-none">{value}</b><span className="text-[9px] text-[#6d7e72]">{label}</span></div></div>; }
function Th({ children, align = "center" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) { return <th className={`border-b border-[#d4e1d6] px-2 py-2 ${align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center"}`}>{children}</th>; }
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <td className={`px-2 py-2 text-center ${className}`}>{children}</td>; }
function PositionBadge({ player }: { player: Player }) { const colors: Record<PositionCode, string> = { G: "bg-[#c59d24]", L: "bg-[#547eaf]", Z: "bg-[#557f99]", M: "bg-[#239557]", A: "bg-[#be584f]" }; return <span className={`inline-grid h-5 min-w-7 place-items-center rounded border border-black/15 px-1 text-[9px] font-black text-white ${colors[player.position]}`}>{fifaPosition(player)}</span>; }
function Energy({ value }: { value: number }) { const tone = value > 70 ? "bg-[#25b95e]" : value > 40 ? "bg-[#eab439]" : "bg-[#d75b4f]"; return <div className="flex items-center gap-1.5"><span className="h-2 w-14 overflow-hidden rounded-full bg-[#e1eae2]"><i style={{ width: `${value}%` }} className={`block h-full rounded-full ${tone}`} /></span><small>{value}%</small></div>; }
function Rating({ value }: { value: number | null }) { if (value === null) return <span className="text-[#9aa8a0]">—</span>; return <span className={value >= 7 ? "text-[#15934f]" : value < 6 ? "text-[#cc4f49]" : "text-[#b77a18]"}>{value.toFixed(1)}</span>; }
