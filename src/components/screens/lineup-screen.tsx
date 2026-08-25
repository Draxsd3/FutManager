"use client";

import type { Player } from "@/lib/game/mock-data";
import Image from "next/image";
import type { ManualPosition } from "@/lib/game/career";
import { ClubSidebar, Crest } from "@/components/ui/club-sidebar";
import { Pitch } from "@/components/ui/pitch";
import { Shirt } from "@/components/ui/shirt";
import { formations } from "@/lib/game/formations";
import { ClassicIcon, type ClassicIconName } from "@/components/ui/classic-icon";
import { clubKitAsset } from "@/lib/game/assets";

export function LineupScreen({
  club, coach, budget, opponent, round, competition, formation, setFormation,
  style, setStyle, marking, setMarking, focus, setFocus, startersData, bench,
  selectedPlayer, onSwap, onPlay, onBack, manualPositions, onMovePlayer, onResetPositions,
  onQuickAction,
}: {
  club: string; coach: string; budget: number; opponent: string; round: number; competition: string;
  formation: string; setFormation: (value: string) => void;
  style: string; setStyle: (value: string) => void;
  marking: string; setMarking: (value: string) => void;
  focus: string; setFocus: (value: string) => void;
  startersData: Player[]; bench: Player[]; selectedPlayer: Player | null;
  onSwap: (id: number) => void; onPlay: () => void; onBack: () => void;
  manualPositions: Record<number, ManualPosition>;
  onMovePlayer: (positions: Record<number, ManualPosition>) => void;
  onResetPositions: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
}) {
  const reserves = bench.slice(0, 6);
  const available = bench.slice(6);

  return (
    <div className="grid bg-[#071a0d] lg:grid-cols-[310px_1fr]">
      <ClubSidebar club={club} coach={coach} budget={budget} directorTrust={95} fanTrust={85}
        opponent={opponent} isHome round={round} competition={competition} selectedPlayer={selectedPlayer}
        ctaLabel="Jogar >>" onCta={onPlay} onQuickAction={onQuickAction} />

      <section className="min-h-[calc(100vh-78px)] overflow-auto bg-[#0a2110] font-[Arial] text-[11px] text-[#edf6ed]">
        <h2 className="h-9 border-b border-[#e7c84d] bg-[#174c27] px-3 leading-9 font-bold text-[#f1d457]">ESCALAR TIME · {formation}</h2>
        <div className="grid min-h-[calc(100vh-100px)] grid-cols-[430px_minmax(480px,1fr)] gap-2 p-2">
          <div className="flex min-w-0 flex-col">
            <Pitch club={club} formation={formation} starters={startersData} selectedPlayer={selectedPlayer?.id ?? null}
              onSelect={onSwap} manualPositions={manualPositions} onMovePlayers={onMovePlayer}
              onResetPositions={onResetPositions} />
            <div className="mt-2 grid min-h-[74px] grid-cols-[48px_1fr_155px] items-center border border-white/40 bg-[#d1d3cf] px-3 py-2">
              <Crest club={opponent} size="sm" />
              <div className="leading-5"><b>Adversário:</b><p className="font-bold">{opponent}</p></div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                <div><b>Condição do gramado:</b><p className="mt-1">Excelente</p></div>
                <div className="flex gap-1"><Kit club={club} kit={1} /><Kit club={club} kit={2} /><Kit club={club} kit={3} /></div>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col border border-white/20 bg-[#919d92]">
            <SectionTitle color="#2c6908">Banco de reservas</SectionTitle>
            <div className="grid min-h-[180px] grid-cols-[repeat(auto-fill,minmax(76px,1fr))] content-start gap-x-1 gap-y-2 p-3">
              {reserves.map((player) => <Shirt key={player.id} club={club} player={player} compact selected={selectedPlayer?.id === player.id} onClick={() => onSwap(player.id)} />)}
              {!reserves.length && <p className="col-span-full text-[#273329]">Banco vazio.</p>}
            </div>
            <SectionTitle color="#3d403e">Jogadores disponíveis</SectionTitle>
            <div className="grid min-h-[135px] flex-1 grid-cols-[repeat(auto-fill,minmax(76px,1fr))] content-start gap-x-1 gap-y-2 p-3">
              {available.map((player) => <Shirt key={player.id} club={club} player={player} compact selected={selectedPlayer?.id === player.id} onClick={() => onSwap(player.id)} />)}
              {!available.length && <p className="col-span-full text-[10px] text-[#263129]">Todos os jogadores aptos estão no banco.</p>}
            </div>
            <div className="mt-auto border-t border-white/50 bg-[#ced1cd] p-2">
              <div className="grid grid-cols-[1.05fr_1fr_.85fr_1fr] gap-3">
                <Select label="Seleção Automática:" value={formation} onChange={setFormation} options={formations} />
                <Select label="Estilo de jogo:" value={style} onChange={setStyle} options={["Equilibrado", "Ofensivo", "Defensivo"]} />
                <Select label="Marcação:" value={marking} onChange={setMarking} options={["Leve", "Normal", "Pesada"]} />
                <Select label="Concentrar ataques:" value={focus} onChange={setFocus} options={["Pelo meio", "Pelas laterais"]} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-5">
                <ClassicButton icon="arrow_refresh" onClick={onResetPositions}>Táticas salvas</ClassicButton>
                <ClassicButton icon="house" onClick={onBack}>&lt;&lt; Voltar ao time</ClassicButton>
                <ClassicButton icon="sport_soccer" onClick={onPlay}>Jogar &gt;&gt;</ClassicButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ color, children }: { color: string; children: React.ReactNode }) { return <h3 style={{ backgroundColor: color }} className="h-5 px-1.5 leading-5 font-bold text-white">{children}</h3>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="font-bold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block h-7 w-full border border-[#6f8492] bg-gradient-to-b from-white to-[#dbe4ea] px-1 font-normal">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function ClassicButton({ icon, onClick, children }: { icon: ClassicIconName; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className="flex h-8 items-center justify-center gap-1.5 border border-[#8aa0af] bg-gradient-to-b from-white to-[#c6d7e3] font-bold hover:brightness-95"><ClassicIcon name={icon} />{children}</button>; }
function Kit({ club, kit }: { club: string; kit: 1 | 2 | 3 }) { const asset = clubKitAsset(club, kit); return asset ? <Image src={asset} alt={`Uniforme ${kit} do ${club}`} width={55} height={55} unoptimized className="block h-10 w-8 object-contain" /> : <i style={{ background: kit === 1 ? "linear-gradient(90deg,#eee 0 42%,var(--team-primary) 42% 58%,#eee 58%)" : "#202020", clipPath: "polygon(25% 0,38% 8%,62% 8%,75% 0,100% 20%,84% 38%,76% 31%,76% 100%,24% 100%,24% 31%,16% 38%,0 20%)" }} className="block h-9 w-7" />; }
