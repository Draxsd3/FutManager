"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { EditorDatabase } from "@/lib/game/editor-data";
import type { Player, RoundFixture } from "@/lib/game/mock-data";
import { ClassicIcon } from "@/components/ui/classic-icon";
import { Crest } from "@/components/ui/club-sidebar";
import { competitionTrophies } from "@/lib/game/assets";

export type ClubSection = "agenda" | "stadium" | "juniors" | "teams" | "search" | "coaches" | "history" | "finances" | "trophies" | "training";

export function ClubSectionScreen({
  section,
  database,
  club,
  coach,
  round,
  budget,
  squad,
  fixtures,
  competition = "Campeonato Estadual",
  inGameDate = "2026-01-22",
  onBack,
  onOpenPlayer,
  onTrainPlayer,
}: {
  section: ClubSection;
  database: EditorDatabase;
  club: string;
  coach: string;
  round: number;
  budget: number;
  squad: Player[];
  fixtures: RoundFixture[];
  competition?: string;
  inGameDate?: string;
  onBack: () => void;
  onOpenPlayer: (id: number) => void;
  onTrainPlayer: (id: number, focus: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState(club);
  const [selectedTrainingId, setSelectedTrainingId] = useState(squad[0]?.id ?? 0);
  const [trainingFocus, setTrainingFocus] = useState("Físico");
  const [trainingMessage, setTrainingMessage] = useState("");
  const currentClub = database.clubs.find((item) => item.name === club);
  const viewedClub = database.clubs.find((item) => item.name === selectedClub) ?? currentClub;
  const clubNameById = useMemo(() => Object.fromEntries(database.clubs.map((item) => [item.id, item.name])), [database.clubs]);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return [];
    return database.players
      .filter((player) => player.name.toLocaleLowerCase("pt-BR").includes(normalized))
      .slice(0, 30);
  }, [database.players, query]);
  const selectedTrainingPlayer = squad.find((player) => player.id === selectedTrainingId) ?? squad[0];
  const monthlyPayroll = squad.reduce((total, player) => total + player.salary * 1000, 0);
  const squadValue = squad.reduce((total, player) => total + player.marketValue, 0);
  const title = {
    agenda: "AGENDA",
    stadium: "ESTÁDIO",
    juniors: "CATEGORIAS DE BASE",
    teams: "TIMES",
    search: "PROCURA DE JOGADORES",
    coaches: "TÉCNICOS",
    history: "HISTÓRIA DA CARREIRA",
    finances: "FINANÇAS",
    trophies: "SALA DE TROFÉUS",
    training: "CENTRO DE TREINAMENTO",
  }[section];

  return (
    <div className="h-full min-h-0 overflow-hidden bg-[linear-gradient(rgba(247,247,242,.72),rgba(247,247,242,.8)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-center p-4 text-[#26382a]">
      <section className="mx-auto h-full max-w-[1180px] overflow-auto border border-[#c6d7c7] bg-white/95 shadow-xl">
        <header className="flex items-center justify-between border-b border-[var(--team-accent)] bg-[var(--team-accent)] px-4 py-3 text-[var(--team-accent-text)]">
          <b className="text-[13px]">{title}</b>
          <button onClick={onBack} className="rounded border border-white/60 bg-white/90 px-3 py-1 text-[11px] font-bold text-[#17351d] hover:bg-white">VOLTAR AO CLUBE</button>
        </header>

        {section === "agenda" && <AgendaCenter club={club} division={currentClub?.division ?? "Série A"} competition={competition} inGameDate={inGameDate} round={round} fixtures={fixtures} squad={squad} clubs={database.clubs.filter((item) => item.division === (currentClub?.division ?? "Série A")).map((item) => item.name)} />}

        {section === "stadium" && (
          <div className="grid gap-4 p-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="relative min-h-80 overflow-hidden border border-black bg-cover bg-center" style={{ backgroundImage: "url('/game-assets/backgrounds/stadium.jpg')" }}><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10"/><div className="absolute inset-x-0 bottom-0 p-4 text-white"><b className="text-xl">{currentClub?.stadiumName ?? "Estádio Municipal"}</b><p>{currentClub?.stadiumCapacity.toLocaleString("pt-BR")} lugares</p></div></div>
            <Panel title="ADMINISTRAÇÃO DO ESTÁDIO"><Info label="Clube" value={club}/><Info label="Capacidade" value={`${currentClub?.stadiumCapacity.toLocaleString("pt-BR") ?? 0} torcedores`}/><Info label="Gramado" value="Excelente"/><Info label="Caixa disponível" value={`R$ ${(budget / 1000).toFixed(2)} milhões`}/><p className="mt-5 border-t pt-3 text-[#68757b]">As reformas e ampliações serão liberadas conforme a evolução financeira da carreira.</p></Panel>
          </div>
        )}

        {section === "juniors" && (
          <div className="p-4"><Panel title="JOGADORES JOVENS MONITORADOS"><DataTable headers={["Nome", "Posição", "Idade", "Força", "Energia"]}>{squad.filter((player) => player.age <= 25).map((player) => <tr key={player.id} onDoubleClick={() => onOpenPlayer(player.id)} className="cursor-pointer border-b hover:bg-[#e4eef3]"><Cell>{player.name}</Cell><Cell>{player.position}</Cell><Cell>{player.age}</Cell><Cell>{player.overall}</Cell><Cell>{player.energy}%</Cell></tr>)}</DataTable><p className="mt-3 text-[11px] text-[#68757b]">Dê dois cliques para abrir a ficha completa do jogador.</p></Panel></div>
        )}

        {section === "teams" && (
          <div className="grid gap-4 p-4 lg:grid-cols-[320px_1fr]"><Panel title="CLUBES"><div className="max-h-[620px] overflow-auto">{database.clubs.map((item) => <button key={item.id} onClick={() => setSelectedClub(item.name)} className={["flex w-full items-center justify-between border-b px-3 py-2 text-left", selectedClub === item.name ? "bg-[#c8dbe5]" : "hover:bg-[#edf3f6]"].join(" ")}><span className="flex items-center gap-2"><Crest club={item.name} size="sm"/><b>{item.name}</b></span><span>{item.division}</span></button>)}</div></Panel><Panel title="INFORMAÇÕES DO CLUBE"><div className="mb-5 flex items-center gap-4">{viewedClub && <Crest club={viewedClub.name}/>}<div><h2 className="text-2xl font-black">{viewedClub?.name}</h2><p>{viewedClub?.country} · fundado em {viewedClub?.foundedYear}</p></div></div><Info label="Divisão" value={viewedClub?.division ?? "-"}/><Info label="Nível" value={String(viewedClub?.level ?? "-")}/><Info label="Estádio" value={`${viewedClub?.stadiumName} · ${viewedClub?.stadiumCapacity.toLocaleString("pt-BR")} lugares`}/><Info label="Técnico" value={viewedClub?.coachName ?? "-"}/></Panel></div>
        )}

        {section === "search" && (
          <div className="p-4"><Panel title="PESQUISAR NO BANCO DE JOGADORES"><div className="mb-4 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Digite o nome do jogador..." className="w-full border border-[#849198] px-3 py-2 outline-none focus:border-[#073e59]"/><button className="bg-[#073e59] px-6 font-bold text-white">PROCURAR</button></div>{query.trim() && <DataTable headers={["Nome", "Time", "P", "Idade", "Força", "Valor"]}>{results.map((player) => <tr key={player.id} className="border-b hover:bg-[#e4eef3]"><Cell>{player.name}</Cell><Cell>{clubNameById[player.clubId]}</Cell><Cell>{player.primaryPosition}</Cell><Cell>{player.age}</Cell><Cell>{player.overall}</Cell><Cell>R$ {(player.marketValueBrl / 1_000_000).toFixed(1)}M</Cell></tr>)}</DataTable>}{query.trim() && results.length === 0 && <p className="py-10 text-center text-[#68757b]">Nenhum jogador encontrado.</p>}</Panel></div>
        )}

        {section === "coaches" && (
          <div className="p-4"><Panel title="TÉCNICOS EM ATIVIDADE"><DataTable headers={["Técnico", "Clube", "Divisão", "Nível do clube"]}><tr className="border-b bg-[#fff7c7]"><Cell><b>{coach}</b></Cell><Cell>{club}</Cell><Cell>{currentClub?.division}</Cell><Cell>{currentClub?.level}</Cell></tr>{database.clubs.filter((item) => item.name !== club).map((item) => <tr key={item.id} className="border-b hover:bg-[#edf3f6]"><Cell>{item.coachName}</Cell><Cell>{item.name}</Cell><Cell>{item.division}</Cell><Cell>{item.level}</Cell></tr>)}</DataTable></Panel></div>
        )}

        {section === "history" && (
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr]"><Panel title="CARREIRA DE TÉCNICO"><Info label="Técnico" value={coach}/><Info label="Clube atual" value={club}/><Info label="Temporada" value="2026"/><Info label="Rodada" value={`${round}ª`}/><Info label="Patrimônio do clube" value={`R$ ${(budget / 1000).toFixed(2)} milhões`}/></Panel><Panel title="REGISTRO HISTÓRICO"><div className="border-l-2 border-[#0a6a42] pl-4"><b>22/01/2026</b><p className="mb-5">{coach} iniciou sua trajetória no comando do {club}.</p><b>Temporada atual</b><p>A carreira está em andamento. Resultados e títulos serão adicionados automaticamente.</p></div></Panel></div>
        )}

        {section === "finances" && (
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.2fr]">
            <Panel title="RESUMO FINANCEIRO"><div className="mb-5 flex items-center gap-3"><ClassicIcon name="money" size={32}/><div><p className="text-[11px] text-[#68757b]">SALDO DISPONÍVEL</p><b className="text-2xl text-[#07552f]">R$ {(budget / 1000).toFixed(2)} milhões</b></div></div><Info label="Folha salarial mensal" value={`R$ ${monthlyPayroll.toLocaleString("pt-BR")}`}/><Info label="Valor de mercado do elenco" value={`R$ ${squadValue.toFixed(1)} milhões`}/><Info label="Jogadores sob contrato" value={String(squad.length)}/></Panel>
            <Panel title="PROJEÇÃO DO MÊS"><Info label="Bilheteria estimada" value={`R$ ${Math.round((currentClub?.stadiumCapacity ?? 15000) * 18).toLocaleString("pt-BR")}`}/><Info label="Patrocínios" value="R$ 450.000"/><Info label="Salários" value={`- R$ ${monthlyPayroll.toLocaleString("pt-BR")}`}/><Info label="Manutenção do estádio" value={`- R$ ${Math.round((currentClub?.stadiumCapacity ?? 15000) * 2.4).toLocaleString("pt-BR")}`}/><p className="mt-4 border-t pt-3 text-[11px] text-[#68757b]">Os lançamentos serão consolidados quando a rodada for concluída.</p></Panel>
          </div>
        )}

        {section === "trophies" && (
          <div className="grid gap-4 p-4 lg:grid-cols-[320px_1fr]">
            <Panel title="TÍTULOS DA CARREIRA"><div className="grid min-h-64 place-items-center text-center"><Image src="/game-assets/trophies/brasileirao.png" alt="Troféu do Brasileirão" width={86} height={121} unoptimized className="h-28 w-20 object-contain opacity-45 grayscale"/><div><b className="mt-3 block text-lg">Nenhum título conquistado</b><p className="mt-1 text-[#68757b]">A temporada de 2026 está em andamento.</p></div></div></Panel>
            <Panel title="HISTÓRICO EM COMPETIÇÕES"><DataTable headers={["Competição", "Temporada", "Situação", "Melhor campanha"]}><tr className="border-b"><Cell>Campeonato Estadual</Cell><Cell>2026</Cell><Cell><b className="text-[#07552f]">Em andamento</b></Cell><Cell>{round}ª rodada</Cell></tr></DataTable><div className="mt-5 grid grid-cols-5 gap-2 border border-[#c5b56c] bg-[#fff9d9] p-3">{competitionTrophies.map((trophy) => <div key={trophy.name} className="text-center"><Image src={trophy.asset} alt={`Troféu ${trophy.name}`} width={86} height={121} unoptimized className="mx-auto h-16 w-12 object-contain"/><b className="mt-1 block text-[9px]">{trophy.name}</b></div>)}</div><div className="mt-3 border-l-4 border-[#c8a929] bg-[#fff9d9] p-4"><b>{coach} · {club}</b><p className="mt-1">Títulos, vice-campeonatos e campanhas serão registrados automaticamente ao término de cada competição.</p></div></Panel>
          </div>
        )}

        {section === "training" && (
          <div className="grid gap-4 p-4 lg:grid-cols-[1.5fr_340px]">
            <Panel title="ELENCO DISPONÍVEL"><DataTable headers={["Nome", "P", "Força", "Energia", "Idade"]}>{squad.map((player) => <tr key={player.id} onClick={() => { setSelectedTrainingId(player.id); setTrainingMessage(""); }} onDoubleClick={() => onOpenPlayer(player.id)} className={["cursor-pointer border-b", selectedTrainingPlayer?.id === player.id ? "bg-[#fff2a8]" : "hover:bg-[#e4eef3]"].join(" ")}><Cell>{player.name}</Cell><Cell>{player.position}</Cell><Cell><b>{player.overall}</b></Cell><Cell>{player.energy}%</Cell><Cell>{player.age}</Cell></tr>)}</DataTable></Panel>
            <Panel title="SESSÃO DE TREINO">{selectedTrainingPlayer && <><div className="mb-4 flex items-center gap-3"><ClassicIcon name="user_green" size={32}/><div><b className="text-lg">{selectedTrainingPlayer.name}</b><p>{selectedTrainingPlayer.position} · Força {selectedTrainingPlayer.overall} · Energia {selectedTrainingPlayer.energy}%</p></div></div><label className="block font-bold">Foco do treino<select value={trainingFocus} onChange={(event) => { setTrainingFocus(event.target.value); setTrainingMessage(""); }} className="mt-1 block h-9 w-full border border-[#849198] bg-white px-2 font-normal"><option>Físico</option><option>Finalização</option><option>Passe</option><option>Defesa</option><option>Recuperação</option></select></label><p className="mt-3 text-[11px] text-[#68757b]">Treinos técnicos consomem 6% de energia e podem aumentar a força. Recuperação devolve 15% de energia.</p><button disabled={trainingFocus !== "Recuperação" && selectedTrainingPlayer.energy < 10} onClick={() => { onTrainPlayer(selectedTrainingPlayer.id, trainingFocus); setTrainingMessage(`Sessão de ${trainingFocus.toLocaleLowerCase("pt-BR")} concluída e salva.`); }} className="mt-5 flex w-full items-center justify-center gap-2 border border-[#687b85] bg-gradient-to-b from-white to-[#c7d4db] py-2 font-bold disabled:opacity-40"><ClassicIcon name={trainingFocus === "Recuperação" ? "arrow_refresh" : "chart_bar"}/>APLICAR TREINO</button>{trainingMessage && <p className="mt-3 border border-[#76a986] bg-[#e4f5e8] p-2 font-bold text-[#07552f]">{trainingMessage}</p>}</>}</Panel>
          </div>
        )}
      </section>
    </div>
  );
}

