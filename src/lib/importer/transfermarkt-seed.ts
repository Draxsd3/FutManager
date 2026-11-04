import { z } from "zod";
import { nationalCompetitions, normalizeLiveClub, normalizeLivePlayer, type LiveCheckpoint } from "./transfermarkt-live";
import { transfermarktSnapshotSchema } from "./transfermarkt";

const idSchema = z.string().regex(/^[1-9]\d*$/);
const fileSchema = z.object({ competitions: z.array(z.object({
  id: z.string(), name: z.string().min(1), seasonId: z.literal("2025"),
  clubs: z.array(z.object({ id: idSchema, name: z.string().min(1), players: z.array(z.unknown()).max(200) })).max(96),
})).length(4) });
export type SeedPlayerIssue = { clubId: string; clubName: string; playerId: string; playerName: string; message: string };

/** User-supplied 2026 collection. Processing date is NOT the unknown upstream collection date. */
export function prepareNationalSeed(input: unknown, seedId: string, processedAt = new Date().toISOString()) {
  const file = fileSchema.parse(input);
  if (new Set(file.competitions.map(comp => comp.id)).size !== 4) throw new Error("Competições duplicadas no arquivo.");
  const checkpoint: LiveCheckpoint = { seedId, snapshot: { version: 2, generatedAt: processedAt, seasonId: "2026", competitions: [], clubs: [] }, members: [], issues: [] };
  const playerIssues: SeedPlayerIssue[] = [], clubIds = new Set<string>(), playerIds = new Set<string>();
  let totalPlayers = 0;
  for (const expected of nationalCompetitions) {
    const comp = file.competitions.find(comp => comp.id === expected.id);
    if (!comp || comp.clubs.length !== expected.expected) throw new Error(`${expected.division}: participantes incompletos no arquivo.`);
    checkpoint.snapshot.competitions!.push({ id: comp.id, name: comp.name, seasonId: comp.seasonId, division: expected.division });
    for (const club of comp.clubs) {
      if (clubIds.has(club.id)) throw new Error("Clube duplicado no arquivo.");
      clubIds.add(club.id);
      checkpoint.members.push({ id: club.id, name: club.name, competitionId: comp.id });
      const problems: string[] = [];
      for (const raw of club.players) {
        const identity = z.object({ id: idSchema, name: z.string().min(1) }).parse(raw);
        if (playerIds.has(identity.id)) throw new Error("Jogador duplicado no arquivo.");
        playerIds.add(identity.id); totalPlayers++;
        try {
          transfermarktSnapshotSchema.shape.clubs.element.shape.players.element.parse(normalizeLivePlayer(raw, club.name, processedAt));
        } catch {
          const facts = raw as Record<string, unknown>;
          const missing = [!facts.position ? "posição não informada" : null,
            facts.age == null && !facts.dateOfBirth ? "idade e nascimento não informados" : null].filter(Boolean);
          const message = missing.length ? missing.join("; ") : "Campo obrigatório inválido no arquivo.";
          playerIssues.push({ clubId: club.id, clubName: club.name, playerId: identity.id, playerName: identity.name, message });
          problems.push(`${identity.name} (ID ${identity.id}): ${message}`);
        }
      }
      if (club.players.length < 11) problems.push(`Elenco com ${club.players.length} jogadores; mínimo de 11.`);
      if (!problems.length) {
        try {
          // Country is established by the explicitly allowlisted Brazilian competition, not an invented profile.
          const normalized = normalizeLiveClub({ id: club.id, name: club.name, league: { countryName: "Brazil" } }, { id: club.id, players: club.players }, club.id, processedAt);
          if (!normalized.players.some(player => player.position === "G")) throw new Error("Elenco sem goleiro.");
          checkpoint.snapshot.clubs.push({ ...normalized, competitionId: comp.id, division: expected.division, country: "Brasil" });
        } catch (error) { problems.push(error instanceof Error ? error.message : "Elenco inválido."); }
      }
      if (problems.length) checkpoint.issues!.push({ clubId: club.id, clubName: club.name, message: problems.join("\n") });
    }
  }
  return { checkpoint, report: { filename: "brasileirao-2026.json", seedId, processedAt, sourceCollectedAt: null,
    clubs: clubIds.size, players: totalPlayers, validClubs: checkpoint.snapshot.clubs.length,
    pendingClubs: checkpoint.issues!.length, playerIssues } };
}
