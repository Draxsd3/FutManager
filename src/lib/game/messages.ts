import type { CareerSave, EditorDatabase } from "./editor-data";
export type MessageCategory = "market" | "team" | "board" | "players";
export type CareerMessage = {
  id: string;
  category: MessageCategory;
  sender: string;
  subject: string;
  body: string;
  date?: string;
  amount?: number;
};
export const MAJOR_TRANSFER_BRL = 5_000_000;
const status = {
  countered: "Em negociação",
  agreed: "Acordo alcançado",
  rejected: "Negociação encerrada",
  completed: "Transferência concluída",
};
/** Projection of this frozen career only. Never creates fictional emails, rumors or cash effects. */
export function careerMessages(
  save: CareerSave,
  db: EditorDatabase,
): CareerMessage[] {
  const p = save.progress;
  if (!p) return [];
  const messages = new Map<string, CareerMessage>();
  const clubs = new Map(db.clubs.map((c) => [c.id, c.name])),
    players = new Map(db.players.map((p) => [p.id, p]));
  const add = (m: CareerMessage) => {
    if (!m.date || m.date <= save.inGameDate) messages.set(m.id, m);
  };
  const club = (id: string) => clubs.get(id) ?? "Clube não cadastrado";
  for (const deal of p.transferNegotiations ?? []) {
    const amount =
      deal.status === "completed"
        ? deal.agreedFeeBrl
        : (deal.agreedFeeBrl ?? deal.counterFeeBrl ?? deal.offerFeeBrl);
    const involved =
      deal.buyerClubId === save.clubId || deal.sourceClubId === save.clubId;
    const date =
      deal.status === "completed" ? deal.completedOn : deal.createdOn;
    const body = `${deal.playerName}: ${deal.freeAgent ? "Sem clube" : deal.sourceClub || club(deal.sourceClubId)} → ${club(deal.buyerClubId)}. ${deal.kind === "loan" ? "Empréstimo" : "Transferência definitiva"}. ${deal.message}`;
    const id = `deal:${deal.id}:${deal.status}:${deal.revision ?? 0}`;
    if (
      amount !== undefined &&
      Number.isFinite(amount) &&
      amount >= MAJOR_TRANSFER_BRL
    )
      add({
        id,
        category: "market",
        sender: "Mercado da Bola",
        subject: `${status[deal.status]} — ${deal.playerName}`,
        body,
        date,
        amount,
      });
    if (involved)
      add({
        id: `club:${id}`,
        category: "players",
        sender: deal.playerName,
        subject: status[deal.status],
        body,
        date,
        amount,
      });
  }
  for (const event of p.managerMarket?.staff?.events ?? [])
    if (event.coachId === p.managerMarket?.staff?.humanId) {
      add({
        id: `board:${event.id}`,
        category: "board",
        sender: `Diretoria · ${club(event.clubId)}`,
        subject: {
          hired: "Contratação confirmada",
          dismissed: "Desligamento do treinador",
          expired: "Contrato do treinador encerrado",
        }[event.type],
        body: `Registro da diretoria: ${save.managerName}, ${club(event.clubId)}. Custo registrado: ${(event.costCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
        date: event.date,
      });
    }
  const board = p.managerMarket?.staff?.boards[save.clubId];
  if (board)
    add({
      id: `objective:${save.clubId}:${board.objective}`,
      category: "board",
      sender: "Diretoria",
      subject: "Objetivo para o trabalho",
      body: board.objective,
    });
  for (const application of p.managerMarket?.applications ?? [])
    add({
      id: `job:${application.id}:${application.status}`,
      category: "board",
      sender: `Diretoria · ${club(application.clubId)}`,
      subject: "Retorno da candidatura",
      body: application.message,
      date: application.appliedOn,
    });
  const own = new Set(
    (p.careerSquad ?? []).map((player) => player.sourceId).filter(Boolean),
  );
  for (const player of db.players)
    if (player.clubId === save.clubId) own.add(player.id);
  for (const event of p.worldMarket?.population?.events ?? [])
    if (own.has(event.personId))
      add({
        id: `player:${event.id}`,
        category: "players",
        sender:
          players.get(event.personId)?.name ??
          p.careerSquad?.find((player) => player.sourceId === event.personId)
            ?.name ??
          "Jogador do elenco",
        subject: {
          injury: "Departamento médico: lesão",
          relapse: "Reavaliação médica",
          recovered: "Recuperação concluída",
          development: "Evolução do jogador",
          decline: "Avaliação do jogador",
          retired: "Aposentadoria",
          "promise-kept": "Promessa cumprida",
          "promise-broken": "Promessa não cumprida",
        }[event.kind],
        body: `${event.reason} Registro de jogador do elenco atual; a data é a do acontecimento.`,
        date: event.date,
      });
  for (const player of p.careerSquad ?? [])
    for (const offer of p.playerCareers?.[player.id]?.transferOffers ?? [])
      add({
        id: `offer:${offer.id}:${offer.status}`,
        category: "players",
        sender: offer.club,
        subject: `Proposta por ${player.name}`,
        body: `Situação: ${{ pending: "aguardando resposta", accepted: "aceita", rejected: "recusada", expired: "expirada" }[offer.status]}. Valor: ${(offer.fee * 1_000_000).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.${offer.expiresOn ? ` Prazo: ${offer.expiresOn}.` : ""}`,
        date: offer.sentOn,
      });
  for (const f of p.competitionSeason?.fixtures ?? [])
    if (
      f.status === "played" &&
      [f.homeClubId, f.awayClubId].includes(save.clubId)
    )
      add({
        id: `match:${f.id}`,
        category: "team",
        sender: "Comissão técnica",
        subject: `${f.home} ${f.homeScore} × ${f.awayScore} ${f.away}`,
        body: `Partida encerrada em ${f.competitionName}. Consulte o resultado e as estatísticas na agenda.`,
        date: f.scheduledDate,
      });
  for (const s of p.trainingSessions ?? [])
    add({
      id: `training:${s.id}`,
      category: "team",
      sender: "Comissão técnica",
      subject: `Relatório de treino · semana ${s.week}`,
      body: `${s.day}, temporada ${s.season}: ${s.playerIds.length} jogadores. Intensidade ${s.intensity.toLowerCase()}. Melhorias de força registradas: ${s.overallImprovements}.`,
    });
  return [...messages.values()].sort(
    (a, b) =>
      (b.date ?? "").localeCompare(a.date ?? "") || a.id.localeCompare(b.id),
  );
}
