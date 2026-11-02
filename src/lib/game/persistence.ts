import { cacheCareerSaves } from "@/lib/importer/database-cache";
import { accountStorageKey } from "./save-utils";
import { createBrowserSupabaseClient, type ClubRow, type PlayerRow } from "@/lib/supabase/client";
import { enforceEditorSquadLimit, type CareerSave, type EditorClub, type EditorDatabase, type EditorPlayer } from "./editor-data";
import type { Player } from "./mock-data";
import { createPlayerCareer, type ManualPosition, type PlayerCareerRecord } from "./career";

export type CloudCareer = {
  squad: Player[];
  starters: number[];
  playerCareers: Record<number, PlayerCareerRecord>;
  manualPositions: Record<number, ManualPosition>;
};

const DATABASE_KEY = "futmanager.editor.v1";
const SAVES_KEY = "futmanager.saves.v1";

export function readLocalDatabase(userId: string): EditorDatabase | null {
  try {
    const value = localStorage.getItem(accountStorageKey(DATABASE_KEY, userId));
    return value ? (JSON.parse(value) as EditorDatabase) : null;
  } catch {
    return null;
  }
}

export function writeLocalDatabase(database: EditorDatabase, userId: string) {
  try {
    localStorage.setItem(accountStorageKey(DATABASE_KEY, userId), JSON.stringify({ ...database, players: enforceEditorSquadLimit(database.players) }));
    return true;
  } catch { return false; }
}

export function readLocalSaves(userId: string): CareerSave[] {
  try {
    const value = localStorage.getItem(accountStorageKey(SAVES_KEY, userId));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed as CareerSave[] : [];
  } catch {
    return [];
  }
}

export function writeLocalSaves(saves: CareerSave[], userId: string) {
  void cacheCareerSaves(saves, userId).catch(() => undefined);
  try {
    localStorage.setItem(accountStorageKey(SAVES_KEY, userId), JSON.stringify(saves));
    return true;
  } catch { return false; }
}

async function authenticatedClient(expectedUserId: string) {
  const client = createBrowserSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user || userData.user.id !== expectedUserId || userData.user.is_anonymous) {
    throw new Error("Entre com email e senha para salvar sua carreira.");
  }
  return { client, userId: userData.user.id };
}

/** Supabase returns at most one page by default; never silently truncate imported rosters. */
async function readAllEditorRows<T extends "editor_clubs" | "editor_players">(client: ReturnType<typeof createBrowserSupabaseClient>, table: T): Promise<(T extends "editor_clubs" ? ClubRow : PlayerRow)[]> {
  let offset = 0;
  const load = () => client.from(table).select("*").order("id").range(offset, offset + 499);
  const rows: NonNullable<Awaited<ReturnType<typeof load>>["data"]> = [];
  for (;;) {
    const { data, error } = await load();
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows as unknown as (T extends "editor_clubs" ? ClubRow : PlayerRow)[];
    offset += 500;
  }
}
function chunks<T>(items: T[], size = 250): T[][] {
  return Array.from({length: Math.ceil(items.length / size)}, (_, i) => items.slice(i * size, (i + 1) * size));
}

