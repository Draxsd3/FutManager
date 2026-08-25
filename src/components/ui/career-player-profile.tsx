"use client";

import Image from "next/image";
import type { Player } from "@/lib/game/mock-data";
import type { PlayerCareerRecord } from "@/lib/game/career";
import { fifaPosition } from "@/lib/game/fifa-position";

export function CareerPlayerProfile({ player, club, record, onClose }: { player: Player; club: string; record: PlayerCareerRecord; onClose: () => void }) {
  const attributes = [
    ["Ritmo", Math.min(99, player.overall + 5)], ["Finalização", player.position === "A" ? player.overall + 4 : player.overall - 6],
    ["Passe", player.position === "M" ? player.overall + 4 : player.overall - 4], ["Drible", player.overall + (player.position === "A" ? 2 : -2)],
    ["Defesa", player.position === "G" || player.position === "Z" ? player.overall + 5 : player.overall - 14], ["Físico", player.overall - 1],
  ].map(([label, value]) => [label as string, Math.max(25, Math.min(99, value as number))] as const);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#06130a]/80 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="w-full max-w-[1040px] overflow-hidden rounded-xl border border-white/15 bg-[#102719] text-white shadow-2xl">
      <header className="flex items-center border-b border-white/10 bg-[#0a1a10] px-5 py-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#75df91]">Central do atleta</p><h2 className="text-lg font-black">{player.name}</h2></div><button onClick={onClose} className="ml-auto rounded border border-white/25 px-4 py-2 text-xs font-bold hover:bg-white/10">Fechar</button></header>
      <div className="grid md:grid-cols-[340px_1fr]">
        <aside className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_20%,#287641,transparent_58%),linear-gradient(150deg,#112f1c,#07140b)] p-6">
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.03)_0_1px,transparent_1px_52px)]" />
          <div className="relative mx-auto grid h-52 w-52 place-items-end overflow-hidden rounded-full border-4 border-[#e8c94a] bg-[#172d1d] shadow-[0_0_0_8px_rgba(255,255,255,.08)]">{player.photoDataUrl ? <Image src={player.photoDataUrl} alt={`Foto de ${player.name}`} width={208} height={208} unoptimized className="h-full w-full object-cover" /> : <span className="relative mb-4 h-36 w-28 rounded-t-[48%] bg-[#071008] before:absolute before:-top-12 before:left-1/2 before:h-20 before:w-20 before:-translate-x-1/2 before:rounded-full before:bg-[#071008]" />}</div>
          <div className="relative mt-6 text-center"><span className="rounded bg-[#e8c94a] px-2 py-1 text-[11px] font-black text-[#102719]">{fifaPosition(player)}</span><b className="ml-2 text-3xl">{player.overall}</b><p className="mt-3 text-sm font-bold">{club}</p><p className="text-xs text-white/65">{player.age} anos · pé {player.foot === "D" ? "direito" : "esquerdo"}</p></div>
        </aside>
        <main className="p-6"><div className="grid gap-6 lg:grid-cols-[1fr_220px]"><div><h3 className="border-b border-[#2e6b41] pb-2 text-xs font-black uppercase tracking-wider text-[#75df91]">Atributos do jogador</h3><div className="mt-4 space-y-3">{attributes.map(([label, value]) => <div key={label} className="grid grid-cols-[86px_34px_1fr] items-center gap-2 text-xs"><b>{label}</b><strong className="text-right text-[#e8c94a]">{value}</strong><span className="h-2 overflow-hidden rounded bg-white/10"><i className="block h-full rounded bg-[#20ce69]" style={{ width: `${value}%` }} /></span></div>)}</div><h3 className="mt-7 border-b border-[#2e6b41] pb-2 text-xs font-black uppercase tracking-wider text-[#75df91]">Perfil</h3><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><Fact label="Características" value={player.traits} /><Fact label="Energia" value={`${player.energy}%`} /><Fact label="Contrato" value={record.contractUntil} /><Fact label="Valor" value={`R$ ${player.marketValue.toFixed(1)} mi`} /></div></div><div className="rounded-lg border border-white/10 bg-black/20 p-4"><h3 className="text-xs font-black uppercase tracking-wider text-[#75df91]">Temporada</h3><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Stat label="Jogos" value={player.goals + player.assists} /><Stat label="Gols" value={player.goals} /><Stat label="Assist." value={player.assists} /></div><p className="mt-5 text-center text-[11px] text-white/60">Nota média</p><p className="text-center text-3xl font-black text-[#e8c94a]">{player.avgRating?.toFixed(1) ?? "—"}</p></div></div></main>
      </div>
    </section>
  </div>;
}

function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded border border-white/10 bg-black/20 p-2"><small className="block text-white/55">{label}</small><b>{value}</b></div>; }
function Stat({ label, value }: { label: string; value: number }) { return <div><b className="block text-lg text-[#e8c94a]">{value}</b><small className="text-[9px] text-white/55">{label}</small></div>; }
