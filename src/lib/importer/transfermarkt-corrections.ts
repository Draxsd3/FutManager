import { z } from "zod";

export const correctionPositions = ["Goalkeeper", "Centre-Back", "Left-Back", "Right-Back", "Defensive Midfield", "Central Midfield", "Attacking Midfield", "Left Midfield", "Right Midfield", "Left Winger", "Right Winger", "Second Striker", "Centre-Forward"] as const;
export const manualCorrectionSchema = z.object({
  clubId: z.string().regex(/^[1-9]\d*$/), playerId: z.string().regex(/^[1-9]\d*$/),
  correctedAt: z.iso.datetime({ offset: true }),
  dateOfBirth: z.iso.date().optional(), age: z.number().int().min(14).max(65).optional(),
  position: z.enum(correctionPositions).optional(), shirtNumber: z.number().int().min(1).max(999).optional(),
  foot: z.enum(["left", "right", "both"]).optional(), contract: z.iso.date().optional(),
}).strict().superRefine((value, ctx) => {
  const fields = Object.keys(value).filter(key => !["clubId", "playerId", "correctedAt"].includes(key));
  if (!fields.length) ctx.addIssue({ code: "custom", message: "Informe pelo menos um campo para corrigir." });
  if (value.age !== undefined && value.dateOfBirth) ctx.addIssue({ code: "custom", message: "Informe nascimento ou idade, não ambos." });
  if (value.dateOfBirth) {
    const today = new Date().toISOString().slice(0, 10);
    const age = Number(today.slice(0, 4)) - Number(value.dateOfBirth.slice(0, 4)) - Number(today.slice(5) < value.dateOfBirth.slice(5));
    if (age < 14 || age > 65) ctx.addIssue({ code: "custom", message: "O nascimento deve resultar em idade entre 14 e 65 anos." });
  }
});
export const manualCorrectionsSchema = z.array(manualCorrectionSchema).max(5000).superRefine((items, ctx) => {
  if (new Set(items.map(item => `${item.clubId}:${item.playerId}`)).size !== items.length) ctx.addIssue({ code: "custom", message: "Correção duplicada para o mesmo jogador." });
});
export type ManualCorrection = z.infer<typeof manualCorrectionSchema>;
export const correctionFields = (item: ManualCorrection) => Object.keys(item).filter(key => !["clubId", "playerId", "correctedAt"].includes(key));
export type CorrectionReviewPlayer = { clubId: string; clubName: string; playerId: string; playerName: string; message: string; dateOfBirth: string | null; position: string | null };

export async function fetchCorrectedSeed(corrections: ManualCorrection[], signal?: AbortSignal) {
  const response = await fetch("/api/transfermarkt/seed", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ corrections }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Não foi possível validar as correções.");
  return result as { checkpoint: import("./transfermarkt-live").LiveCheckpoint; report: { validClubs: number; pendingClubs: number; playerIssues: { playerId: string; clubId: string; message: string }[] }; reviewPlayers: CorrectionReviewPlayer[] };
}
