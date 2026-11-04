import { z } from "zod";
import { transfermarktSnapshotSchema, type TransfermarktSnapshot } from "./transfermarkt";

export const nationalCompetitions = [
  { id: "BRA1", division: "Série A", expected: 20 },
  { id: "BRA2", division: "Série B", expected: 20 },
  { id: "BRA3", division: "Série C", expected: 20 },
  { id: "BRA4", division: "Série D", expected: 96 },
] as const;
export const liveRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("seasons"), competition: z.enum(["BRA1", "BRA2", "BRA3", "BRA4"]) }),
  z.object({ action: z.literal("members"), competition: z.enum(["BRA1", "BRA2", "BRA3", "BRA4"]), season: z.string().regex(/^\d{4}$/) }),
  z.object({ action: z.literal("club"), club: z.string().regex(/^[1-9]\d{0,9}$/), season: z.string().regex(/^\d{4}$/) }),
]);
export type LiveRequest = z.infer<typeof liveRequestSchema>;
const memberSchema = z.object({ id: z.string().regex(/^[1-9]\d*$/), name: z.string().min(1) });
export const membersSchema = z.object({ id: z.string(), name: z.string(), seasonId: z.string(), clubs: z.array(memberSchema).max(200) });
const seasonsSchema = z.object({ id: z.string(), name: z.string(), seasons: z.array(z.object({ id: z.string().regex(/^\d{4}$/), name: z.string() })) });
export function resolveSeason(input: unknown, competition: string, year = "2026") {
  const parsed = seasonsSchema.parse(input);
  if (parsed.id !== competition) throw new Error("A fonte retornou outra competição.");
  const matches = parsed.seasons.filter(season => season.name.trim() === year);
  if (matches.length !== 1) throw new Error(`${competition}: temporada ${year} ausente ou ambígua na fonte.`);
  return { id: parsed.id, name: parsed.name, seasonId: matches[0].id };
}

const positions: Record<string, "G" | "L" | "Z" | "M" | "A"> = {
  Goalkeeper: "G", "Centre-Back": "Z", Sweeper: "Z", "Left-Back": "L", "Right-Back": "L", "Left Wing-Back": "L", "Right Wing-Back": "L",
  "Defensive Midfield": "M", "Central Midfield": "M", "Attacking Midfield": "M", "Left Midfield": "M", "Right Midfield": "M",
  "Left Winger": "A", "Right Winger": "A", "Second Striker": "A", "Centre-Forward": "A",
};
const rawPlayerSchema = z.object({
  manualCorrection: z.object({ fields: z.array(z.string()), correctedAt: z.iso.datetime({ offset: true }) }).optional(),
  id: z.string(), name: z.string(), position: z.string().nullable(),
  age: z.number().int().nullable().optional(), dateOfBirth: z.iso.date().nullable().optional(),
  shirtNumber: z.number().int().nullable().optional(), foot: z.string().nullable().optional(),
  contract: z.iso.date().nullable().optional(), marketValue: z.number().int().nullable().optional(),
});
const profileSchema = z.object({
  id: z.string(), name: z.string(), addressLine2: z.string().nullable().optional(), addressLine3: z.string().nullable().optional(), shortName: z.string().nullable().optional(), colors: z.array(z.string()).optional(),
  league: z.object({ countryName: z.string().nullable().optional() }).nullable().optional(),
  stadiumName: z.string().nullable().optional(), stadiumSeats: z.number().nullable().optional(),
  stadium: z.object({ addressLine2: z.string().nullable().optional(), countryName: z.string().nullable().optional(), name: z.string().nullable().optional(), capacity: z.number().nullable().optional() }).nullable().optional(),
  coach: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
});
export function normalizeLivePlayer(input: unknown, clubName: string, collectedAt: string) {
  const player = rawPlayerSchema.parse(input);
  const reference = new Date(collectedAt);
  const born = player.dateOfBirth ? new Date(`${player.dateOfBirth}T00:00:00Z`) : null;
  const age = player.age ?? (born ? reference.getUTCFullYear() - born.getUTCFullYear() - Number(reference.toISOString().slice(5, 10) < player.dateOfBirth!.slice(5)) : null);
  const position = player.position ? positions[player.position] : undefined;
  if (age === null || !position) throw new Error(`${clubName} / ${player.name}: idade/nascimento ou posição não informados. Nada foi aplicado.`);
  return { manualCorrection: player.manualCorrection, id: player.id, name: player.name, age, position, dateOfBirth: player.dateOfBirth ?? null,
    shirtNumber: player.shirtNumber && player.shirtNumber > 0 ? player.shirtNumber : null,
    foot: ({ left: "E", right: "D", both: "A" } as const)[player.foot as "left" | "right" | "both"] ?? null,
    contractEndsOn: player.contract ?? null, marketValueEur: player.marketValue ?? null };
}

