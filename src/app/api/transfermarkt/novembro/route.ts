import collection from "@/data/transfermarkt/brasileirao-2026-novembro.json";
import { prepareNationalSeed } from "@/lib/importer/transfermarkt-seed";

export const runtime = "nodejs";
/** This is a current-squad collection, not a recreation of the January 2026 squads. */
export async function GET() {
  try {
    const { checkpoint, report } = prepareNationalSeed(collection, collection.sourceMetadata.sha256, new Date().toISOString(), [], collection.sourceMetadata.generatedAt);
    return Response.json({ checkpoint, report }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível validar a coleta de novembro. Nenhum dado foi aplicado." }, { status: 503 });
  }
}
