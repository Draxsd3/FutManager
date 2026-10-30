import type { EditorDatabase } from "./editor-data";
import { MAX_CLUB_SQUAD_SIZE } from "./editor-data";
import type { Player } from "./mock-data";

/** A temporary market rule: external contracts do not yet store their real clause. Budget is in R$ thousands. */
export function recruitPlayer(database: EditorDatabase, squad: Player[], club: string, budget: number, sourceId: string, reservedIds: number[] = []): { squad: Player[]; budget: number; message: string } {
  const source = database.players.find((p) => p.id === sourceId);
  if (!source || !database.clubs.some((c) => c.id === source.clubId) || database.clubs.find((c) => c.id === source.clubId)?.name === club || squad.some((p) => p.sourceId === sourceId)) return { squad, budget, message: "Jogador indisponível para contratação." };
  if (squad.length >= MAX_CLUB_SQUAD_SIZE) return { squad, budget, message: "Elenco cheio: limite de 35 jogadores." };
  const fee = Math.ceil(source.marketValueBrl * 2 / 1000);
  if (!Number.isFinite(fee) || fee <= 0 || budget < fee) return { squad, budget, message: "Saldo insuficiente ou valor de multa indisponível." };
  const player: Player = { id: Math.max(0, ...squad.map((p) => p.id), ...reservedIds) + 1, sourceId: source.id, shirtNumber: source.shirtNumber, name: source.name, position: source.primaryPosition, secondaryPosition: source.secondaryPosition, foot: source.preferredFoot === "A" ? "D" : source.preferredFoot, overall: source.overall, energy: source.energy, salary: Math.round(source.salaryMonthlyBrl / 1000), passValue: source.marketValueBrl / 1e6, goals: 0, assists: 0, ownGoals: 0, traits: `${source.qualityPrimary.slice(0, 3)}/${source.qualitySecondary.slice(0, 3)}`, age: source.age, avgRating: null, contractUntil: source.contractEndsOn, marketValue: source.marketValueBrl / 1e6 };
  return { squad: [...squad, player], budget: budget - fee, message: `${player.name} contratado por R$ ${(fee / 1000).toFixed(2)} mi.` };
}