export function normalizeLiveClub(profileInput: unknown, squadInput: unknown, clubId: string, collectedAt = new Date().toISOString()) {
  const profile = profileSchema.parse(profileInput);
  const squad = z.object({ id: z.string(), updatedAt: z.string().nullable().optional(), players: z.array(rawPlayerSchema).min(11).max(200) }).parse(squadInput);
  if (profile.id !== clubId || squad.id !== clubId) throw new Error("A fonte retornou outro clube.");
  if (![profile.league?.countryName, profile.stadium?.countryName, profile.addressLine3].some(country => country === "Brazil" || country === "Brasil")) throw new Error(`${profile.name}: país brasileiro não confirmado.`);
  const players = squad.players.map(player => normalizeLivePlayer(player, profile.name, collectedAt));
  const states: Record<string, string> = { AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins" };
  const suffix = `${profile.shortName ?? ""}`.match(/(?:[- (])([A-Z]{2})\)?$/)?.[1] ?? profile.name.match(/\(([A-Z]{2})\)$/)?.[1];
  const address = [profile.addressLine2, profile.stadium?.addressLine2].filter(Boolean).join(", ");
  const addressStates = Object.values(states).filter(state => address.split(",").some(part => part.trim() === state));
  const state = suffix && states[suffix] ? states[suffix] : addressStates.length === 1 ? addressStates[0] : undefined;
  const club = { state, source: `transfermarkt:${clubId}`, id: clubId, name: profile.name,
    shortName: profile.shortName ?? undefined, colors: profile.colors?.filter(color => /^#[\da-f]{6}$/i.test(color)),
    fetchedAt: collectedAt, updatedAt: squad.updatedAt ?? null,
    stadiumName: profile.stadium?.name?.trim() || profile.stadiumName?.trim() || null,
    stadiumCapacity: profile.stadium?.capacity ?? profile.stadiumSeats ?? null, coachName: profile.coach?.name?.trim() || null, players };
  return transfermarktSnapshotSchema.shape.clubs.element.parse(club);
}

export type ImportProgress = (message: string) => void;
export type LiveCollectionIssue = { clubId: string; clubName: string; message: string };
export type LiveCheckpoint = { snapshot: TransfermarktSnapshot; members: { id: string; name: string; competitionId: string }[]; issues?: LiveCollectionIssue[]; seedId?: string };
export type LiveOptions = {
  request: (body: LiveRequest, signal?: AbortSignal) => Promise<unknown>;
  progress?: ImportProgress; signal?: AbortSignal;
  load?: () => Promise<LiveCheckpoint | null>;
  seed?: () => Promise<LiveCheckpoint>; save?: (checkpoint: LiveCheckpoint | null) => Promise<void>;
  pause?: () => Promise<void>;
};
/** Short, sequential requests. A failed club never publishes a partial catalog. */
export async function collectNationalSnapshot(options: LiveOptions) {
  const progress = options.progress ?? (() => undefined);
  const request = async (body: LiveRequest) => {
    options.signal?.throwIfAborted();
    await options.pause?.();
    options.signal?.throwIfAborted();
    return options.request(body, options.signal);
  };
  let checkpoint = await options.load?.() ?? null;
  // Checkpoints are per-account and only reusable for a day, with a complete, validated manifest.
  if (checkpoint) {
    try {
      checkpoint.snapshot = transfermarktSnapshotSchema.parse(checkpoint.snapshot);
      if (checkpoint.snapshot.version !== 2 || checkpoint.snapshot.seasonId !== "2026" ||
        !checkpoint.snapshot.generatedAt || Date.now() - Date.parse(checkpoint.snapshot.generatedAt) > 86_400_000 ||
        checkpoint.members.length !== 156 || new Set(checkpoint.members.map(member => member.id)).size !== 156 ||
        !nationalCompetitions.every(c => checkpoint!.members.filter(member => member.competitionId === c.id).length === c.expected && checkpoint!.snapshot.competitions?.filter(comp => comp.id === c.id && comp.division === c.division).length === 1) ||
        new Set(checkpoint.snapshot.clubs.map(club => club.id)).size !== checkpoint.snapshot.clubs.length ||
        checkpoint.snapshot.clubs.some(club => !checkpoint!.members.some(member => member.id === club.id && member.competitionId === club.competitionId))) checkpoint = null;
    } catch { checkpoint = null; }
  }
  if (options.seed) {
    options.signal?.throwIfAborted();
    const seed = await options.seed();
    if (!checkpoint) checkpoint = seed;
    else if (checkpoint.seedId !== seed.seedId) {
      if (!checkpoint.members.every(member => seed.members.some(other => other.id === member.id && other.competitionId === member.competitionId)) ||
          !checkpoint.snapshot.competitions?.every(comp => seed.snapshot.competitions?.some(other => other.id === comp.id && other.seasonId === comp.seasonId))) {
        throw new Error("O arquivo e a coleta salva têm participantes/temporadas diferentes. Nada foi alterado.");
      }
      const revised = new Set(seed.snapshot.clubs.filter(club => club.players.some(player => player.manualCorrection)).map(club => club.id));
      checkpoint.snapshot.clubs = checkpoint.snapshot.clubs.filter(club => !revised.has(club.id) && !club.players.some(player => player.manualCorrection));
      const completed = new Set(checkpoint.snapshot.clubs.map(club => club.id));
      checkpoint.snapshot.clubs.push(...seed.snapshot.clubs.filter(club => !completed.has(club.id)));
      checkpoint.seedId = seed.seedId;
    }
    await options.save?.(checkpoint);
    progress(`Arquivo brasileiro 2026 aproveitado: ${checkpoint.snapshot.clubs.length}/156 clubes válidos; consultando somente os pendentes…`);
  }
  if (!checkpoint) {
    checkpoint = { snapshot: { version: 2, seasonId: "2026", generatedAt: new Date().toISOString(), competitions: [], clubs: [] }, members: [] };
    for (const competition of nationalCompetitions) {
      progress(`Verificando ${competition.division} — temporada 2026…`);
      const season = resolveSeason(await request({ action: "seasons", competition: competition.id }), competition.id);
      const members = membersSchema.parse(await request({ action: "members", competition: competition.id, season: season.seasonId }));
      if (members.id !== competition.id || members.seasonId !== season.seasonId || members.clubs.length !== competition.expected || new Set(members.clubs.map(club => club.id)).size !== competition.expected) {
        throw new Error(`${competition.division}: esperados ${competition.expected} clubes; fonte retornou ${members.clubs.length}. Nada foi aplicado.`);
      }
      checkpoint.snapshot.competitions!.push({ ...season, division: competition.division });
      checkpoint.members.push(...members.clubs.map(club => ({ ...club, competitionId: competition.id })));
    }
    if (new Set(checkpoint.members.map(member => member.id)).size !== 156) throw new Error("Clube duplicado entre divisões. Nada foi aplicado.");
    await options.save?.(checkpoint);
  }
  // Rebuild the pending list on every run; older checkpoints need no migration.
  const issues = new Map<string, LiveCollectionIssue>();
  const saveProgress = async () => {
    checkpoint!.issues = [...issues.values()];
    await options.save?.(checkpoint!);
  };
  const collectMember = async (member: LiveCheckpoint["members"][number], finalAttempt = false) => {
    options.signal?.throwIfAborted();
    const competition = checkpoint!.snapshot.competitions!.find(c => c.id === member.competitionId);
    if (!competition) throw new Error("Manifesto de competições inválido. Reinicie a coleta.");
    progress(`${checkpoint!.snapshot.clubs.length}/156 clubes válidos · ${issues.size} pendência(s) — ${finalAttempt ? "Revisão final" : competition.division}: ${member.name}…`);
    try {
      const club = transfermarktSnapshotSchema.shape.clubs.element.parse(await request({ action: "club", club: member.id, season: competition.seasonId }));
      options.signal?.throwIfAborted();
      if (club.id !== member.id) throw new Error("Identidade do clube divergente.");
      checkpoint!.snapshot.clubs.push({ ...club, competitionId: competition.id, division: competition.division, country: "Brasil" });
      issues.delete(member.id);
    } catch (error) {
      // A pause is not a source-data problem and must stop immediately.
      options.signal?.throwIfAborted();
      issues.set(member.id, { clubId: member.id, clubName: member.name,
        message: (error instanceof Error ? error.message : "Consulta falhou.").slice(0, 1000) });
      progress(`${checkpoint!.snapshot.clubs.length}/156 clubes válidos · ${issues.size} pendência(s). ${member.name} separado para revisão; continuando a coleta…`);
    }
    // Storage failure is fatal, not another club issue: never pretend progress was saved.
    await saveProgress();
  };
  for (const member of checkpoint.members) {
    if (checkpoint.snapshot.clubs.some(club => club.id === member.id)) continue;
    await collectMember(member);
  }
  // One bounded final pass, only after every remaining club has been attempted.
  const pending = checkpoint.members.filter(member => issues.has(member.id));
  for (const member of pending) await collectMember(member, true);
  if (issues.size) {
    const details = [...issues.values()].map(issue => `• ${issue.clubName}: ${issue.message}`).join("\n");
    throw new Error(`Coleta concluída com pendências: ${checkpoint.snapshot.clubs.length}/156 clubes válidos, ${issues.size} clube(s) pendente(s). Os clubes válidos foram salvos para retomar, mas o catálogo ainda não foi alterado.\n${details}\nClique em Rodar para retomar somente os clubes pendentes após corrigir os dados na fonte.`);
  }
  progress("156/156 clubes coletados. Validando identidades e elencos completos…");
  return transfermarktSnapshotSchema.parse(checkpoint.snapshot);
}