function AgendaCenter({ club, division, competition, inGameDate, round, fixtures, squad, clubs }: { club: string; division: string; competition: string; inGameDate: string; round: number; fixtures: RoundFixture[]; squad: Player[]; clubs: string[] }) {
  const [filter, setFilter] = useState<"all" | "matches" | "selection" | "market">("all");
  const date = new Date(`${inGameDate}T12:00:00`);
  const opponents = clubs.filter((name) => name !== club).slice(0, 10);
  const games = opponents.map((opponent, index) => ({ date: new Date(date.getFullYear(), date.getMonth(), date.getDate() + index * 7), opponent, home: index % 2 === 0, round: round + index, competition }));
  const selected = squad.filter((player) => player.overall >= 82 && player.age <= 27).slice(0, 2);
  const selectionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 12);
  const window = transferWindowFor(competition, date);
  const currentFixture = fixtures.find((fixture) => fixture.home === club || fixture.away === club);
  const visibleGames = filter === "all" || filter === "matches";
  return <div className="p-4"><div className="grid gap-4 xl:grid-cols-[250px_1fr_280px]"><Panel title="CALENDÁRIO DA CARREIRA"><p className="text-4xl font-black text-[var(--team-accent)]">{String(date.getDate()).padStart(2, "0")}</p><p className="font-bold capitalize">{date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p><p className="mt-3 text-[11px] text-[#68757b]">{competition} · {division}</p><p className="mt-1 text-[11px] text-[#68757b]">Rodada atual: {round}ª</p><div className="mt-5 grid gap-1">{(["all", "matches", "selection", "market"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded px-3 py-2 text-left text-xs font-bold ${filter === item ? "bg-[var(--team-accent)] text-[var(--team-accent-text)]" : "bg-[#edf3ee] hover:bg-[#dfece1]"}`}>{({ all: "Visão geral", matches: "Jogos do clube", selection: "Seleção", market: "Transferências" } as const)[item]}</button>)}</div></Panel>
    <Panel title={filter === "market" ? "JANELA DE TRANSFERÊNCIAS" : filter === "selection" ? "COMPROMISSOS DE SELEÇÃO" : "AGENDA DE JOGOS"}>{visibleGames && <div className="divide-y divide-[#dce7dc]">{games.map((game, index) => <div key={`${game.opponent}-${index}`} className="grid grid-cols-[72px_1fr_auto_1fr] items-center gap-3 py-3 text-xs"><div><b className="block text-[var(--team-accent)]">{game.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</b><small>{game.round}ª rodada</small></div><b className="text-right">{game.home ? club : game.opponent}</b><span className="rounded bg-[#253229] px-2 py-1 font-black text-white">×</span><b>{game.home ? game.opponent : club}</b><p className="col-span-4 text-[10px] text-[#6b7970]">{game.competition} · {game.home ? "Casa" : "Fora"}</p></div>)}</div>}{filter === "selection" && <SelectionAgenda selected={selected} date={selectionDate} />}{filter === "market" && <TransferDetails window={window} competition={competition} />}{filter === "all" && <><div className="mt-4 border-t border-[#dce7dc] pt-4"><SelectionAgenda selected={selected} date={selectionDate} /></div><div className="mt-4 border-t border-[#dce7dc] pt-4"><TransferDetails window={window} competition={competition} /></div></>}</Panel>
    <aside className="space-y-4"><Panel title="PRÓXIMO COMPROMISSO">{currentFixture ? <><b className="block text-lg">{currentFixture.home} × {currentFixture.away}</b><p className="mt-1 text-[11px] text-[#68757b]">{currentFixture.stadium}</p><p className="mt-3 text-xs font-bold text-[var(--team-accent)]">Hoje · {competition}</p></> : <p className="text-xs text-[#68757b]">Nenhuma partida cadastrada.</p>}</Panel><Panel title="MERCADO ATUAL"><b className={window.open ? "text-[#157b40]" : "text-[#a85a28]"}>{window.open ? "JANELA ABERTA" : "JANELA FECHADA"}</b><p className="mt-2 text-[11px] text-[#68757b]">{window.name}</p><p className="mt-1 text-[11px] text-[#68757b]">{window.period}</p><p className="mt-3 text-[10px]">As decisões de venda, empréstimo e contrato podem ser feitas na ficha do jogador.</p></Panel></aside></div></div>;
}

function SelectionAgenda({ selected, date }: { selected: Player[]; date: Date }) { return selected.length ? <div><b className="text-xs text-[#29402f]">Brasil · amistoso internacional</b><p className="mt-1 text-[11px] text-[#68757b]">{date.toLocaleDateString("pt-BR")} · Convocados: {selected.map((player) => player.name).join(", ")}</p><p className="mt-1 text-[10px] text-[#68757b]">Os atletas ficam indisponíveis durante a data FIFA.</p></div> : <p className="text-xs text-[#68757b]">Nenhum atleta do elenco foi convocado para a próxima data FIFA.</p>; }
function TransferDetails({ window, competition }: { window: ReturnType<typeof transferWindowFor>; competition: string }) { return <div><b className={window.open ? "text-[#157b40]" : "text-[#a85a28]"}>{window.open ? "Janela de transferências aberta" : "Janela de transferências fechada"}</b><p className="mt-1 text-xs">{window.name} · {window.period}</p><p className="mt-2 text-[11px] text-[#68757b]">Regras aplicadas para {competition}: negociações só podem ser concluídas dentro da janela correspondente.</p></div>; }
function transferWindowFor(competition: string, date: Date) { const month = date.getMonth() + 1; const day = date.getDate(); const domesticOpen = (month === 1 && day >= 7) || month === 2 || (month === 3 && day <= 3) || (month === 7 && day >= 10) || month === 8 || (month === 9 && day <= 2); if (competition.includes("Libertadores")) return { name: "Inscrição CONMEBOL", period: "25/01–10/02 e 10/07–02/08", open: (month === 1 && day >= 25) || (month === 2 && day <= 10) || (month === 7 && day >= 10) || (month === 8 && day <= 2) }; if (competition.includes("Copa do Brasil")) return { name: "Registro nacional da CBF", period: "07/01–03/03 e 10/07–02/09", open: domesticOpen }; if (competition.includes("Estadual")) return { name: "Inscrição estadual", period: "02/01–27/03", open: month <= 3 && (month !== 1 || day >= 2) }; return { name: "Janela nacional", period: "07/01–03/03 e 10/07–02/09", open: domesticOpen }; }

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border border-[#c9d9ca] bg-[#fbfdfb]"><h2 className="border-b border-[#d9e5d9] bg-[var(--team-accent)] px-3 py-2 text-[11px] font-bold text-[var(--team-accent-text)]">{title}</h2><div className="p-4">{children}</div></section>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="flex justify-between border-b border-[#dce7dc] py-2"><b>{label}</b><span>{value}</span></div>; }
function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="overflow-auto border border-[#c9d9ca]"><table className="w-full border-collapse text-left"><thead className="bg-[var(--team-accent)] text-[var(--team-accent-text)]"><tr>{headers.map((header) => <th key={header} className="border-r border-white/20 px-3 py-2 text-[11px]">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Cell({ children }: { children: React.ReactNode }) { return <td className="px-3 py-2">{children}</td>; }
