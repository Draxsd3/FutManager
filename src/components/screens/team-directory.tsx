"use client";

import { useMemo, useState } from "react";
import type { EditorClub, EditorDatabase, EditorPlayer } from "@/lib/game/editor-data";
import type { Player, PositionCode } from "@/lib/game/mock-data";
import { positionLabel } from "@/lib/game/mock-data";
import type { PlayerCareerRecord } from "@/lib/game/career";
import { askingFeeBrl, formatBrl, type TransferNegotiation } from "@/lib/game/transfers";
import { Crest } from "@/components/ui/club-sidebar";

const panel = "rounded-2xl border border-[#dfe8e1] bg-white shadow-[0_12px_35px_rgba(27,61,39,.06)]";
const control = "rounded-xl border border-[#d5e0d8] bg-white px-3 py-2.5 text-sm text-[#263d30] outline-none transition focus:border-[#438458] focus:ring-2 focus:ring-[#438458]/15";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#216b43] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#175735] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#d5e0d8] bg-white px-4 py-2.5 text-sm font-bold text-[#354d3c] transition hover:bg-[#f4f8f5]";
const positionOrder: Record<PositionCode, number> = { G: 0, L: 1, Z: 2, M: 3, A: 4 };

type TeamPlayer = {
  profile: EditorPlayer;
  careerPlayer?: Player;
  careerRecord?: PlayerCareerRecord;
};