export async function readCloudDatabase(userId: string): Promise<EditorDatabase | null> {
  const { client } = await authenticatedClient(userId);
  const [clubRows, playerRows] = await Promise.all([readAllEditorRows(client, "editor_clubs"), readAllEditorRows(client, "editor_players")]);
  if (!clubRows?.length) return null;
  return {
    clubs: clubRows.map((row) => ({
      id: row.id,
      name: row.name,
      shortName: row.short_name,
      division: row.division,
      state: row.state ?? undefined,
      foundedYear: row.founded_year ?? 0,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      stadiumName: row.stadium_name,
      stadiumCapacity: row.stadium_capacity,
      country: row.country,
      level: row.level,
      coachName: row.coach_name,
      kitStyle: row.kit_style,
    })) as EditorClub[],
    players: (playerRows ?? []).map((row) => ({
      id: row.id,
      clubId: row.club_id,
      name: row.name,
      shirtNumber: row.shirt_number,
      primaryPosition: row.primary_position,
      secondaryPosition: row.secondary_position,
      overall: row.overall,
      age: row.age,
      preferredFoot: row.preferred_foot,
      starRating: row.star_rating,
      qualityPrimary: row.quality_primary,
      qualitySecondary: row.quality_secondary,
      energy: row.energy,
      salaryMonthlyBrl: Number(row.salary_monthly_brl),
      marketValueBrl: Number(row.market_value_brl),
      goals: row.goals,
      assists: row.assists,
      ownGoals: row.own_goals,
      averageRating: row.average_rating === null ? null : Number(row.average_rating),
      contractEndsOn: row.contract_ends_on,
      marketStatus: row.market_status ?? "normal",
    })) as EditorPlayer[],
  };
}

const databaseWrites = new Map<string, Promise<void>>();
export function writeCloudDatabase(database: EditorDatabase, expectedUserId: string): Promise<void> {
  const write = (databaseWrites.get(expectedUserId) ?? Promise.resolve()).catch(() => undefined)
    .then(() => performCloudDatabaseWrite(database, expectedUserId));
  databaseWrites.set(expectedUserId, write);
  void write.finally(() => { if (databaseWrites.get(expectedUserId) === write) databaseWrites.delete(expectedUserId); }).catch(() => undefined);
  return write;
}

async function performCloudDatabaseWrite(database: EditorDatabase, expectedUserId: string) {
  const { client, userId } = await authenticatedClient(expectedUserId);
  const limitedPlayers = enforceEditorSquadLimit(database.players);
  const remoteClubs = await readAllEditorRows(client, "editor_clubs");
  const localClubIds = new Set(database.clubs.map((club) => club.id));
  const removedClubIds = (remoteClubs ?? []).map((club) => club.id).filter((clubId) => !localClubIds.has(clubId));
  for (const ids of chunks(removedClubIds, 100)) {
    const { error } = await client.from("editor_clubs").delete().in("id", ids);
    if (error) throw error;
  }

  if (database.clubs.length) {
    const rows = database.clubs.map((club) => ({
      id: club.id,
      owner_id: userId,
      name: club.name,
      short_name: club.shortName,
      division: club.division,
      state: club.state ?? null,
      founded_year: club.foundedYear || null,
      primary_color: club.primaryColor,
      secondary_color: club.secondaryColor,
      stadium_name: club.stadiumName,
      stadium_capacity: club.stadiumCapacity,
      country: club.country,
      level: club.level,
      coach_name: club.coachName,
      kit_style: club.kitStyle,
      updated_at: new Date().toISOString(),
    }));
    for (const batch of chunks(rows)) {
      const { error } = await client.from("editor_clubs").upsert(batch);
      if (error) throw error;
    }
  }

  const remotePlayers = await readAllEditorRows(client, "editor_players");
  const localPlayerIds = new Set(limitedPlayers.map((player) => player.id));
  const removedPlayerIds = (remotePlayers ?? []).map((player) => player.id).filter((playerId) => !localPlayerIds.has(playerId));
  for (const ids of chunks(removedPlayerIds, 100)) {
    const { error } = await client.from("editor_players").delete().in("id", ids);
    if (error) throw error;
  }
  if (limitedPlayers.length) {
    const rows = limitedPlayers.map((player) => ({
      id: player.id,
      owner_id: userId,
      club_id: player.clubId,
      name: player.name,
      shirt_number: player.shirtNumber,
      primary_position: player.primaryPosition,
      secondary_position: player.secondaryPosition,
      overall: player.overall,
      age: player.age,
      preferred_foot: player.preferredFoot,
      star_rating: player.starRating,
      quality_primary: player.qualityPrimary,
      quality_secondary: player.qualitySecondary,
      energy: player.energy,
      salary_monthly_brl: player.salaryMonthlyBrl,
      market_value_brl: player.marketValueBrl,
      goals: player.goals,
      assists: player.assists,
      own_goals: player.ownGoals,
      average_rating: player.averageRating,
      contract_ends_on: player.contractEndsOn,
      market_status: player.marketStatus ?? "normal",
      updated_at: new Date().toISOString(),
    }));
    for (const batch of chunks(rows)) {
      const { error } = await client.from("editor_players").upsert(batch);
      if (error) throw error;
    }
  }
}

