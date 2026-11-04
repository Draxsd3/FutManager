import { createHash } from "node:crypto";
import collection from "@/data/transfermarkt/brasileirao-2026.json";
import { prepareNationalSeed } from "@/lib/importer/transfermarkt-seed";

export const runtime = "nodejs";
const seedId = createHash("sha256").update(JSON.stringify(collection)).digest("hex");
/** Public football data, like the legacy snapshot. No external requests or account writes. */
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const result = prepareNationalSeed(collection, seedId);
    return Response.json(new URL(request.url).searchParams.get("report") === "1" ? { ...result.report, clubIssues: result.checkpoint.issues } : result, { headers });
  }
  catch { return Response.json({ error: "O arquivo brasileiro 2026 é inválido. Nenhum dado foi aplicado." }, { status: 503, headers }); }
}

/** Pure preview: corrections affect only this response, never the bundled file or API. */
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const text = await request.text();
  if (text.length > 1_000_000) return Response.json({ error: "Correções excedem o limite de tamanho." }, { status: 413, headers });
  try {
    const { manualCorrectionsSchema } = await import("@/lib/importer/transfermarkt-corrections");
    const corrections = manualCorrectionsSchema.parse(JSON.parse(text).corrections);
    const base = prepareNationalSeed(collection, seedId);
    const revision = createHash("sha256").update(JSON.stringify(corrections)).digest("hex");
    const result = prepareNationalSeed(collection, `${seedId}:${revision}`, new Date().toISOString(), corrections);
    const corrected = new Set(corrections.map(item => `${item.clubId}:${item.playerId}`));
    const pending = new Map(base.report.playerIssues.map(item => [`${item.clubId}:${item.playerId}`, item.message]));
    const reviewPlayers = collection.competitions.flatMap(comp => comp.clubs.flatMap(club => club.players.flatMap(player => {
      const key = `${club.id}:${player.id}`;
      if (!pending.has(key) && !corrected.has(key)) return [];
      return [{ clubId: club.id, clubName: club.name, playerId: player.id, playerName: player.name,
        dateOfBirth: player.dateOfBirth, position: player.position, message: pending.get(key) ?? "Correção manual salva." }];
    })));
    return Response.json({ ...result, reviewPlayers }, { headers });
  } catch {
    return Response.json({ error: "Correção inválida. Confira IDs, datas, idade (14–65), posição e demais campos. Informe nascimento ou idade, não ambos." }, { status: 400, headers });
  }
}
