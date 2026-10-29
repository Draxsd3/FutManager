"use client";

import type { Player } from "@/lib/game/mock-data";
import { Pitch } from "@/components/ui/pitch";
import type { ManualPosition } from "@/lib/game/career";
import { formations } from "@/lib/game/formations";
import { ClassicIcon } from "@/components/ui/classic-icon";

export type { MatchEvent } from "@/lib/game/live-match";
import type { MatchEvent } from "@/lib/game/live-match";

export function MatchDetailScreen({
  club,
  opponent,
  homeScore,
  awayScore,
  minute,
  formation,
  setFormation,
  startersData,
  bench,
  events,
  possession,
  shots,
  onGoal,
  tackles,
  passErrors,
  style,
  setStyle,
  marking,
  setMarking,
  focus,
  setFocus,
  substitutionsLeft,
  selectedPlayer,
  substitutionOut,
  onSelectPlayer,
  onSubstitute,
  onClose,
  isHalftime,
  manualPositions,
  onMovePlayers,
  onResetPositions,
}: {
  club: string;
  opponent: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  formation: string;
  setFormation: (value: string) => void;
  startersData: Player[];
  bench: Player[];
  events: MatchEvent[];
  possession: number;
  shots: number;
  onGoal: string;
  tackles: number;
  passErrors: number;
  style: string;
  setStyle: (value: string) => void;
  marking: string;
  setMarking: (value: string) => void;
  focus: string;
  setFocus: (value: string) => void;
  substitutionsLeft: number;
  selectedPlayer: number | null;
  substitutionOut: number | null;
  onSelectPlayer: (id: number) => void;
  onSubstitute: (id: number) => void;
  onClose: () => void;
  isHalftime: boolean;
  manualPositions: Record<number, ManualPosition>;
  onMovePlayers: (positions: Record<number, ManualPosition>) => void;
  onResetPositions: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#0d0d0d] bg-cover bg-center p-3 font-[Arial] text-white" style={{ backgroundImage: "linear-gradient(rgba(3,18,24,.42),rgba(3,18,24,.42)),url('/game-assets/backgrounds/stadium.jpg')" }}>
      <section className="mx-auto max-w-[1100px] border border-black/50 bg-[#154a22] shadow-2xl">
        <header className="flex items-center justify-between bg-[#123c1c] px-4 py-2">
          <b className="text-[var(--accent)]">Campeonato</b>
          <b className="text-sm">
            {club} {homeScore} x {awayScore} {opponent}
          </b>
          <b className="text-sm">{isHalftime ? "Intervalo" : `${minute}'`}</b>
        </header>

        <div className="grid gap-3 p-4 lg:grid-cols-[190px_1.4fr_1fr]">
          <aside className="max-h-[620px] space-y-2 overflow-auto border border-white/10 bg-black/20 p-2">
            <p className="px-1 text-[10px] font-bold uppercase text-white/50">
              Reservas
            </p>
            {bench.map((player) => (
              <button
                key={player.id}
                onClick={() => onSelectPlayer(player.id)}
                className={[
                  "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11px] transition hover:bg-white/10",
                  selectedPlayer === player.id ? "bg-white/15" : "",
                ].join(" ")}
              >
                <span className="w-5 font-bold text-white/60">
                  {player.position}
                </span>
                <span className="flex-1 truncate">{player.name}</span>
                <span className="text-white/50">F:{player.overall}</span>
              </button>
            ))}
          </aside>

          <Pitch
            club={club}
            formation={formation}
            starters={startersData}
            selectedPlayer={substitutionOut ?? selectedPlayer}
            onSelect={onSelectPlayer}
            manualPositions={manualPositions}
            onMovePlayers={onMovePlayers}
            onResetPositions={onResetPositions}
          />

          <aside className="space-y-3">
            <div className="flex items-center justify-between bg-[var(--team-primary,#0a3d1f)] px-3 py-2">
              <b>{club}</b>
              <b className="text-lg">{homeScore}</b>
            </div>
            <p className="px-1 text-[11px] text-white/70">{formation}</p>
            <div className="flex items-center justify-between bg-[#5a1414] px-3 py-2">
              <b>{opponent}</b>
              <b className="text-lg">{awayScore}</b>
            </div>

            <div className="border border-[#d1bf59] bg-[#203e14] p-3">
              <h3 className="mb-2 text-xs font-bold text-[var(--accent)]">
                Lances da partida
              </h3>
              <div className="max-h-24 space-y-1 overflow-auto text-[11px]">
                {events.length === 0 && (
                  <p className="text-white/50">Nenhum evento ainda.</p>
                )}
                {events.map((event, index) => (
                  <p key={index} className="flex items-center gap-1.5">
                    <ClassicIcon name={event.card === "yellow" ? "bullet_yellow" : event.card === "red" ? "flag_red_dull" : event.scene?.action === "goal" || event.text.startsWith("Gol") ? "sport_soccer" : "arrow_refresh"} />
                    {event.text} · {event.minute}&apos; - {event.half}º
                  </p>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border border-[#d1bf59] bg-[#203e14] p-3 text-[11px]">
              <p>posse de bola: {possession}%</p>
              <p>finalizações: {shots}</p>
              <p>no gol/fora: {onGoal}</p>
              <p>desarmes: {tackles}</p>
              <p className="col-span-2">erros de passe: {passErrors}</p>
            </div>

            <div className="border-t border-[#d1bf59] pt-3">
              <p className="mb-2 text-xs font-bold">
                Substituições restantes: {substitutionsLeft}
              </p>
              <p className="mb-2 text-[10px] text-white/65">
                A partida está pausada. Arraste os titulares no campo ou escolha quem sai e depois quem entra.
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <label>
                  Formação
                  <select
                    value={formation}
                    onChange={(e) => setFormation(e.target.value)}
                    className="mt-1 block w-full border border-black/30 bg-white p-1 text-black"
                  >
                    {formations.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  Estilo
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="mt-1 block w-full border border-black/30 bg-white p-1 text-black"
                  >
                    <option>Equilibrado</option>
                    <option>Ofensivo</option>
                    <option>Defensivo</option>
                  </select>
                </label>
                <label>
                  Marcação
                  <select
                    value={marking}
                    onChange={(e) => setMarking(e.target.value)}
                    className="mt-1 block w-full border border-black/30 bg-white p-1 text-black"
                  >
                    <option>Leve</option>
                    <option>Normal</option>
                    <option>Pesada</option>
                  </select>
                </label>
                <label>
                  Ataques
                  <select
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    className="mt-1 block w-full border border-black/30 bg-white p-1 text-black"
                  >
                    <option>Pelo meio</option>
                    <option>Pelas laterais</option>
                  </select>
                </label>
              </div>

              {substitutionOut !== null && selectedPlayer !== null &&
                !startersData.some((p) => p.id === selectedPlayer) && (
                  <button
                    onClick={() => onSubstitute(selectedPlayer)}
                    disabled={substitutionsLeft === 0}
                    className="mt-3 w-full bg-[var(--accent)] py-2 text-xs font-black text-black disabled:opacity-40"
                  >
                    Confirmar: {startersData.find((player) => player.id === substitutionOut)?.name} sai
                  </button>
                )}

              <button
                onClick={onClose}
                className="mt-3 w-full bg-white py-2 text-xs font-bold text-black transition hover:brightness-95"
              >
                Voltar ao jogo
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
