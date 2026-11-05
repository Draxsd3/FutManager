import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { normalizeName } from "@/lib/importer/matching";
import { normalizeLivePlayer } from "@/lib/importer/transfermarkt-live";

export const runtime = "nodejs";
export const maxDuration = 60;
const base = "https://transfermarkt-api-umber.vercel.app";
const inputSchema = z.object({ club: z.string().regex(/^[1-9]\d{0,9}$/) }).strict();
const resultSchema = z.object({ results: z.array(z.object({ id: z.string().regex(/^[1-9]\d*$/), name: z.string(), country: z.string().nullable().optional() })), lastPageNumber: z.number().int().optional() });
const profileSchema = z.object({ id: z.string(), name: z.string() });
const squadSchema = z.object({ id: z.string(), players: z.array(z.unknown()).max(200) });
const response = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return response({ error: "Entre na sua conta." }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response({ error: "Autenticação indisponível." }, 503);
  try {
    const { data, error } = await createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return response({ error: "Sessão inválida." }, 401);
  } catch { return response({ error: "Autenticação indisponível." }, 503); }
  const text = await request.text();
  if (text.length > 10_000) return response({ error: "Pedido muito longo." }, 413);
  let input: unknown;
  try { input = JSON.parse(text); } catch { return response({ error: "Consulta inválida." }, 400); }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return response({ error: "Consulta inválida." }, 400);
  async function get(path: string): Promise<unknown> {
    const result = await fetch(`${base}${path}`, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!result.ok) throw new Error("API indisponível");
    const body = await result.text(); if (body.length > 2_000_000) throw new Error("Resposta grande demais");
    return JSON.parse(body);
  }
  try {
    const parent = profileSchema.parse(await get(`/clubs/${parsed.data.club}/profile`));
    if (parent.id !== parsed.data.club) throw new Error("Identidade divergente");
    const expected = normalizeName(`${parent.name} U20`);
    const found = new Map<string, { id: string; name: string }>();
    for (let page = 1; page <= 3; page++) {
      const search = resultSchema.parse(await get(`/clubs/search/${encodeURIComponent(parent.name)}?page_number=${page}`));
      for (const club of search.results) if (normalizeName(club.name) === expected && (club.country === "Brazil" || club.country === "Brasil")) found.set(club.id, club);
      if (page >= (search.lastPageNumber ?? 1)) break;
    }
    if (found.size !== 1) return response({ players: [], reason: found.size ? "Equipe de base ambígua" : "Equipe de base não encontrada com identificação segura" });
    const youthClub = [...found.values()][0];
    const squad = squadSchema.parse(await get(`/clubs/${youthClub.id}/players`));
    if (squad.id !== youthClub.id) throw new Error("Identidade divergente");
    const collectedAt = new Date().toISOString();
    const players = squad.players.flatMap((raw) => {
      const input = z.object({ id: z.string().regex(/^[1-9]\d*$/), name: z.string().trim().min(1).max(80), position: z.string().nullable(), age: z.number().int().nullable().optional(), dateOfBirth: z.string().nullable().optional() }).safeParse(raw);
      if (!input.success) return [];
      const ageEstimated = input.data.age == null && !input.data.dateOfBirth;
      const positionEstimated = !input.data.position;
      try {
        const normalized = normalizeLivePlayer({ ...input.data, ...(ageEstimated ? { age: 18 } : {}), ...(positionEstimated ? { position: "Central Midfield" } : {}) }, youthClub.name, collectedAt);
        return [{ ...normalized, ageEstimated, positionEstimated }];
      } catch { return []; }
    });
    return response({ players, collectedAt, missing: squad.players.length - players.length, youthClub: youthClub.name });
  } catch { return response({ error: "Não foi possível consultar a API de juniores." }, 502); }
}
