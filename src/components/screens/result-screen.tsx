"use client";

import type { Player, RoundFixture } from "@/lib/game/mock-data";
import { isHighlight, type MatchEvent } from "@/lib/game/live-match";
import { ClassicIcon } from "@/components/ui/classic-icon";

export function ResultScreen({
  round,
  fixtures,
  club,
  opponent,
  homeScore,
  awayScore,
  startersData,
  events,
  possession,
  shots,
  onGoal,
  tackles,
  passErrors,
  onContinue,
}: {
  round: number;
  fixtures: RoundFixture[];
  club: string;
  opponent: string;
  homeScore: number;
  awayScore: number;
  startersData: Player[];
  events: MatchEvent[];
  possession: number;
  shots: number;
  onGoal: string;
  tackles: number;
  passErrors: number;
  onContinue: () => void;
}) {


  const highlights = events.filter(isHighlight);
  return (
    <div className="h-dvh overflow-hidden bg-[#06170a] bg-[linear-gradient(rgba(3,23,9,.86),rgba(3,23,9,.92)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover p-3 font-[Arial] text-white">
      <section className="mx-auto grid h-full max-w-[1200px] grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[240px_1fr]">
        <aside className="min-h-0 overflow-auto border border-black/40 bg-[#111]">
          <h2 className="bg-[#1a1a1a] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white/70">
            {round}ª rodada
          </h2>
          <div className="divide-y divide-white/10 text-xs">
            {fixtures.map((fixture) => (
              <div
                key={`${fixture.home}-${fixture.away}`}
                className={[
                  "px-3 py-2",
                  fixture.live ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "",
                ].join(" ")}
              >
                <p className="flex justify-between">
                  <span className="truncate">{fixture.home}</span>
                  <b>{fixture.homeScore}</b>
                </p>
                <p className="flex justify-between">
                  <span className="truncate">{fixture.away}</span>
                  <b>{fixture.awayScore}</b>
                </p>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-h-0 overflow-auto border border-[#477d51] bg-[#0b2411]">
          <h1 className="px-4 pt-4 text-center text-lg font-black">
            RESULTADO DA RODADA
          </h1>
          <div className="mx-4 mt-4 grid grid-cols-3 items-center rounded border border-[#e7c84d] bg-[#174c27] p-6 text-center">
            <b className="text-lg">{club}</b>
            <strong className="text-5xl font-black">
              {homeScore} × {awayScore}
            </strong>
            <b className="text-lg">{opponent}</b>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-3">
            <Panel title={club}>
              {startersData.map((player) => (
                <p key={player.id} className="flex justify-between text-[12px]">
                  <span className="truncate">
                    {player.position} · {player.name}
                  </span>
                  <span className="font-bold">
                    {(6 + player.overall / 30).toFixed(1)}
                  </span>
                </p>
              ))}
            </Panel>

            <Panel title="Melhores momentos">
              {highlights.length === 0 && <p className="text-white/60">Sem eventos na partida.</p>}
              <div className="max-h-96 space-y-1.5 overflow-auto">
                {highlights.map((event, index) => <p key={index} className="flex items-start gap-1.5"><span>{event.card ? "🟨" : event.scene?.action === "goal" ? "⚽" : event.scene?.action === "shot" ? "◎" : event.scene?.action === "foul" ? "✋" : event.scene?.action === "discussion" ? "!" : "↗"}</span>{event.minute}&apos; · {event.text}</p>)}
              </div>
            </Panel>

            <Panel title="Estatísticas">
              <StatBar label="posse de bola" value={possession} max={100} />
              <StatBar label="finalizações" value={shots} max={20} />
              <p className="text-[12px]">no gol/fora: {onGoal}</p>
              <StatBar label="desarmes" value={tackles} max={20} />
              <StatBar label="erros de passe" value={passErrors} max={20} />
            </Panel>
          </div>

          <div className="flex justify-end px-4 pb-4">
            <button
              onClick={onContinue}
              className="rounded border border-[#e7c84d] bg-[#e7c84d] px-6 py-3 font-black text-[#14391d] transition hover:bg-[#f1d457]"
            >
              <ClassicIcon name="accept_button" className="mr-1.5 align-middle" />Continuar &gt;&gt;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#3e7448] bg-[#12391b] p-3 text-sm">
      <h2 className="border-b border-[#e7c84d] pb-2 font-black text-[#f1d457]">
        {title}
      </h2>
      <div className="mt-3 space-y-1.5">{children}</div>
    </div>
  );
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="text-[12px]">
      <p className="mb-0.5 flex justify-between">
        <span>{label}</span>
        <b>{value}</b>
      </p>
      <div className="h-1.5 bg-white/10">
        <div
          className="h-full bg-[var(--accent)]"
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}
