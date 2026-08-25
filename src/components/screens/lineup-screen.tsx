"use client";

import { useRef } from "react";
import Image from "next/image";
import type { Player } from "@/lib/game/mock-data";
import type { ManualPosition } from "@/lib/game/career";
import { Pitch } from "@/components/ui/pitch";
import { formations } from "@/lib/game/formations";
import { ClassicIcon, type ClassicIconName } from "@/components/ui/classic-icon";

export function LineupScreen({
  club, opponent, round, competition, formation, setFormation, style, setStyle, marking, setMarking, focus, setFocus,
  startersData, bench, selectedPlayer, onSwap, onPlay, onBack, manualPositions, onMovePlayer, onResetPositions, onPhotoChange,
}: {
  club: string; coach: string; budget: number; opponent: string; round: number; competition: string;
  formation: string; setFormation: (value: string) => void; style: string; setStyle: (value: string) => void; marking: string; setMarking: (value: string) => void; focus: string; setFocus: (value: string) => void;
  startersData: Player[]; bench: Player[]; selectedPlayer: Player | null; onSwap: (id: number) => void; onPlay: () => void; onBack: () => void;
  manualPositions: Record<number, ManualPosition>; onMovePlayer: (positions: Record<number, ManualPosition>) => void; onResetPositions: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void; onPhotoChange: (id: number, photoDataUrl: string | null) => void;
}) {
  const photoInput = useRef<HTMLInputElement>(null);
  const attack = sectorStrength(startersData, ["A"]);
  const midfield = sectorStrength(startersData, ["M"]);
  const defense = sectorStrength(startersData, ["G", "L", "Z"]);

  function uploadPhoto(file: File | undefined) {
    if (!file || !selectedPlayer) return;
    if (!file.type.startsWith("image/") || file.size > 700_000) return;
    const reader = new FileReader();
    reader.onload = () => onPhotoChange(selectedPlayer.id, typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return <section className="min-h-screen overflow-auto bg-[#021b0d] bg-[linear-gradient(rgba(0,24,11,.82),rgba(0,18,8,.92)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-center p-3 font-[Arial] text-[11px] text-[#e9f7ec]">
    <header className="mb-3 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">Escalação &amp; Tática</h2><p className="mt-0.5 text-[10px] text-[#a7c5ad]">Escalação para: {opponent} (casa) · {competition} · {round}ª rodada</p></div><div className="flex gap-2"><button onClick={onBack} className="rounded border border-white/15 bg-white/10 px-4 py-2 font-bold hover:bg-white/20">Voltar</button><button onClick={onPlay} className="rounded bg-[#16cf6d] px-5 py-2 font-black text-[#062417] hover:bg-[#2be47e]">Ir para a partida ›</button></div></header>
    <div className="grid min-w-[1120px] grid-cols-[300px_minmax(540px,1fr)_270px] gap-3">
      <aside className="space-y-3"><Panel title="Esquema tático"><Select label="Esquema tático" value={formation} onChange={setFormation} options={formations} /><Select label="Estilo de jogo" value={style} onChange={setStyle} options={["Equilibrado", "Ofensivo", "Defensivo"]} /><Select label="Marcação / pressão" value={marking} onChange={setMarking} options={["Leve", "Normal", "Pesada"]} /></Panel>
        <Panel title={`Banco de reservas · ${bench.length}`}><div className="max-h-[460px] space-y-1 overflow-auto">{bench.map((player) => <ReserveRow key={player.id} player={player} active={selectedPlayer?.id === player.id} onClick={() => onSwap(player.id)} />)}{!bench.length && <p className="p-2 text-[#9db7a3]">Banco vazio.</p>}</div></Panel>
        <Panel title="Foto do atleta"><input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(event) => uploadPhoto(event.target.files?.[0])} />{selectedPlayer ? <div className="flex items-center gap-3"><Portrait player={selectedPlayer} size={44} /><div className="min-w-0 flex-1"><b className="block truncate">{selectedPlayer.name}</b><p className="text-[9px] text-[#a7c5ad]">JPG ou PNG · até 700 KB</p><div className="mt-2 flex gap-1"><button onClick={() => photoInput.current?.click()} className="rounded bg-[#1b8f4d] px-2 py-1 font-bold">Adicionar foto</button>{selectedPlayer.photoDataUrl && <button onClick={() => onPhotoChange(selectedPlayer.id, null)} className="rounded border border-white/25 px-2 py-1">Remover</button>}</div></div></div> : <p className="p-1 text-[#a7c5ad]">Selecione um atleta no campo ou no banco.</p>}</Panel>
      </aside>
      <main className="flex min-w-0 flex-col"><Pitch club={club} formation={formation} starters={startersData} selectedPlayer={selectedPlayer?.id ?? null} onSelect={onSwap} manualPositions={manualPositions} onMovePlayers={onMovePlayer} onResetPositions={onResetPositions} tactical />
        <Panel title="Ajustes de equipe" className="mt-3"><div className="grid grid-cols-4 gap-2"><Select label="Batedor de falta" value={startersData[0]?.name ?? ""} onChange={() => undefined} options={startersData.map((player) => player.name)} /><Select label="Batedor de escanteio" value={startersData[1]?.name ?? ""} onChange={() => undefined} options={startersData.map((player) => player.name)} /><Select label="Batedor de pênalti" value={startersData[2]?.name ?? ""} onChange={() => undefined} options={startersData.map((player) => player.name)} /><Select label="Capitão" value={startersData[3]?.name ?? ""} onChange={() => undefined} options={startersData.map((player) => player.name)} /></div><div className="mt-3 flex justify-end gap-2"><Button icon="arrow_refresh" onClick={onResetPositions}>Restaurar posições</Button><Button icon="sport_soccer" onClick={onPlay}>Salvar e ir para partida</Button></div></Panel>
      </main>
      <aside className="space-y-3"><Panel title="Foco tático"><Select label="Concentração de ataque" value={focus} onChange={setFocus} options={["Pelo meio", "Pelas laterais"]} /><div className="mt-3 grid h-28 grid-cols-5 grid-rows-3 overflow-hidden rounded border border-[#38724d] bg-[#0c4a28]">{Array.from({ length: 15 }, (_, index) => <i key={index} className={`border border-[#2e6942] ${index === 7 ? "bg-[#1c9a52]" : ""}`} />)}</div></Panel>
        <Panel title="Força do time"><div className="grid grid-cols-3 gap-2 text-center"><Sector value={attack} label="Ataque" tone="#16cf6d" /><Sector value={midfield} label="Meio" tone="#f1c53c" /><Sector value={defense} label="Defesa" tone="#4d9eed" /></div><div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3"><span>GERAL <b className="ml-1 text-lg">{Math.round((attack + midfield + defense) / 3)}</b></span><span className="text-[#f1ca3e]">★★★★★</span></div></Panel>
        <Panel title="Próxima partida"><p className="font-bold">{club} x {opponent}</p><p className="mt-1 text-[#a7c5ad]">{competition} · {round}ª rodada</p><button onClick={onPlay} className="mt-3 w-full rounded bg-[#16cf6d] py-2 font-black text-[#062417]">Confirmar escalação</button></Panel>
      </aside>
    </div>
  </section>;
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) { return <section className={`rounded-lg border border-[#3d6749] bg-[#061d0e]/90 p-2 shadow-lg ${className}`}><h3 className="mb-2 font-black uppercase text-[#18dc72]">{title}</h3>{children}</section>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="mb-2 block last:mb-0"><b className="block text-[9px] uppercase tracking-wide text-[#19ce6d]">{label}</b><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-8 w-full rounded border border-[#426c4e] bg-[#173c24] px-2 font-bold text-white outline-none">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function ReserveRow({ player, active, onClick }: { player: Player; active: boolean; onClick: () => void }) { const role = { G: "GOL", L: "LAT", Z: "ZAG", M: "MC", A: "ATA" }[player.position]; return <button onClick={onClick} className={`grid w-full grid-cols-[1fr_24px_14px_24px_48px_12px] items-center gap-1 border-b border-white/10 px-1 py-1.5 text-left hover:bg-white/10 ${active ? "bg-[#145b31]" : ""}`}><span className="truncate font-bold">{player.name}</span><b className="text-[9px] text-[#19d66d]">{role}</b><span className="text-[9px]">{player.foot}</span><b className={player.overall >= 70 ? "text-[#18da71]" : "text-[#f1c239]"}>{player.overall}</b><span className="h-1.5 overflow-hidden rounded bg-[#193a25]"><i style={{ width: `${player.energy}%` }} className={`block h-full ${player.energy >= 80 ? "bg-[#18da71]" : "bg-[#f1c239]"}`} /></span><i className={`h-2 w-2 rounded-full ${player.energy >= 75 ? "bg-[#82df54]" : "bg-[#f19e36]"}`} /></button>; }
function Portrait({ player, size }: { player: Player; size: number }) { return player.photoDataUrl ? <Image src={player.photoDataUrl} alt={`Foto de ${player.name}`} width={size} height={size} unoptimized className="rounded-full object-cover" style={{ width: size, height: size }} /> : <span style={{ width: size, height: size }} className="inline-grid place-items-center rounded-full bg-[#17261b] text-[#84ad8d]"><ClassicIcon name="user_green" size={Math.max(16, size - 10)} /></span>; }
function Sector({ value, label, tone }: { value: number; label: string; tone: string }) { return <div><span style={{ borderColor: tone }} className="mx-auto grid h-14 w-14 place-items-center rounded-full border-4 text-lg font-black">{value}</span><b className="mt-1 block text-[9px] uppercase text-[#a9c3ae]">{label}</b></div>; }
function Button({ icon, onClick, children }: { icon: ClassicIconName; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className="flex items-center gap-1.5 rounded border border-[#3d6749] bg-[#173c24] px-3 py-2 font-bold hover:bg-[#245430]"><ClassicIcon name={icon} />{children}</button>; }
function sectorStrength(players: Player[], positions: Player["position"][]) { const picked = players.filter((player) => positions.includes(player.position)); return picked.length ? Math.round(picked.reduce((total, player) => total + player.overall, 0) / picked.length) : 0; }
