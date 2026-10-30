import type { EditorDatabase } from "./editor-data";

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
};

export type TransferNegotiationAction =
  | { type: "accept-counter" }
  | { type: "counter"; feeBrl: number; wageSharePercent?: number }
  | { type: "reject" }
  | { type: "complete" };

export function askingFeeBrl(kind: TransferKind, marketValueBrl: number) {
  return kind === "sale" ? Math.max(100_000, Math.round(marketValueBrl)) : Math.max(25_000, Math.round(marketValueBrl * 0.05));
}

export function proposeTransfer(database: EditorDatabase, existing: TransferNegotiation[], input: TransferOfferInput): { negotiation?: TransferNegotiation; message: string } {
  const player = database.players.find((item) => item.id === input.playerId);
  const buyer = database.clubs.find((item) => item.id === input.buyerClubId);
  const seller = player && database.clubs.find((item) => item.id === player.clubId);
  if (!player || !buyer || !seller || seller.id === buyer.id || !input.id) return { message: "Jogador ou clube inválido." };
  if (player.marketStatus !== "sale" && player.marketStatus !== "loan") return { message: "Este atleta não está listado para venda ou empréstimo." };
  if (existing.some((item) => item.playerId === player.id && item.status !== "rejected" && item.status !== "completed")) return { message: "Já existe uma negociação ativa por este atleta." };
  const kind = player.marketStatus;
  const askingFee = askingFeeBrl(kind, player.marketValueBrl);
  const wageSharePercent = kind === "loan" ? input.wageSharePercent ?? 50 : 0;
  const validation = validateOffer(input.feeBrl, wageSharePercent, askingFee, kind);
  if (validation) return { message: validation };
  const base: TransferNegotiation = {
    id: input.id,
    playerId: player.id,
    playerName: player.name,
    sourceClubId: seller.id,
    sourceClub: seller.name,
    buyerClubId: buyer.id,
    kind,
    askingFeeBrl: askingFee,
    offerFeeBrl: Math.round(input.feeBrl),
    wageSharePercent,
    status: "rejected",
    attempts: 0,
    message: "",
  };
  const negotiation = evaluateOffer(base);
  return { negotiation, message: negotiation.message };
}

export function respondToTransferNegotiation(negotiation: TransferNegotiation, action: TransferNegotiationAction): { negotiation: TransferNegotiation; message: string } {
  if (action.type === "accept-counter") {
    if (negotiation.status !== "countered" || negotiation.counterFeeBrl === undefined) return { negotiation, message: "Não há contraproposta ativa para aceitar." };
    const next = { ...negotiation, status: "agreed" as const, agreedFeeBrl: negotiation.counterFeeBrl, agreedWageSharePercent: negotiation.counterWageSharePercent ?? (negotiation.kind === "sale" ? 100 : 0), message: "Contraproposta aceita. Revise o custo total e confirme a contratação." };
    return { negotiation: next, message: next.message };
  }
  if (action.type === "reject") {
    if (negotiation.status !== "countered") return { negotiation, message: "Não há contraproposta ativa para recusar." };
    const next = { ...negotiation, status: "rejected" as const, message: "Negociação encerrada sem acordo." };
    return { negotiation: next, message: next.message };
  }
  if (action.type === "complete") {
    if (negotiation.status !== "agreed" || negotiation.agreedFeeBrl === undefined) return { negotiation, message: "A negociação ainda não foi aceita pelas duas partes." };
    const next = { ...negotiation, status: "completed" as const, message: "Contratação concluída e registrada no elenco." };
    return { negotiation: next, message: next.message };
  }
  if (negotiation.status !== "countered") return { negotiation, message: "Envie uma nova proposta somente após receber uma contraproposta." };
  const wageSharePercent = negotiation.kind === "loan" ? action.wageSharePercent ?? 50 : 0;
  const validation = validateOffer(action.feeBrl, wageSharePercent, negotiation.askingFeeBrl, negotiation.kind);
  if (validation) return { negotiation, message: validation };
  const next = evaluateOffer({
    ...negotiation,
    offerFeeBrl: Math.round(action.feeBrl),
    wageSharePercent,
    counterFeeBrl: undefined,
    counterWageSharePercent: undefined,
    attempts: negotiation.attempts + 1,
  });
  return { negotiation: next, message: next.message };
}

function validateOffer(feeBrl: number, wageSharePercent: number, askingFee: number, kind: TransferKind): string | null {
  if (!Number.isFinite(feeBrl) || feeBrl <= 0 || feeBrl > askingFee * 3) return "Informe uma proposta positiva, de no máximo três vezes o valor pedido.";
  if (kind === "loan" && (!Number.isFinite(wageSharePercent) || wageSharePercent < 0 || wageSharePercent > 100)) return "A participação salarial deve ficar entre 0% e 100%.";
  return null;
}

function evaluateOffer(offer: TransferNegotiation): TransferNegotiation {
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
  const completed = new Map(negotiations.filter((item) => item.status === "completed").map((item) => [item.playerId, item]));
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
