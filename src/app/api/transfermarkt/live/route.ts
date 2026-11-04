import { normalizeHonours } from "@/lib/game/honours";
import { correctionFields } from "@/lib/importer/transfermarkt-corrections";
import { loanFromTransferHistory } from "@/lib/importer/transfermarkt-loans";
import { createClient } from "@supabase/supabase-js";
import { liveRequestSchema, normalizeLiveClub } from "@/lib/importer/transfermarkt-live";

export const runtime = "nodejs";
export const maxDuration = 60;
const BASE = "https://transfermarkt-api-umber.vercel.app";
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Fixed host and allowlisted operations: never an arbitrary-URL proxy. */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return reply({ error: "Entre na sua conta para importar." }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return reply({ error: "Autenticação indisponível." }, 503);
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return reply({ error: "Sua sessão expirou. Entre novamente." }, 401);
  } catch { return reply({ error: "Não foi possível validar a sessão." }, 503); }
  const text = await request.text();
  if (text.length > 100_000) return reply({ error: "Pedido muito longo." }, 413);
  let input: unknown;
  try { input = JSON.parse(text); } catch { return reply({ error: "Pedido inválido." }, 400); }
  const parsed = liveRequestSchema.safeParse(input);
  if (!parsed.success) return reply({ error: "Consulta não permitida." }, 400);
  const body = parsed.data;
  async function get(path: string) {
    const response = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(25_000), redirect: "error" });
    if (!response.ok) throw new Error(`API Transfermarkt respondeu HTTP ${response.status}. Tente novamente mais tarde.`);
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error("Resposta da fonte excedeu o limite de segurança.");
    return JSON.parse(text);
  }
  try {
    if (body.action === "honours") return reply(normalizeHonours(await get(`/clubs/${body.club}/achievements`), body.club));
    if (body.action === "loans") return reply({ loan: loanFromTransferHistory(await get(`/players/${body.player}/transfers`), body.player) });
    if (body.action === "seasons") return reply(await get(`/competitions/${body.competition}/seasons`));
    if (body.action === "members") return reply(await get(`/competitions/${body.competition}/clubs?season_id=${body.season}`));
    // Two bounded upstream reads per request, rather than one long-running 156-club function.
    const [profile, squad] = await Promise.all([
      get(`/clubs/${body.club}/profile`), get(`/clubs/${body.club}/players?season_id=${body.season}`),
    ]);
    if (body.corrections?.length && squad && Array.isArray(squad.players)) {
      squad.players = squad.players.map((player: { id: string; age?: number | null }) => {
        const correction = body.corrections?.find(item => item.clubId === body.club && item.playerId === player.id);
        if (!correction) return player;
        const { clubId: _club, playerId: _player, correctedAt, ...fields } = correction;
        void _club; void _player;
        return { ...player, ...fields, ...(fields.dateOfBirth ? { age: null } : {}), manualCorrection: { fields: correctionFields(correction), correctedAt } };
      });
    }
    return reply(normalizeLiveClub(profile, squad, body.club));
  } catch (error) {
    console.error("Transfermarkt live collection failed", error);
    return reply({ error: error instanceof Error && !error.name.includes("Zod") ? error.message : "Dados incompletos ou inválidos na fonte. Nada foi aplicado." }, 502);
  }
}