export async function readCloudSaves(userId: string): Promise<CareerSave[]> {
  const { client } = await authenticatedClient(userId);
  const { data, error } = await client.from("game_saves").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    managerName: row.manager_name,
    clubId: String(row.state?.clubId ?? ""),
    clubName: row.club_name ?? "Clube",
    division: row.division ?? "Série A",
    round: row.round,
    budget: Number(row.budget_brl),
    inGameDate: row.in_game_date,
    updatedAt: row.updated_at,
    progress: row.state?.progress,
    playerCareers: row.state?.playerCareers ?? {},
    manualPositions: row.state?.manualPositions ?? {},
  })) as CareerSave[];
}

async function performCloudSave(save: CareerSave, expectedUserId: string) {
  const { client, userId } = await authenticatedClient(expectedUserId);
  const { error } = await client.from("game_saves").upsert({
    id: save.id,
    owner_id: userId,
    name: save.name,
    manager_name: save.managerName,
    club_name: save.clubName,
    division: save.division,
    round: save.round,
    budget_brl: save.budget,
    in_game_date: save.inGameDate,
    state: {
      clubId: save.clubId,
      progress: save.progress,
      playerCareers: save.playerCareers ?? {},
      manualPositions: save.manualPositions ?? {},
    },
    updated_at: save.updatedAt,
  });
  if (error) throw error;
}

export async function deleteCloudSave(id: string, expectedUserId: string) {
  await saveWrites.get(`${expectedUserId}:${id}`)?.catch(() => undefined);
  const { client } = await authenticatedClient(expectedUserId);
  const { error } = await client.from("game_saves").delete().eq("id", id);
  if (error) throw error;
}

export async function writeCloudCareer(
  saveId: string,
  squad: Player[],
  starters: number[],
  playerCareers: Record<number, PlayerCareerRecord>,
  manualPositions: Record<number, ManualPosition>,
  club: string,
  expectedUserId: string,
) {
  const { client, userId } = await authenticatedClient(expectedUserId);
  const rows = squad.map((player) => {
    const record = playerCareers[player.id] ?? createPlayerCareer(player, club);
    const position = manualPositions[player.id];
    const lineupOrder = starters.indexOf(player.id);
    return {
      owner_id: userId,
      save_id: saveId,
      source_player_id: player.sourceId ?? null,
      name: player.name,
      position_code: player.position,
      secondary_position_code: player.secondaryPosition ?? null,
      preferred_foot: player.foot,
      overall: player.overall,
      energy: player.energy,
      salary_monthly_brl: record.salary * 1000,
      market_value_brl: player.marketValue * 1_000_000,
      goals: player.goals,
      assists: player.assists,
      own_goals: player.ownGoals,
      average_rating: player.avgRating,
      traits: player.traits,
      age: player.age,
      contract_ends_on: record.contractUntil,
      market_status: record.marketStatus,
      retirement_year: record.retirementYear,
      is_starter: lineupOrder >= 0,
      lineup_order: lineupOrder >= 0 ? lineupOrder : null,
      pitch_left: position?.left ?? null,
      pitch_top: position?.top ?? null,
      updated_at: new Date().toISOString(),
    };
  });
  const { data, error } = await client
    .from("career_players")
    .upsert(rows, { onConflict: "save_id,source_player_id" })
    .select("id,source_player_id");
  if (error) throw error;

  const playerIdBySource = new Map((data ?? []).map((row) => [row.source_player_id, row.id]));
  for (const player of squad) {
    const careerPlayerId = playerIdBySource.get(player.sourceId ?? null);
    if (!careerPlayerId) continue;
    const record = playerCareers[player.id] ?? createPlayerCareer(player, club);
    const { error: seasonError } = await client.from("career_player_seasons").upsert(
      record.seasons.map((season) => ({
        owner_id: userId,
        career_player_id: careerPlayerId,
        season: season.season,
        club_name: season.club,
        games: season.games,
        goals: season.goals,
        assists: season.assists,
        average_rating: season.average,
      })),
      { onConflict: "career_player_id,season" },
    );
    if (seasonError) throw seasonError;
  }
}

