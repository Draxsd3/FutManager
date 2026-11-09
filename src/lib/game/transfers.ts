import { assessMove, contextualPriceBrl } from "./simulation/market-rules";
import { dateAfterMonths } from "./loans";
import { civilDate } from "./simulation/foundation";
import { isFreeAgent } from "./player-contract";
import type { EditorPlayer, EditorDatabase } from "./editor-data";

export type TransferKind = "sale" | "loan";
export type TransferNegotiationStatus = "countered" | "agreed" | "rejected" | "completed";

export type TransferNegotiation = {
  id: string;
  playerId: string;
  playerName: string;
  sourceClubId: string;
  sourceClub: string;
  buyerClubId: string;
  kind: TransferKind;
  freeAgent?: boolean;
  /** Present only for new two-stage human purchases; absent in legacy and CPU deals. */
  negotiationPhase?: "club" | "player" | "ready";
  completedOn?: string;
  revision?: number;
  createdOn?: string;
  expiresOn?: string;
  respondAfter?: string;
  origin?: "cpu" | "human";
  agreedMonthlyWageBrl?: number;
  assessment?: import("./simulation/market-rules").MoveAssessment;
  /** Modeled now; non-cash settlements and commissions remain disabled until their ledger exists. */
  paymentTerms?: { kind: "cash" } | { kind: "instalments"; schedule: { dueOn: string; amountBrl: number }[] };
  commission?: { agentId: string; amountBrl: number; payerClubId: string };
  /** Simulation estimate at proposal date; absent in legacy negotiations. */
  releaseClauseBrl?: number;
  askingFeeBrl: number;
  offerFeeBrl: number;
  wageSharePercent: number;
  counterFeeBrl?: number;
  counterWageSharePercent?: number;
  agreedFeeBrl?: number;
  agreedWageSharePercent?: number;
  status: TransferNegotiationStatus;
  attempts: number;
  message: string;
};

export type TransferOfferInput = {
  id: string;
  playerId: string;
  buyerClubId: string;
  feeBrl: number;
  wageSharePercent?: number;
  date?: string;
  monthlyWageBrl?: number;
  twoStage?: boolean;
};

export type TransferNegotiationAction =
  | { type: "accept-counter" }
  | { type: "counter"; feeBrl: number; wageSharePercent?: number }
  | { type: "reject" }
  | { type: "complete" }
  | { type: "player-offer"; monthlyWageBrl: number };

export function askingFeeBrl(kind: TransferKind, marketValueBrl: number) {
  return kind === "sale" ? Math.max(100_000, Math.round(marketValueBrl)) : Math.max(25_000, Math.round(marketValueBrl * 0.05));
}

/** A listing signals willingness, not a prerequisite for approaching another club. */
export function playerAskingFeeBrl(player: EditorPlayer) {
  return isFreeAgent(player) ? 0 : askingFeeBrl(player.marketStatus === "loan" ? "loan" : "sale", player.marketValueBrl) * (player.marketStatus === "normal" ? 1.5 : 1);
}

/** Estimated game clause, not a sourced contractual fact. Missing/stale dates do not free a player. */
export function simulatedReleaseClauseBrl(player: EditorPlayer, date?: string): number | null {
  if (isFreeAgent(player)) return 0;
  if (!date || !Number.isFinite(player.marketValueBrl) || player.marketValueBrl <= 0) return null;
  try {
    civilDate(date); civilDate(player.contractEndsOn);
    if (player.contractEndsOn < date) return null; // stale data, not proof of release
    const base = Math.round(player.marketValueBrl * 2);
    const factor = player.contractEndsOn <= dateAfterMonths(date, 2) ? 0.1 : player.contractEndsOn <= dateAfterMonths(date, 6) ? 0.5 : 1;
    return Math.max(1, Math.round(base * factor));
  } catch { return null; }
}

export function transferAskingPrice(player: EditorPlayer, players: EditorPlayer[], date?: string) {
  return date ? contextualPriceBrl(player, players.filter(p => p.clubId === player.clubId), date) : playerAskingFeeBrl(player);
}

