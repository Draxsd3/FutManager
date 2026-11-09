"use client";
import { MarketPlayerModal } from "./market-player-modal";
import type { EditorPlayer } from "@/lib/game/editor-data";
import { MarketCost } from "./market-cost";
import { marketCostQuote } from "@/lib/game/market-quote";
import { MarketPlanningPanel } from "./market-planning-panel";
import { isFreeAgent, playerNationalities, searchMarket, type MarketAvailability } from "@/lib/game/market-search";
import Image from "next/image";
import { Crest } from "@/components/ui/club-sidebar";
import marketStyles from "./market-screen.module.css";
import { ManagementHeader } from "@/components/ui/management-header";
import surface from "@/components/ui/management-surface.module.css";

import { ChampionshipHistory } from "@/components/ui/championship-history";
import type { ChampionshipRecord } from "@/lib/game/honours";
import { useMemo, useState } from "react";
import type { EditorDatabase } from "@/lib/game/editor-data";
import type { Player } from "@/lib/game/mock-data";
import type { YouthTeam } from "@/lib/game/youth";
import type { PlayerCareerRecord } from "@/lib/game/career";
import { transferAskingPrice, simulatedReleaseClauseBrl, formatBrl, type TransferNegotiation, type TransferNegotiationAction } from "@/lib/game/transfers";
import { CoachesScreen } from "./coaches-screen";
import type { ManagerMarket } from "@/lib/game/manager-market";
import { TeamDirectory } from "@/components/screens/team-directory";

export type HistoryView = "players" | "awards" | "champions";
export const historyOptions: { id: HistoryView; label: string; description: string }[] = [
  { id: "players", label: "História dos jogadores", description: "Partidas e temporadas registradas" },
  { id: "awards", label: "Bola de Ouro", description: "Premiações individuais" },
  { id: "champions", label: "Times campeões", description: "Histórico de competições" },
];
const select = "rounded-lg border border-[#d5e0d8] bg-white px-3 py-2 text-sm text-[#263d30]";
const box = surface.panel;
const action = "rounded-lg bg-[#246e43] px-4 py-2 text-xs font-bold text-white hover:bg-[#195a34]";
const label = "text-[10px] font-bold uppercase tracking-[.14em] text-[#6b8170]";
function Header({ eyebrow, title, detail, onBack }: { eyebrow: string; title: string; detail: string; onBack: () => void }) { return <ManagementHeader eyebrow={`FutManager / ${eyebrow}`} title={title} description={detail} icon={title === "Mercado" ? "find" : title === "Técnicos" ? "user_suit" : title === "História" ? "clock_history_frame" : "group"} actions={<button onClick={onBack}>← Voltar ao clube</button>} />; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="rounded-xl border border-dashed border-[#ccdcd0] p-6 text-sm text-[#718477]">{children}</div>; }

