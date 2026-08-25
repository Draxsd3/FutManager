"use client";

import type { Player } from "@/lib/game/mock-data";
import { ClassicIcon } from "@/components/ui/classic-icon";
import { ClubSidebar } from "@/components/ui/club-sidebar";

export function HubScreen({
  club,
  coach,
  budget,
  opponent,
  round,
  competition,
  squad,
  starters,
  selectedPlayer,
  onSelectPlayer,
  onOpenPlayer,
  onEscalar,
  onQuickAction,
}: {
  club: string;
  coach: string;
  budget: number;
  opponent: string;
  round: number;
  competition: string;
  squad: Player[];
  starters: number[];
  selectedPlayer: Player | null;
  onSelectPlayer: (id: number) => void;
  onOpenPlayer: (id: number) => void;
  onEscalar: () => void;
  onQuickAction: (action: "roster" | "finances" | "trophies" | "training") => void;
}) {
  return (
    <div className="grid bg-transparent lg:grid-cols-[310px_1fr]">
      <ClubSidebar
        club={club}
        coach={coach}
        budget={budget}
        directorTrust={95}
        fanTrust={85}
        opponent={opponent}
        isHome
        round={round}
        competition={competition}
        selectedPlayer={selectedPlayer}
        ctaLabel="Escalar Time"
        onCta={onEscalar}
        onQuickAction={onQuickAction}
      />
      <section className="min-h-[calc(100vh-90px)] overflow-auto bg-[linear-gradient(rgba(255,255,255,.88),rgba(255,255,255,.92)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-center text-[#28382d]">
        <div className="border-b border-[#d6e2d7] bg-[#f1f6f1] px-3 py-2 text-[11px] text-[#526258]">ELENCO PRINCIPAL · dê dois cliques no jogador para abrir a ficha completa</div>
        <table className="w-full whitespace-nowrap border-collapse text-left text-[12px]">
          <thead className="sticky top-0 bg-[var(--team-accent)] text-[11px] font-bold text-[var(--team-accent-text)]">
            <tr>
              <Th>P</Th>
              <Th align="left">Nome</Th>
              <Th>L</Th>
              <Th>F</Th>
              <Th align="left">Energia</Th>
              <Th>Salário</Th>
              <Th>Passe</Th>
              <Th>G</Th>
              <Th align="left">Car.</Th>
              <Th>Idade</Th>
              <Th>GC</Th>
              <Th>A</Th>
              <Th>NM</Th>
            </tr>
          </thead>
          <tbody>
            {squad.map((player) => {
              const isStarter = starters.includes(player.id);
              return (
                <tr
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  onDoubleClick={() => onOpenPlayer(player.id)}
                  className={[
                    "cursor-default border-b border-[#e3ece4] hover:bg-[#f2f8f2]",
                    selectedPlayer?.id === player.id ? "bg-[#e2f0e4]" : "",
                  ].join(" ")}
                >
                  <td className="px-2 py-[5px] text-center font-bold text-[var(--team-accent)]">
                    {player.position}
                  </td>
                  <td className="px-2 py-[3px]">
                    {player.name}
                    {isStarter && (
                      <span className="ml-2 text-[9px] font-bold text-[#62e88a]">
                        <ClassicIcon name="bullet_green" />
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-[3px] text-center">{player.foot}</td>
                  <td className="px-2 py-[3px] text-center font-bold">
                    {player.overall}
                  </td>
                  <td className="px-2 py-[3px]">
                    <div className="relative h-[15px] w-20 rounded-full bg-[#dce8dd] text-center text-[10px] font-bold leading-[15px]">
                      <div
                        className={[
                          "h-full",
                          player.energy > 60
                            ? "bg-emerald-500"
                            : player.energy > 30
                              ? "bg-amber-500"
                              : "bg-red-500",
                        ].join(" ")}
                        style={{ width: `${player.energy}%` }}
                      />
                      <span className="absolute inset-0">{player.energy}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {player.salary} mil
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {player.passValue}M
                  </td>
                  <td className="px-2 py-1.5 text-center">{player.goals}</td>
                  <td className="px-2 py-1.5">{player.traits}</td>
                  <td className="px-2 py-1.5 text-center">{player.age}</td>
                  <td className="px-2 py-1.5 text-center">{player.ownGoals}</td>
                  <td className="px-2 py-1.5 text-center">{player.assists}</td>
                  <td className="px-2 py-1.5 text-center">
                    {player.avgRating?.toFixed(2) ?? "--"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Th({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
      <th className={`border-b border-[#3f8050] px-2 py-2 font-bold ${align === "left" ? "text-left" : "text-center"}`}>
      {children}
    </th>
  );
}