export function proposeTransfer(database: EditorDatabase, existing: TransferNegotiation[], input: TransferOfferInput): { negotiation?: TransferNegotiation; message: string } {
  const player = database.players.find((item) => item.id === input.playerId);
  if(player?.condition?.retiredOn) return {message:"Atleta aposentado não pode ser contratado."};
  const buyer = database.clubs.find((item) => item.id === input.buyerClubId);
  const seller = player && database.clubs.find((item) => item.id === player.clubId);
  const free = player ? isFreeAgent(player) : false;
  if (!player || !buyer || (!seller && !free) || seller?.id === buyer.id || !input.id) return { message: "Jogador ou clube inválido." };
  if (player.loan?.status === "active") return { message: "Atleta em empréstimo vigente: o vínculo precisa ser resolvido antes de uma nova transferência." };
  if (existing.some((item) => item.playerId === player.id && item.buyerClubId === buyer.id && item.status !== "rejected" && item.status !== "completed")) return { message: "Já existe uma negociação ativa por este atleta." };
  const kind: TransferKind = !free && player.marketStatus === "loan" ? "loan" : "sale";
  const askingFee = transferAskingPrice(player, database.players, input.date);
  const clause = kind === "sale" && !free ? simulatedReleaseClauseBrl(player, input.date) : null;
  const wageSharePercent = kind === "loan" ? input.wageSharePercent ?? 50 : 0;
  const validation = free ? input.feeBrl !== 0 ? "Jogador livre não tem taxa de transferência." : null : validateOffer(input.feeBrl, wageSharePercent, Math.max(askingFee, clause ?? 0), kind);
  if (validation) return { message: validation };
  const base: TransferNegotiation = {
    id: input.id,
    playerId: player.id,
    playerName: player.name,
    sourceClubId: seller?.id ?? "",
    sourceClub: seller?.name ?? "Sem clube",
    ...(free ? { freeAgent: true } : {}),
    buyerClubId: buyer.id,
    kind,
    askingFeeBrl: askingFee,
    ...(clause !== null && clause > 0 ? { releaseClauseBrl: clause } : {}),
    offerFeeBrl: Math.round(input.feeBrl),
    wageSharePercent,
    ...(input.monthlyWageBrl !== undefined && kind === "sale" ? {agreedMonthlyWageBrl: input.monthlyWageBrl} : {}),
    status: "rejected",
    attempts: 0,
    message: "",
  };
  const staged = input.twoStage === true && !free && kind === "sale";
  let negotiation = free ? { ...base, status: "agreed" as const, agreedFeeBrl: 0, agreedWageSharePercent: 100, message: "Atleta livre aceitou as condições salariais cadastradas. Revise os salários futuros antes de contratar." } : evaluateOffer(base);
  if (staged) {
    negotiation = {...negotiation, negotiationPhase: negotiation.status === "agreed" ? "player" : "club", agreedMonthlyWageBrl: undefined, ...(negotiation.status === "agreed" ? {message: "Condições do clube acertadas. Negocie o salário com o jogador."} : {})};
  }
  if(input.date && !staged) {
    const assessment=assessMove(player,database.players.filter(p=>p.clubId===buyer.id),kind,input.monthlyWageBrl ?? player.salaryMonthlyBrl,{database,buyerClubId:buyer.id,date:input.date});
    negotiation={...negotiation,createdOn:input.date,expiresOn:new Date(Date.parse(`${input.date}T12:00:00Z`)+14*86400000).toISOString().slice(0,10),revision:1,origin:"human",assessment,...(!assessment.accepted ? {status:"rejected",message:assessment.reason} : {})};
  }
  if (input.date && staged) negotiation = {...negotiation, createdOn: input.date, expiresOn: new Date(Date.parse(`${input.date}T12:00:00Z`)+14*86400000).toISOString().slice(0,10), revision: 1, origin: "human"};
  return { negotiation, message: negotiation.message };
}

