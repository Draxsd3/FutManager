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
  tactical?: boolean;
}) {
  const slots = formationSlots[formation] ?? formationSlots["4-3-3"];
  const roles = formationSlotRoles[formation] ?? formationSlotRoles["4-3-3"];
  const effectivePositions = Object.fromEntries(starters.slice(0, 11).map((player, index) => [player.id, manualPositions[player.id] ?? slots[index] ?? { left: 50, top: 50 }]));
  return (
    <div
      className={`relative ${tactical ? "min-h-[720px]" : "min-h-[650px]"} w-full overflow-hidden rounded-lg border-2 border-[#cbd8c4] bg-[#102519] bg-[linear-gradient(rgba(5,19,9,.35),rgba(5,19,9,.5)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-center shadow-xl`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
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
      {slots.map((slot, index) => <div key={`${slot.left}-${slot.top}`} className="pointer-events-none absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 bg-black/10" style={{ left: `${slot.left}%`, top: `${slot.top}%` }}>
        <i className="absolute left-1/2 top-1/2 h-8 w-7 -translate-x-1/2 -translate-y-1/2 bg-black/20" style={{ clipPath: "polygon(25% 0,38% 8%,62% 8%,75% 0,100% 20%,84% 38%,76% 31%,76% 100%,24% 100%,24% 31%,16% 38%,0 20%)" }} />
        <b className="absolute bottom-0 right-0 text-[8px] text-white/35">{roles[index]}</b>
      </div>)}
      {starters.slice(0, 11).map((player, index) => {
        const slot = effectivePositions[player.id] ?? { left: 50, top: 50 };
        const fit = playerFitAtPosition(player, formation, slot, index);
        return (
          <div
            key={player.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${slot.left}%`, top: `${slot.top}%` }}
          >
            {tactical ? <TacticPlayer player={player} selected={selectedPlayer === player.id} fitLabel={fit.label} effectiveOverall={Math.max(1, player.overall - fit.penalty)} onClick={() => onSelect(player.id)} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/player-id", String(player.id)); }} /> : <Shirt club={club} player={player} selected={selectedPlayer === player.id} onClick={() => onSelect(player.id)} effectiveOverall={Math.max(1, player.overall - fit.penalty)} fitLabel={fit.label} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/player-id", String(player.id)); }} />}
          </div>
        );
      })}
      <label className="absolute bottom-0 right-1 bg-[#236613]/85 px-1 text-[10px] font-bold text-white">
        <input type="checkbox" checked={Object.keys(manualPositions).length === 0} onChange={() => onResetPositions?.()} className="mr-1 align-middle" />escalação padrão
      </label>
    </div>
  );
}

function TacticPlayer({ player, selected, effectiveOverall, fitLabel, onClick, onDragStart }: { player: Player; selected: boolean; effectiveOverall: number; fitLabel: "Natural" | "Secundária" | "Improvisado"; onClick: () => void; onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void }) {
  return <button type="button" draggable onDragStart={onDragStart} onClick={onClick} className={`relative flex w-[94px] -translate-x-1/2 flex-col items-center cursor-grab active:cursor-grabbing ${selected ? "scale-110" : ""}`}>
    <span className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 border-[#19d36f] bg-[#08130a] shadow-lg">{player.photoDataUrl ? <Image src={player.photoDataUrl} alt={`Foto de ${player.name}`} width={56} height={56} unoptimized className="h-full w-full object-cover" /> : <span className="h-9 w-7 rounded-t-[50%] bg-black" />}<b className="absolute -right-3 -top-1 grid h-7 w-7 place-items-center rounded-full border-2 border-[#dcefdc] bg-[#07160b] text-[11px] text-white">{effectiveOverall}</b></span>
    <span className="mt-1 w-full truncate rounded bg-black/90 px-1 py-0.5 text-center text-[9px] font-black text-white">{player.name}</span>
    <span className="h-1 w-[74px] overflow-hidden rounded bg-black/70"><i style={{ width: `${player.energy}%` }} className="block h-full bg-[#18d870]" /></span>
    {fitLabel !== "Natural" && <em className="mt-0.5 rounded bg-[#e9aa35] px-1 text-[7px] not-italic font-bold text-black">{fitLabel}</em>}
  </button>;
}
