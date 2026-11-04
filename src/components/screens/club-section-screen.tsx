"use client";

import { TrophyGallery } from "@/components/ui/championship-history";
import type { ChampionshipRecord } from "@/lib/game/honours";
import { useMemo, useState } from "react";
import type { CareerSeason } from "@/lib/game/season";
import type { EditorDatabase } from "@/lib/game/editor-data";
import type { Player, RoundFixture } from "@/lib/game/mock-data";
import { ClassicIcon } from "@/components/ui/classic-icon";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { Crest } from "@/components/ui/club-sidebar";
import { StadiumScreen } from "./stadium-screen";
import { projectStadiumGate, stadiumCapacity, newStadium, type StadiumSector, type StadiumState } from "@/lib/game/stadium";
import type { ManagerJobsProps } from "./manager-jobs";
import { AgendaScreen, type AgendaView } from "./agenda-screen";
import { canJoinTraining, sessionEnergyDelta, TRAINING_DAYS, TRAINING_DRILLS, trainingDrillLabel, trainingWeekSessions, type TrainingDay, type TrainingDrillId, type TrainingIntensity, type TrainingSessionInput, type TrainingSessionRecord } from "@/lib/game/training";
import { TrainingIcon } from "@/components/ui/training-icon";
import trainingStyles from "./training-center.module.css";

export type ClubSection = "agenda" | "stadium" | "juniors" | "teams" | "search" | "coaches" | "history" | "finances" | "trophies" | "training";