export function respondToTransferNegotiation(negotiation: TransferNegotiation, action: TransferNegotiationAction): { negotiation: TransferNegotiation; message: string } {
  if (action.type === "accept-counter") {
    if (negotiation.status !== "countered" || negotiation.counterFeeBrl === undefined) return { negotiation, message: "Não há contraproposta ativa para aceitar." };
    const next = { ...negotiation, status: "agreed" as const, agreedFeeBrl: negotiation.counterFeeBrl, agreedWageSharePercent: negotiation.counterWageSharePercent ?? (negotiation.kind === "sale" ? 100 : 0), ...(negotiation.negotiationPhase === "club" ? {negotiationPhase: "player" as const} : {}), message: negotiation.negotiationPhase === "club" ? "Contraproposta do clube aceita. Negocie com o jogador." : "Contraproposta aceita. Revise o custo total e confirme a contratação." };
    return { negotiation: next, message: next.message };
  }
  if (action.type === "reject") {
    if (negotiation.status !== "countered" && negotiation.status !== "agreed") return { negotiation, message: "Não há negociação ativa para recusar." };
    const next = { ...negotiation, status: "rejected" as const, message: "Negociação encerrada sem acordo." };
    return { negotiation: next, message: next.message };
  }
  if (action.type === "player-offer") return { negotiation, message: "A proposta ao jogador precisa ser avaliada na carreira." };
  if (action.type === "complete") {
    if (negotiation.negotiationPhase && negotiation.negotiationPhase !== "ready") return { negotiation, message: "Negocie com o jogador antes de confirmar." };
    if (negotiation.status !== "agreed" || negotiation.agreedFeeBrl === undefined) return { negotiation, message: "A negociação ainda não foi aceita pelas duas partes." };
    const next = { ...negotiation, status: "completed" as const, message: "Contratação concluída e registrada no elenco." };
    return { negotiation: next, message: next.message };
  }
  if (negotiation.status !== "countered") return { negotiation, message: "Envie uma nova proposta somente após receber uma contraproposta." };
  const wageSharePercent = negotiation.kind === "loan" ? action.wageSharePercent ?? 50 : 0;
  const validation = validateOffer(action.feeBrl, wageSharePercent, Math.max(negotiation.askingFeeBrl, negotiation.releaseClauseBrl ?? 0), negotiation.kind);
  if (validation) return { negotiation, message: validation };
  const next = evaluateOffer({
    ...negotiation,
    offerFeeBrl: Math.round(action.feeBrl),
    wageSharePercent,
    counterFeeBrl: undefined,
    counterWageSharePercent: undefined,
    attempts: negotiation.attempts + 1,
  });
  const stagedNext = negotiation.negotiationPhase === "club" && next.status === "agreed" ? {...next, negotiationPhase: "player" as const, message: "Condições do clube acertadas. Negocie com o jogador."} : next;
  return { negotiation: stagedNext, message: stagedNext.message };
}

function validateOffer(feeBrl: number, wageSharePercent: number, askingFee: number, kind: TransferKind): string | null {
  if (!Number.isFinite(feeBrl) || feeBrl <= 0 || feeBrl > askingFee * 3) return "Informe uma proposta positiva, de no máximo três vezes o valor pedido.";
  if (kind === "loan" && (!Number.isFinite(wageSharePercent) || wageSharePercent < 0 || wageSharePercent > 100)) return "A participação salarial deve ficar entre 0% e 100%.";
  return null;
}

function evaluateOffer(offer: TransferNegotiation): TransferNegotiation {
  if (offer.kind === "sale" && offer.releaseClauseBrl && offer.offerFeeBrl >= offer.releaseClauseBrl) return { ...offer, status: "agreed", agreedFeeBrl: offer.offerFeeBrl, agreedWageSharePercent: 100, message: "Multa simulada atingida: o clube libera o atleta. Confirme a contratação após revisar o custo e o aceite salarial." };
  const feeRatio = offer.offerFeeBrl / offer.askingFeeBrl;
  const salaryMeetsTerms = offer.kind !== "loan" || offer.wageSharePercent >= 50;
  if (feeRatio >= 0.95 && salaryMeetsTerms) {
    return { ...offer, status: "agreed", agreedFeeBrl: offer.offerFeeBrl, agreedWageSharePercent: offer.kind === "sale" ? 100 : offer.wageSharePercent, message: `${offer.sourceClub} aceitou a proposta. Confirme para concluir a contratação.` };
  }
  const minimumFeeRatio = offer.kind === "loan" ? 0.45 : 0.65;
  const minimumWageShare = offer.kind === "loan" ? 20 : 0;
  const canCounter = feeRatio >= minimumFeeRatio && offer.wageSharePercent >= minimumWageShare && offer.attempts < 2;
  if (canCounter) {
    const counterFeeBrl = offer.askingFeeBrl;
    const counterWageSharePercent = offer.kind === "loan" ? 50 : 100;
    return {
      ...offer,
      status: "countered",
      counterFeeBrl,
      counterWageSharePercent,
      message: `${offer.sourceClub} fez uma contraproposta: ${formatBrl(counterFeeBrl)}${offer.kind === "loan" ? ` e ${counterWageSharePercent}% dos salários` : ""}.`,
    };
  }
  return { ...offer, status: "rejected", message: `${offer.sourceClub} recusou a proposta. Ajuste o valor e tente novamente.` };
}

export function databaseWithCompletedTransfers(database: EditorDatabase, negotiations: TransferNegotiation[]) {
  // Negotiations are newest first: an older loan must not override a later sale.
  const completed = new Map<string, TransferNegotiation>();
  for (const deal of negotiations) if (deal.status === "completed" && !completed.has(deal.playerId)) completed.set(deal.playerId, deal);
  if (!completed.size) return database;
  return {
    ...database,
    players: database.players.map((player) => {
      const deal = completed.get(player.id);
      return deal ? { ...player, clubId: deal.buyerClubId, marketStatus: "normal" as const } : player;
    }),
  };
}

export function formatBrl(value: number) {
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
}
