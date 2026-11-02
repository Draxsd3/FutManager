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
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="grid min-h-full grid-cols-[minmax(0,1fr)_minmax(245px,290px)] items-start gap-3 max-[1180px]:grid-cols-1">
          <div className="min-w-0 overflow-auto rounded-xl border border-[#d5e1d6] bg-white/75 shadow-sm">
            <table className="w-full min-w-[980px] border-separate border-spacing-y-1 text-left text-[11px]">
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
          <SquadInsights squad={squad} starters={starters} records={records} availableCount={availableCount} />
        </div>
      </div>
    </section>
  </div>;
}

function SquadInsights({ squad, starters, records, availableCount }: { squad: Player[]; starters: number[]; records: Record<number, PlayerCareerRecord>; availableCount: number }) {
  const defenders = squad.filter((player) => player.position === "L" || player.position === "Z").length;
  const sectors = [
    { label: "Goleiros", count: squad.filter((player) => player.position === "G").length, color: "bg-[#c59d24]" },
    { label: "Defesa", count: defenders, color: "bg-[#547eaf]" },
    { label: "Meio-campo", count: squad.filter((player) => player.position === "M").length, color: "bg-[#239557]" },
    { label: "Ataque", count: squad.filter((player) => player.position === "A").length, color: "bg-[#be584f]" },
  ];
  const averageEnergy = squad.length ? Math.round(squad.reduce((sum, player) => sum + player.energy, 0) / squad.length) : 0;
  const lowEnergy = [...squad].filter((player) => player.energy < 60).sort((a, b) => a.energy - b.energy);
  const forSale = squad.filter((player) => (records[player.id]?.marketStatus ?? player.marketAvailability) === "sale").length;
  const forLoan = squad.filter((player) => (records[player.id]?.marketStatus ?? player.marketAvailability) === "loan").length;

  return <aside aria-label="Resumo do elenco" className="grid content-start gap-3">
    <section className="rounded-xl border border-[#d5e1d6] bg-white/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div><span className="text-[9px] font-black uppercase tracking-[.12em] text-[var(--team-accent)]">Composição</span><h3 className="mt-1 text-sm font-black text-[#273b2e]">Profundidade por setor</h3></div>
        <span className="rounded-full bg-[#eff5ef] px-2 py-1 text-[9px] font-bold text-[#607267]">{squad.length} atletas</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[#f2f7f2] px-3 py-2"><b className="block text-lg leading-none text-[#263b2d]">{starters.length}</b><span className="mt-1 block text-[9px] font-bold text-[#68796d]">Titulares</span></div>
        <div className="rounded-lg bg-[#f2f7f2] px-3 py-2"><b className="block text-lg leading-none text-[#263b2d]">{Math.max(0, squad.length - starters.length)}</b><span className="mt-1 block text-[9px] font-bold text-[#68796d]">Reservas</span></div>
      </div>
      <div className="mt-4 space-y-3">{sectors.map((sector) => <div key={sector.label}>
        <div className="mb-1 flex items-center justify-between text-[10px]"><span className="font-semibold text-[#586a5e]">{sector.label}</span><b className="text-[#34483a]">{sector.count}</b></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#e8eee8]" role="img" aria-label={`${sector.label}: ${sector.count} de ${squad.length}`}><i className={`block h-full rounded-full ${sector.color}`} style={{ width: `${squad.length ? sector.count / squad.length * 100 : 0}%` }} /></div>
      </div>)}</div>
    </section>

    <section className="rounded-xl border border-[#d5e1d6] bg-white/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2"><div><span className="text-[9px] font-black uppercase tracking-[.12em] text-[var(--team-accent)]">Condição</span><h3 className="mt-1 text-sm font-black text-[#273b2e]">Energia do plantel</h3></div><b className="text-lg text-[#263b2d]">{averageEnergy}%</b></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e7eee7]" role="img" aria-label={`Energia média do elenco: ${averageEnergy}%`}><i className={`block h-full rounded-full ${averageEnergy > 70 ? "bg-[#25b95e]" : averageEnergy > 40 ? "bg-[#eab439]" : "bg-[#d75b4f]"}`} style={{ width: `${averageEnergy}%` }} /></div>
      <p className="mt-3 text-[10px] font-bold text-[#64756a]">{lowEnergy.length} atletas abaixo de 60% de energia</p>
      {lowEnergy.length > 0 && <ul className="mt-2 divide-y divide-[#edf1ed]">{lowEnergy.slice(0, 3).map((player) => <li key={player.id} className="flex items-center justify-between gap-2 py-1.5 text-[10px]"><span className="truncate text-[#405346]">{player.name}</span><b className="shrink-0 text-[#a56e19]">{player.energy}%</b></li>)}</ul>}
    </section>

    <section className="rounded-xl border border-[#d5e1d6] bg-white/95 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2"><div><span className="text-[9px] font-black uppercase tracking-[.12em] text-[var(--team-accent)]">Mercado</span><h3 className="mt-1 text-sm font-black text-[#273b2e]">Disponibilidade</h3></div><b className="text-lg text-[#263b2d]">{availableCount}</b></div>
      <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[#e7f4e9] px-2.5 py-1 text-[9px] font-bold text-[#2d7147]">À venda · {forSale}</span><span className="rounded-full bg-[#e9efff] px-2.5 py-1 text-[9px] font-bold text-[#354e93]">Empréstimo · {forLoan}</span></div>
    </section>
  </aside>;
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