export async function readCloudCareer(saveId: string, userId: string): Promise<CloudCareer | null> {
  const { client } = await authenticatedClient(userId);
  const { data: playerRows, error } = await client
    .from("career_players")
    .select("*")
    .eq("save_id", saveId)
    .order("created_at");
  if (error) throw error;
  if (!playerRows?.length) return null;
  const ids = playerRows.map((row) => row.id);
  const { data: seasonRows, error: seasonError } = await client
    .from("career_player_seasons")
    .select("*")
    .in("career_player_id", ids)
    .order("season", { ascending: false });
  if (seasonError) throw seasonError;

  const numericIdByCareerId = new Map<string, number>();
  const squad = playerRows.map((row, index) => {
    const id = index + 1;
    numericIdByCareerId.set(row.id, id);
    return {
      id,
      sourceId: row.source_player_id ?? undefined,
      name: row.name,
      position: row.position_code as Player["position"],
      secondaryPosition: row.secondary_position_code as Player["secondaryPosition"],
      foot: row.preferred_foot as Player["foot"],
      overall: row.overall,
      energy: row.energy,
      salary: Math.round(Number(row.salary_monthly_brl) / 1000),
      passValue: Number((Number(row.market_value_brl) / 1_000_000).toFixed(1)),
      goals: row.goals,
      assists: row.assists,
      ownGoals: row.own_goals,
      traits: row.traits,
      age: row.age,
      avgRating: row.average_rating === null ? null : Number(row.average_rating),
      contractUntil: row.contract_ends_on,
      marketValue: Number((Number(row.market_value_brl) / 1_000_000).toFixed(1)),
    } satisfies Player;
  });
  const playerCareers: Record<number, PlayerCareerRecord> = {};
  const manualPositions: Record<number, ManualPosition> = {};
  for (const row of playerRows) {
    const id = numericIdByCareerId.get(row.id)!;
    playerCareers[id] = {
      marketStatus: row.market_status,
      contractUntil: row.contract_ends_on,
      salary: Math.round(Number(row.salary_monthly_brl) / 1000),
      retirementYear: row.retirement_year,
      seasons: (seasonRows ?? []).filter((season) => season.career_player_id === row.id).map((season) => ({
        season: season.season,
        club: season.club_name,
        games: season.games,
        goals: season.goals,
        assists: season.assists,
        average: season.average_rating === null ? null : Number(season.average_rating),
      })),
    };
    if (row.pitch_left !== null && row.pitch_top !== null) {
      manualPositions[id] = { left: Number(row.pitch_left), top: Number(row.pitch_top) };
    }
  }
  const starters = playerRows
    .filter((row) => row.is_starter)
    .sort((a, b) => (a.lineup_order ?? 99) - (b.lineup_order ?? 99))
    .map((row) => numericIdByCareerId.get(row.id)!)
    .filter(Boolean);
  return { squad, starters, playerCareers, manualPositions };
}

// Serialize writes per account/save so an earlier request cannot overwrite a newer snapshot.
const saveWrites = new Map<string, Promise<void>>();
export function writeCloudSave(save: CareerSave, userId: string): Promise<void> {
  const key = `${userId}:${save.id}`;
  const previous = saveWrites.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() => performCloudSave(save, userId));
  saveWrites.set(key, next);
  void next.finally(() => { if (saveWrites.get(key) === next) saveWrites.delete(key); }).catch(() => undefined);
  return next;
}
