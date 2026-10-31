import type { Player } from "./mock-data";

export type PlayerMarketStatus = "normal" | "sale" | "loan" | "retiring";

export type SeasonStats = {
  season: number;
  club: string;
  games: number;
  goals: number;
  assists: number;
  average: number | null;
  ratedGames?: number;
  minutes?: number;
  shots?: number;
  tackles?: number;
  passes?: number;
  saves?: number;
  yellowCards?: number;
  redCards?: number;
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

export function createPlayerCareer(player: Player, club: string, season = 2026): PlayerCareerRecord {
  return {
    marketStatus: player.marketAvailability === "sale" || player.marketAvailability === "loan" ? player.marketAvailability : "normal",
    contractUntil: player.contractUntil,
    salary: player.salary,
    retirementYear: null,
    // Editor totals have no match/season provenance; never present them as current-season results.
    seasons: [{ season, club, games: 0, goals: 0, assists: 0, average: null, ratedGames: 0, minutes: 0, shots: 0, tackles: 0, passes: 0, saves: 0, yellowCards: 0, redCards: 0 }],
  };
}

export type PlayerMatchRecord = {
  key: string;
  round: number;
  opponent: string;
  homeScore: number;
  awayScore: number;
  minutes: number;
  goals: number;
  assists?: number;
  rating?: number | null;
  season?: number;
  competitionId?: string;
  competition?: string;
  competitionRound?: number;
  isHome?: boolean;
  yellowCards?: number;
  redCards?: number;
  shots?: number;
  tackles?: number;
  passes?: number;
  saves?: number;
  errors?: number;
};
export type MatchParticipation = Record<number, { entered: number; left?: number }>;
export type PlayerMatchPerformance = { goals?: number; assists?: number; rating?: number | null; yellowCards?: number; redCards?: number; shots?: number; tackles?: number; passes?: number; saves?: number; errors?: number };

/** Register only completed matches; the fixture key makes retries and resumed saves idempotent. */
export function recordPlayerMatch(
  records: Record<number, PlayerCareerRecord>,
  squad: Player[],
  club: string,
  participation: MatchParticipation,
  match: Omit<PlayerMatchRecord, "minutes" | "goals" | "assists" | "rating" | "yellowCards" | "redCards" | "shots" | "tackles" | "passes" | "saves" | "errors">,
  performance: Record<number, PlayerMatchPerformance | number>,
): Record<number, PlayerCareerRecord> {
  const next = { ...records };
  const seasonYear = match.season ?? 2026;
  for (const [idText, stint] of Object.entries(participation)) {
    const id = Number(idText);
    const player = squad.find((item) => item.id === id);
    const rawMinutes = (stint.left ?? 90) - stint.entered;
    const minutes = Number.isFinite(rawMinutes) ? Math.max(0, rawMinutes) : 0;
    if (!player || minutes === 0) continue;
    const current = next[id] ?? createPlayerCareer(player, club, seasonYear);
    if (current.matches?.some((item) => item.key === match.key)) continue;
    const entry = performance[id];
    const stats: PlayerMatchPerformance = typeof entry === "number" ? { goals: entry } : entry ?? {};
    const count = (value: number | undefined) => Number.isFinite(value) ? Math.max(0, Math.floor(value!)) : 0;
    const goals = count(stats.goals);
    const assists = count(stats.assists);
    const rating = stats.rating === null || stats.rating === undefined || !Number.isFinite(stats.rating) ? null : Math.max(0, Math.min(10, stats.rating));
    const yellowCards = count(stats.yellowCards), redCards = count(stats.redCards);
    const shots = count(stats.shots), tackles = count(stats.tackles), passes = count(stats.passes), saves = count(stats.saves);
    const seasons = [...current.seasons];
    const index = seasons.findIndex((item) => item.season === seasonYear && item.club === club);
    if (index < 0) {
      seasons.push({ season: seasonYear, club, games: 1, goals, assists, average: rating, ratedGames: rating === null ? 0 : 1, minutes, shots, tackles, passes, saves, yellowCards, redCards });
    } else {
      const previous = seasons[index];
      const ratedGames = previous.ratedGames ?? (previous.average === null ? 0 : previous.games);
      const average = rating === null ? previous.average : previous.average === null
        ? rating
        : (previous.average * ratedGames + rating) / (ratedGames + 1);
      seasons[index] = {
        ...previous,
        games: previous.games + 1,
        goals: previous.goals + goals,
        assists: previous.assists + assists,
        average,
        ratedGames: ratedGames + (rating === null ? 0 : 1),
        minutes: (previous.minutes ?? 0) + minutes,
        shots: (previous.shots ?? 0) + shots,
        tackles: (previous.tackles ?? 0) + tackles,
        passes: (previous.passes ?? 0) + passes,
        saves: (previous.saves ?? 0) + saves,
        yellowCards: (previous.yellowCards ?? 0) + yellowCards,
        redCards: (previous.redCards ?? 0) + redCards,
      };
    }
    next[id] = {
      ...current,
      seasons,
      matches: [...(current.matches ?? []), {
        ...match,
        season: seasonYear,
        minutes,
        goals,
        assists,
        rating,
        yellowCards,
        redCards,
        shots,
        tackles,
        passes,
        saves,
        errors: count(stats.errors),
      }],
    };
  }
  return next;
}

/** Values: salary in R$ thousands per month, transfer fees in R$ millions. */
export type ContractOffer = { salary: number; years: number; releaseClause: number };
export type TransferOffer = { id: string; club: string; fee: number; status: "pending" | "rejected" | "accepted" };
export type MarketAction =
  | { type: "list" }
  | { type: "loan" }
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
  if (action.type === "list") return { record: { ...record, marketStatus: "sale" }, message: "Atleta listado para venda." };
  if (action.type === "loan") return { record: { ...record, marketStatus: "loan" }, message: "Atleta listado para empréstimo." };
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
