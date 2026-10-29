import { useId } from "react";
import type { Player } from "@/lib/game/mock-data";
import { KIT_TEMPLATE } from "@/lib/kits/template";

/** Photographic fabric, never a player portrait. All numbered jerseys share the exact mold. */
export function PlayerJersey({ player }: { player: Player }) {
  const id = useId();
  const color =
    player.position === "G" ? "#c7a451" : "var(--team-primary, #287354)";
  return (
    <svg
      viewBox="0 0 870 1000"
      width="60"
      height="58"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id={id}
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodColor={color} result="dye" />
          <feComposite
            in="dye"
            in2="SourceGraphic"
            operator="in"
            result="color"
          />
          <feBlend
            in="SourceGraphic"
            in2="color"
            mode="multiply"
            result="tinted"
          />
          <feComposite
            in="tinted"
            in2="SourceGraphic"
            operator="arithmetic"
            k2="0.9"
            k3="0.1"
          />
          <feComponentTransfer result="lit">
            <feFuncA type="table" tableValues="1 1" />
          </feComponentTransfer>
          <feComposite in="lit" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <image
        href={KIT_TEMPLATE.image}
        width="870"
        height="1000"
        filter={`url(#${id})`}
      />
      <text
        x="435"
        y="560"
        textAnchor="middle"
        fill={player.position === "G" ? "#17231c" : "var(--team-text, white)"}
        fontSize="235"
        fontFamily="Arial,sans-serif"
        fontWeight="700"
        style={{ paintOrder: "stroke", stroke: "#00000030", strokeWidth: 5 }}
      >
        {player.shirtNumber ?? player.id}
      </text>
    </svg>
  );
}
