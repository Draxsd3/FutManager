import type { Player } from "@/lib/game/mock-data";

/** A neutral vector shirt: no portraits, requests or photo upload. */
export function PlayerJersey({ player }: { player: Player }) {
  return (
    <svg
      viewBox="0 0 80 78"
      width="60"
      height="58"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M24 5 32 9Q40 17 48 9L56 5 77 22 65 38 58 32 58 72 22 72 22 32 15 38 3 22Z"
        fill={
          player.position === "G" ? "#eac76c" : "var(--team-primary, #287354)"
        }
        stroke="#ffffffb3"
        strokeWidth="2"
      />
      <path
        d="M32 9Q40 22 48 9M22 64H58"
        fill="none"
        stroke="#ffffff70"
        strokeWidth="3"
      />
      <text
        x="40"
        y="51"
        textAnchor="middle"
        fill={player.position === "G" ? "#1b281e" : "var(--team-text, white)"}
        fontSize="25"
        fontFamily="Arial,sans-serif"
        fontWeight="800"
      >
        {player.shirtNumber ?? player.id}
      </text>
    </svg>
  );
}
