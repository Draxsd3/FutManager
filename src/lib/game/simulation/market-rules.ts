import type { EditorPlayer } from "../editor-data";
import { playerAskingFeeBrl, type TransferKind } from "../transfers";

export const MARKET_RULES = Object.freeze({ version: "market-v1", proposalDays: 14, responseDays: 1, maxOptions: 3, maxProposals: 6, maxSettlements: 6, pilotCallsPerAdvance: 1 });
export type MarketRole = "titular" | "rotação" | "desenvolvimento";
export type MoveAssessment = { accepted: boolean; role: MarketRole; reason: string; representation: "unknown" };
export function proposedRole(player: EditorPlayer, roster: EditorPlayer[]): MarketRole {
  const peers = roster.filter(p => p.primaryPosition === player.primaryPosition).sort((a,b) => b.overall-a.overall);
  return !peers.length || player.overall >= peers[Math.min(peers.length-1,1)].overall ? "titular" : peers.length < 4 ? "rotação" : "desenvolvimento";
}
/** Explicit simulation policy, not a claim to know an athlete's personality or agent. */
export function assessMove(player: EditorPlayer, roster: EditorPlayer[], kind: TransferKind, salaryBrl: number): MoveAssessment {
  const role = proposedRole(player,roster);
  const result = (accepted: boolean, reason: string): MoveAssessment => ({accepted,role,reason,representation:"unknown"});
  if(player.condition?.retiredOn) return result(false,"Atleta aposentado não aceita novo vínculo.");
  if (!Number.isFinite(salaryBrl) || salaryBrl <= 0 || !Number.isFinite(player.salaryMonthlyBrl) || player.salaryMonthlyBrl < 0) return result(false,"Salário sem condições verificáveis.");
  if (kind === "loan") return result(role !== "desenvolvimento",role === "desenvolvimento" ? "Empréstimo recusado: não há perspectiva de utilização." : "Empréstimo oferece espaço de jogo.");
  if (salaryBrl < player.salaryMonthlyBrl) return result(false,"Remuneração inferior ao vínculo atual.");
  if (role === "desenvolvimento" && player.age > 23 && salaryBrl < player.salaryMonthlyBrl*1.2) return result(false,"Reserva experiente exige compensação salarial nesta política.");
  const average = roster.length ? roster.reduce((n,p) => n+p.overall,0)/roster.length : player.overall;
  if (player.overall > average+12 && salaryBrl < player.salaryMonthlyBrl*1.2) return result(false,"Projeto esportivo abaixo do nível atual sem compensação suficiente.");
  return result(true,role === "titular" ? "Projeto oferece disputa por titularidade e salário compatível." : "Papel e remuneração compatíveis; aceite não depende só do preço do passe.");
}
export function contextualPriceBrl(player: EditorPlayer, sellerRoster: EditorPlayer[], date?: string): number {
  const base = playerAskingFeeBrl(player);
  if (!base) return 0;
  const peers = sellerRoster.filter(p => p.primaryPosition === player.primaryPosition).sort((a,b) => b.overall-a.overall || a.id.localeCompare(b.id));
  const index = peers.findIndex(p => p.id === player.id);
  const important = index >= 0 && index < (player.primaryPosition === "G" ? 1 : 2);
  let factor = important ? 1.25 : peers.length >= 4 ? .9 : 1;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(player.contractEndsOn)) {
    const remaining = (Date.parse(`${player.contractEndsOn}T12:00:00Z`)-Date.parse(`${date}T12:00:00Z`))/86400000;
    if (remaining >= 0 && remaining < 180) factor *= .85;
  }
  return Math.max(1,Math.round(base*factor));
}
