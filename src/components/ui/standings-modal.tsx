"use client";

import { useState } from "react";
import type { TableRow, TopScorer, TopRating } from "@/lib/game/mock-data";
import { ClassicIcon, type ClassicIconName } from "./classic-icon";

const scopeTabs = ["nacional", "internacional", "seleções", "estadual", "regional"] as const;

export function StandingsModal({
  club,
  competition,
  table,
  topScorers,
  topRatings,
  onClose,
}: {
  club: string;
  competition: string;
  table: TableRow[];
  topScorers: TopScorer[];
  topRatings: TopRating[];
  onClose: () => void;
}) {
  const [scope, setScope] = useState<(typeof scopeTabs)[number]>("estadual");
  const [statsView, setStatsView] = useState<"estatisticas" | "rodadas">("estatisticas");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-[1000px] border border-black bg-[#06405b] text-white shadow-2xl">
        <div className="flex items-center gap-1 border-b border-black/40 bg-[#062f42] px-3 py-2 text-xs font-bold">
          {scopeTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setScope(tab)}
              className={[
                "rounded px-3 py-1.5 uppercase tracking-wide transition",
                scope === tab
                  ? "bg-white text-[#062332]"
                  : "text-white/70 hover:bg-white/10",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
          <span className="ml-auto pr-2 text-sm font-black">2026</span>
          <button
            onClick={onClose}
            className="rounded bg-white px-3 py-1.5 font-black text-[#062332]"
          >
            <ClassicIcon name="cancel" />
          </button>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="mb-3 flex flex-wrap gap-2 text-xs font-bold text-black">
              <select className="border bg-white px-2 py-1" defaultValue={competition}>
                <option>{competition}</option>
              </select>
              <select className="border bg-white px-2 py-1" defaultValue="Primeira Fase">
                <option>Primeira Fase</option>
              </select>
            </div>

            <table className="w-full border-collapse bg-[#e6e6e6] text-left text-[12px] text-black">
              <thead className="bg-[#09283a] text-white">
                <tr>
                  <th className="p-1.5 px-2">#</th>
                  <th className="px-2 text-left">Clube</th>
                  <th className="px-2">PG</th>
                  <th className="px-2">J</th>
                  <th className="px-2">V</th>
                  <th className="px-2">E</th>
                  <th className="px-2">D</th>
                  <th className="px-2">GP</th>
                  <th className="px-2">GC</th>
                  <th className="px-2">SG</th>
                </tr>
              </thead>
              <tbody>
                {table.map((row, index) => (
                  <tr
                    key={row.club}
                    className={
                      row.club === club
                        ? "bg-[#ebd42f] font-bold"
                        : index % 2 === 0
                          ? "bg-white/70"
                          : ""
                    }
                  >
                    <td className="p-1.5 px-2">{index + 1}</td>
                    <td className="px-2">{row.club}</td>
                    <td className="px-2 text-center">{row.points}</td>
                    <td className="px-2 text-center">{row.played}</td>
                    <td className="px-2 text-center">{row.wins}</td>
                    <td className="px-2 text-center">{row.draws}</td>
                    <td className="px-2 text-center">{row.losses}</td>
                    <td className="px-2 text-center">{row.goalsFor}</td>
                    <td className="px-2 text-center">{row.goalsAgainst}</td>
                    <td className="px-2 text-center">
                      {row.goalsFor - row.goalsAgainst}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <Panel title="Artilheiros">
              {topScorers.map((scorer) => (
                <Row key={scorer.name} icon="sport_soccer" left={`${scorer.name} (${scorer.club})`} right={`${scorer.goals} · ${scorer.played}`} />
              ))}
            </Panel>
            <Panel title="Melhores notas médias">
              {topRatings.map((rating) => (
                <Row
                  key={rating.name}
                  left={`${rating.role} · ${rating.name} (${rating.club})`}
                  right={`${rating.rating.toFixed(1)} · ${rating.played}`}
                />
              ))}
            </Panel>
            <div className="bg-[#083d58] p-3 text-sm">
              <div className="mb-2 flex gap-2 text-xs font-bold">
                <button
                  onClick={() => setStatsView("estatisticas")}
                  className={statsView === "estatisticas" ? "text-[var(--accent)]" : "text-white/60"}
                >
                  Estatísticas
                </button>
                <button
                  onClick={() => setStatsView("rodadas")}
                  className={statsView === "rodadas" ? "text-[var(--accent)]" : "text-white/60"}
                >
                  Rodadas
                </button>
              </div>
              {statsView === "estatisticas" ? (
                <div className="space-y-1.5 text-[12px]">
                  <p>Média de gols: 3,0 (18 G/6 J)</p>
                  <p>Maior goleada: (ainda não há goleadas)</p>
                  <p>Último campeão: (ainda não definido)</p>
                  <p>Maior vencedor: (ainda não definido)</p>
                </div>
              ) : (
                <p className="text-[12px] opacity-80">
                  Selecione uma rodada na tabela de jogos para ver os resultados.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#083d58] p-3 text-sm">
      <h2 className="border-b border-[var(--accent)] pb-1.5 font-black text-[var(--accent)]">
        {title}
      </h2>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ left, right, icon }: { left: string; right: string; icon?: ClassicIconName }) {
  return (
    <p className="flex justify-between gap-2 text-[12px]">
      <span className="flex min-w-0 items-center gap-1.5 truncate">{icon && <ClassicIcon name={icon} />}{left}</span>
      <span className="shrink-0 font-bold">{right}</span>
    </p>
  );
}
