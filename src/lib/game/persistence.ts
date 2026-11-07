import { binaryText,textBinary,packCheckpoint,unpackCheckpoint } from "./simulation/checkpoint-dictionary";
import { strToU8, strFromU8, zlibSync, unzlibSync } from "fflate";
import { EngineConflict } from "./simulation/foundation";
import { currentCareerSaves, isCurrentCareerSave } from "./career-rules";
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
const aggregateCodecs:Record<string,string>={finance:"finance-deflate-v1",marketState:"market-deflate-v1",staff:"staff-deflate-v1",population:"players-deflate-v1",managerMarket:"managers-deflate-v1",competitionSeason:"season-deflate-v1",youthTeams:"youth-deflate-v1",jobClubSnapshots:"club-snapshots-deflate-v1"};
function compressAggregate(key:string,value:unknown) {
  if(!value || typeof value!=="object") return false;
  const v=value as Record<string,unknown>;
  return (key==="finance" && v.rulesVersion==="finance-v1") || (key==="marketState" && v.version===1) || (key==="staff" && v.rulesVersion==="coaches-v1") || (key==="population" && v.rulesVersion==="players-v1")
    || (key==="managerMarket" && (v.finance as {rulesVersion?:string})?.rulesVersion==="finance-v1")
    || (key==="competitionSeason" && Array.isArray(v.fixtures))
    || (["youthTeams","jobClubSnapshots"].includes(key) && Object.keys(v).length>0);
}
const packedFinance = new WeakMap<object, string>();
const unpackedFinance = new Map<string, unknown>();
function decodeSaveIndex(raw: string | null): CareerSave[] {
  return JSON.parse(raw ?? "[]",(key,value)=>{
    const legacy=aggregateCodecs[key],dictionary=legacy?.replace("-deflate-v1","-dictionary-deflate-v1");
    if (!legacy || ![legacy,dictionary].includes(value?.codec)) return value;
    let finance=unpackedFinance.get(value.data);
    if (!finance) {
      if (!Number.isSafeInteger(value.size) || value.size < 2 || value.size > 64_000_000) throw new Error("Checkpoint financeiro inválido.");
      const bytes=value.encoding==="utf15" ? textBinary(value.data,value.bytes) : Uint8Array.from(atob(value.data),c=>c.charCodeAt(0));
      // A corrupt local payload must fail closed, not allocate arbitrary decompression output.
      const text=strFromU8(unzlibSync(bytes,{out:new Uint8Array(value.size)}));
      finance=value.codec===dictionary ? unpackCheckpoint(text) : JSON.parse(text); if(unpackedFinance.size>=4) unpackedFinance.clear(); unpackedFinance.set(value.data,finance);
    }
    const restored=structuredClone(finance);
    if(restored && typeof restored === "object") packedFinance.set(restored,JSON.stringify(value));
    return restored;
  }) as CareerSave[];
}
function encodeSaveIndex(index: CareerSave[]) {
  return JSON.stringify(index,(key,value)=>{
    if (!compressAggregate(key,value)) return value;
    let packed=packedFinance.get(value);
    if (!packed) {
      const bytes=strToU8(packCheckpoint(value)), zipped=zlibSync(bytes,{level:6});
      packed=JSON.stringify({codec:aggregateCodecs[key].replace("-deflate-v1","-dictionary-deflate-v1"),size:bytes.length,encoding:"utf15",bytes:zipped.length,data:binaryText(zipped)});
      packedFinance.set(value,packed);
    }
    return JSON.parse(packed);
  });
}
// Large immutable universes live in IndexedDB/cloud, not the 5 MB localStorage index.
const cloudTokens = new Map<string, { token: string; ancestors: Set<string | null> }>();
const universeMemory = new Map<string, EditorDatabase>();

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
    const parsed = decodeSaveIndex(value);
    return Array.isArray(parsed) ? currentCareerSaves(parsed as CareerSave[]).map(save => {
      const snapshot = universeMemory.get(`${userId}:${save.id}`);
      return snapshot && save.progress ? { ...save, progress: { ...save.progress, universeSnapshot: save.progress.universeSnapshot ?? snapshot } } : save;
    }) : [];
  } catch {
    return [];
  }
}