export function WorldScreens({ competitionSeason, allTransfers, marketState,onMarketMode,managerMarket, gameDate, worldEvents = [], youthTeam, youthLoading = false, onPromoteYouth, embedded = false, championHistory = [], section, database, squad, club, coach, budget, records, negotiations, historyView, onHistoryView, onOpenPlayer, onTransferOffer, onTransferAction, onBack }: { competitionSeason?: import("@/lib/game/season").CareerSeason; allTransfers?: TransferNegotiation[]; marketState?: import("@/lib/game/simulation/market-planning").MarketStrategy; onMarketMode?: (mode: import("@/lib/game/simulation/foundation").DecisionRecord["mode"])=>Promise<string>; managerMarket?: ManagerMarket; gameDate?: string; worldEvents?: { date: string; text: string }[]; youthTeam?: YouthTeam; youthLoading?: boolean; onPromoteYouth?: (id: string) => string | Promise<string>; embedded?: boolean; championHistory?: ChampionshipRecord[]; section: "juniors" | "teams" | "search" | "coaches" | "history"; database: EditorDatabase; squad: Player[]; club: string; coach: string; budget: number; records: Record<number, PlayerCareerRecord>; negotiations: TransferNegotiation[]; historyView: HistoryView; onHistoryView: (view: HistoryView) => void; onOpenPlayer: (id: number) => void; onTransferOffer: (playerId: string, feeBrl: number, wageSharePercent: number, monthlyWageBrl?: number) => string | Promise<string>; onTransferAction: (id: string, action: TransferNegotiationAction) => string | Promise<string>; onBack: () => void }) {
  const [marketTab, setMarketTab] = useState<"players" | "negotiations">("players");
  const [query, setQuery] = useState(""); const [country, setCountry] = useState(""); const [division, setDivision] = useState(""); const [position, setPosition] = useState(""); const [age, setAge] = useState(""); const [maxFee, setMaxFee] = useState(""); const [availability, setAvailability] = useState<MarketAvailability>("all"); const [page, setPage] = useState(0); const [marketPlayerId, setMarketPlayerId] = useState(""); const [offerFee, setOfferFee] = useState(""); const [wageShare, setWageShare] = useState("50"); const [counteringId, setCounteringId] = useState(""); const [counterFee, setCounterFee] = useState(""); const [counterShare, setCounterShare] = useState("50"); const [message, setMessage] = useState("");
  const [monthlyWage,setMonthlyWage]=useState("");
  const [profileTab, setProfileTab] = useState<"resumo" | "mercado">("resumo");
  const [selectedDealId, setSelectedDealId] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittedBaseline, setSubmittedBaseline] = useState<string[] | null>(null);
  const [nationality, setNationality] = useState("");
  const [minOverall, setMinOverall] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const nationalities = [...new Set(database.players.flatMap(playerNationalities))].sort((a,b) => a.localeCompare(b,"pt-BR"));
  const resetSearch = () => { setQuery(""); setCountry(""); setDivision(""); setPosition(""); setAge(""); setMaxFee(""); setNationality(""); setMinOverall(""); setMaxSalary(""); setAvailability("all"); setPage(0); };
  const clubsById = useMemo(() => new Map(database.clubs.map((item) => [item.id, item])), [database.clubs]);
  const countries = [...new Set(database.clubs.map((item) => item.country).filter(Boolean))].sort();
  const divisions = [...new Set(database.clubs.filter((item) => !country || item.country === country).map((item) => item.division))].sort();
  const buyerId = database.clubs.find(item => item.name === club)?.id ?? "";
  const finance = managerMarket?.finance;
  const available = useMemo(() => marketCostQuote(finance, buyerId, "sale", 0, 0, 100)?.available ?? null, [finance, buyerId]);
  const hired = new Set(squad.map((item) => item.sourceId));
  const players = searchMarket(database, club, hired, { query, country, division, position, maxAge: age, maxFee, availability, nationality, minOverall, maxSalary });
  const pages = Math.max(1, Math.ceil(players.length / 12)); const visiblePage = Math.min(page, pages - 1);
  const selectedPlayer = database.players.find(p => p.id === marketPlayerId);
  const selectedDeal = negotiations.find(d => d.id === selectedDealId && d.playerId === marketPlayerId) ?? negotiations.find(d => d.playerId === marketPlayerId && (d.status === "countered" || d.status === "agreed")) ?? (submittedBaseline ? negotiations.find(d => d.playerId === marketPlayerId && !submittedBaseline.includes(d.id)) : undefined);
  function openProfile(p: EditorPlayer, tab: "resumo" | "mercado", dealId = "") {
    setMarketPlayerId(p.id); setProfileTab(tab); setSelectedDealId(dealId); setSubmittedBaseline(null); setMessage(""); setCounteringId("");
    setOfferFee(String(transferAskingPrice(p, database.players, gameDate) / 1e6)); setWageShare("50"); setMonthlyWage(String(p.salaryMonthlyBrl));
  }
  async function runAction(id: string, action: TransferNegotiationAction) {
    if (busy) return; setBusy(true); try { setMessage(await onTransferAction(id, action)); } catch { setMessage("Não foi possível atualizar a proposta."); } finally { setBusy(false); }
  }
  function renderDeal(item: TransferNegotiation) {
          const source = database.players.find((player) => player.id === item.playerId);
          const wageShare = item.agreedWageSharePercent ?? item.counterWageSharePercent ?? item.wageSharePercent;
          const costQuote = source ? marketCostQuote(finance, buyerId, item.kind, item.agreedFeeBrl ?? item.counterFeeBrl ?? item.offerFeeBrl, item.kind === "sale" ? item.agreedMonthlyWageBrl ?? source.salaryMonthlyBrl : source.salaryMonthlyBrl, item.kind === "sale" ? 100 : wageShare, item.id) : null;
          const statusText = item.status === "countered" ? "Contraproposta recebida" : item.status === "agreed" ? item.negotiationPhase === "player" ? "Acordo com o clube · falta negociar com o jogador" : item.freeAgent ? "Condições aceitas pelo atleta" : "Acordo entre clubes" : item.status === "completed" ? "Concluída" : "Recusada";
          return <article key={item.id} className={marketStyles.deal}>
            <div className="mb-3 rounded-lg bg-[#f3f7f3] p-3 text-xs"><p><b>Jogador:</b> {item.assessment ? (item.assessment.accepted ? "Condições avaliadas como aceitas" : "Condições recusadas") + ` — ${item.assessment.reason}` : "Avaliação do jogador não registrada nesta proposta."}</p><p><b>Clube:</b> {item.freeAgent ? "Sem clube vendedor." : item.freeAgent ? "Atleta livre; não há clube vendedor." : item.status === "countered" ? "Não aceitou os termos; enviou contraproposta." : item.status === "agreed" || item.status === "completed" ? (item.releaseClauseBrl && item.offerFeeBrl >= item.releaseClauseBrl ? "Multa atingida; aceite do clube dispensado." : "Acordo registrado.") : item.assessment?.accepted === false ? "Resposta do clube não confirmada: atleta recusou." : "Proposta recusada ou encerrada; motivo detalhado não registrado."}</p><p>Respostas simuladas, não declarações reais.</p></div>
            <div className="flex flex-wrap items-start justify-between gap-2"><div><b>{item.playerName}</b><p className="text-xs text-[#718477]">{item.sourceClub} · {item.kind === "loan" ? "Empréstimo de 6 meses" : "Transferência definitiva"}</p><p className="mt-1 text-xs font-bold text-[#246e43]">{statusText}</p><p className="mt-1 text-xs text-[#536b59]">{item.message}</p></div><p className="text-right text-xs">Oferta: <b>{formatBrl(item.offerFeeBrl)}</b>{item.kind === "loan" && <span className="block">Salário: {item.wageSharePercent}%</span>}</p></div>
            {(item.status === "countered" || item.status === "agreed") && item.negotiationPhase !== "player" && <MarketCost quote={costQuote} kind={item.kind} />}
            {item.negotiationPhase === "player" && item.status === "agreed" && <div className="mt-4 space-y-3 rounded-xl border border-[#dce9de] bg-[#f8fbf8] p-4"><h4 className="font-bold">Etapa 2 · Negociar com o jogador</h4><p className="text-sm">O clube aceitou {formatBrl(item.agreedFeeBrl ?? item.offerFeeBrl)}. O jogador ainda precisa aceitar seu contrato.</p><label className="block text-sm font-bold">Salário mensal oferecido (R$)<input aria-label="Salário para o jogador" className={select + " mt-1 w-full"} type="number" min="1" value={monthlyWage} onChange={e => setMonthlyWage(e.target.value)} /></label><MarketCost quote={source ? marketCostQuote(finance, buyerId, item.kind, item.agreedFeeBrl ?? item.offerFeeBrl, Number(monthlyWage), 100, item.id) : null} kind={item.kind} /><button className={action} disabled={busy} onClick={() => runAction(item.id, {type:"player-offer", monthlyWageBrl:Number(monthlyWage)})}>Enviar proposta ao jogador</button><button className={marketStyles.secondary} disabled={busy} onClick={() => runAction(item.id, {type:"reject"})}>Encerrar negociação</button></div>}
            {item.status === "countered" && <div className="mt-3 rounded-lg bg-[#fff8e5] p-3"><p className="text-xs font-bold">Contraproposta: {formatBrl(item.counterFeeBrl ?? item.askingFeeBrl)}{item.kind === "loan" ? ` · ${item.counterWageSharePercent ?? 50}% do salário` : ""}</p><div className="mt-2 flex flex-wrap gap-2"><button className={action} disabled={busy} onClick={async () => runAction(item.id, { type: "accept-counter" })}>Aceitar contraproposta</button><button className="rounded-lg border border-[#bbd1c0] px-3 py-2 text-xs font-bold" onClick={async () => { setCounteringId(counteringId === item.id ? "" : item.id); setCounterFee((item.offerFeeBrl / 1e6).toFixed(2)); setCounterShare(String(item.wageSharePercent)); }}>Fazer contraproposta</button><button className="rounded-lg border border-[#bbd1c0] px-3 py-2 text-xs font-bold" onClick={async () => runAction(item.id, { type: "reject" })}>Encerrar negociação</button></div>
              {counteringId === item.id && <><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><label className="text-xs font-bold">Nova taxa (R$ mi)<input aria-label={`Nova proposta para ${item.playerName}`} className={select + " mt-1 w-full"} type="number" min="0.01" step="0.01" value={counterFee} onChange={(e) => setCounterFee(e.target.value)}/></label>{item.kind === "loan" ? <label className="text-xs font-bold">Salário (%)<input className={select + " mt-1 w-full"} type="number" min="0" max="100" value={counterShare} onChange={(e) => setCounterShare(e.target.value)}/></label> : <span/>}<button className={action + " self-end"} onClick={async () => { const feeBrl = Number(counterFee) * 1e6; const share = item.kind === "loan" ? Number(counterShare) : 0; if (!Number.isFinite(feeBrl) || feeBrl <= 0) { setMessage("Informe um valor válido."); return; } await runAction(item.id, { type: "counter", feeBrl, wageSharePercent: share }); setCounteringId(""); }}>Enviar contraproposta</button></div><MarketCost quote={source ? marketCostQuote(finance, buyerId, item.kind, Number(counterFee) * 1e6, item.kind === "sale" ? item.agreedMonthlyWageBrl ?? source.salaryMonthlyBrl : source.salaryMonthlyBrl, item.kind === "loan" ? Number(counterShare) : 100, item.id) : null} kind={item.kind} /></>}
            </div>}
            {item.expiresOn && <p className="text-xs">Proposta v{item.revision ?? 1} · válida até {item.expiresOn}{item.assessment ? ` · ${item.assessment.role}` : ""}</p>}
            {item.status === "agreed" && item.negotiationPhase !== "player" && item.negotiationPhase !== "club" && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#eaf5ed] p-3"><p className="text-xs">Valor acordado: <b>{formatBrl(item.agreedFeeBrl ?? item.offerFeeBrl)}</b> · Compromisso estimado (taxa + {item.kind === "loan" ? "salários do empréstimo" : "salário do primeiro ano"}): <b>{costQuote ? formatBrl(costQuote.total) : "indisponível"}</b></p><button className={action} disabled={!costQuote || busy} onClick={async () => { if (costQuote && window.confirm(`Confirmar contratação de ${item.playerName} por custo total estimado de ${formatBrl(costQuote.total)}?`)) await runAction(item.id, { type: "complete" }); }}>Confirmar contratação</button><button className={marketStyles.secondary} onClick={async () => runAction(item.id,{type:"reject"})}>Encerrar acordo</button></div>}
          </article>;
  }
  function renderOffer(p: EditorPlayer) {
    const free = isFreeAgent(p); const kind = !free && p.marketStatus === "loan" ? "loan" : "sale";
    if (p.loan?.status === "active") return <p>Atleta em empréstimo vigente. Não é possível iniciar outra negociação.</p>;
    return                 <div className={marketStyles.offerForm}>
                  {kind==="sale" && free && <label>Salário mensal (R$)<input aria-label="Salário mensal proposto" type="number" min="1" value={monthlyWage} onChange={e=>setMonthlyWage(e.target.value)} /></label>}
                  <label>{free ? "Passe livre — sem taxa" : kind === "loan" ? "Taxa do empréstimo (R$ mi)" : "Oferta de compra (R$ mi)"}<input aria-label="Valor da proposta" type="number" disabled={free} min={free ? "0" : "0.01"} step="0.01" value={offerFee} onChange={(e) => setOfferFee(e.target.value)}/></label>
                  {kind === "loan" ? <label>Parte do salário paga por você (%)<input aria-label="Parte do salário" type="number" min="0" max="100" step="5" value={wageShare} onChange={(e) => setWageShare(e.target.value)}/></label> : <p>{free ? "Sem taxa de transferência. A contratação reserva 12 meses de salário." : "Etapa 1: negocie a taxa com o clube. Depois, negocie o salário com o jogador."}</p>}
                  {!free && kind === "sale" && <p>Prévia salarial estimada pelo salário atual; o valor será negociado com o atleta na próxima etapa.</p>}<MarketCost quote={marketCostQuote(finance, buyerId, kind, Number(offerFee) * 1e6, kind === "sale" && free ? Number(monthlyWage) : p.salaryMonthlyBrl, kind === "loan" ? Number(wageShare) : 100)} kind={kind} />
                  <p>Multa simulada: 2× o valor de mercado, reduzida em 50% nos últimos 6 meses e 90% nos últimos 2. O passe é o valor de mercado; o pedido é negociável. A multa não é dado oficial.</p>
                  <div className={marketStyles.offerActions}><button className={marketStyles.primary} disabled={busy} onClick={async () => { const feeBrl = Number(offerFee) * 1e6; const share = kind === "loan" ? Number(wageShare) : 0; if (!Number.isFinite(feeBrl) || (free ? feeBrl !== 0 : feeBrl <= 0) || (kind === "loan" && (!Number.isFinite(share) || share < 0 || share > 100))) { setMessage("Revise o valor e a participação salarial."); return; } if (window.confirm(`Enviar oferta de ${formatBrl(feeBrl)}${kind === "loan" ? ` e pagar ${share}% do salário por 6 meses` : ""} por ${p.name}?`)) { if (busy) return; setBusy(true); try { const previousIds = negotiations.map(d => d.id); setMessage(await onTransferOffer(p.id, feeBrl, share,kind==="sale" ? Number(monthlyWage) : undefined)); setSubmittedBaseline(previousIds); } catch { setMessage("Não foi possível enviar a proposta."); } finally { setBusy(false); } } }}>Enviar proposta</button><button className={marketStyles.secondary} onClick={async () => setMarketPlayerId("")}>Cancelar</button></div>
                </div>;
  }
  if (section === "teams") return <TeamDirectory embedded={embedded} database={database} club={club} coach={coach} squad={squad} budget={budget} records={records} negotiations={negotiations} gameDate={gameDate} finance={finance} onOpenPlayer={onOpenPlayer} onTransferOffer={onTransferOffer} onBack={onBack}/>;
  return <><div inert={!!selectedPlayer} aria-hidden={selectedPlayer ? true : undefined} className={surface.screen} data-management-surface="world"><div className={`${surface.content} space-y-4`}>
    {section === "juniors" && <><Header eyebrow="base" title="Juniores" detail="Elenco de base separado dos profissionais." onBack={onBack}/><section className={box}><div className="mb-4 flex justify-between"><div><p className={label}>Categorias de base</p><h2 className="mt-1 text-lg font-black">Elenco sub-20</h2></div><b className="text-xl text-[#246e43]">{youthTeam?.players.length ?? 0}</b></div>
      {youthLoading ? <p role="status">Carregando base da carreira…</p> : youthTeam ? <><p className="mb-3 text-xs text-[#718477]">{youthTeam.note} {youthTeam.origin === "simulado" ? "Jogadores fictícios gerados pelo jogo." : "Dados importados preservados nesta carreira."}</p><div className="grid max-h-[440px] overflow-y-auto gap-2 sm:grid-cols-2 lg:grid-cols-3">{youthTeam.players.map(player => <div key={player.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#e1eae3] p-3"><div><b className="text-sm">{player.name}</b><p className="text-xs text-[#718477]">{player.position}{player.positionEstimated ? " (estimada)" : ""} · {player.age} anos{player.ageEstimated ? " (estimada)" : ""} · {player.nationality ?? "Nacionalidade não informada"} · força {player.overall} (estimada)</p><p className="text-xs text-[#718477]">{player.origin === "simulado" ? "Fictício" : "Transfermarkt"}</p></div><button className={action} disabled={!onPromoteYouth} onClick={async () => { if (window.confirm(`Promover ${player.name} ao elenco principal?`)) setMessage(await onPromoteYouth?.(player.id) ?? "Promoção indisponível."); }}>Promover</button></div>)}</div>{!youthTeam.players.length && <Empty>Não há mais jogadores disponíveis nesta base.</Empty>}</> : <Empty>Base indisponível. Abra uma carreira para carregar.</Empty>}{message && <p role="status" className="mt-3 text-sm">{message}</p>}</section></>}

    {section === "search" && <>
      <Header eyebrow="transferências" title="Mercado" detail="Pesquise atletas listados à venda ou para empréstimo e negocie com o clube." onBack={onBack}/>
      <div className={marketStyles.market}>
        <div className={marketStyles.intro}>
          <div className={marketStyles.introCopy}><span className={marketStyles.kicker}>CENTRAL DE TRANSFERÊNCIAS</span><h2>Encontre seu próximo reforço</h2><p>Explore o mercado, descubra talentos e escolha seu próximo reforço.</p></div>
          <Image src="/icons/navigation/mercado.webp" alt="" aria-hidden="true" width={104} height={104} className={marketStyles.heroIcon} unoptimized />
          <div className={marketStyles.budget}><Image src="/icons/navigation/financas.webp" alt="" aria-hidden="true" width={48} height={48} unoptimized /><span><small>CAIXA DO CLUBE</small><strong>{formatBrl(budget * 1000)}</strong><small>DISPONÍVEL: {available === null ? "não informado" : formatBrl(available)}</small></span></div>
        </div>
        {onMarketMode && <MarketPlanningPanel state={marketState} database={database} onMode={async mode=>setMessage(await onMarketMode(mode))} />}
        <nav className={marketStyles.tabs} aria-label="Seções do mercado">
          <button type="button" aria-current={marketTab === "players" ? "page" : undefined} onClick={async () => setMarketTab("players")}><Image src="/icons/navigation/times.webp" alt="" aria-hidden="true" width={34} height={34} unoptimized /><span>Buscar jogadores<small>{players.length} encontrados</small></span></button>
          <button type="button" aria-current={marketTab === "negotiations" ? "page" : undefined} onClick={async () => setMarketTab("negotiations")}><Image src="/icons/navigation/mercado.webp" alt="" aria-hidden="true" width={34} height={34} unoptimized /><span>Negociações<small>{negotiations.filter((item) => item.status === "countered" || item.status === "agreed").length} em andamento</small></span></button>
        </nav>
        {message && !selectedPlayer && <p role="status" className={`${marketStyles.notice} ${/insuficiente/i.test(message) ? marketStyles.noticeWarning : ""}`}>{message}</p>}
        {marketTab === "players" ? <section className={marketStyles.panel} aria-label="Busca de jogadores">
          <div className={marketStyles.sectionHeading}><div><h3>Área de observação</h3><p>Explore por perfil, mesmo sem saber o nome do atleta.</p></div><span>{players.length} {players.length === 1 ? "jogador" : "jogadores"}</span></div>
          <div className={marketStyles.scouting} role="group" aria-label="Rotas de observação">
            {([['all','Visão geral'],['free','Sem clube'],['sale','À venda'],['loan','Empréstimos']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={availability === value} onClick={async () => { setAvailability(value); if (value === "free") { setCountry(""); setDivision(""); } setPage(0); }}>{label}</button>)}
            <button type="button" aria-pressed={age === "23"} onClick={async () => { setAge(age === "23" ? "" : "23"); setPage(0); }}>Até 23 anos</button>
            <button type="button" className={marketStyles.clearSearch} onClick={resetSearch}>Limpar busca</button>
          </div>
          <div className={marketStyles.filters}>
            <label className={marketStyles.searchField}><span>Buscar jogador</span><input aria-label="Buscar jogadores" placeholder="Nome, clube, país ou nacionalidade" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }}/></label>
            <label><span>Disponibilidade</span><select aria-label="Disponibilidade" value={availability} onChange={(e) => { setAvailability(e.target.value as typeof availability); if (e.target.value === "free") { setCountry(""); setDivision(""); } setPage(0); }}><option value="all">Todos os jogadores</option><option value="free">Sem clube / sem contrato</option><option value="available">Listados ou livres</option><option value="sale">Somente à venda</option><option value="loan">Somente para empréstimo</option></select></label>
            <label><span>Posição</span><select aria-label="Posição" value={position} onChange={(e) => { setPosition(e.target.value); setPage(0); }}><option value="">Todas as posições</option>{[["G", "Goleiro"], ["L", "Lateral"], ["Z", "Zagueiro"], ["M", "Meio-campo"], ["A", "Atacante"]].map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
            <details className={marketStyles.moreFilters}><summary>Mais filtros{[country, nationality, division, age, maxFee, minOverall, maxSalary].filter(Boolean).length > 0 ? ` (${[country, nationality, division, age, maxFee, minOverall, maxSalary].filter(Boolean).length})` : ""}</summary><div className={marketStyles.extraFilters}>
              <label><span>Onde atua</span><select aria-label="País onde atua" value={country} onChange={(e) => { setCountry(e.target.value); setDivision(""); setPage(0); }}><option value="">Todos os países</option>{countries.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label><span>Nacionalidade</span><select aria-label="Nacionalidade" value={nationality} onChange={e => { setNationality(e.target.value); setPage(0); }}><option value="">Todas as nacionalidades</option>{nationalities.map(n => <option key={n}>{n}</option>)}<option value="__unknown">Não informada</option></select></label>
              <label><span>Força mínima</span><select aria-label="Força mínima" value={minOverall} onChange={e => { setMinOverall(e.target.value); setPage(0); }}><option value="">Qualquer força</option>{[50,60,70,80,90].map(n => <option key={n} value={n}>{n} ou mais</option>)}</select></label>
              <label><span>Salário até (R$ mil/mês)</span><input aria-label="Salário máximo em milhares" type="number" min="0" value={maxSalary} onChange={e => { setMaxSalary(e.target.value); setPage(0); }} placeholder="Sem limite" /></label>
              <label><span>Divisão</span><select aria-label="Competição" value={division} onChange={(e) => { setDivision(e.target.value); setPage(0); }}><option value="">Todas as divisões</option>{divisions.map((d) => <option key={d}>{d}</option>)}</select></label>
              <label><span>Idade máxima</span><select aria-label="Idade máxima" value={age} onChange={(e) => { setAge(e.target.value); setPage(0); }}><option value="">Qualquer idade</option>{[21, 23, 25, 30].map((n) => <option key={n} value={n}>Até {n} anos</option>)}</select></label>
              <label><span>Taxa máxima (R$ mi)</span><input aria-label="Taxa máxima em milhões" value={maxFee} onChange={(e) => { setMaxFee(e.target.value); setPage(0); }} type="number" min="0" placeholder="Sem limite"/></label>
            </div></details>
          </div>
          <details><summary className={marketStyles.hint}>Giro do mercado · {worldEvents.length} notícias</summary>{worldEvents.length ? worldEvents.slice(0,10).map((event, i) => <p className={marketStyles.hint} key={`${event.date}:${i}`}>{event.date.split("-").reverse().join("/")} · {event.text}</p>) : <p className={marketStyles.hint}>As decisões dos clubes aparecem aqui com o avanço das semanas.</p>}</details>
          <p className={marketStyles.hint}>Sem nome? Escolha uma rota de observação. País indica onde atua; nacionalidade vem do cadastro, nunca do clube. Você pode sondar atletas não listados; o clube tende a pedir mais.</p>
          <div className={marketStyles.playerList} aria-label="Lista de jogadores" tabIndex={0}>
            {players.slice(visiblePage * 12, visiblePage * 12 + 12).map((p) => {
              const free = isFreeAgent(p);
              const kind = !free && p.marketStatus === "loan" ? "loan" : "sale";
              const canOffer = p.loan?.status !== "active";
              const listed = p.marketStatus === "sale" || p.marketStatus === "loan";
              const asking = transferAskingPrice(p, database.players, gameDate);
              const clause = simulatedReleaseClauseBrl(p, gameDate);
              const team = clubsById.get(p.clubId);
              const activeNegotiation = negotiations.find((item) => item.playerId === p.id && item.status !== "rejected" && item.status !== "completed");
              return <article key={p.id} className={marketStyles.player}>
                <div className={marketStyles.playerMain}>
                  <div className={marketStyles.crest}>{team && <Crest club={team.name} size="sm" />}</div>
                  <div className={marketStyles.playerInfo}><button type="button" className="text-left text-[13px] font-bold text-[#20392a] underline-offset-2 hover:underline" onClick={() => openProfile(p, "resumo")}>{p.name}</button><span>{free ? "Sem clube" : team?.name} · {playerNationalities(p).join(" / ") || "Nacionalidade não informada"} · {p.age} anos · salário {formatBrl(p.salaryMonthlyBrl)}/mês</span><div><b className={marketStyles.position}>{p.primaryPosition}</b><b className={marketStyles.rating}>FORÇA {p.overall}</b><b className={kind === "loan" ? marketStyles.loan : marketStyles.sale}>{free ? "SEM CONTRATO" : !canOffer ? "EMPRESTADO" : !listed && !free ? "NÃO LISTADO" : kind === "loan" ? "PARA EMPRÉSTIMO" : "À VENDA"}</b></div></div>
                  <div className={marketStyles.asking}><small>{free ? "PASSE LIVRE" : !listed ? "VALOR PARA SONDAGEM" : kind === "loan" ? "TAXA PEDIDA" : "VALOR PEDIDO"}</small><strong>{formatBrl(asking)}</strong><small>PASSE (MERCADO) {formatBrl(p.marketValueBrl)}</small><small>MULTA SIMULADA {clause === null ? "indisponível" : formatBrl(clause)}</small></div>
                  <button className={marketStyles.primary} aria-label={`${activeNegotiation ? "Negociação ativa" : "Fazer proposta"} por ${p.name} do ${team?.name ?? "Sem clube"}`} onClick={() => openProfile(p, "mercado", activeNegotiation?.id)}>{activeNegotiation ? "Negociação ativa" : !canOffer ? "Em empréstimo" : "Fazer proposta"}</button>
                </div>

              </article>;
            })}
            {!players.length && <div className={marketStyles.empty}><strong>Nenhum jogador encontrado</strong><span>Tente outra rota de observação ou limpe a busca. Somente jogadores presentes no universo da carreira aparecem aqui.</span></div>}
          </div>
          <Pagination page={visiblePage} pages={pages} setPage={setPage}/>
        </section> : <section className={marketStyles.panel} aria-label="Negociações da carreira">
          <div className={marketStyles.sectionHeading}><div><h3>Negociações da carreira</h3><p>Acompanhe respostas e confirme acordos antes de contratar.</p></div><span>{negotiations.length} propostas</span></div>
        <div className={marketStyles.negotiationList} tabIndex={0} aria-label="Lista de negociações">{negotiations.map(item => <article key={item.id} className={marketStyles.deal}><div className="flex flex-wrap justify-between gap-3"><div><b>{item.playerName}</b><p className="text-xs text-[#718477]">{item.sourceClub} · {item.message}</p></div><button className={marketStyles.primary} disabled={!database.players.some(p => p.id === item.playerId)} onClick={() => { const p = database.players.find(p => p.id === item.playerId); if (p) openProfile(p, "mercado", item.id); }}>Ver proposta</button></div></article>)}</div>
          {!negotiations.length && <div className={marketStyles.empty}><strong>Nenhuma negociação ainda</strong><span>Envie uma proposta para acompanhar a resposta aqui.</span><button className={marketStyles.secondary} onClick={async () => setMarketTab("players")}>Buscar jogadores</button></div>}
        </section>}
      </div>
    </>}
    {section === "coaches" && <><Header eyebrow="carreiras" title="Técnicos" detail="Conheça os treinadores cadastrados no universo do jogo." onBack={onBack}/><CoachesScreen database={database} club={club} coach={coach} managerMarket={managerMarket} date={gameDate}/></>}
    {section === "history" && <><Header eyebrow="arquivo" title="História" detail="Consulte os registros disponíveis na sua carreira." onBack={onBack}/><nav className="flex flex-wrap gap-2" aria-label="Seções de história">{historyOptions.map((item) => <button key={item.id} className={`rounded-lg px-4 py-2 text-xs font-bold ${historyView === item.id ? "bg-[#246e43] text-white" : "bg-white text-[#52675a]"}`} onClick={async () => onHistoryView(item.id)} aria-current={historyView === item.id ? "page" : undefined}>{item.label}</button>)}</nav><section className={box}>{historyView === "players" ? <><h2 className="text-lg font-black">História dos jogadores</h2><p className="mt-1 text-xs text-[#718477]">Temporadas e partidas registradas dos atletas atualmente no elenco.</p><div className="mt-4 space-y-2">{squad.map((p) => { const record = records[p.id]; const matches = record?.matches?.length ?? 0; return <button key={p.id} onClick={async () => onOpenPlayer(p.id)} className="flex w-full justify-between rounded-lg border border-[#e2eae4] p-3 text-left hover:bg-[#f4f8f5]"><b>{p.name}</b><span className="text-[#718477]">{matches} partidas registradas →</span></button>; })}</div></> : historyView === "champions" ? <ChampionshipHistory records={championHistory}/> : <><h2 className="text-lg font-black">{historyView === "awards" ? "Bola de Ouro" : "Times campeões"}</h2><div className="mt-4"><Empty>{historyView === "awards" ? "Nenhuma premiação registrada. O jogo ainda não calcula vencedores da Bola de Ouro." : "Nenhum campeão registrado. O jogo ainda não registra campeões por competição e temporada; não há histórico completo disponível."}</Empty></div></>}</section></>}
  </div></div>{section === "search" && selectedPlayer && <MarketPlayerModal key={selectedPlayer.id + profileTab} player={selectedPlayer} database={database} season={competitionSeason} transfers={allTransfers ?? negotiations} initialTab={profileTab} date={gameDate} onClose={() => { setMarketPlayerId(""); setSelectedDealId(""); setMessage(""); }}>{message && <p role="status" className={`${marketStyles.notice} ${/insuficiente/i.test(message) ? marketStyles.noticeWarning : ""}`}>{message}</p>}{selectedDeal ? renderDeal(selectedDeal) : renderOffer(selectedPlayer)}</MarketPlayerModal>}</>;
}
function Pagination({ page, pages, setPage }: { page: number; pages: number; setPage: (n: number) => void }) { return <div className="mt-4 flex items-center justify-between text-xs"><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={page === 0} onClick={async () => setPage(page - 1)}>Anterior</button><span>Página {page + 1} de {pages}</span><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={page + 1 >= pages} onClick={async () => setPage(page + 1)}>Próxima</button></div>; }
