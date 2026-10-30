import type { EditorDatabase } from "./editor-data";
import { MAX_CLUB_SQUAD_SIZE } from "./editor-data";
import type { Player } from "./mock-data";
import type { TransferKind } from "./transfers";

export type RecruitmentTerms = {
  feeBrl: number;
  kind: TransferKind;
  wageSharePercent: number;
  loanMonths?: number;
  gameDate?: string;
};

/** Budget units are R$ thousands; offers and player salaries in the database are in R$. */
export function recruitPlayer(
  database: EditorDatabase,
  squad: Player[],
  club: string,
  budget: number,
  sourceId: string,
  reservedIds: number[] = [],
  terms?: RecruitmentTerms,
): { squad: Player[]; budget: number; message: string } {
  const source = database.players.find((player) => player.id === sourceId);
  const sourceClub = source && database.clubs.find((item) => item.id === source.clubId);
  if (!source || !sourceClub || sourceClub.name === club || squad.some((player) => player.sourceId === sourceId)) {
    return { squad, budget, message: "Jogador indisponível para contratação." };
  }
  if (source.marketStatus !== "sale" && source.marketStatus !== "loan") return { squad, budget, message: "Jogador não está à venda nem disponível para empréstimo." };
  if (squad.length >= MAX_CLUB_SQUAD_SIZE) return { squad, budget, message: "Elenco cheio: limite de 35 jogadores." };
  const kind = terms?.kind ?? source.marketStatus;
  if (kind !== source.marketStatus) return { squad, budget, message: "O tipo de contratação não corresponde à disponibilidade do jogador." };
  const feeBrl = terms?.feeBrl ?? source.marketValueBrl * 2;
  const wageSharePercent = kind === "loan" ? terms?.wageSharePercent ?? 50 : 100;
  const loanMonths = kind === "loan" ? terms?.loanMonths ?? 6 : 0;
  if (!Number.isFinite(feeBrl) || feeBrl <= 0 || !Number.isFinite(wageSharePercent) || wageSharePercent < 0 || wageSharePercent > 100 || !Number.isInteger(loanMonths) || (kind === "loan" && (loanMonths < 1 || loanMonths > 24))) {
    return { squad, budget, message: "Termos financeiros da contratação inválidos." };
  }
  const salaryCommitmentMonths = kind === "loan" ? loanMonths : 12;
  const totalCostBrl = Math.round(feeBrl + source.salaryMonthlyBrl * (wageSharePercent / 100) * salaryCommitmentMonths);
  const costThousands = Math.ceil(totalCostBrl / 1000);
  if (!Number.isFinite(costThousands) || budget < costThousands) return { squad, budget, message: "Saldo insuficiente para a taxa e os salários acordados." };
  const loanExpiresOn = kind === "loan" ? addMonths(terms?.gameDate ?? new Date().toISOString().slice(0, 10), loanMonths) : undefined;
  const player: Player = {
    id: Math.max(0, ...squad.map((item) => item.id), ...reservedIds) + 1,
    sourceId: source.id,
    shirtNumber: source.shirtNumber,
    name: source.name,
    position: source.primaryPosition,
    secondaryPosition: source.secondaryPosition,
    foot: source.preferredFoot === "A" ? "D" : source.preferredFoot,
    overall: source.overall,
    energy: source.energy,
    salary: Math.round(source.salaryMonthlyBrl / 1000),
    passValue: source.marketValueBrl / 1e6,
    goals: 0,
    assists: 0,
    ownGoals: 0,
    traits: `${source.qualityPrimary.slice(0, 3)}/${source.qualitySecondary.slice(0, 3)}`,
    age: source.age,
    avgRating: null,
    contractUntil: loanExpiresOn ?? source.contractEndsOn,
    marketValue: source.marketValueBrl / 1e6,
    marketAvailability: "normal",
    acquisitionType: kind === "loan" ? "loan" : "permanent",
    ...(loanExpiresOn ? { loanExpiresOn } : {}),
  };
  const action = kind === "loan" ? `emprestado por ${loanMonths} meses` : "contratado em definitivo";
  return {
    squad: [...squad, player],
    budget: budget - costThousands,
    message: `${player.name} ${action} por ${formatMillion(feeBrl)}; custo total com salários: ${formatMillion(totalCostBrl)}.`,
  };
}

function addMonths(isoDate: string, months: number) {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) return isoDate;
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function formatMillion(value: number) {
  return `R$ ${(value / 1_000_000).toFixed(2).replace(".", ",")} mi`;
}
