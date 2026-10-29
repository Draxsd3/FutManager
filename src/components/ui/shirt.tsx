import type { Player } from "@/lib/game/mock-data";
import { PlayerJersey } from "./player-jersey";

export function Shirt({
  player,
  selected,
  onClick,
  compact,
  draggable,
  onDragStart,
  effectiveOverall,
  fitLabel,
}: {
  player: Player;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
  effectiveOverall?: number;
  fitLabel?: "Natural" | "Secundária" | "Improvisado";
  club?: string;
}) {
  return (
    <button
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      type="button"
      className={[
        "inline-flex flex-col items-center text-center transition",
        draggable ? "cursor-grab active:cursor-grabbing" : "",
        "w-[76px]",
        selected ? "scale-105 drop-shadow-[0_0_6px_var(--accent)]" : "",
      ].join(" ")}
    >
      <span className={compact ? "h-11 w-10 [&>svg]:h-full [&>svg]:w-full" : "h-12 w-11 [&>svg]:h-full [&>svg]:w-full"}><PlayerJersey player={player}/></span>
      <span
        className={[
          "mt-1 max-w-full truncate font-bold text-white drop-shadow",
          compact ? "text-[10px]" : "text-[10px]",
        ].join(" ")}
      >
        {player.name}
      </span>
      {!compact && (
        <>
          <small className="text-[9px] font-bold text-white drop-shadow-[0_1px_1px_#000]">{player.position} · F:{effectiveOverall ?? player.overall} E:{player.energy}</small>
          {fitLabel && fitLabel !== "Natural" && <em className={`mt-0.5 px-1 text-[8px] not-italic ${fitLabel === "Secundária" ? "bg-[#d9a913] text-black" : "bg-[#a91e1e] text-white"}`}>{fitLabel}{fitLabel === "Secundária" ? " -4" : " -10"}</em>}
        </>
      )}
    </button>
  );
}
