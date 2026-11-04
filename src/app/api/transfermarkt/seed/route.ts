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
