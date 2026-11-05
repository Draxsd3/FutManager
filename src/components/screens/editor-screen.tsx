"use client";
import { WindowHeader } from "@/components/ui/window-header";
import { ManagementIcon } from "@/components/ui/management-header";
import { TransfermarktSettings, type TransfermarktSyncResult } from "./transfermarkt-settings";
import { prepareNationalSeed } from "@/lib/importer/transfermarkt-seed";
import { COLLECTION_VERSION } from "@/lib/importer/transfermarkt-live";
import { saveTransfermarktCheckpoint } from "@/lib/importer/database-cache";

import { useMemo, useState, useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import { applyNovemberDatabase } from "@/lib/importer/november-database";
import { importBrazilDatabase } from "@/lib/importer/brazil-database";
import { divisionKeys, type DivisionKey, type PositionCode } from "@/lib/game/mock-data";
import { brazilianStates } from "@/lib/game/competitions";
import { MAX_CLUB_SQUAD_SIZE, type EditorClub, type EditorDatabase, type EditorPlayer } from "@/lib/game/editor-data";
import styles from "./editor-screen.module.css";
import { automaticKitSvg, svgImage } from "@/lib/kits/design";
import { KitStudio } from "./kit-studio";
import { ClassicIcon, type ClassicIconName } from "@/components/ui/classic-icon";
import { clubCrestAsset, clubKitAsset } from "@/lib/game/assets";
import { clubThemeStyle } from "@/components/ui/app-shell";

type EditorModal = "club" | "player" | null;
const positions: PositionCode[] = ["G", "L", "Z", "M", "A"];
const qualities = ["Armação", "Cabeceio", "Colocação", "Cruzamento", "Desarme", "Finalização", "Marcação", "Passe", "Reflexo", "Resistência", "Velocidade"];

export function EditorScreen({ database, userId, syncLabel, onChange, onBack, onSynchronize }: { userId: string; database: EditorDatabase; syncLabel: string; onSynchronize?: (progress: (message: string) => void, signal: AbortSignal, resume?: boolean) => Promise<TransfermarktSyncResult>; onChange: (database: EditorDatabase) => void; onBack: () => void }) {
  const [section, setSection] = useState<"overview" | "clubs" | "data">("overview");
  const [apiBusy, setApiBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileMessage, setFileMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  async function importJson(file: File | undefined) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) { setFileMessage("Arquivo muito grande. O limite é 30 MB."); return; }
    setFileBusy(true); setFileMessage("");
    try {
      const input: unknown = JSON.parse(await file.text());
      const { checkpoint, report } = prepareNationalSeed(input, `arquivo-${crypto.randomUUID()}`);
      if (!window.confirm(`Arquivo validado: ${report.clubs} clubes e ${report.players} jogadores; ${report.pendingClubs} clubes com pendências. Preparar este arquivo para a coleta da API? Isso substitui qualquer progresso de coleta anterior, mas não altera o catálogo nem as carreiras.`)) { setFileMessage("Importação cancelada. Nenhum dado foi alterado."); return; }
      await saveTransfermarktCheckpoint(userId, { ...checkpoint, collectionVersion: COLLECTION_VERSION });
      setFileMessage(`Arquivo preparado: ${report.validClubs} clubes válidos e ${report.pendingClubs} com pendências. Use Retomar coleta para consultar os dados faltantes, empréstimos e títulos. O catálogo só muda após a confirmação final.`);
    } catch (error) { setFileMessage(`Não foi possível preparar o JSON. Nenhum dado foi alterado. ${error instanceof Error && !(error instanceof SyntaxError) && error.name !== "ZodError" ? error.message : "Confira se é uma coleta brasileira compatível."}`); }
    finally { setFileBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }
  async function prepareBundledCollection() {
    setFileBusy(true); setFileMessage("");
    try {
      const response = await fetch("/api/transfermarkt/novembro", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível validar o arquivo incorporado.");
      const { checkpoint, report } = await response.json();
      if (!window.confirm(`Coleta de 04/11/2026: ${report.clubs} clubes e ${report.players} jogadores; ${report.pendingClubs} clubes têm pendências. Usar estes dados atuais como ponto de partida? Isso substitui o progresso de coleta anterior, mas ainda não altera o catálogo nem as carreiras.`)) { setFileMessage("Preparação cancelada. Nenhum dado foi alterado."); return; }
      await saveTransfermarktCheckpoint(userId, { ...checkpoint, collectionVersion: COLLECTION_VERSION });
      setFileMessage(`Arquivo de 04/11/2026 preparado: ${report.validClubs} clubes válidos e ${report.pendingClubs} com pendências. Clique em Retomar coleta para completar e revisar antes de aplicar. Os elencos são os atuais na data da coleta, não os de janeiro de 2026.`);
    } catch (error) { setFileMessage(error instanceof Error ? error.message : "Não foi possível preparar a coleta."); }
    finally { setFileBusy(false); }
  }
  async function applyReceivedCollection() {
    if (!window.confirm("Atualizar o catálogo com os 156 clubes e 4.208 jogadores da coleta de novembro? Os elencos destes clubes serão substituídos, inclusive alterações manuais nesses elencos. Carreiras salvas e uniformes serão preservados. Posições ausentes serão estimadas; quatro elencos não possuem 11 atletas ou goleiro. A coleta não representa janeiro de 2026.")) return;
    setFileBusy(true); setFileMessage("");
    try {
      const result = await applyNovemberDatabase(database);
      onChange(result.database);
      setFileMessage(`${result.clubs} clubes e ${result.players} jogadores aplicados ao catálogo. ${result.provisional} posições são estimadas; ${result.shortRosters} elencos estão incompletos ou sem goleiro e precisam de revisão. Consulte o indicador de salvamento. Carreiras existentes não foram alteradas.`);
    } catch (error) { setFileMessage(`Não foi possível aplicar a coleta. Nenhum dado foi alterado. ${error instanceof Error ? error.message : ""}`); }
    finally { setFileBusy(false); }
  }
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  async function importBase() {
    if (!window.confirm("Importar a base brasileira 2026? Clubes brasileiros reconhecidos terão cadastro e elenco substituídos; clubes personalizados e carreiras salvas serão mantidos. Camisas próprias do ateliê não serão apagadas. Há atributos financeiros/de força estimados e 8 participantes da Série D ausentes na base.")) return;
    setImporting(true);
    try { const next = await importBrazilDatabase(database); onChange(next); setImportMessage("Base importada: 706 clubes, até 35 atletas por clube. Divisões 2026; elencos dos arquivos. Valores, força, numeração e contratos são padrões da simulação. Fundação 0 = não informada."); }
    catch { setImportMessage("Não foi possível importar. Seus dados anteriores foram mantidos."); }
    finally { setImporting(false); }
  }
  const [tab, setTab] = useState<"squad" | "kits">("squad");
  const [selectedClubId, setSelectedClubId] = useState(database.clubs[0]?.id ?? "");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<"Todos" | PositionCode>("Todos");
  const [juniors, setJuniors] = useState(false);
  const [modal, setModal] = useState<EditorModal>(null);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("input, select, button")?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setModal(null);
      if (event.key !== "Tab") return;
      const options = Array.from(dialog.current?.querySelectorAll<HTMLElement>("input, select, button:not(:disabled)") ?? []);
      const first = options[0], last = options[options.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
      if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
    }
    document.addEventListener("keydown", keyboard);
    return () => {document.removeEventListener("keydown", keyboard);previous?.focus();};
  }, [modal]);
  const selectedClub = database.clubs.find((club) => club.id === selectedClubId) ?? database.clubs[0] ?? null;
  const selectedPlayer = database.players.find((player) => player.id === selectedPlayerId) ?? null;
  const totalClubPlayerCount = database.players.filter((player) => player.clubId === selectedClub?.id).length;
  const squadIsFull = totalClubPlayerCount >= MAX_CLUB_SQUAD_SIZE;

  const visibleClubs = useMemo(() => {
    const teamTerm = teamSearch.trim().toLocaleLowerCase("pt-BR");
    const playerTerm = playerSearch.trim().toLocaleLowerCase("pt-BR");
    return database.clubs.filter((club) => (!teamTerm || club.name.toLocaleLowerCase("pt-BR").includes(teamTerm)) && (!playerTerm || database.players.some((player) => player.clubId === club.id && player.name.toLocaleLowerCase("pt-BR").includes(playerTerm))));
  }, [database.clubs, database.players, playerSearch, teamSearch]);

  const clubPlayers = useMemo(() => database.players
    .filter((player) => player.clubId === selectedClub?.id)
    .filter((player) => !juniors || player.age <= 20)
    .filter((player) => positionFilter === "Todos" || player.primaryPosition === positionFilter)
    .sort((a, b) => positionOrder(a.primaryPosition) - positionOrder(b.primaryPosition) || b.overall - a.overall), [database.players, juniors, positionFilter, selectedClub?.id]);

  function updateClub(patch: Partial<EditorClub>) {
    if (!selectedClub) return;
    onChange({ ...database, clubs: database.clubs.map((club) => club.id === selectedClub?.id ? { ...club, ...patch } : club) });
  }

  function updatePlayer(patch: Partial<EditorPlayer>) {
    if (!selectedPlayer) return;
    if (patch.shirtNumber && database.players.some((player) => player.clubId === selectedPlayer.clubId && player.id !== selectedPlayer.id && player.shirtNumber === patch.shirtNumber)) {
      window.alert("Este número de camisa já está em uso.");
      return;
    }
    onChange({ ...database, players: database.players.map((player) => player.id === selectedPlayer.id ? { ...player, ...patch, ...(patch.primaryPosition && player.transfermarkt ? { transfermarkt: { ...player.transfermarkt, estimatedFields: player.transfermarkt.estimatedFields?.filter(field => field !== "primaryPosition") } } : {}) } : player) });
  }

  function addClub() {
    const club: EditorClub = { id: crypto.randomUUID(), name: "Nova equipe", shortName: "NOV", division: "Série A", foundedYear: 2000, primaryColor: "#e52b31", secondaryColor: "#ffffff", stadiumName: "Estádio Municipal", stadiumCapacity: 15000, country: "Brasil", level: 8, coachName: "Técnico interino", kitStyle: "lisa" };
    onChange({ ...database, clubs: [...database.clubs, club] });
    setSelectedClubId(club.id);
    setModal("club");
  }

  function removeClub() {
    if (!selectedClub || !window.confirm(`Deletar ${selectedClub.name} e seu elenco?`)) return;
    const clubs = database.clubs.filter((club) => club.id !== selectedClub.id);
    onChange({ clubs, players: database.players.filter((player) => player.clubId !== selectedClub.id) });
    setSelectedClubId(clubs[0]?.id ?? "");
    setSelectedPlayerId("");
  }

  function addPlayer(random = false) {
    if (!selectedClub) return;
    if (squadIsFull) {
      window.alert(`O elenco do ${selectedClub.name} já atingiu o limite de ${MAX_CLUB_SQUAD_SIZE} jogadores.`);
      return;
    }
    const used = new Set(database.players.filter((player) => player.clubId === selectedClub.id).map((player) => player.shirtNumber));
    let shirtNumber = 1;
    while (used.has(shirtNumber) && shirtNumber < 99) shirtNumber += 1;
    const names = ["André Lima", "Caio Nunes", "Bruno Rocha", "Diego Alves", "Felipe Santos", "João Vitor"];
    const primaryPosition = random ? positions[Math.floor(Math.random() * positions.length)] : "M";
    const overall = random ? 55 + Math.floor(Math.random() * 30) : 60;
    const player: EditorPlayer = { id: crypto.randomUUID(), clubId: selectedClub.id, name: random ? names[Math.floor(Math.random() * names.length)] : "Novo jogador", shirtNumber, primaryPosition, secondaryPosition: primaryPosition === "G" ? null : primaryPosition === "A" ? "M" : "A", overall, age: random ? 17 + Math.floor(Math.random() * 18) : 20, preferredFoot: Math.random() > .25 ? "D" : "E", starRating: random ? Math.floor(Math.random() * 5) : 2, qualityPrimary: qualities[Math.floor(Math.random() * qualities.length)], qualitySecondary: qualities[Math.floor(Math.random() * qualities.length)], energy: 100, salaryMonthlyBrl: overall * 1000, marketValueBrl: Math.round((overall / 18) * 1_000_000), goals: 0, assists: 0, ownGoals: 0, averageRating: null, contractEndsOn: "2027-12-31", marketStatus: "normal" };
    onChange({ ...database, players: [...database.players, player] });
    setSelectedPlayerId(player.id);
    if (!random) setModal("player");
  }

  function removePlayer() {
    if (!selectedPlayer || !window.confirm(`Deletar ${selectedPlayer.name}?`)) return;
    onChange({ ...database, players: database.players.filter((player) => player.id !== selectedPlayer.id) });
    setSelectedPlayerId("");
  }

  function showDiagnostic(kind: "crest" | "kits" | "duplicates") {
    if (kind === "crest") setTeamSearch(database.clubs.find((club) => !club.shortName.trim())?.name ?? "__nenhum__");
    if (kind === "kits") setTeamSearch(database.clubs.find((club) => !club.primaryColor)?.name ?? "__nenhum__");
    if (kind === "duplicates") {
      const duplicate = database.players.find((player, index) => database.players.findIndex((item) => item.name === player.name && item.clubId === player.clubId) !== index);
      setPlayerSearch(duplicate?.name ?? "__nenhum__");
    }
  }

  return <main className={styles.screen} style={selectedClub ? clubThemeStyle(selectedClub.name, selectedClub) : undefined}>
    <header className={styles.pageHeader}><div><p>FUTMANAGER / BANCO DE DADOS</p><h1><ManagementIcon name="pencil" />Editar universo</h1><p>Configure a base de dados para suas próximas carreiras.</p></div><button disabled={apiBusy || fileBusy || importing} onClick={onBack}>← Voltar ao início</button></header>
    <nav className={styles.mainNav} aria-label="Áreas do universo">{([["overview", "Visão geral"], ["clubs", "Clubes e jogadores"], ["data", "Dados e importação"]] as const).map(([id, title]) => <button key={id} aria-current={section === id ? "page" : undefined} disabled={apiBusy || fileBusy || importing} onClick={() => setSection(id)}>{title}</button>)}</nav>
    {section === "overview" && <section className={styles.overview} aria-label="Visão geral do universo">
      <div className={styles.hero}><div><p className={styles.eyebrow}>SEU UNIVERSO, SUAS REGRAS</p><h2>Seu futebol começa aqui.</h2><p>Gerencie os clubes e jogadores ou atualize os dados que serão usados nas novas carreiras.</p></div><span aria-hidden="true" className={styles.heroMark}>✦</span></div>
      <div className={styles.metrics}><div><span>Clubes cadastrados</span><strong>{database.clubs.length.toLocaleString("pt-BR")}</strong></div><div><span>Jogadores cadastrados</span><strong>{database.players.length.toLocaleString("pt-BR")}</strong></div><div><span>Estado do catálogo</span><strong className={styles.statusText}>{syncLabel}</strong></div></div>
      <div className={styles.actionGrid}><button onClick={() => setSection("clubs")}><span className={styles.actionIcon}>▦</span><strong>Clubes e jogadores</strong><small>Edite elencos, times e uniformes.</small><b>Explorar clubes →</b></button><button onClick={() => setSection("data")}><span className={styles.actionIcon}>↥</span><strong>Dados e importação</strong><small>Importe um JSON ou consulte a API.</small><b>Gerenciar dados →</b></button></div>
      <p className={styles.safetyNote}>Alterações no universo são usadas em novas carreiras. Suas carreiras salvas e uniformes personalizados são preservados.</p>
    </section>}
    <section hidden={section !== "data"} className={styles.dataPage} aria-label="Dados e importação">
      <div className={styles.dataIntro}><div><p className={styles.eyebrow}>CENTRAL DE DADOS</p><h2>Atualize seu universo</h2><p>Escolha uma fonte e revise os dados antes de aplicar ao catálogo.</p></div></div>
      <div className={styles.dataCards}><article className={styles.dataCard}><span className={styles.cardIndex}>ARQUIVO RECEBIDO / 04 NOV 2026</span><h3>Coleta Transfermarkt recebida</h3><p>156 clubes e 4.208 jogadores. Elencos atuais em novembro. As posições faltantes são estimadas e quatro elencos precisam de revisão. A API de empréstimos usa a situação de janeiro de 2026, que pode diferir desses elencos.</p><button className={styles.outlineButton} disabled={fileBusy || apiBusy || importing} onClick={() => void applyReceivedCollection()}>Atualizar catálogo com dados recebidos</button><button className={styles.outlineButton} disabled={fileBusy || apiBusy || importing} onClick={() => void prepareBundledCollection()}>{fileBusy ? "Preparando…" : "Preparar dados recebidos"}</button></article><article className={styles.dataCard}><span className={styles.cardIndex}>01 / ARQUIVO</span><h3>Importar JSON</h3><p>Selecione uma coleta brasileira do Transfermarkt com as competições Séries A, B, C e D. O arquivo é validado e preparado; a API completa pendências antes da aplicação. Retome a coleta em até 24 horas.</p><input ref={fileInput} type="file" accept=".json,application/json" aria-label="Selecionar JSON do Transfermarkt" disabled={fileBusy || apiBusy} onChange={event => void importJson(event.target.files?.[0])} /></article>
      <article className={styles.dataCard}><span className={styles.cardIndex}>02 / BASE INCLUÍDA</span><h3>Base brasileira 2026</h3><p>Usar os clubes e elencos incluídos no jogo. Os dados de força e finanças são estimativas.</p><button className={styles.outlineButton} disabled={importing || apiBusy || fileBusy} onClick={() => void importBase()}>{importing ? "Importando…" : "Importar base incluída"}</button><p role="status">{importMessage}</p></article></div>
      {fileMessage && <p className={styles.safetyNote} role="status">{fileMessage}</p>}
      <div className={styles.apiPanel}><span className={styles.cardIndex}>03 / SINCRONIZAÇÃO</span>{onSynchronize ? <TransfermarktSettings userId={userId} onSynchronize={onSynchronize} onBusyChange={setApiBusy} disabled={fileBusy || importing} /> : <p>Sincronização da API indisponível nesta tela.</p>}</div>
    </section>
    {section === "clubs" && <div className={styles.editorLayout}>
    <section className={styles.teamPanel}>
      <div className={styles.teamTableHeader}><span>Time</span><span>País</span><span>Nível</span></div>
      <div className={styles.teamList}>{visibleClubs.map((club) => <button key={club.id} aria-label={`${club.name}, ${club.country}, nível ${club.level}`} aria-pressed={club.id === selectedClub?.id} className={club.id === selectedClub?.id ? styles.teamSelected : ""} onClick={() => { setSelectedClubId(club.id); setSelectedPlayerId(""); }}><span>{club.name}</span><span><i className={styles.flag} />{club.country}</span><span>{club.level}</span></button>)}</div>
      <div className={styles.teamActions}><ClassicButton label="adicionar" icon="add" onClick={addClub} /><ClassicButton label="editar" icon="pencil" onClick={() => setModal("club")} /><ClassicButton label="deletar" icon="delete" onClick={removeClub} /></div>
      <div className={styles.searchBox}>
        <label><strong>Procurar time:</strong><input value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} /><button aria-label="Procurar time"><ClassicIcon name="magnifier" /></button></label>
        <label><strong>Procurar jogador:</strong><input value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} /><button aria-label="Procurar jogador"><ClassicIcon name="magnifier" /></button></label>
        <strong>Mostrar times:</strong><div><button onClick={() => showDiagnostic("crest")}>sem sigla</button><button onClick={() => showDiagnostic("kits")}>sem cor principal</button><button onClick={() => showDiagnostic("duplicates")}>jogadores duplicados</button></div>
      </div>

    </section>

    {selectedClub ? <section className={styles.clubPanel} style={{ "--club-color": selectedClub.primaryColor, "--club-secondary": selectedClub.secondaryColor } as CSSProperties}>

      <header className={styles.clubHeader}>
        <div className={styles.clubFacts}><strong>{selectedClub.name}</strong><span>{selectedClub.division}</span><b className={styles.level}>{selectedClub.level}</b><span><i className={styles.flag} /> {selectedClub.country}</span><span><ClassicIcon name="sport" /> {selectedClub.stadiumName}</span><span>{selectedClub.stadiumCapacity.toLocaleString("pt-BR")} lugares</span><span><ClassicIcon name="user_suit" /> {selectedClub.coachName}</span></div>
        <ClubCrest club={selectedClub} /><div className={styles.kits}><Shirt club={selectedClub} tone="primary" /><Shirt club={selectedClub} tone="secondary" /><Shirt club={selectedClub} tone="third" /></div>
      </header>
      <nav className={styles.editorTabs} aria-label="Áreas do editor"><button aria-pressed={tab === "squad"} onClick={() => setTab("squad")}>Elenco e jogadores <span>{totalClubPlayerCount}</span></button><button aria-pressed={tab === "kits"} onClick={() => setTab("kits")}>✦ Estúdio de uniformes</button></nav>
      {tab === "kits" ? <KitStudio key={`${userId}:${selectedClub.id}`} club={selectedClub} userId={userId} /> : <>
      <div className={styles.squadTabs}><button className={!juniors ? styles.activeSquadTab : ""} onClick={() => setJuniors(false)}><ClassicIcon name="bullet_green" /> Principal</button><button className={juniors ? styles.activeSquadTab : ""} onClick={() => setJuniors(true)}><ClassicIcon name="user_green" /> Juniores</button></div>
      <div className={styles.playerTableWrap}><table className={styles.playerTable}><thead><tr><th>★</th><th>Nº</th><th>Nome</th><th>Posição</th><th>2ª pos.</th><th>Força</th><th>Qualidades</th><th>Idade</th><th>Lado</th></tr></thead><tbody>{clubPlayers.map((player) => <tr key={player.id} className={player.id === selectedPlayer?.id ? styles.playerSelected : ""} onClick={() => setSelectedPlayerId(player.id)} onDoubleClick={() => { setSelectedPlayerId(player.id); setModal("player"); }} tabIndex={0} aria-label={`Selecionar jogador ${player.name}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedPlayerId(player.id); if (event.key === "Enter") setModal("player"); } }}><td className={styles.stars}>{"★".repeat(player.starRating)}<span>{"☆".repeat(5 - player.starRating)}</span></td><td>{player.shirtNumber}</td><td>{player.name}</td><td>{positionName(player.primaryPosition)}{player.transfermarkt?.estimatedFields?.includes("primaryPosition") && <small title="Posição estimada pela necessidade do elenco, não informada pela fonte"> (estimada)</small>}</td><td>{player.secondaryPosition ? positionName(player.secondaryPosition) : "—"}</td><td><b>{player.overall}</b></td><td>{shortQuality(player.qualityPrimary)}/{shortQuality(player.qualitySecondary)}</td><td>{player.age}</td><td>{player.preferredFoot}</td></tr>)}</tbody></table></div>
      <footer className={styles.squadFooter}><span title="Limite de elenco"><ClassicIcon name="group" /> {totalClubPlayerCount}/{MAX_CLUB_SQUAD_SIZE}</span><span><ClassicIcon name="star" /> {clubPlayers.filter((player) => player.starRating >= 4).length}</span><div className={styles.iconActions}><button aria-label="Adicionar jogador" onClick={() => addPlayer(false)} disabled={squadIsFull} title={squadIsFull ? "Limite técnico de 200 jogadores atingido" : "Adicionar jogador"}><ClassicIcon name="user_add" /></button><button aria-label="Editar jogador" onClick={() => selectedPlayer && setModal("player")} disabled={!selectedPlayer} title="Editar jogador"><ClassicIcon name="user_edit" /></button><button aria-label="Remover jogador" onClick={removePlayer} disabled={!selectedPlayer} title="Remover jogador"><ClassicIcon name="user_delete" /></button></div><button className={styles.randomButton} onClick={() => addPlayer(true)} disabled={squadIsFull} title={squadIsFull ? "Limite técnico de 200 jogadores atingido" : "Criar jogador aleatório"}><ClassicIcon name="user_add" /> Criar aleatório</button><select aria-label="Filtrar posição" value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as "Todos" | PositionCode)}><option>Todos</option>{positions.map((position) => <option key={position} value={position}>{positionName(position)}</option>)}</select></footer>
      </>}
    </section> : <section className={styles.emptyState}><h2>Nenhum clube cadastrado</h2><p>Adicione uma equipe ou importe uma base na área de dados.</p><button onClick={addClub}>Adicionar equipe</button></section>}
    </div>}

    {modal && selectedClub && <div className={styles.modalBackdrop} onMouseDown={() => setModal(null)}><section ref={dialog} role="dialog" aria-modal="true" aria-label={modal === "club" ? "Editar equipe" : "Editar jogador"} className={styles.modal} onKeyDown={(event) => { if(event.key === "Escape") setModal(null); }} onMouseDown={(event) => event.stopPropagation()}><WindowHeader level={2} title={modal === "club" ? "Editar equipe" : "Editar jogador"} onClose={() => setModal(null)} closeLabel="Fechar editor" />{modal === "club" ? <ClubForm club={selectedClub} onChange={updateClub} /> : <PlayerForm player={selectedPlayer} onChange={updatePlayer} />}<footer><button onClick={() => setModal(null)}>Salvar e fechar</button></footer></section></div>}
    <div className={styles.syncStatus}>{syncLabel}</div>
  </main>;
}

function ClubCrest({ club }: { club: EditorClub }) { const asset = clubCrestAsset(club.name); return asset ? <Image src={asset} alt={`Escudo do ${club.name}`} width={80} height={90} unoptimized className={styles.realCrest} /> : <div className={styles.crest} style={{ color: club.secondaryColor }}><span>★</span><strong>{club.shortName}</strong></div>; }
function Shirt({ club, tone }: { club: EditorClub; tone: "primary" | "secondary" | "third" }) { const kit = tone === "primary" ? 1 : tone === "secondary" ? 2 : 3; const asset = clubKitAsset(club.name, kit); return <Image src={asset ?? svgImage(automaticKitSvg(club, kit))} alt={`Uniforme ${kit} do ${club.name}`} width={87} height={100} unoptimized className={styles.realShirt} />; }
function ClassicButton({ label, icon, onClick }: { label: string; icon: ClassicIconName; onClick: () => void }) { return <button className={styles.classicButton} onClick={onClick}><ClassicIcon name={icon} />{label}</button>; }

function ClubForm({ club, onChange }: { club: EditorClub; onChange: (patch: Partial<EditorClub>) => void }) { return <div className={styles.formGrid}><Field label="Nome"><input value={club.name} onChange={(e) => onChange({ name: e.target.value })} /></Field><Field label="Sigla do escudo"><input maxLength={8} value={club.shortName} onChange={(e) => onChange({ shortName: e.target.value.toUpperCase() })} /></Field><Field label="País"><input value={club.country} onChange={(e) => onChange({ country: e.target.value })} /></Field><Field label="Nível"><input type="number" min={1} max={20} value={club.level} onChange={(e) => onChange({ level: Number(e.target.value) })} /></Field><Field label="Divisão"><select value={club.division} onChange={(e) => onChange({ division: e.target.value as DivisionKey })}>{[...divisionKeys, "Sem divisão nacional"].map((division) => <option key={division}>{division}</option>)}</select></Field><Field label="Estado"><select value={club.state ?? ""} onChange={(e) => onChange({ state: e.target.value || undefined })}><option value="">Sem estadual</option>{brazilianStates.map((state) => <option key={state}>{state}</option>)}</select></Field><Field label="Fundação"><input type="number" min={0} max={2100} title="0 = fundação não informada na base" value={club.foundedYear} onChange={(e) => onChange({ foundedYear: Number(e.target.value) })} /></Field><Field label="Técnico"><input value={club.coachName} onChange={(e) => onChange({ coachName: e.target.value })} /></Field><Field label="Modelo da camisa"><select value={club.kitStyle} onChange={(e) => onChange({ kitStyle: e.target.value as EditorClub["kitStyle"] })}><option value="lisa">Lisa</option><option value="listrada">Listrada</option><option value="faixa">Com faixa</option></select></Field><Field label="Cor principal"><input type="color" value={club.primaryColor} onChange={(e) => onChange({ primaryColor: e.target.value })} /></Field><Field label="Cor secundária"><input type="color" value={club.secondaryColor} onChange={(e) => onChange({ secondaryColor: e.target.value })} /></Field><Field label="Estádio"><input value={club.stadiumName} onChange={(e) => onChange({ stadiumName: e.target.value })} /></Field><Field label="Capacidade"><input type="number" min={500} max={200000} value={club.stadiumCapacity} onChange={(e) => onChange({ stadiumCapacity: Number(e.target.value) })} /></Field></div>; }

function PlayerForm({ player, onChange }: { player: EditorPlayer | null; onChange: (patch: Partial<EditorPlayer>) => void }) {
  if (!player) return <p>Selecione um jogador.</p>;
  return <div className={styles.formGrid}>
    <Field label="Nome"><input value={player.name} onChange={(e) => onChange({ name: e.target.value })} /></Field>
    <Field label="Camisa"><input type="number" min={1} max={99} value={player.shirtNumber} onChange={(e) => onChange({ shirtNumber: Number(e.target.value) })} /></Field>
    <Field label="Posição"><select value={player.primaryPosition} onChange={(e) => onChange({ primaryPosition: e.target.value as PositionCode })}>{positions.map((position) => <option key={position} value={position}>{positionName(position)}</option>)}</select></Field>
    <Field label="Segunda posição"><select value={player.secondaryPosition ?? ""} onChange={(e) => onChange({ secondaryPosition: (e.target.value || null) as PositionCode | null })}><option value="">Nenhuma</option>{positions.map((position) => <option key={position} value={position}>{positionName(position)}</option>)}</select></Field>
    <Field label="Força"><input type="number" min={1} max={100} value={player.overall} onChange={(e) => onChange({ overall: Number(e.target.value) })} /></Field>
    <Field label="Energia"><input type="number" min={0} max={100} value={player.energy} onChange={(e) => onChange({ energy: Number(e.target.value) })} /></Field>
    <Field label="Estrelas"><select value={player.starRating} onChange={(e) => onChange({ starRating: Number(e.target.value) })}>{[0,1,2,3,4,5].map((stars) => <option key={stars} value={stars}>{"★".repeat(stars) || "Sem estrela"}</option>)}</select></Field>
    <Field label="Qualidade principal"><select value={player.qualityPrimary} onChange={(e) => onChange({ qualityPrimary: e.target.value })}>{!qualities.includes(player.qualityPrimary) && <option>{player.qualityPrimary}</option>}{qualities.map((quality) => <option key={quality}>{quality}</option>)}</select></Field>
    <Field label="Qualidade secundária"><select value={player.qualitySecondary} onChange={(e) => onChange({ qualitySecondary: e.target.value })}>{!qualities.includes(player.qualitySecondary) && <option>{player.qualitySecondary}</option>}{qualities.map((quality) => <option key={quality}>{quality}</option>)}</select></Field>
    <Field label="Idade"><input type="number" min={15} max={50} value={player.age} onChange={(e) => onChange({ age: Number(e.target.value) })} /></Field>
    <Field label="Lado"><select value={player.preferredFoot} onChange={(e) => onChange({ preferredFoot: e.target.value as EditorPlayer["preferredFoot"] })}><option value="D">Direito</option><option value="E">Esquerdo</option><option value="A">Ambos</option></select></Field>
    <Field label="Salário mensal (R$)"><input type="number" min={0} value={player.salaryMonthlyBrl} onChange={(e) => onChange({ salaryMonthlyBrl: Number(e.target.value) })} /></Field>
    <Field label="Valor de mercado (R$)"><input type="number" min={0} value={player.marketValueBrl} onChange={(e) => onChange({ marketValueBrl: Number(e.target.value) })} /></Field>
    <Field label="Disponibilidade no mercado"><select value={player.marketStatus ?? "normal"} onChange={(e) => onChange({ marketStatus: e.target.value as EditorPlayer["marketStatus"] })}><option value="normal">Não listado</option><option value="sale">À venda</option><option value="loan">Para empréstimo</option></select></Field>
    <Field label="Fim do contrato"><input type="date" value={player.contractEndsOn} onChange={(e) => onChange({ contractEndsOn: e.target.value })} /></Field>
    <Field label="Gols"><input type="number" min={0} value={player.goals} onChange={(e) => onChange({ goals: Number(e.target.value) })} /></Field>
    <Field label="Assistências"><input type="number" min={0} value={player.assists} onChange={(e) => onChange({ assists: Number(e.target.value) })} /></Field>
    <Field label="Nota média"><input type="number" min={0} max={10} step="0.01" value={player.averageRating ?? ""} onChange={(e) => onChange({ averageRating: e.target.value ? Number(e.target.value) : null })} /></Field>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className={styles.field}><span>{label}</span>{children}</label>; }
function positionOrder(position: PositionCode) { return positions.indexOf(position); }
function positionName(position: PositionCode) { return ({ G: "Goleiro", L: "Lateral", Z: "Zagueiro", M: "Meia", A: "Atacante" } as const)[position]; }
function shortQuality(quality: string) { return quality.slice(0, 3); }