export function TeamDirectory({
  database, club, coach, squad, budget, records, negotiations, onOpenPlayer, onTransferOffer, onBack,
}: {
  database: EditorDatabase;
  club: string;
  coach: string;
  squad: Player[];
  budget: number;
  records: Record<number, PlayerCareerRecord>;
  negotiations: TransferNegotiation[];
  onOpenPlayer: (id: number) => void;
  onTransferOffer: (playerId: string, feeBrl: number, wageSharePercent: number) => string;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [division, setDivision] = useState("");
  const [activeClubId, setActiveClubId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerFee, setOfferFee] = useState("");
  const [wageShare, setWageShare] = useState("50");
  const [message, setMessage] = useState("");

  const clubsById = useMemo(() => new Map(database.clubs.map((item) => [item.id, item])), [database.clubs]);
  const visibleClubs = useMemo(() => database.clubs
    .filter((item) => (!country || item.country === country) && (!division || item.division === division)
      && item.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")))
    .sort((a, b) => a.country.localeCompare(b.country) || a.division.localeCompare(b.division) || a.name.localeCompare(b.name)),
  [database.clubs, country, division, query]);
  const activeClub = visibleClubs.find((item) => item.id === activeClubId) ?? visibleClubs[0] ?? null;
  const completedTransfers = useMemo(() => new Map(negotiations
    .filter((item) => item.status === "completed")
    .map((item) => [item.playerId, item])), [negotiations]);
  const teamPlayers: TeamPlayer[] = useMemo(() => {
    if (!activeClub) return [];
    if (activeClub.name === club) {
      return squad.flatMap((careerPlayer) => {
        const source = careerPlayer.sourceId ? database.players.find((item) => item.id === careerPlayer.sourceId) : undefined;
        if (!source) return [];
        const profile: EditorPlayer = {
          ...source,
          clubId: activeClub.id,
          name: careerPlayer.name,
          shirtNumber: careerPlayer.shirtNumber ?? source.shirtNumber,
          primaryPosition: careerPlayer.position,
          secondaryPosition: careerPlayer.secondaryPosition ?? source.secondaryPosition,
          overall: careerPlayer.overall,
          age: careerPlayer.age,
          preferredFoot: careerPlayer.foot,
          energy: careerPlayer.energy,
          salaryMonthlyBrl: careerPlayer.salary * 1000,
          marketValueBrl: Math.round(careerPlayer.marketValue * 1_000_000),
          marketStatus: careerPlayer.marketAvailability ?? "normal",
        };
        return [{ profile, careerPlayer, careerRecord: records[careerPlayer.id] }];
      }).sort((a, b) => positionOrder[a.profile.primaryPosition] - positionOrder[b.profile.primaryPosition] || b.profile.overall - a.profile.overall);
    }
    return database.players
      .filter((player) => player.clubId === activeClub.id && !completedTransfers.has(player.id))
      .map((profile) => ({ profile }))
      .sort((a, b) => positionOrder[a.profile.primaryPosition] - positionOrder[b.profile.primaryPosition] || b.profile.overall - a.profile.overall);
  }, [activeClub, club, completedTransfers, database.players, records, squad]);
  const selected = teamPlayers.find((item) => item.profile.id === selectedPlayerId) ?? teamPlayers[0] ?? null;
  const countryOptions = [...new Set(database.clubs.map((item) => item.country).filter(Boolean))].sort();
  const divisionOptions = [...new Set(database.clubs.filter((item) => !country || item.country === country).map((item) => item.division))].sort();
  const averageOverall = teamPlayers.length ? Math.round(teamPlayers.reduce((sum, item) => sum + item.profile.overall, 0) / teamPlayers.length) : 0;
  const listedPlayers = teamPlayers.filter((item) => item.profile.marketStatus === "sale" || item.profile.marketStatus === "loan").length;
  const currentNegotiation = selected && !selected.careerPlayer
    ? negotiations.find((item) => item.playerId === selected.profile.id && item.status !== "rejected" && item.status !== "completed")
    : undefined;
  const careerSeasons = selected?.careerRecord?.seasons ?? [];
  const careerGames = careerSeasons.reduce((sum, season) => sum + season.games, 0);
  const careerGoals = careerSeasons.reduce((sum, season) => sum + season.goals, 0);
  const careerAssists = careerSeasons.reduce((sum, season) => sum + season.assists, 0);
  const currentSeller = selected ? clubsById.get(selected.profile.clubId) : undefined;
  const asking = selected ? askingFeeBrl(selected.profile.marketStatus === "loan" ? "loan" : "sale", selected.profile.marketValueBrl) : 0;

  function chooseClub(item: EditorClub) {
    setActiveClubId(item.id);
    setSelectedPlayerId("");
    setOfferOpen(false);
    setMessage("");
  }

  function startOffer() {
    if (!selected) return;
    const kind = selected.profile.marketStatus === "loan" ? "loan" : "sale";
    setOfferFee((asking / 1_000_000).toFixed(2));
    setWageShare("50");
    setOfferOpen(true);
    setMessage("");
    if (kind === "loan") setWageShare("50");
  }

  function submitOffer() {
    if (!selected || selected.careerPlayer || !currentSeller) return;
    const feeBrl = Number(offerFee) * 1_000_000;
    const share = selected.profile.marketStatus === "loan" ? Number(wageShare) : 0;
    if (!Number.isFinite(feeBrl) || feeBrl <= 0 || (selected.profile.marketStatus === "loan" && (!Number.isFinite(share) || share < 0 || share > 100))) {
      setMessage("Informe uma taxa válida e confira a participação salarial.");
      return;
    }
    if (!window.confirm(`Enviar proposta de ${formatBrl(feeBrl)}${selected.profile.marketStatus === "loan" ? `, pagando ${share}% do salário por 6 meses` : ""} por ${selected.profile.name}?`)) return;
    setMessage(onTransferOffer(selected.profile.id, feeBrl, share));
    setOfferOpen(false);
  }

  return <main className="h-full min-h-0 overflow-auto bg-[#eef3ef] p-3 text-[#23392b] sm:p-5 lg:p-6">
    <div className="mx-auto max-w-[1450px] space-y-4">
      <header className="relative overflow-hidden rounded-3xl bg-[#173e2c] px-5 py-5 text-white shadow-[0_18px_50px_rgba(23,62,44,.18)] sm:px-7 sm:py-6">
        <div className="absolute -right-10 -top-24 h-64 w-64 rounded-full border-[32px] border-white/[.035]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-[#9fd1aa]">FutManager / universo</p><h1 className="mt-1 text-3xl font-black tracking-tight">Times<span className="text-[#a9d971">.</span></h1><p className="mt-1 max-w-xl text-sm text-[#d0e2d4]">Explore os elencos, acompanhe os atletas disponíveis e inicie negociações com outros clubes.</p></div>
          <div className="relative flex flex-wrap items-center gap-2"><span className="rounded-xl border border-white/20 bg-white/[.08] px-4 py-2.5 text-xs font-semibold">Saldo do clube <b className="ml-1 text-[#c5e89b]">R$ {(budget / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi</b></span><button className="rounded-xl border border-white/25 bg-white/[.06] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/[.13]" onClick={onBack}>← Voltar ao clube</button></div>
        </div>
      </header>

      <section className={`${panel} p-3 sm:p-4`} aria-label="Filtros de clubes">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_220px_220px_auto]">
          <label className="sr-only" htmlFor="team-directory-query">Buscar clube</label>
          <input id="team-directory-query" className={control} placeholder="Buscar clube pelo nome" value={query} onChange={(event) => setQuery(event.target.value)} />
          <label className="sr-only" htmlFor="team-directory-country">País</label>
          <select id="team-directory-country" className={control} value={country} onChange={(event) => { setCountry(event.target.value); setDivision(""); }}><option value="">Todos os países</option>{countryOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <label className="sr-only" htmlFor="team-directory-division">Competição</label>
          <select id="team-directory-division" className={control} value={division} onChange={(event) => setDivision(event.target.value)}><option value="">Todas as competições</option>{divisionOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <div className="flex items-center justify-between rounded-xl bg-[#f3f7f3] px-3 py-2 text-xs sm:col-span-2 lg:col-span-1"><span className="text-[#718477]">Clubes</span><b className="text-sm text-[#246e43]">{visibleClubs.length}</b></div>
        </div>
      </section>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className={`${panel} flex min-h-[250px] flex-col overflow-hidden xl:max-h-[calc(100vh-250px)]`} aria-label="Lista de clubes">
          <div className="flex items-center justify-between border-b border-[#e8eee9] px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#718477]">Clubes cadastrados</p><p className="mt-0.5 text-sm font-extrabold">Universo do jogo</p></div><span className="rounded-lg bg-[#edf5ef] px-2.5 py-1 text-[11px] font-bold text-[#246e43]">{visibleClubs.length}</span></div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {visibleClubs.map((item) => {
              const isActive = activeClub?.id === item.id;
              const rosterCount = item.name === club ? squad.length : database.players.filter((player) => player.clubId === item.id && !completedTransfers.has(player.id)).length;
              return <button key={item.id} aria-pressed={isActive} onClick={() => chooseClub(item)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${isActive ? "border-[#81b48d] bg-[#eef7f0] shadow-sm" : "border-transparent hover:border-[#e3ece4] hover:bg-[#f7faf7]"}`}>
                <Crest club={item.name} size="sm" />
                <span className="min-w-0 flex-1"><b className="block truncate text-[13px]">{item.name}</b><small className="mt-0.5 block truncate text-[10px] text-[#718477]">{item.country} · {item.division}</small></span>
                <span className="text-[10px] font-bold text-[#789080]">{rosterCount}</span>
              </button>;
            })}
            {!visibleClubs.length && <div className="p-4 text-sm text-[#718477]">Nenhum clube corresponde aos filtros.</div>}
          </div>
        </aside>

        {activeClub ? <section className="min-w-0 space-y-4" aria-label={`Elenco do ${activeClub.name}`}>
          <article className={`${panel} relative overflow-hidden`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#27734a] via-[#82bc5e] to-[#d4eab4]" />
            <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
              <div className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-2xl bg-[#f0f6f1] ring-1 ring-[#e1ebe3]"><Crest club={activeClub.name} /></div>
              <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#718477]">{activeClub.country}{activeClub.state ? ` · ${activeClub.state}` : ""} / {activeClub.division}</p><h2 className="mt-1 truncate text-2xl font-black tracking-tight">{activeClub.name}</h2><p className="mt-1 text-xs text-[#718477]">Técnico: <b className="text-[#354b3b]">{activeClub.name === club ? coach : activeClub.coachName}</b><span className="mx-2 text-[#c4d1c6]">•</span>{activeClub.stadiumName}</p></div>
              <span className="rounded-full bg-[#edf6ef] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#2c7148]">{activeClub.name === club ? "Seu clube" : "Clube adversário"}</span>
            </div>
            <div className="grid grid-cols-2 border-t border-[#e8eee9] sm:grid-cols-4">
              <Metric label="Atletas no elenco" value={teamPlayers.length.toString()} />
              <Metric label="Força média" value={teamPlayers.length ? `${averageOverall} GER` : "—"} />
              <Metric label="Disponíveis no mercado" value={listedPlayers.toString()} />
              <Metric label="Folha mensal estimada" value={formatCompactBrl(teamPlayers.reduce((sum, item) => sum + item.profile.salaryMonthlyBrl, 0))} />
            </div>
          </article>

          <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className={`${panel} min-w-0 overflow-hidden`} aria-label="Jogadores do clube">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e8eee9] px-4 py-3.5 sm:px-5">
                <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#718477]">Plantel</p><h3 className="mt-0.5 text-lg font-black">Jogadores</h3></div>
                <p className="text-[11px] text-[#718477]">Selecione um atleta para ver o perfil e as ações disponíveis.</p>
              </div>
              <div className="max-h-[570px] overflow-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-[#f5f8f5] text-[9px] font-bold uppercase tracking-[.1em] text-[#75877a]"><tr><th className="px-3 py-3 text-center">#</th><th className="px-3 py-3">Pos</th><th className="px-3 py-3">Jogador</th><th className="px-3 py-3 text-center">GER</th><th className="px-3 py-3 text-center">Idade</th><th className="px-3 py-3">Salário / mês</th><th className="px-3 py-3">Valor</th><th className="px-3 py-3">Mercado</th></tr></thead>
                  <tbody>
                    {teamPlayers.map(({ profile }) => {
                      const isSelected = selected?.profile.id === profile.id;
                      const listed = profile.marketStatus === "sale" || profile.marketStatus === "loan";
                      return <tr key={profile.id} aria-selected={isSelected} tabIndex={0} onClick={() => { setSelectedPlayerId(profile.id); setOfferOpen(false); setMessage(""); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedPlayerId(profile.id); setOfferOpen(false); setMessage(""); } }} className={`cursor-pointer border-t border-[#edf1ed] transition hover:bg-[#f5faf5] focus:bg-[#f1f8f2] ${isSelected ? "bg-[#edf7ef]" : "bg-white"}`}>
                        <td className="px-3 py-3 text-center font-bold text-[#718477]">{profile.shirtNumber}</td><td className="px-3 py-3"><span className="rounded-md bg-[#f0f4f0] px-2 py-1 font-bold text-[#52675a]">{profile.primaryPosition}</span></td><td className="px-3 py-3"><span className="font-bold text-[#263d30]">{profile.name}</span><span className="ml-2 hidden text-[10px] text-[#809085] md:inline">{profile.preferredFoot === "E" ? "Canhoto" : profile.preferredFoot === "D" ? "Destro" : "Ambidestro"}</span></td><td className="px-3 py-3 text-center"><span className={`inline-grid h-8 min-w-8 place-items-center rounded-lg font-black ${profile.overall >= 80 ? "bg-[#e5f2e6] text-[#277246]" : "bg-[#f0f3f0] text-[#51665a]"}`}>{profile.overall}</span></td><td className="px-3 py-3 text-center text-[#607267]">{profile.age}</td><td className="px-3 py-3 whitespace-nowrap text-[#53685a]">{formatCompactBrl(profile.salaryMonthlyBrl)}/mês</td><td className="px-3 py-3 whitespace-nowrap font-semibold text-[#53685a]">{formatCompactBrl(profile.marketValueBrl)}</td><td className="px-3 py-3">{listed ? <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${profile.marketStatus === "loan" ? "bg-[#e9efff] text-[#354e93]" : "bg-[#e7f4e9] text-[#2d7147]"}`}>{profile.marketStatus === "loan" ? "EMPRÉSTIMO" : "À VENDA"}</span> : <span className="text-[10px] text-[#a1ada4]">Não listado</span>}</td>
                      </tr>;
                    })}
                    {!teamPlayers.length && <tr><td colSpan={8} className="p-8 text-center text-sm text-[#718477]">Este clube ainda não possui jogadores cadastrados.</td></tr>}
                  </tbody>
                </table>
              </div>
              <footer className="flex items-center justify-between gap-3 border-t border-[#e8eee9] bg-[#fafcfa] px-4 py-3 text-[10px] text-[#718477]"><span>{teamPlayers.length} atletas · valores mensais em reais</span><span>Disponibilidade definida no editor</span></footer>
            </section>

            <aside className={`${panel} h-fit overflow-hidden`} aria-label="Perfil do jogador selecionado">
              {selected ? <>
                <div className="bg-[#f4f8f4] px-4 pb-4 pt-5 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-2xl font-black text-[#276b44] shadow-sm ring-1 ring-[#e1ebe3]">{selected.profile.primaryPosition}</div>
                  <h3 className="mt-3 text-lg font-black">{selected.profile.name}</h3><p className="mt-1 text-xs text-[#718477]">{positionLabel[selected.profile.primaryPosition]}{selected.profile.secondaryPosition ? ` · também ${positionLabel[selected.profile.secondaryPosition]}` : ""}</p>
                  <div className="mt-3 flex justify-center gap-2"><span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#52675a]">{selected.profile.age} anos</span><span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#52675a]">Camisa {selected.profile.shirtNumber}</span><span className="rounded-full bg-[#e3f0e5] px-3 py-1 text-[10px] font-extrabold text-[#286d45]">GER {selected.profile.overall}</span></div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-2 gap-2"><Detail label="Salário mensal" value={`${formatCompactBrl(selected.profile.salaryMonthlyBrl)}/mês`} /><Detail label="Valor de mercado" value={formatCompactBrl(selected.profile.marketValueBrl)} /><Detail label="Pé preferido" value={selected.profile.preferredFoot === "E" ? "Esquerdo" : selected.profile.preferredFoot === "D" ? "Direito" : "Ambos"} /><Detail label="Contrato até" value={selected.profile.contractEndsOn} /></div>
                  <div className="rounded-xl border border-[#e7eee8] p-3"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#718477]">Pontos fortes cadastrados</p><p className="mt-1 text-xs font-bold text-[#354b3b]">{selected.profile.qualityPrimary} <span className="font-normal text-[#a4b0a5]">/</span> {selected.profile.qualitySecondary}</p></div>
                  {selected.careerPlayer && <div className="grid grid-cols-3 rounded-xl bg-[#f3f7f3] p-3 text-center"><CareerStat label="Jogos" value={careerGames} /><CareerStat label="Gols" value={careerGoals} /><CareerStat label="Assistências" value={careerAssists} /></div>}
                  {!selected.careerPlayer && activeClub.name !== club && <p className="rounded-xl bg-[#f6f8f6] p-3 text-[10px] leading-relaxed text-[#718477]">Estatísticas de carreira ainda não registradas para este atleta nesta carreira.</p>}

                  {selected.careerPlayer ? <button className={`${secondaryButton} w-full`} onClick={() => onOpenPlayer(selected.careerPlayer!.id)}>Abrir ficha completa</button> : selected.profile.marketStatus === "sale" || selected.profile.marketStatus === "loan" ? <>
                    {currentNegotiation ? <div className="rounded-xl border border-[#edd99c] bg-[#fff9e9] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#826a27]">Negociação em andamento</p><p className="mt-1 text-xs font-bold text-[#4f4527]">{currentNegotiation.message}</p><p className="mt-1 text-[10px] text-[#776b48]">Para responder, use a seção Mercado e revise o custo antes de confirmar.</p></div> : <>
                      <p className="rounded-xl bg-[#f3f7f3] p-3 text-xs text-[#53685a]">{selected.profile.marketStatus === "loan" ? "Clube pede " : "Clube pede "}<b>{formatCompactBrl(asking)}</b>{selected.profile.marketStatus === "loan" ? " de taxa · salário negociável" : " de transferência"}</p>
                      {!offerOpen ? <button className={`${primaryButton} w-full`} onClick={startOffer}>Fazer proposta</button> : <div className="space-y-3 rounded-xl border border-[#dce9de] bg-[#f8fbf8] p-3">
                        <label className="block text-[10px] font-bold text-[#53685a]">{selected.profile.marketStatus === "loan" ? "Taxa de empréstimo (R$ milhões)" : "Oferta de compra (R$ milhões)"}<input aria-label="Valor da proposta" className={`${control} mt-1 w-full`} type="number" min="0.01" step="0.01" value={offerFee} onChange={(event) => setOfferFee(event.target.value)} /></label>
                        {selected.profile.marketStatus === "loan" && <label className="block text-[10px] font-bold text-[#53685a]">Parte do salário paga pelo seu clube (%)<input aria-label="Parte do salário" className={`${control} mt-1 w-full`} type="number" min="0" max="100" step="5" value={wageShare} onChange={(event) => setWageShare(event.target.value)} /></label>}
                        <p className="text-[10px] leading-relaxed text-[#718477]">Uma proposta não conclui a contratação. O clube vendedor pode aceitar, recusar ou fazer uma contraproposta.</p>
                        <div className="grid grid-cols-2 gap-2"><button className={primaryButton} onClick={submitOffer}>Enviar proposta</button><button className={secondaryButton} onClick={() => setOfferOpen(false)}>Cancelar</button></div>
                      </div>}
                    </>}
                  </> : <div className="rounded-xl bg-[#f5f7f5] p-3 text-center text-[10px] text-[#829087]">Este jogador não está listado para transferência.</div>}
                  {message && <p role="status" className="text-xs font-bold text-[#276b44]">{message}</p>}
                </div>
              </> : <div className="p-6 text-sm text-[#718477]">Selecione um jogador para consultar os detalhes.</div>}
            </aside>
          </div>
        </section> : <section className={`${panel} p-8 text-center text-sm text-[#718477]`}>Nenhum clube encontrado. Altere a busca ou os filtros.</section>}
      </div>
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border-t border-[#e8eee9] px-4 py-3 first:border-r sm:border-l sm:first:border-l-0"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#809086]">{label}</p><p className="mt-1 truncate text-sm font-extrabold text-[#344b3a]">{value}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg bg-[#f6f9f6] p-2.5"><p className="text-[9px] font-bold uppercase tracking-wide text-[#819087]">{label}</p><p className="mt-1 truncate text-[11px] font-bold text-[#354b3b]">{value}</p></div>;
}

function CareerStat({ label, value }: { label: string; value: number }) {
  return <div><p className="text-base font-black text-[#276b44]">{value}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-[#718477]">{label}</p></div>;
}

function formatCompactBrl(value: number) {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return formatBrl(value);
}
