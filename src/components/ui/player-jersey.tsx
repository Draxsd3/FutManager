"use client";

import { useId, useState } from "react";
import type { Player } from "@/lib/game/mock-data";
import { clubKitAsset } from "@/lib/game/assets";
import { KIT_TEMPLATE } from "@/lib/kits/template";

/** Use the very same imported artwork as the club/editor; never recolor or crop it. */
export function PlayerJersey({ player, club, kit = 1 }: { player: Player; club?: string; kit?: 1 | 2 | 3 }) {
  const [failedAsset, setFailedAsset] = useState<string | null>(null);
  const asset = club ? clubKitAsset(club, kit) : null;
  const imported = asset && asset !== failedAsset ? asset : null;
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
        href={imported ?? KIT_TEMPLATE.image}
        width="870"
        height="1000"
        preserveAspectRatio="xMidYMid meet"
        filter={imported ? undefined : `url(#${id})`}
        onError={imported ? () => setFailedAsset(imported) : undefined}
      />
    </svg>
  );
}
