import type { Player } from "@/lib/game/mock-data";
import { formationSlotRoles, formationSlots, nearestFormationSlot, playerFitAtPosition } from "@/lib/game/formations";
import type { ManualPosition } from "@/lib/game/career";
import { Shirt } from "./shirt";
import Image from "next/image";

export function Pitch({
  club,
  formation,
  starters,
  selectedPlayer,
  onSelect,
  manualPositions = {},
  onMovePlayers = () => undefined,
  onResetPositions,
  onPlacePlayer,
  tactical = false,
}: {
  club?: string;
  formation: string;
  starters: Player[];
  selectedPlayer: number | null;
  onSelect: (id: number) => void;
  manualPositions?: Record<number, ManualPosition>;
  onMovePlayers?: (positions: Record<number, ManualPosition>) => void;
  onResetPositions?: () => void;
  onPlacePlayer?: (id: number, slotIndex: number) => void;
  tactical?: boolean;
}) {
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  const roles = formationSlotRoles[formation] ?? formationSlotRoles["4-3-3"];
  const roleLabels = tacticalRoleLabels[formation] ?? tacticalRoleLabels["4-3-3"];
  const effectivePositions = Object.fromEntries(starters.slice(0, 11).map((player, index) => [player.id, (tactical && onPlacePlayer ? slots[index] : manualPositions[player.id]) ?? slots[index] ?? { left: 50, top: 50 }]));
  return (
    <div
      className={`relative ${tactical ? "min-h-0 flex-1" : "h-full min-h-[520px]"} w-full overflow-hidden rounded-lg border-2 border-[#cbd8c4] bg-[#102519] bg-[linear-gradient(rgba(5,19,9,.35),rgba(5,19,9,.5)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-center shadow-xl`}
      onDragOver={(event) => { if (!onPlacePlayer) event.preventDefault(); }}
      onDrop={(event) => {
        if (onPlacePlayer) return;
        event.preventDefault();
        const id = Number(event.dataTransfer.getData("text/player-id"));
        if (!id) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const player = starters.find((item) => item.id === id);
        if (!player) return;
        const requested = {
          left: Math.min(93, Math.max(7, ((event.clientX - bounds.left) / bounds.width) * 100)),
          top: Math.min(92, Math.max(8, ((event.clientY - bounds.top) / bounds.height) * 100)),
        };
        const targetIndex = nearestFormationSlot(formation, requested, player.position === "G");
        const target = slots[targetIndex];
        const origin = effectivePositions[id];
        const occupant = starters.find((item) => item.id !== id && effectivePositions[item.id]?.left === target.left && effectivePositions[item.id]?.top === target.top);
        const updates: Record<number, ManualPosition> = { [id]: target };
        if (occupant && origin) updates[occupant.id] = origin;
        onMovePlayers(updates);
      }}
    >
      <div className="pointer-events-none absolute inset-7 rounded-sm bg-[repeating-linear-gradient(0deg,#347f2e_0_52px,#2a6e27_52px_104px)] shadow-[0_0_24px_rgba(0,0,0,.45)]" />
      <div className="pointer-events-none absolute inset-[30px] border-2 border-[#edf1ce]" />
      <div className="pointer-events-none absolute left-[30px] right-[30px] top-1/2 border-t-2 border-[#edf1ce]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#e7e6a8]" />
      <div className="pointer-events-none absolute left-1/2 top-[30px] h-[112px] w-[210px] -translate-x-1/2 border-x-2 border-b-2 border-[#edf1ce]" />
      <div className="pointer-events-none absolute bottom-[30px] left-1/2 h-[112px] w-[210px] -translate-x-1/2 border-x-2 border-t-2 border-[#edf1ce]" />
      <div className="pointer-events-none absolute left-1/2 top-[30px] h-[43px] w-[92px] -translate-x-1/2 border-x-2 border-b-2 border-[#edf1ce]" />
      <div className="pointer-events-none absolute bottom-[30px] left-1/2 h-[43px] w-[92px] -translate-x-1/2 border-x-2 border-t-2 border-[#edf1ce]" />
      {slots.map((slot, index) => {
        const occupied = starters.some((player) => {
          const position = effectivePositions[player.id];
          return position?.left === slot.left && position?.top === slot.top;
        });
        const moveTarget = onPlacePlayer && selectedPlayer !== null && starters[index]?.id !== selectedPlayer;
        return <div key={`${slot.left}-${slot.top}`} onClick={() => { if (moveTarget) onPlacePlayer(selectedPlayer, index); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { if (!onPlacePlayer) return; event.preventDefault(); const id = Number(event.dataTransfer.getData("text/player-id")); if (id) onPlacePlayer(id, index); }} className={`absolute h-[76px] w-[112px] -translate-x-1/2 -translate-y-1/2 rounded ${onPlacePlayer ? "z-0 cursor-pointer transition" : "pointer-events-none"} ${moveTarget ? "border-2 border-dashed border-[#ffd34d] bg-[#ffd34d]/15 shadow-[0_0_18px_rgba(255,211,77,.3)]" : occupied ? "border border-transparent" : "border border-dashed border-white/30 bg-black/20 hover:border-[#22e47b] hover:bg-[#22e47b]/20"}`} style={{ left: fieldCoordinate(slot.left), top: fieldCoordinate(slot.top) }}>
          {(!occupied || moveTarget) && <><i className="absolute left-1/2 top-1/2 h-7 w-6 -translate-x-1/2 -translate-y-1/2 bg-white/20" style={{ clipPath: "polygon(25% 0,38% 8%,62% 8%,75% 0,100% 20%,84% 38%,76% 31%,76% 100%,24% 100%,24% 31%,16% 38%,0 20%)" }} /><b className={`absolute bottom-1 right-1 rounded px-1 text-[8px] ${moveTarget ? "bg-[#ffd34d] font-black text-[#231b00]" : "text-white/60"}`}>{moveTarget ? `MOVER · ${tactical ? roleLabels[index] : roles[index]}` : tactical ? roleLabels[index] : roles[index]}</b></>}
        </div>;
      })}
      {starters.slice(0, 11).map((player, index) => {
        const slot = effectivePositions[player.id] ?? { left: 50, top: 50 };
        const fit = playerFitAtPosition(player, formation, slot, index);
        const tacticalRole = roleLabels[closestSlot(slots, slot)] ?? player.position;
        return (
          <div
            key={player.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: fieldCoordinate(slot.left), top: fieldCoordinate(slot.top) }}
          >
            {tactical ? <TacticPlayer player={player} role={tacticalRole} selected={selectedPlayer === player.id} fitLabel={fit.label} effectiveOverall={Math.max(1, player.overall - fit.penalty)} onClick={() => { if (onPlacePlayer && selectedPlayer !== null && selectedPlayer !== player.id) onPlacePlayer(selectedPlayer, index); else onSelect(player.id); }} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/player-id", String(player.id)); }} /> : <Shirt club={club} player={player} selected={selectedPlayer === player.id} onClick={() => onSelect(player.id)} effectiveOverall={Math.max(1, player.overall - fit.penalty)} fitLabel={fit.label} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/player-id", String(player.id)); }} />}
          </div>
        );
      })}
      {!onPlacePlayer && <label className="absolute bottom-0 right-1 bg-[#236613]/85 px-1 text-[10px] font-bold text-white">
        <input type="checkbox" checked={Object.keys(manualPositions).length === 0} onChange={() => onResetPositions?.()} className="mr-1 align-middle" />escalação padrão
      </label>}
    </div>
  );
}

