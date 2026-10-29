import type { Player } from "@/lib/game/mock-data";
import Image from "next/image";
import { clubKitAsset } from "@/lib/game/assets";

export function Shirt({
  player,
  selected,
  onClick,
  compact,
  draggable,
  onDragStart,
  effectiveOverall,
  fitLabel,
  club,
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
  const kitAsset = club ? clubKitAsset(club) : null;
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
      {kitAsset ? <span className={["relative block drop-shadow-[0_1px_1px_#111]", compact ? "h-11 w-10" : "h-12 w-11"].join(" ")}>
        <Image src={kitAsset} alt={`Camisa do ${club}`} width={55} height={55} unoptimized className="h-full w-full object-contain" />
        <b className="absolute inset-0 grid place-items-center pt-1 text-[8px] text-white drop-shadow-[0_1px_2px_#000]">{player.shirtNumber ?? player.id}</b>
      </span> : <i
        className={[
          "flex items-center justify-center not-italic font-black drop-shadow-[0_1px_1px_#111]",
          compact ? "h-11 w-10 text-[9px]" : "h-12 w-11 text-[10px]",
        ].join(" ")}
        style={{
          background:
            "linear-gradient(90deg, var(--team-primary) 0 42%, var(--team-secondary) 42% 58%, var(--team-primary) 58%)",
          color: "var(--team-text)",
          clipPath: "polygon(25% 0,38% 8%,62% 8%,75% 0,100% 20%,84% 38%,76% 31%,76% 100%,24% 100%,24% 31%,16% 38%,0 20%)",
          outline: selected ? "2px solid var(--accent)" : "none",
        }}
      >
        {player.shirtNumber ?? player.id}
      </i>}
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
