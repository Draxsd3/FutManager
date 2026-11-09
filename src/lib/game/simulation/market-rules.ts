import type { EditorDatabase, EditorPlayer } from "../editor-data";
import { isFreeAgent } from "../player-contract";
import { civilDate } from "./foundation";
import { playerAskingFeeBrl, type TransferKind } from "../transfers";

export const MARKET_RULES = Object.freeze({ version: "market-v1", proposalDays: 14, responseDays: 1, maxOptions: 3, maxProposals: 6, maxSettlements: 6, pilotCallsPerAdvance: 1 });
export type MarketRole = "titular" | "rotação" | "desenvolvimento";
export type MoveAssessment = { accepted: boolean; role: MarketRole; reason: string; representation: "unknown" };
export function proposedRole(player: EditorPlayer, roster: EditorPlayer[]): MarketRole {
  const peers = roster.filter(p => p.primaryPosition === player.primaryPosition).sort((a,b) => b.overall-a.overall);
  return !peers.length || player.overall >= peers[Math.min(peers.length-1,1)].overall ? "titular" : peers.length < 4 ? "rotação" : "desenvolvimento";
}
export type WageContext = { database: EditorDatabase; buyerClubId: string; date?: string; sellerRoster?: EditorPlayer[] };
export type WageReference = { amount: number | null; reasons: string[] };
/** Gameplay estimates, not claims about an actual player's wishes. Missing data gives no adjustment. */
export function wageReference(player: EditorPlayer, roster: EditorPlayer[], context?: WageContext): WageReference {
  if (player.condition?.retiredOn || !Number.isFinite(player.salaryMonthlyBrl) || player.salaryMonthlyBrl < 0) return {amount:null,reasons:[]};
  const role = proposedRole(player, roster);
  const average = roster.length ? roster.reduce((n,p) => n+p.overall,0)/roster.length : player.overall;
  let adjustment = 0;
  const reasons: string[] = [];
  if (role === "desenvolvimento" && player.age > 23) { adjustment += .2; reasons.push("Pouca perspectiva de utilização para um atleta experiente."); }
  else if (player.overall > average+12) { adjustment += .2; reasons.push("Projeto esportivo abaixo do nível do atleta."); }
  if (context) {
    const db=context.database, seller=db.clubs.find(c=>c.id===player.clubId), buyer=db.clubs.find(c=>c.id===context.buyerClubId);
    const sellerRoster=context.sellerRoster ?? db.players.filter(p=>p.clubId===player.clubId);
    // A thin or missing roster is not proof of a player's role.
    if (!isFreeAgent(player) && seller && sellerRoster.some(p=>p.id===player.id) && sellerRoster.filter(p=>p.primaryPosition===player.primaryPosition).length>=2 && roster.length>=11) {
      const oldRole=proposedRole(player,sellerRoster.filter(p=>p.id!==player.id));
      const rank={titular:2,rotação:1,desenvolvimento:0};
      if(rank[role]>rank[oldRole]) { adjustment -= player.age<=23 ? .12 : .10; reasons.push("Maior perspectiva de espaço no elenco (estimativa, sem garantia de titularidade)."); }
      else if(rank[role]<rank[oldRole]) { adjustment += .08; reasons.push("Perspectiva menor de espaço no elenco."); }
    }
    const tiers: Record<string,number>={"Série A":1,"Série B":2,"Série C":3,"Série D":4};
    const from=seller && tiers[seller.division], to=buyer && tiers[buyer.division];
    if(from && to && to<from) { adjustment -= .08; reasons.push("Projeto em divisão nacional superior (cadastro do clube)."); }
    else if(from && to && to>from) { adjustment += .08; reasons.push("Projeto em divisão nacional inferior (cadastro do clube)."); }
    if(isFreeAgent(player)) { adjustment -= .15; reasons.push("Atleta sem clube; busca por novo vínculo."); }
    else if(context.date) {
      try {
        const days=(Date.parse(`${civilDate(player.contractEndsOn)}T12:00:00Z`)-Date.parse(`${civilDate(context.date)}T12:00:00Z`))/86400000;
        if(days>=0 && days<=180) { adjustment -= .05; reasons.push("Contrato cadastrado próximo do fim; vínculo continua ativo."); }
      } catch { /* An unknown or invalid date contributes no adjustment. */ }
    }
  }
  const factor=Math.max(.75,Math.min(1.30,1+adjustment));
  return {amount:Math.max(1,Math.ceil(player.salaryMonthlyBrl*factor-1e-9)),reasons};
}
export function estimatedWageExpectation(player: EditorPlayer, roster: EditorPlayer[], context?: WageContext): number | null {
  return wageReference(player,roster,context).amount;
}
/** Explicit simulation policy, not a claim to know an athlete's personality or agent. */
export function assessMove(player: EditorPlayer, roster: EditorPlayer[], kind: TransferKind, salaryBrl: number, context?: WageContext): MoveAssessment {
  const role = proposedRole(player,roster);
  const result = (accepted: boolean, reason: string): MoveAssessment => ({accepted,role,reason,representation:"unknown"});
  if(player.condition?.retiredOn) return result(false,"Atleta aposentado não aceita novo vínculo.");
  if (!Number.isFinite(salaryBrl) || salaryBrl <= 0 || !Number.isFinite(player.salaryMonthlyBrl) || player.salaryMonthlyBrl < 0) return result(false,"Salário sem condições verificáveis.");
  if (kind === "loan") return result(role !== "desenvolvimento",role === "desenvolvimento" ? "Empréstimo recusado: não há perspectiva de utilização." : "Empréstimo oferece espaço de jogo.");
  const reference=wageReference(player,roster,context);
  if (salaryBrl < reference.amount!) return result(false,`Oferta abaixo da referência salarial simulada de R$ ${reference.amount!.toLocaleString("pt-BR")} por mês. ${reference.reasons.join(" ")}`);
  return result(true,`${salaryBrl < player.salaryMonthlyBrl ? "Aceita salário menor diante do contexto simulado." : "Remuneração compatível com o projeto simulado."} ${reference.reasons.join(" ")}`);
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
