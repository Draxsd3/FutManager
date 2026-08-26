"use client";

import { useState } from "react";
import type { Player } from "@/lib/game/mock-data";
import { positionLabel } from "@/lib/game/mock-data";
import type { PlayerCareerRecord, PlayerMarketStatus } from "@/lib/game/career";
import { Crest } from "./club-sidebar";

const statusLabel: Record<PlayerMarketStatus, string> = {
  normal: "Atleta do elenco",
  sale: "Disponível para venda",
  loan: "Disponível para empréstimo",
  retiring: "Aposentadoria anunciada",
};

export function PlayerProfileModal({
  player,
  club,
  record,
  onChange,
  onClose,
}: {
  player: Player;
  club: string;
  record: PlayerCareerRecord;
  onChange: (record: PlayerCareerRecord) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"resume" | "seasons" | "contract">("resume");

  function setMarketStatus(marketStatus: PlayerMarketStatus) {
    onChange({
      ...record,
      marketStatus,
      retirementYear: marketStatus === "retiring" ? 2026 : null,
    });
  }

  const totals = record.seasons.reduce(
    (sum, season) => ({ games: sum.games + season.games, goals: sum.goals + season.goals, assists: sum.assists + season.assists }),
    { games: 0, goals: 0, assists: 0 },
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="w-full max-w-[820px] border border-[#142d3c] bg-[#f3f3f0] font-[Tahoma] text-[12px] text-black shadow-2xl">
        <header className="flex items-center bg-[#062f47] px-3 py-2 text-white">
          <b>Ficha do jogador</b>
          <button onClick={onClose} className="ml-auto h-6 w-8 border border-white/50 bg-[#e7e7e7] font-bold text-black">X</button>
        </header>

        <div className="grid md:grid-cols-[220px_1fr]">
          <aside className="border-r border-[#9aa5aa] bg-[#d9dedf] p-4">
            <div className="flex items-center gap-3">
              <Crest club={club} size="sm" />
              <div>
                <h2 className="text-[17px] font-bold">{player.name}</h2>
                <p>{positionLabel[player.position]} · lado {player.foot}</p>
              </div>
            </div>
            <div className="mt-4 border border-[#879399] bg-white">
              <Info label="Clube" value={club} />
              <Info label="Força" value={String(player.overall)} />
              <Info label="Idade" value={`${player.age} anos`} />
              <Info label="Qualidades" value={player.traits} />
              <Info label="Valor" value={`R$ ${player.marketValue.toFixed(1)} mi`} />
              <Info label="Salário" value={`R$ ${record.salary} mil`} />
            </div>
            <p className="mt-3 border border-[#777] bg-[#fffbd2] p-2 font-bold">{statusLabel[record.marketStatus]}</p>
          </aside>

          <div>
            <nav className="flex border-b border-[#72838a] bg-[#c5cacc]">
              <Tab active={tab === "resume"} onClick={() => setTab("resume")}>Resumo</Tab>
              <Tab active={tab === "seasons"} onClick={() => setTab("seasons")}>Temporadas</Tab>
              <Tab active={tab === "contract"} onClick={() => setTab("contract")}>Contrato e mercado</Tab>
            </nav>
            <div className="min-h-[330px] p-4">
              {tab === "resume" && (
                <>
                  <h3 className="border-b border-[#325e72] pb-1 text-sm font-bold text-[#073c56]">Desempenho na carreira</h3>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Stat label="Jogos" value={totals.games} />
                    <Stat label="Gols" value={totals.goals} />
                    <Stat label="Assistências" value={totals.assists} />
                  </div>
                  <h3 className="mt-5 border-b border-[#325e72] pb-1 text-sm font-bold text-[#073c56]">Situação atual</h3>
                  <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-2">
                    <Info label="Energia" value={`${player.energy}%`} />
                    <Info label="Nota média" value={player.avgRating?.toFixed(2) ?? "--"} />
                    <Info label="Contrato até" value={record.contractUntil} />
                    <Info label="Status" value={statusLabel[record.marketStatus]} />
                  </div>
                </>
              )}
              {tab === "seasons" && (
                <table className="w-full border-collapse bg-white">
                  <thead className="bg-[#0b4865] text-white"><tr><Th>Ano</Th><Th>Clube</Th><Th>J</Th><Th>G</Th><Th>A</Th><Th>NM</Th></tr></thead>
                  <tbody>{record.seasons.map((season) => <tr key={season.season} className="border-b border-[#ccd2d5]"><Td>{season.season}</Td><Td left>{season.club}</Td><Td>{season.games}</Td><Td>{season.goals}</Td><Td>{season.assists}</Td><Td>{season.average?.toFixed(2) ?? "--"}</Td></tr>)}</tbody>
                </table>
              )}
              {tab === "contract" && (
                <>
                  <div className="border border-[#879399] bg-white p-3">
                    <b>Contrato vigente</b>
                    <p className="mt-2">Vencimento: <b>{record.contractUntil}</b></p>
                    <p>Salário: <b>R$ {record.salary} mil/mês</b></p>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Action active={record.marketStatus === "sale"} onClick={() => setMarketStatus(record.marketStatus === "sale" ? "normal" : "sale")}>Colocar à venda</Action>
                    <Action active={record.marketStatus === "loan"} onClick={() => setMarketStatus(record.marketStatus === "loan" ? "normal" : "loan")}>Disponibilizar empréstimo</Action>
                    <Action onClick={() => onChange({ ...record, contractUntil: "31/dez/2029", salary: Math.round(record.salary * 1.15) })}>Renovar contrato</Action>
                    <Action active={record.marketStatus === "retiring"} onClick={() => setMarketStatus(record.marketStatus === "retiring" ? "normal" : "retiring")}>Anunciar aposentadoria</Action>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <footer className="flex justify-end border-t border-[#879399] bg-[#d1d6d8] p-2"><button onClick={onClose} className="min-w-24 border border-[#7b858a] bg-gradient-to-b from-white to-[#cbd3d7] px-4 py-1.5 font-bold">Fechar</button></footer>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <p className="flex justify-between gap-3 border-b border-[#d4d9db] px-2 py-1.5 last:border-0"><span>{label}</span><b className="text-right">{value}</b></p>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="border border-[#879399] bg-white p-3 text-center"><strong className="block text-2xl text-[#073c56]">{value}</strong><span>{label}</span></div>; }
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`border-r border-[#8b969a] px-5 py-2 font-bold ${active ? "bg-[#f3f3f0] text-[#073c56]" : "bg-[#c5cacc]"}`}>{children}</button>; }
function Action({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`border px-3 py-2 text-left font-bold ${active ? "border-[#9b7200] bg-[#fff2a8]" : "border-[#7c898e] bg-gradient-to-b from-white to-[#cfd6d8]"}`}>{active ? "✓ " : ""}{children}</button>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="border border-[#7790a0] px-2 py-1.5 text-center">{children}</th>; }
function Td({ children, left }: { children: React.ReactNode; left?: boolean }) { return <td className={`border-x border-[#d6dbdd] px-2 py-1.5 ${left ? "text-left" : "text-center"}`}>{children}</td>; }
