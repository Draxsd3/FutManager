"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { WindowHeader } from "@/components/ui/window-header";
import { PlayerJersey } from "@/components/ui/player-jersey";
import { buildSquadFromDatabase, type EditorDatabase, type EditorPlayer } from "@/lib/game/editor-data";
import type { CareerSeason } from "@/lib/game/season";
import type { TransferNegotiation } from "@/lib/game/transfers";
import { formatBrl } from "@/lib/game/transfers";

export function MarketPlayerModal({ player, database, season, transfers, initialTab, date, onClose, children }: { player: EditorPlayer; database: EditorDatabase; season?: CareerSeason; transfers: TransferNegotiation[]; initialTab: "resumo" | "mercado"; date?: string; onClose: () => void; children: ReactNode }) {
  const [tab, setTab] = useState<"resumo" | "temporada" | "historico" | "mercado">(initialTab);
  const panel = useRef<HTMLElement>(null), close = useRef<HTMLButtonElement>(null);
  useEffect(() => { const previous = document.activeElement; close.current?.focus(); return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); }; }, []);
  const club = database.clubs.find(c => c.id === player.clubId);
  const jerseyClub = club ?? database.clubs[0];
  const jersey = jerseyClub ? buildSquadFromDatabase({ clubs: [jerseyClub], players: [{ ...player, clubId: jerseyClub.id, loan: undefined }] }, jerseyClub.name, true)?.[0] : undefined;
  const matches = (season?.fixtures ?? []).filter(f => f.status === "played").flatMap(f => (f.playerContributions ?? []).filter(c => c.playerId === player.id && c.minutes > 0).map(c => ({ fixture: f, data: c })));
  const clubs = new Map(database.clubs.map(c => [c.id,c.name]));
  const history = transfers.filter(d => d.playerId === player.id && d.status === "completed");
  const tabs = { resumo: "Resumo", temporada: "Temporada", historico: "Histórico", mercado: "Mercado" } as const;
  return createPortal(<div className="fixed inset-0 z-[100] grid place-items-center bg-[#07110e]/75 p-2 backdrop-blur-sm sm:p-5" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={panel} role="dialog" aria-modal="true" aria-label={`Perfil de ${player.name}`} tabIndex={-1} className="flex max-h-[calc(100dvh-16px)] w-full max-w-[1120px] flex-col overflow-hidden rounded-xl bg-[#f5f6f3] text-[#26392f] shadow-2xl sm:max-h-[calc(100dvh-40px)]" onKeyDown={e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
      if (e.key === "Tab") { const controls = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? [])].filter(el => el.getClientRects().length > 0); const first = controls[0], last = controls.at(-1); if (!first) { e.preventDefault(); panel.current?.focus(); } else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }}>
      <WindowHeader title={player.name} date={date} level={2} onClose={onClose} closeLabel="Fechar" closeRef={close} />
      <nav aria-label="Seções do atleta" className="flex overflow-x-auto border-b border-[#d8e1db] bg-white px-3 sm:px-6">{(Object.keys(tabs) as (keyof typeof tabs)[]).map(key => <button key={key} type="button" aria-current={tab === key ? "page" : undefined} onClick={() => setTab(key)} className={`shrink-0 border-b-2 px-3 py-3 text-xs font-bold ${tab === key ? "border-[#287649] text-[#22653d]" : "border-transparent text-[#697a70]"}`}>{tabs[key]}</button>)}</nav>
      <div className="min-h-0 overflow-y-auto p-4 sm:p-6"><div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-[#dce5de] bg-white p-5"><div className="grid h-28 w-28 place-items-center rounded-2xl bg-[#edf3ee] p-2" role="img" aria-label={`Camisa de ${player.name}`}>{jersey && <PlayerJersey player={jersey} club={club?.name} clubColors={club} />}</div><p className="mt-3 text-xs font-bold text-[#588064]">{player.primaryPosition} · {player.age} anos</p><p className="text-3xl font-black">{player.overall} <span className="text-xs font-medium">GER</span></p><p className="font-bold">{player.name}</p><p className="text-xs">{club?.name ?? "Sem clube"} · Nº {player.shirtNumber}</p></aside>
        <main className="min-w-0 rounded-xl border border-[#dce5de] bg-white p-4 sm:p-6">
          {tab === "resumo" && <><h3 className="text-lg font-bold">Visão geral</h3><p className="mt-2 text-sm">{player.nationalities?.join(" / ") || "Nacionalidade não informada"} · Contrato: {player.contractEndsOn || "não informado"}</p><p className="mt-2 text-sm">Salário mensal: {formatBrl(player.salaryMonthlyBrl)} · Valor de mercado: {formatBrl(player.marketValueBrl)}</p><p className="mt-3 text-xs text-[#718076]">Força, salários e valores em reais são estimativas da simulação.</p></>}
          {tab === "temporada" && <><h3 className="text-lg font-bold">Partidas registradas na carreira</h3><p className="mt-2 text-sm">{matches.length} jogos · {matches.reduce((n,m)=>n+m.data.goals,0)} gols · {matches.reduce((n,m)=>n+m.data.assists,0)} assistências · {matches.reduce((n,m)=>n+m.data.minutes,0)} minutos</p>{matches.length === 0 ? <p className="mt-4 text-sm text-[#718076]">Nenhuma participação registrada nesta temporada.</p> : <div className="mt-4 space-y-2">{matches.map(({fixture,data}) => <div key={fixture.id} className="rounded-lg border border-[#e2eae4] p-3 text-xs"><b>{fixture.home} {fixture.homeScore} × {fixture.awayScore} {fixture.away}</b><p>{fixture.competitionName} · {fixture.scheduledDate ?? "Data não informada"} · {data.minutes} min · {data.goals} gols · {data.assists} assist. · nota {data.rating?.toFixed(1) ?? "—"}</p></div>)}</div>}</>}
          {tab === "historico" && <><h3 className="text-lg font-bold">Histórico de clubes</h3><p className="mt-2 text-xs text-[#718076]">A base atual não contém histórico completo de clubes ou estatísticas reais. Abaixo estão apenas registros desta carreira.</p><p className="mt-4 text-sm">Clube atual: <b>{club?.name ?? "Sem clube"}</b></p>{history.length ? <div className="mt-3 space-y-2">{history.map(d => <p key={d.id} className="rounded-lg border border-[#e2eae4] p-3 text-sm">{d.completedOn ?? "Data não registrada"} · {d.sourceClub || "Sem clube"} → {clubs.get(d.buyerClubId) ?? "Clube não informado"} · {d.kind === "loan" ? "Empréstimo" : "Transferência"}</p>)}</div> : <p className="mt-3 text-sm text-[#718076]">Nenhuma transferência registrada nesta carreira.</p>}</>}
          {tab === "mercado" && children}
        </main>
      </div></div>
    </section>
  </div>, document.body);
}
