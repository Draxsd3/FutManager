"use client";

import { useId, useState } from "react";
import { clubKitAsset } from "@/lib/game/assets";
import { Player } from "@/lib/game/mock-data";
import { ClubColorIdentity, resolveGoalkeeperKit } from "@/lib/kits/goalkeeper";
import { KIT_TEMPLATE } from "@/lib/kits/template";

export function PlayerJersey({
  player,
  club,
  kit = 1,
  clubColors,
}: {
  player: Player;
  club?: string;
  kit?: 1 | 2 | 3;
  clubColors?: ClubColorIdentity;
}) {
  const id = `jersey-${useId().replace(/:/g, "")}`;
  const [failedAsset, setFailedAsset] = useState<string | null>(null);
  const [failedCrest, setFailedCrest] = useState<string | null>(null);

  if (player.position === "G") {
    const goalkeeperKit = resolveGoalkeeperKit(club, kit, clubColors);
    const crestHref =
      goalkeeperKit.crestAsset && goalkeeperKit.crestAsset !== failedCrest
        ? goalkeeperKit.crestAsset
        : null;
    const { primaryColor, secondaryColor, shortName } = goalkeeperKit.fallbackCrest;

    return (
      <svg
        data-jersey-role="goalkeeper"
        data-gk-color={goalkeeperKit.hex}
        viewBox="0 0 870 1000"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
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
            <feFlood floodColor={goalkeeperKit.hex} result="dye" />
            <feComposite in="dye" in2="SourceGraphic" operator="in" result="color" />
            <feBlend in="SourceGraphic" in2="color" mode="multiply" result="tinted" />
            <feComposite in="tinted" in2="SourceGraphic" operator="arithmetic" k2="0.9" k3="0.1" />
            <feComponentTransfer result="lit">
              <feFuncA type="table" tableValues="1 1" />
            </feComponentTransfer>
            <feComposite in="lit" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
        <image
          data-jersey-fabric="true"
          href={KIT_TEMPLATE.image}
          width="870"
          height="1000"
          preserveAspectRatio="xMidYMid meet"
          filter={`url(#${id})`}
        />
        {crestHref ? (
          <image
            data-jersey-crest="true"
            href={crestHref}
            x="506"
            y="212"
            width="124"
            height="124"
            preserveAspectRatio="xMidYMid meet"
            onError={() => setFailedCrest(crestHref)}
          />
        ) : (
          <g data-jersey-crest="fallback" transform="translate(506 212)">
            <path
              d="M62 8 L110 24 V64 C110 92 90 111 62 120 C34 111 14 92 14 64 V24 Z"
              fill={primaryColor}
              stroke="#f8fafc"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M62 16 L101 29 V63 C101 86 84 102 62 110 Z"
              fill={secondaryColor}
              fillOpacity="0.32"
            />
            <text
              x="62"
              y="72"
              textAnchor="middle"
              fill="#ffffff"
              stroke="rgba(15,23,42,0.72)"
              strokeWidth="3"
              paintOrder="stroke"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize={shortName.length >= 3 ? "28" : "32"}
              fontWeight="800"
              letterSpacing="1"
            >
              {shortName}
            </text>
          </g>
        )}
      </svg>
    );
  }

  const asset = club ? clubKitAsset(club, kit) : null;
  const imported = asset && asset !== failedAsset ? asset : null;
  const color = clubColors?.primaryColor ?? "var(--team-primary, #287354)";

  return (
    <svg
      data-jersey-role="outfield"
      viewBox="0 0 870 1000"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {!imported && (
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
            <feComposite in="dye" in2="SourceGraphic" operator="in" result="color" />
            <feBlend in="SourceGraphic" in2="color" mode="multiply" result="tinted" />
            <feComposite in="tinted" in2="SourceGraphic" operator="arithmetic" k2="0.9" k3="0.1" />
            <feComponentTransfer result="lit">
              <feFuncA type="table" tableValues="1 1" />
            </feComponentTransfer>
            <feComposite in="lit" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      )}
      <image
        href={imported ?? KIT_TEMPLATE.image}
        width="870"
        height="1000"
        preserveAspectRatio="xMidYMid meet"
        filter={imported ? undefined : `url(#${id})`}
        onError={imported ? () => setFailedAsset(asset) : undefined}
      />
    </svg>
  );
}
