import type { Player } from "./mock-data";

export type PlayerMarketStatus = "normal" | "sale" | "loan" | "retiring";

export type SeasonStats = {
  season: number;
  club: string;
  games: number;
  goals: number;
  assists: number;
  average: number | null;
};

export type PlayerCareerRecord = {
  marketStatus: PlayerMarketStatus;
  contractUntil: string;
  salary: number;
  retirementYear: number | null;
  seasons: SeasonStats[];
  matches?: PlayerMatchRecord[];
  releaseClause?: number; // R$ milhões; ausente em saves antigos
  transferOffers?: TransferOffer[];
};

export type ManualPosition = { left: number; top: number };

export function createPlayerCareer(player: Player, club: string): PlayerCareerRecord {
  return {
    marketStatus: "normal",
    contractUntil: player.contractUntil,
    salary: player.salary,
    retirementYear: null,
    seasons: [{ season: 2026, club, games: 0, goals: player.goals, assists: player.assists, average: player.avgRating }],
  };
}

export type PlayerMatchRecord = {
  key: string; round: number; opponent: string; homeScore: number; awayScore: number;
  minutes: number; goals: number;
};
export type MatchParticipation = Record<number, { entered: number; left?: number }>;

/** Register only completed matches; the key makes retries and resumed saves idempotent. */
export function recordPlayerMatch(records: Record<number, PlayerCareerRecord>, squad: Player[], club: string, participation: MatchParticipation, match: Omit<PlayerMatchRecord, "minutes" | "goals">, goals: Record<number, number>): Record<number, PlayerCareerRecord> {
  const next = { ...records };
  for (const [idText, stint] of Object.entries(participation)) {
    const id = Number(idText);
    const player = squad.find((item) => item.id === id);
    const minutes = Math.max(0, (stint.left ?? 90) - stint.entered);
    if (!player || minutes === 0) continue;
    const current = next[id] ?? createPlayerCareer(player, club);
    if (current.matches?.some((item) => item.key === match.key)) continue;
    const playerGoals = goals[id] ?? 0;
    const seasons = [...current.seasons];
    const index = seasons.findIndex((item) => item.season === 2026 && item.club === club);
    if (index < 0) seasons.push({ season: 2026, club, games: 1, goals: playerGoals, assists: 0, average: null });
    else seasons[index] = { ...seasons[index], games: seasons[index].games + 1, goals: seasons[index].goals + playerGoals };
    next[id] = { ...current, seasons, matches: [...(current.matches ?? []), { ...match, minutes, goals: playerGoals }] };
  }
  return next;
}

/** Values: salary in R$ thousands per month, transfer fees in R$ millions. */
export type ContractOffer = { salary: number; years: number; releaseClause: number };
export type TransferOffer = { id: string; club: string; fee: number; status: "pending" | "rejected" | "accepted" };
export type MarketAction =
  | { type: "list" }
  | { type: "unlist" }
  | { type: "contract"; offer: ContractOffer }
  | { type: "offer"; club: string; fee: number; id: string }
  | { type: "reject"; id: string }
  | { type: "accept"; id: string };

export function validateContractOffer(offer: ContractOffer): string | null {
  if (!Number.isFinite(offer.salary) || offer.salary <= 0 || offer.salary > 100000) return "Informe um salário válido.";
  if (!Number.isInteger(offer.years) || offer.years < 1 || offer.years > 5) return "A duração deve ser de 1 a 5 anos.";
  if (!Number.isFinite(offer.releaseClause) || offer.releaseClause <= 0 || offer.releaseClause > 1000000) return "Informe uma multa válida.";
  return null;
}

/** Game rule, not a statement of real-world transfer law. Legacy contracts have no clause. */
export function offerEligibility(record: PlayerCareerRecord, fee: number): boolean {
  return Number.isFinite(fee) && fee > 0 && (record.marketStatus === "sale" || (typeof record.releaseClause === "number" && record.releaseClause > 0 && fee >= record.releaseClause));
}

export function applyNegotiation(record: PlayerCareerRecord, action: MarketAction, gameDate: string, ownClub: string): { record: PlayerCareerRecord; message: string; transfer?: TransferOffer } {
  if (action.type === "list") return { record: { ...record, marketStatus: "sale" }, message: "Atleta disponível no mercado." };
  if (action.type === "unlist") return { record: { ...record, marketStatus: "normal" }, message: "Atleta retirado do mercado." };
  if (action.type === "contract") {
    const error = validateContractOffer(action.offer);
    if (error) return { record, message: error };
    // A transparent approximation, not a real player/agent negotiation engine.
    if (action.offer.salary < record.salary) return { record, message: "Proposta recusada: salário inferior ao atual (critério simplificado)." };
    const year = Number(gameDate.slice(0, 4));
    if (!Number.isInteger(year) || year < 1900 || year > 9990) return { record, message: "Data da carreira inválida." };
    return { record: { ...record, salary: action.offer.salary, contractUntil: `${year + action.offer.years}-12-31`, releaseClause: action.offer.releaseClause }, message: "Renovação aceita pelo atleta (simulação simplificada)." };
  }
  if (action.type === "offer") {
    const club = action.club.trim();
    if (!club || club.toLocaleLowerCase() === ownClub.trim().toLocaleLowerCase() || !action.id || (record.transferOffers ?? []).some((offer) => offer.id === action.id)) return { record, message: "Selecione outro clube válido." };
    if (!offerEligibility(record, action.fee)) return { record, message: "Proposta inválida: jogador não listado exige o valor integral da multa cadastrada." };
    return { record: { ...record, transferOffers: [...(record.transferOffers ?? []), { id: action.id, club, fee: action.fee, status: "pending" }] }, message: "Proposta simulada registrada; a transferência ainda não foi concluída." };
  }
  const offer = (record.transferOffers ?? []).find((item) => item.id === action.id && item.status === "pending");
  if (!offer) return { record, message: "Proposta não encontrada ou já respondida." };
  if (action.type === "accept" && !offerEligibility(record, offer.fee)) return { record, message: "A proposta não atende às condições atuais do jogador." };
  const transferOffers = (record.transferOffers ?? []).map((item): TransferOffer => item.id === offer.id ? { ...item, status: action.type === "accept" ? "accepted" : "rejected" } : action.type === "accept" && item.status === "pending" ? { ...item, status: "rejected" } : item);
  return { record: { ...record, transferOffers }, message: action.type === "accept" ? "Transferência concluída na simulação." : "Proposta recusada.", ...(action.type === "accept" ? { transfer: offer } : {}) };
}