export function writeLocalSaves(saves: CareerSave[], userId: string) {
  saves = currentCareerSaves(saves);
  const index = saves.map(save => save.progress ? { ...save, progress: { ...save.progress, universeSnapshot: undefined } } : save);
  try {
    const previous = decodeSaveIndex(localStorage.getItem(accountStorageKey(SAVES_KEY,userId)));
    if (index.some(save => (previous.find(old => old.id === save.id)?.progress?.engine?.revision ?? 0) > (save.progress?.engine?.revision ?? 0))) return false;
    for(const save of index) {
      const old=previous.find(v=>v.id===save.id)?.progress?.worldMarket?.population,current=save.progress?.worldMarket?.population;
      if(old && (!current || current.rulesVersion!==old.rulesVersion || current.version!==old.version || Object.keys(old.people).some(id=>!current.people[id]) || Object.keys(old.generated).some(id=>!current.generated[id]))) return false;
    }
    localStorage.setItem(accountStorageKey(SAVES_KEY, userId), encodeSaveIndex(index));
    // Retain only careers still present in this account's durable index. In particular,
    // deleted/replaced careers must not pin whole frozen universes for the life of the tab.
    const retained=new Set(saves.map(save=>`${userId}:${save.id}`));
    for(const key of universeMemory.keys()) if(key.startsWith(`${userId}:`) && !retained.has(key)) universeMemory.delete(key);
    for (const save of saves) if (save.progress?.universeSnapshot) universeMemory.set(`${userId}:${save.id}`, save.progress.universeSnapshot);
    void cacheCareerSaves(saves, userId).catch(() => undefined);
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
      transfermarkt: row.transfermarkt ?? undefined,
      honours: row.transfermarkt?.honours,
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
      transfermarkt: row.transfermarkt ?? undefined,
      ...(row.transfermarkt?.loan ? { loan: row.transfermarkt.loan } : {}),
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
      ...(club.transfermarkt ? { transfermarkt: club.transfermarkt } : {}),
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
      ...(player.transfermarkt ? { transfermarkt: { ...player.transfermarkt, ...(player.loan ? { loan: player.loan } : {}) } } : {}),
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
  // Read every page BEFORE deleting: deleting while paging by offset skips rows.
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("game_saves").select("*").eq("owner_id", userId)
      .order("id", { ascending: true }).range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  const saves = rows.map((row) => ({
    id: row.id, name: row.name, managerName: row.manager_name,
    careerRuleset: row.state?.careerRuleset,
    syncToken: row.state?.sync?.token,
    clubId: String(row.state?.clubId ?? ""), clubName: row.club_name ?? "Clube",
    division: row.division ?? "Série A", round: row.round, budget: Number(row.budget_brl),
    inGameDate: row.in_game_date, updatedAt: row.updated_at, progress: row.state?.progress,
    playerCareers: row.state?.playerCareers ?? {}, manualPositions: row.state?.manualPositions ?? {},
  })) as CareerSave[];
  const retired = saves.filter(save => !isCurrentCareerSave(save));
  // RLS and explicit owner scope: never delete another account through a browser session.
  for (let offset = 0; offset < retired.length; offset += 100) {
    const { error } = await client.from("game_saves").delete().eq("owner_id", userId)
      .in("id", retired.slice(offset, offset + 100).map(save => save.id));
    if (error) throw error; // Retry on the next login; never merge old careers back in.
  }
  return currentCareerSaves(saves);
}

async function performCloudSave(save: CareerSave, expectedUserId: string) {
  if (!isCurrentCareerSave(save)) throw new Error("Esta carreira foi encerrada na atualização do calendário CBF. Inicie uma nova carreira.");
  const { client, userId } = await authenticatedClient(expectedUserId);
  const key = `${userId}:${save.id}`;
  const token = crypto.randomUUID();
  const lineage = cloudTokens.get(key);
  const supplied = save.syncToken ?? null;
  const parent = lineage?.ancestors.has(supplied) ? lineage.token : supplied;
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
      sync: { token, parent },
      careerRuleset: save.careerRuleset,
      clubId: save.clubId,
      progress: save.progress,
      playerCareers: save.playerCareers ?? {},
      manualPositions: save.manualPositions ?? {},
    },
    updated_at: save.updatedAt,
  });
  if (error) {
    if (error.code === "40001") throw new EngineConflict();
    throw error;
  }
  const ancestors = new Set(lineage?.ancestors ?? []); ancestors.add(parent); ancestors.add(token);
  cloudTokens.set(key,{token,ancestors});
  save.syncToken = token;
  // Do not race a command's local checkpoint publication while acknowledging cloud lineage.
  if (typeof navigator !== "undefined" && navigator.locks) {
    await navigator.locks.request(`futmanager:${userId}:${save.id}`,() => {
      try {
        const raw = localStorage.getItem(accountStorageKey(SAVES_KEY,userId));
        if (raw) {
          const index = decodeSaveIndex(raw);
          localStorage.setItem(accountStorageKey(SAVES_KEY,userId),encodeSaveIndex(index.map(item => item.id === save.id ? { ...item,syncToken:token } : item)));
        }
      } catch { /* Cloud commit succeeded; local storage may be unavailable. */ }
    });
  }
}

export async function deleteCloudSave(id: string, expectedUserId: string) {
  await saveWrites.get(`${expectedUserId}:${id}`)?.catch(() => undefined);
  const { client } = await authenticatedClient(expectedUserId);
  const { error } = await client.from("game_saves").delete().eq("id", id);
  if (error) throw error;
  cloudTokens.delete(`${expectedUserId}:${id}`);
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
