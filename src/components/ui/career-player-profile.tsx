"use client";
import { ManagementHeader } from "@/components/ui/management-header";


import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { preparePlayerPhoto } from "@/lib/game/player-photo";
import type { Player } from "@/lib/game/mock-data";
import { PlayerMarket } from "./player-market";
import type { MarketAction, PlayerCareerRecord } from "@/lib/game/career";
import { fifaPosition } from "@/lib/game/fifa-position";

type Tab = "resumo" | "temporada" | "historico" | "mercado";
const tabs: Record<Tab, string> = { resumo: "Resumo", temporada: "Temporada", historico: "Histórico", mercado: "Mercado" };

export function CareerPlayerProfile({ player, club, record, clubs = [], onMarketAction, onPhotoChange, onClose }: { player: Player; club: string; record: PlayerCareerRecord; clubs?: string[]; onMarketAction: (action: MarketAction) => string; onPhotoChange: (photo: string | null) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("resumo");
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoRequest = useRef(0);
  useEffect(() => () => { photoRequest.current += 1; }, []);
  async function choosePhoto(file: File) {
    const request = ++photoRequest.current;
    setPhotoMessage(""); setPhotoLoading(true);
    try {
      const photo = await preparePlayerPhoto(file);
      if (request !== photoRequest.current) return;
      onPhotoChange(photo);
      setPhotoMessage("Foto adicionada à carreira.");
    } catch (error) {
      if (request === photoRequest.current) setPhotoMessage(error instanceof Error ? error.message : "Não foi possível adicionar a foto.");
    } finally {
      if (request === photoRequest.current) setPhotoLoading(false);
    }
  }
  const season = [...record.seasons].reverse().find((item) => item.club === club);
  const matches = [...(record.matches ?? [])].reverse();
  const status = ({ normal: "No elenco", sale: "À venda", loan: "Para empréstimo", retiring: "Aposentadoria" } as const)[record.marketStatus];
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#07110e]/75 p-2 backdrop-blur-sm sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-label={`Perfil de ${player.name}`} className="flex max-h-[calc(100dvh-16px)] w-full max-w-[1120px] flex-col overflow-hidden rounded-xl bg-[#f5f6f3] p-4 text-[#26392f] shadow-2xl sm:max-h-[calc(100dvh-40px)] sm:p-6">
      <ManagementHeader title={player.name} level={2} eyebrow="Modo carreira / perfil do atleta" icon="user_green" description={`${club} · ${fifaPosition(player)}`} actions={<button type="button" onClick={onClose}>Fechar</button>} />
      <nav aria-label="Seções do atleta" className="flex overflow-x-auto border-b border-[#d8e1db] bg-white px-3 sm:px-6">{(Object.keys(tabs) as Tab[]).map((item) => <button type="button" key={item} aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-3 py-3 text-xs font-bold sm:px-4 ${tab === item ? "border-[#287649] text-[#22653d]" : "border-transparent text-[#697a70] hover:text-[#263e30]"}`}>{tabs[item]}</button>)}</nav>
      <div className="min-h-0 overflow-y-auto p-4 sm:p-6"><div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-[#dce5de] bg-white p-5"><div className="flex items-center gap-4 lg:flex-col lg:text-center"><div className="grid h-24 w-24 shrink-0 place-items-end overflow-hidden rounded-full bg-[#edf3ee] lg:h-32 lg:w-32"><Image src={player.photoDataUrl ?? "/game-assets/player-silhouette.png"} alt={`Retrato de ${player.name}`} width={128} height={128} unoptimized className={`h-full w-full ${player.photoDataUrl ? "object-cover" : "object-contain object-bottom"}`} /></div><div><p className="text-xs font-bold uppercase tracking-wider text-[#588064]">{fifaPosition(player)} · {player.age} anos</p><p className="mt-1 text-3xl font-black">{player.overall} <span className="text-xs font-medium text-[#728077]">GER</span></p><p className="mt-1 text-sm font-bold">{player.name}</p><p className="text-xs text-[#728077]">{club}</p></div></div><div className="mt-4 flex flex-wrap justify-center gap-2"><label className="cursor-pointer rounded-lg border border-[#b8cdbd] px-3 py-2 text-xs font-bold text-[#22653d] hover:bg-[#edf5ef] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#287649]">{photoLoading ? "Preparando foto..." : player.photoDataUrl ? "Alterar foto" : "Adicionar foto"}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label={player.photoDataUrl ? "Alterar foto" : "Adicionar foto"} disabled={photoLoading} className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void choosePhoto(file); }}/></label>{player.photoDataUrl && <button type="button" onClick={() => { photoRequest.current += 1; setPhotoLoading(false); onPhotoChange(null); setPhotoMessage("Foto removida."); }} className="rounded-lg border border-[#d5dfd7] px-3 py-2 text-xs font-bold text-[#596d60] hover:bg-[#f4f7f4]">Remover foto</button>}</div><p className="mt-2 text-center text-[10px] text-[#718076]">JPG, PNG ou WebP · até 5 MB</p>{photoMessage && <p role="status" className="mt-2 text-center text-xs text-[#315d3b]">{photoMessage}</p>}<div className="mt-5 border-t border-[#edf0ed] pt-2"><Line label="Pé dominante" value={player.foot === "D" ? "Direito" : "Esquerdo"}/><Line label="Situação" value={status}/><Line label="Energia" value={`${player.energy}%`}/></div></aside>
        <main className="min-w-0 rounded-xl border border-[#dce5de] bg-white p-4 sm:p-6">
          {tab === "resumo" && <><Heading title="Visão geral" subtitle="Condição, produção e vínculo do atleta."/><div className="mt-5 grid grid-cols-3 gap-2"><Metric label="Jogos" value={season?.games ?? 0}/><Metric label="Gols" value={season?.goals ?? 0}/><Metric label="Assistências" value={season?.assists ?? 0}/></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Box title="Condição"><Line label="Energia" value={`${player.energy}%`}/><Line label="Disponibilidade" value={player.energy >= 60 ? "Apto para jogar" : "Recuperação recomendada"}/><Line label="Características" value={player.traits || "—"}/></Box><Box title="Vínculo"><Line label="Contrato até" value={player.acquisitionType === "loan" ? player.loan?.endsOn ?? player.loanExpiresOn ?? "Prazo não informado" : record.contractUntil}/><Line label="Vínculo" value={player.acquisitionType === "loan" ? `Empréstimo até ${player.loan?.endsOn ?? player.loanExpiresOn ?? "prazo não informado"}` : player.acquisitionType === "permanent" ? "Contratação definitiva" : "Contrato do elenco"}/>{player.loan && <><Line label="Proprietário" value={player.loan.owner.name}/><Line label="Clube atual" value={player.loan.status === "active" ? player.loan.borrower.name : player.loan.owner.name}/></>}<Line label="Salário mensal" value={`R$ ${record.salary} mil`}/><Line label="Valor de mercado" value={`R$ ${player.marketValue.toFixed(1)} mi`}/></Box></div><p className="mt-4 text-xs leading-relaxed text-[#718076]">Estatísticas detalhadas desta carreira são calculadas somente a partir de partidas concluídas registradas.</p></>}
          {tab === "temporada" && <><Heading title="Partidas do atleta" subtitle="Participações em partidas concluídas nesta carreira."/><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5"><Metric label="Jogos" value={matches.length}/><Metric label="Minutos" value={matches.reduce((n, match) => n + match.minutes, 0)}/><Metric label="Gols" value={matches.reduce((n, match) => n + match.goals, 0)}/><Metric label="Assistências" value={matches.reduce((n, match) => n + (match.assists ?? 0), 0)}/><Metric label="Nota média" value={matches.length ? Number((matches.reduce((n, match) => n + (match.rating ?? 0), 0) / matches.filter((match) => match.rating !== null && match.rating !== undefined).length || 0).toFixed(1)) : 0}/></div><div className="mt-5 space-y-2">{matches.length === 0 ? <Empty>Nenhuma partida registrada ainda. Os jogos concluídos aparecerão aqui.</Empty> : matches.map((match) => <div key={match.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e2eae4] bg-[#f8faf8] px-4 py-3"><div><p className="text-xs text-[#738278]">{match.competition ?? "Competição"} · {match.isHome === false ? "Fora" : "Mandante"}</p><p className="text-xs text-[#738278]">Rodada {match.competitionRound ?? match.round} · {match.minutes} min</p><p className="mt-1 text-sm font-bold">{club} {match.homeScore} × {match.awayScore} {match.opponent}</p></div><span className="rounded-full bg-[#e5f2e9] px-3 py-1 text-xs font-bold text-[#23683b]">{match.goals} gols · {match.assists ?? 0} assist. · {match.shots ?? 0} finalizações · {match.passes ?? 0} passes · nota {match.rating?.toFixed(1) ?? "—"}</span></div>)}</div></>}
          {tab === "historico" && <><Heading title="Histórico por temporada" subtitle="Totais disponíveis no cadastro e na carreira."/><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-xs"><thead className="bg-[#eff4f0] text-[#536b59]"><tr>{["Temporada", "Clube", "Jogos", "Gols", "Assist.", "Nota"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{record.seasons.map((item, index) => <tr key={`${item.season}-${item.club}-${index}`} className="border-b border-[#edf1ed]"><td className="px-3 py-3">{item.season}</td><td className="px-3 py-3 font-bold">{item.club}</td><td className="px-3 py-3">{item.games}</td><td className="px-3 py-3">{item.goals}</td><td className="px-3 py-3">{item.assists}</td><td className="px-3 py-3">{item.average?.toFixed(1) ?? "—"}</td></tr>)}</tbody></table>{record.seasons.length === 0 && <Empty>Sem temporadas registradas.</Empty>}</div></>}
          {tab === "mercado" && <PlayerMarket player={player} record={record} club={club} clubs={clubs} onAction={onMarketAction} />}
        </main>
      </div></div>
    </section>
  </div>;
}
function Heading({ title, subtitle }: { title: string; subtitle: string }) { return <div><h3 className="text-lg font-black">{title}</h3><p className="mt-1 text-xs text-[#718076]">{subtitle}</p></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-[#eff5f0] px-3 py-3"><b className="block text-xl text-[#23683b]">{value}</b><span className="text-[11px] text-[#687b6e]">{label}</span></div>; }
function Box({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-lg border border-[#e1eae3] p-4"><h4 className="mb-1 text-[10px] font-black uppercase tracking-wider text-[#6d8071]">{title}</h4>{children}</section>; }
function Line({ label, value }: { label: string; value: string }) { return <p className="flex justify-between gap-3 border-b border-[#eef2ee] py-2 text-xs last:border-0"><span className="text-[#718076]">{label}</span><b className="text-right">{value}</b></p>; }
function Empty({ children }: { children: React.ReactNode }) { return <p className="rounded-lg border border-dashed border-[#cbdacf] p-5 text-sm text-[#718076]">{children}</p>; }
