import snapshot from "@/data/transfermarkt-snapshot.json";
import catalog from "@/data/brazil-clubs.json";
import links from "../../../../scripts/transfermarkt/clubs.json";
import { applyTransfermarktSnapshot, transfermarktSnapshotSchema } from "@/lib/importer/transfermarkt";

/** Public catalog data only. No credentials, external requests or database writes. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const parsed = transfermarktSnapshotSchema.parse(snapshot);
    // Validate the approved allowlist and all identities before serving a published collection.
    applyTransfermarktSnapshot({ clubs: [], players: [] }, parsed, catalog, links);
    return Response.json({ snapshot: parsed }, { headers });
  } catch {
    return Response.json({ error: "A coleta publicada do Transfermarkt é inválida. O catálogo não foi alterado." }, { status: 503, headers });
  }
}