export function ClubSectionScreen({
  section,
  stadium, onStadiumPriceChange, onStadiumExpand,
  championHistory = [],
  jobs,
  database,
  club,
  coach,
  round,
  budget,
  squad,
  season,
  competition = "Campeonato Estadual",
  inGameDate = "2026-01-22",
  agendaView = "matches",
  onAgendaViewChange,
  onPrepare,
  onAgenda,
  onBack,
  onOpenPlayer,
  onTrainPlayers,
  starters = [],
  trainingSessions = [],
  trainingWeek = 1,
  trainingSeason = 2026,
}: {
  stadium?: StadiumState;
  onStadiumPriceChange?: (sector: StadiumSector, price: number) => void;
  onStadiumExpand?: (seats: number) => string | undefined;
  championHistory?: ChampionshipRecord[];
  jobs?: ManagerJobsProps;
  agendaView?: AgendaView;
  onAgendaViewChange?: (view: AgendaView) => void;
  onPrepare?: () => void;
  onAgenda?: () => void;
  section: ClubSection;
  database: EditorDatabase;
  club: string;
  coach: string;
  round: number;
  budget: number;
  squad: Player[];
  fixtures: RoundFixture[];
  season?: CareerSeason;
  competition?: string;
  inGameDate?: string;
  onBack: () => void;
  onOpenPlayer: (id: number) => void;
  onTrainPlayers: (input: Omit<TrainingSessionInput, "season" | "week">) => { record?: TrainingSessionRecord; error?: string };
  starters?: number[];
  trainingSessions?: TrainingSessionRecord[];
  trainingWeek?: number;
  trainingSeason?: number;
}) {
  const [query, setQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState(club);
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

  if (section === "stadium") return <StadiumScreen key={club} club={currentClub} budget={budget} payroll={monthlyPayroll} date={inGameDate} stadium={stadium} onPriceChange={onStadiumPriceChange} onExpand={onStadiumExpand} onBack={onBack} onAgenda={onAgenda} />;

  if (section === "agenda") return <AgendaScreen jobs={jobs} club={club} coach={coach} competition={competition} inGameDate={inGameDate} round={round} season={season} database={database} view={agendaView} onViewChange={onAgendaViewChange ?? (() => undefined)} onBack={onBack} onPrepare={onPrepare ?? onBack} />;

  if (section === "training") return <TrainingCenter squad={squad} starters={starters} week={trainingWeek} season={trainingSeason} sessions={trainingSessions} onTrain={onTrainPlayers} />;

  return (
    <div className="h-full min-h-0 overflow-hidden bg-[linear-gradient(rgba(247,247,242,.72),rgba(247,247,242,.8)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-center p-4 text-[#26382a]">
      <section className="mx-auto h-full max-w-[1180px] overflow-auto border border-[#c6d7c7] bg-white/95 shadow-xl">
        <header className="flex items-center justify-between border-b border-[#215b39] bg-[#215b39] px-4 py-3 text-white">
          <b className="text-[13px]">{title}</b>
          <button onClick={onBack} className="rounded border border-white/60 bg-white/90 px-3 py-1 text-[11px] font-bold text-[#17351d] hover:bg-white">VOLTAR AO CLUBE</button>
        </header>



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
            <Panel title="PROJEÇÃO DO MÊS"><Info label="Bilheteria líquida estimada (jogo em casa)" value={`R$ ${projectStadiumGate(stadiumCapacity(currentClub?.stadiumCapacity ?? 0, stadium ?? newStadium(), inGameDate), (stadium ?? newStadium()).prices).net.toLocaleString("pt-BR")}`}/><Info label="Patrocínios" value="R$ 450.000"/><Info label="Salários" value={`- R$ ${monthlyPayroll.toLocaleString("pt-BR")}`}/><Info label="Manutenção do estádio" value={`- R$ ${Math.round((currentClub?.stadiumCapacity ?? 15000) * 2.4).toLocaleString("pt-BR")}`}/><p className="mt-4 border-t pt-3 text-[11px] text-[#68757b]">Somente a bilheteria líquida de jogos em casa é creditada ao fim da partida. Patrocínios, salários e manutenção acima são projeções.</p></Panel>
          </div>
        )}

        {section === "trophies" && <TrophyGallery database={database} club={club} records={championHistory}/>}


      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border border-[#c9d9ca] bg-[#fbfdfb]"><h2 className="border-b border-[#d9e5d9] bg-[#215b39] px-3 py-2 text-[11px] font-bold text-white">{title}</h2><div className="p-4">{children}</div></section>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="flex justify-between border-b border-[#dce7dc] py-2"><b>{label}</b><span>{value}</span></div>; }
function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="overflow-auto border border-[#c9d9ca]"><table className="w-full border-collapse text-left"><thead className="bg-[#215b39] text-white"><tr>{headers.map((header) => <th key={header} className="border-r border-white/20 px-3 py-2 text-[11px]">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Cell({ children }: { children: React.ReactNode }) { return <td className="px-3 py-2">{children}</td>; }


function TrainingCenter({ squad, starters, week, season, sessions, onTrain }: { squad: Player[]; starters: number[]; week: number; season: number; sessions: TrainingSessionRecord[]; onTrain: (input: Omit<TrainingSessionInput, "season" | "week">) => { record?: TrainingSessionRecord; error?: string } }) {
  const weekly = trainingWeekSessions(sessions, season, week);
  const completedDays = new Set(weekly.map((session) => session.day));
  const [day, setDay] = useState<TrainingDay>(TRAINING_DAYS.find((item) => !completedDays.has(item)) ?? TRAINING_DAYS[0]);
  const [drill, setDrill] = useState<TrainingDrillId>("passe");
  const [intensity, setIntensity] = useState<TrainingIntensity>("Moderada");
  const [selectedIds, setSelectedIds] = useState<number[]>(() => starters.length ? starters : squad.slice(0, 11).map((player) => player.id));
  const [position, setPosition] = useState("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const selectedSet = new Set(selectedIds);
  const eligibleSelected = squad.filter((player) => selectedSet.has(player.id) && canJoinTraining(player, drill, intensity));
  const energyDelta = sessionEnergyDelta(drill, intensity);
  const selectedSession = weekly.find((session) => session.day === day);
  const visiblePlayers = squad.filter((player) => (position === "all" || player.position === position) && player.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));
  const energySummary = energyDelta < 0 ? `+${Math.abs(energyDelta)}% energia` : `−${energyDelta}% energia`;

  function updateSelection(ids: number[]) { setSelectedIds([...new Set(ids)]); setMessage(""); }
  function togglePlayer(id: number) { updateSelection(selectedSet.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]); }
  function applySession() {
    const result = onTrain({ day, drill, intensity, playerIds: eligibleSelected.map((player) => player.id) });
    setMessage(result.record ? `${trainingDrillLabel(result.record.drill)} aplicado a ${result.record.playerIds.length} atleta${result.record.playerIds.length === 1 ? "" : "s"}.` : result.error ?? "Não foi possível aplicar o treino.");
    if (result.record) setSelectedIds(result.record.playerIds);
  }


  const availableIds = squad.filter((player) => canJoinTraining(player, drill, intensity)).map((player) => player.id);
  const allAvailableSelected = availableIds.length > 0 && availableIds.every((id) => selectedSet.has(id));
  const currentDrill = TRAINING_DRILLS.find((item) => item.id === drill)!;

  return <div className={trainingStyles.center}>
    <header className={trainingStyles.heading}>
      <div><span>PLANEJAMENTO DA SEMANA</span><h2><TrainingIcon name="resistencia" size={48} /> Centro de treinamento</h2><p>Organize a carga, escolha os atletas e acompanhe o efeito de cada sessão.</p></div>
      <div className={trainingStyles.weekStamp}><ClassicIcon name="calendar" size={16} /><span>Semana {week} · {season}</span></div>
    </header>
    <div className={trainingStyles.layout}>
      <section className={trainingStyles.builder} aria-label="Configurar sessão de treino">
        <div className={trainingStyles.sectionHead}><div><h3><ClassicIcon name="calendar" /> Escolha o dia</h3></div><small>{weekly.length}/6 concluídas</small></div>
        <div className={trainingStyles.days}>{TRAINING_DAYS.map((item) => {
          const done = completedDays.has(item);
          return <button key={item} type="button" aria-pressed={day === item} data-done={done || undefined} className={day === item ? trainingStyles.dayActive : trainingStyles.day} onClick={() => { setDay(item); setMessage(""); }}><b>{item.slice(0, 3)}</b><small>{done ? "FEITO" : "LIVRE"}</small></button>;
        })}</div>
        {selectedSession && <p className={trainingStyles.slotNotice}>Sessão concluída: {trainingDrillLabel(selectedSession.drill)} · {selectedSession.playerIds.length} atletas.</p>}

        <div className={trainingStyles.sectionHead}><div><h3><ClassicIcon name="sport_soccer" /> Tipo de treino</h3></div></div>
        <div className={trainingStyles.drills}>{TRAINING_DRILLS.map((item) => <button key={item.id} type="button" aria-pressed={drill === item.id} className={drill === item.id ? trainingStyles.drillActive : trainingStyles.drill} onClick={() => { setDrill(item.id); setMessage(""); }}><TrainingIcon name={item.id} /><span><b>{item.name}</b><small>{item.category}</small></span></button>)}</div>

        <p className={trainingStyles.drillDescription}>{currentDrill.description}</p>
        <div className={trainingStyles.loadRow}>
          <label><ClassicIcon name="chart_bar" /> Intensidade <select aria-label="Intensidade do treino" value={intensity} onChange={(event) => { setIntensity(event.target.value as TrainingIntensity); setMessage(""); }}><option>Leve</option><option>Moderada</option><option>Intensa</option></select></label>
          <small>{energySummary} por atleta</small>
        </div>

        <div className={trainingStyles.sectionHead}><div><h3><ClassicIcon name="group" /> Atletas da sessão</h3></div><small>{eligibleSelected.length} aptos · {selectedIds.length} selecionados</small></div>
        <div className={trainingStyles.rosterTools}><input aria-label="Buscar atleta no treino" placeholder="Buscar no elenco..." value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filtrar posição no treino" value={position} onChange={(event) => setPosition(event.target.value)}><option value="all">Todas as posições</option><option value="G">Goleiros</option><option value="L">Laterais</option><option value="Z">Zagueiros</option><option value="M">Meias</option><option value="A">Atacantes</option></select></div>
        <label className={trainingStyles.selectAll}><input type="checkbox" checked={allAvailableSelected} disabled={!availableIds.length} onChange={(event) => updateSelection(event.target.checked ? availableIds : [])} />Selecionar aptos</label>
        <div className={trainingStyles.playerList} aria-label="Escolha os atletas">
          {visiblePlayers.map((player) => {
            const eligible = canJoinTraining(player, drill, intensity);
            return <label key={player.id} className={eligible ? trainingStyles.playerRow : trainingStyles.playerUnavailable}><input type="checkbox" checked={selectedSet.has(player.id)} disabled={!eligible} onChange={() => togglePlayer(player.id)} /><span className={trainingStyles.playerPosition}>{player.position}</span><span className={trainingStyles.playerInfo}><b>{player.name}</b><small>Força {player.overall}</small></span><span className={trainingStyles.playerEnergy}><b>{player.energy}%</b><span className={trainingStyles.energyTrack}><i style={{ width: `${Math.max(0, Math.min(100, player.energy))}%` }} /></span></span><span className={trainingStyles.playerState}>{eligible ? "APTO" : drill === "recuperacao" ? "OK" : "DESCANSO"}</span></label>;
          })}
          {!visiblePlayers.length && <p className={trainingStyles.emptyRoster}>Nenhum atleta encontrado. Ajuste a busca ou a posição.</p>}
        </div>
        <div className={trainingStyles.applyRow}><div><b>{selectedSession ? "Dia já utilizado" : "Carga prevista"}</b><small>{eligibleSelected.length ? `${eligibleSelected.length} atleta${eligibleSelected.length === 1 ? "" : "s"} · ${energySummary}` : "Selecione atletas aptos para treinar"}</small></div><button type="button" disabled={!!selectedSession || eligibleSelected.length === 0} onClick={applySession}><ClassicIcon name="accept_button" size={15} /> APLICAR SESSÃO</button></div>
        {message && <p className={message.includes("aplicado") ? trainingStyles.success : trainingStyles.error} role="status">{message}</p>}
      </section>

      <aside className={trainingStyles.weekPanel} aria-label="Resumo dos treinos da semana">
        <div className={trainingStyles.sectionHead}><div><h3><ClassicIcon name="clock_history_frame" /> Resumo das sessões</h3></div><b className={trainingStyles.sessionCount}>{weekly.length}/6</b></div>
        <div className={trainingStyles.progress} role="progressbar" aria-label="Sessões concluídas na semana" aria-valuemin={0} aria-valuemax={TRAINING_DAYS.length} aria-valuenow={weekly.length}><i style={{ width: `${weekly.length / TRAINING_DAYS.length * 100}%` }} /></div>
        <div className={trainingStyles.weekStats}><div><ClassicIcon name="group" /><b>{new Set(weekly.flatMap((session) => session.playerIds)).size}</b><span>atletas</span></div><div><ClassicIcon name="chart_bar" /><b>{weekly.reduce((sum, session) => sum + session.overallImprovements, 0)}</b><span>evoluções</span></div><div><InterfaceIcon name="activity" /><b>{weekly.reduce((sum, session) => sum + session.energySpent, 0)}</b><span>pts de energia</span></div></div>
        <h4>DIÁRIO DE TREINO</h4>
        {weekly.length ? <ol className={trainingStyles.sessionLog}>{weekly.map((session) => <li key={session.id}><span className={trainingStyles.sessionDay}>{session.day.slice(0, 3)}</span><span className={trainingStyles.sessionInfo}><b>{trainingDrillLabel(session.drill)}</b><small>{session.intensity} · {session.playerIds.length} atletas</small></span><span className={trainingStyles.sessionEnergy}>{session.energyRecovered ? `+${Math.round(session.energyRecovered / session.playerIds.length)}` : `−${Math.round(session.energySpent / session.playerIds.length)}`}%/atleta</span></li>)}</ol> : <div className={trainingStyles.emptyWeek}><TrainingIcon name="posicionamento" size={72} /><b>Sua semana começa aqui</b><p>Nenhuma sessão concluída nesta semana. As atividades realizadas aparecerão aqui.</p></div>}

        <p className={trainingStyles.energyFootnote}>A evolução é gradual e depende da idade, força e intensidade. Cada dia aceita uma sessão.</p>
      </aside>
    </div>
  </div>;
}