function TacticPlayer({ player, role, selected, effectiveOverall, fitLabel, onClick, onDragStart }: { player: Player; role: string; selected: boolean; effectiveOverall: number; fitLabel: "Natural" | "Secundária" | "Improvisado"; onClick: () => void; onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void }) {
  const fitTone = fitLabel === "Natural" ? "border-[#19d66d]" : fitLabel === "Secundária" ? "border-[#f1bf31]" : "border-[#e65e50]";
  const energyTone = player.energy >= 80 ? "bg-[#17d66d]" : player.energy >= 55 ? "bg-[#f1bd31]" : "bg-[#e65e50]";
  return <button type="button" draggable onDragStart={onDragStart} onClick={onClick} className={`relative z-[1] flex w-[112px] flex-col items-center cursor-grab transition-all duration-200 active:cursor-grabbing ${selected ? "scale-110 rounded ring-2 ring-[#e6c137]" : "hover:scale-105"}`}>
    <span className="relative grid h-16 w-16 place-items-end overflow-visible"><Image src={player.photoDataUrl ?? "/game-assets/player-silhouette.png"} alt={`Foto de ${player.name}`} width={64} height={64} unoptimized className="h-full w-full object-contain object-bottom" /><b className={`absolute -right-4 -top-1 grid h-8 w-8 place-items-center rounded-full border-2 ${fitTone} bg-[#071009] text-[12px] text-white`}>{effectiveOverall}</b></span>
    <span className="mt-0.5 rounded bg-[#101610] px-1 text-[7px] font-black text-[#ffc73d]">{role}</span>
    <span className="-mt-px w-full truncate border-y border-[#0a0d0a] bg-black/95 px-1 py-0.5 text-center text-[10px] font-black uppercase text-white">{player.name}</span>
    <span className="h-1 w-[88px] overflow-hidden rounded-b bg-black/80"><i style={{ width: `${player.energy}%` }} className={`block h-full ${energyTone}`} /></span>
    {fitLabel !== "Natural" && <em className={`mt-0.5 rounded px-1 text-[7px] not-italic font-black ${fitLabel === "Secundária" ? "bg-[#e5a332] text-black" : "bg-[#df584c] text-white"}`}>{fitLabel === "Secundária" ? "SEC" : "FORA"}</em>}
  </button>;
}

const tacticalRoleLabels: Record<string, string[]> = {
  "4-3-3": ["LW", "ST", "RW", "CM", "CM", "CDM", "LB", "CB", "CB", "RB", "GK"],
  "4-4-2": ["ST", "ST", "LM", "CM", "CM", "RM", "LB", "CB", "CB", "RB", "GK"],
  "3-5-2": ["ST", "ST", "LM", "CM", "CDM", "CM", "RM", "CB", "CB", "CB", "GK"],
  "5-3-2": ["ST", "ST", "CM", "CDM", "CM", "LB", "CB", "CB", "CB", "RB", "GK"],
};

function closestSlot(slots: Array<{ left: number; top: number }>, point: { left: number; top: number }) { return slots.reduce((best, slot, index) => Math.hypot(slot.left - point.left, slot.top - point.top) < Math.hypot(slots[best].left - point.left, slots[best].top - point.top) ? index : best, 0); }
function fieldCoordinate(value: number) { return `calc(${value}% + ${30 - value * .6}px)`; }
