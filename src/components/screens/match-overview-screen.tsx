"use client";

import type { RoundFixture } from "@/lib/game/mock-data";
import type { MatchEvent } from "@/components/screens/match-detail-screen";
import { ClassicIcon } from "@/components/ui/classic-icon";
import { Crest } from "@/components/ui/club-sidebar";

export function MatchOverviewScreen({
  competition,
  round,
  minute,
  half,
  club,
  opponent,
  homeScore,
  awayScore,
  possession,
  shots,
  onGoal,
  tackles,
  passErrors,
  fixtures,
  events,
  running,
  speed,
  halftimeWaiting,
  onToggleRunning,
  onSpeedChange,
  onOpenDetail,
}: {
  competition: string;
  round: number;
  minute: number;
  half: "1º tempo" | "2º tempo" | "fim";
  club: string;
  opponent: string;
  homeScore: number;
  awayScore: number;
  possession: number;
  shots: number;
  onGoal: string;
  tackles: number;
  passErrors: number;
  fixtures: RoundFixture[];
  events: MatchEvent[];
  running: boolean;
  speed: 1 | 2 | 4;
  halftimeWaiting: boolean;
  onToggleRunning: () => void;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
  onOpenDetail: () => void;
}) {
  const progress = Math.min(100, Math.round((minute / 90) * 100));
  return (
    <div className="min-h-screen bg-[#06170a] bg-cover bg-center p-3 font-[Arial] text-white" style={{ backgroundImage: "linear-gradient(rgba(3,23,9,.72),rgba(3,23,9,.78)),url('/game-assets/backgrounds/stadium.jpg')" }}>
      <section className="mx-auto max-w-[1000px] border border-[#477d51] bg-[#0b2411] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#e7c84d] bg-[#174c27] px-4 py-3">
          <b className="text-[#f1d457]">{competition}</b>
          <div className="h-1.5 w-40 overflow-hidden rounded bg-white/20">
            <div
              className="h-full bg-[var(--accent)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <b className="text-sm">
            {minute}&apos; - {halftimeWaiting ? "intervalo" : half}
          </b>
        </header>

        <button
          onClick={onOpenDetail}
          className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-5 text-center transition hover:bg-white/5"
        >
          <div className="flex items-center justify-end gap-3">
            <span className="text-lg font-bold">{club}</span>
            <MiniCrest club={club} />
          </div>
          <strong className="text-4xl font-black">
            {homeScore} <span className="text-white/50">x</span> {awayScore}
          </strong>
          <div className="flex items-center gap-3">
            <MiniCrest club={opponent} />
            <span className="text-lg font-bold">{opponent}</span>
          </div>
        </button>

        <div className="grid grid-cols-4 gap-2 border-y border-white/10 bg-white/5 px-6 py-3 text-center text-xs">
          <Stat label="posse de bola" value={`${possession}%`} />
          <Stat label="finalizações" value={shots} />
          <Stat label="no gol/fora" value={onGoal} />
          <Stat label="desarmes" value={tackles} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#183b20] px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={["h-2 w-2 rounded-full", running ? "animate-pulse bg-[#6cff7a]" : "bg-[#f2d64b]"].join(" ")} />
            <b>{running ? "PARTIDA EM ANDAMENTO" : halftimeWaiting ? "INTERVALO" : minute >= 90 ? "ENCERRADA" : "PARTIDA PAUSADA"}</b>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 4].map((value) => (
              <button
                key={value}
                onClick={() => onSpeedChange(value as 1 | 2 | 4)}
                className={[
                  "border px-2 py-1 font-bold",
                  speed === value ? "border-[#e7c84d] bg-[#e7c84d] text-[#14391d]" : "border-white/30 bg-black/30",
                ].join(" ")}
              >
                {value}x
              </button>
            ))}
            {minute < 90 && (
              <button onClick={onToggleRunning} className="ml-2 rounded border border-[#e7c84d] bg-[#e7c84d] px-3 py-1 font-bold text-[#14391d]">
                {running ? "Pausar" : halftimeWaiting ? "Iniciar 2º tempo" : "Continuar"}
              </button>
            )}
            <button onClick={onOpenDetail} className="ml-1 border border-[#d1bf59] bg-[#e8e8e8] px-3 py-1 font-bold text-black">
              Escalação e táticas
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/60">
            {round}ª rodada
          </h2>
          <div className="divide-y divide-white/10">
            {fixtures.map((fixture) => (
              <div
                key={`${fixture.home}-${fixture.away}`}
                className={[
                  "flex items-center gap-3 py-2 text-sm",
                  fixture.live ? "text-[var(--accent)]" : "text-white/90",
                ].join(" ")}
              >
                <span className="w-40 shrink-0 truncate text-[11px] text-white/50">
                  {fixture.stadium} | {fixture.attendance.toLocaleString("pt-BR")}
                </span>
                <span className="flex-1 text-right font-semibold">{fixture.home}</span>
                <span className="w-14 shrink-0 rounded bg-black/40 px-2 py-0.5 text-center font-black">
                  {fixture.homeScore} - {fixture.awayScore}
                </span>
                <span className="flex-1 font-semibold">{fixture.away}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-4 mb-3 border border-white/15 bg-[#071c0d]">
          <h3 className="bg-black/40 px-3 py-1.5 text-[11px] font-bold uppercase text-[var(--accent)]">Últimos lances</h3>
          <div className="min-h-20 space-y-1 px-3 py-2 text-xs">
            {events.length === 0 ? (
              <p className="text-white/45">A bola está rolando. Acompanhe os acontecimentos da partida.</p>
            ) : (
              events.slice(-5).reverse().map((event, index) => (
                <p key={`${event.minute}-${index}`} className="flex items-center">
                  <b className="mr-2 text-[var(--accent)]">{event.minute}&apos;</b>
                  <ClassicIcon name={event.card === "yellow" ? "bullet_yellow" : event.card === "red" ? "flag_red_dull" : event.text.startsWith("Gol") ? "sport_soccer" : "arrow_refresh"} className="mr-1.5" />{event.text}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="px-4 pb-4 text-right text-[11px] text-white/50">
          {passErrors} erros de passe registrados
        </div>
      </section>
    </div>
  );
}

function MiniCrest({ club }: { club: string }) { return <Crest club={club} size="sm" />; }

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-base font-black text-[var(--accent)]">{value}</p>
      <p className="text-white/60">{label}</p>
    </div>
  );
}
