// @vitest-environment jsdom
import { CURRENT_CAREER_RULESET } from "./career-rules";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCloudSave, readLocalSaves, writeCloudSave, writeLocalSaves } from "./persistence";
import type { CareerSave } from "./editor-data";

const client = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), upsert: vi.fn(), remove: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabaseClient: () => ({ auth: { getUser: client.getUser }, from: client.from }) }));
const save = (round = 1): CareerSave => ({ careerRuleset: CURRENT_CAREER_RULESET, id: "career", name: "Minha carreira", managerName: "Alice", clubId: "club", clubName: "Flamengo", division: "Série A", round, budget: 12624, inGameDate: "2026-01-22", updatedAt: "2026-10-29T15:00:00Z" });
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  client.getUser.mockResolvedValue({ data: { user: { id: "alice", is_anonymous: false } }, error: null });
  client.upsert.mockResolvedValue({ error: null });
  client.eq.mockResolvedValue({ error: null });
  client.remove.mockReturnValue({ eq: client.eq });
  client.from.mockReturnValue({ upsert: client.upsert, delete: client.remove });
});
afterEach(() => vi.restoreAllMocks());

describe("career persistence", () => {
  it("never reads legacy shared saves or another account's cache", () => {
    localStorage.setItem("futmanager.saves.v1", JSON.stringify([save()]));
    expect(readLocalSaves("alice")).toEqual([]);
    writeLocalSaves([save()], "alice");
    expect(readLocalSaves("alice")).toHaveLength(1);
    expect(readLocalSaves("bob")).toEqual([]);
  });
  it("rejects anonymous sessions and writes started for a different account", async () => {
    client.getUser.mockResolvedValueOnce({ data: { user: { id: "alice", is_anonymous: true } } });
    await expect(writeCloudSave(save(), "alice")).rejects.toThrow(/email e senha/);
    client.getUser.mockResolvedValueOnce({ data: { user: { id: "bob" } } });
    await expect(writeCloudSave(save(), "alice")).rejects.toThrow(/email e senha/);
    expect(client.from).not.toHaveBeenCalled();
  });
  it("writes the authenticated owner, not a caller-provided owner field", async () => {
    await writeCloudSave(save(), "alice");
    expect(client.upsert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: "alice", id: "career", round: 1 }));
  });
  it("serializes writes so the last checkpoint wins", async () => {
    let release!: () => void;
    client.upsert.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ error: null }); }));
    const first = writeCloudSave(save(1), "alice");
    const second = writeCloudSave(save(2), "alice");
    await vi.waitFor(() => expect(client.upsert).toHaveBeenCalledTimes(1));
    release();
    await Promise.all([first, second]);
    expect(client.upsert.mock.calls.map(([row]) => row.round)).toEqual([1, 2]);
  });
  it("waits for pending writes before deleting a save", async () => {
    let release!: () => void;
    client.upsert.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ error: null }); }));
    const pending = writeCloudSave(save(), "alice");
    const deletion = deleteCloudSave("career", "alice");
    await vi.waitFor(() => expect(client.upsert).toHaveBeenCalledTimes(1));
    expect(client.remove).not.toHaveBeenCalled();
    release();
    await Promise.all([pending, deletion]);
    expect(client.eq).toHaveBeenCalledWith("id", "career");
  });
  it("does not crash when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(writeLocalSaves([save()], "alice")).toBe(false);
  });
});

it("reads every cloud page and uploads imported players in bounded batches", async () => {
  const { createDefaultDatabase } = await import("./editor-data");
  const { readCloudDatabase, writeCloudDatabase } = await import("./persistence");
  const database=createDefaultDatabase();
  const template=database.players[0];
  database.clubs=database.clubs.slice(0,1);
  database.players=Array.from({length:35},(_,i)=>({...template,id:`p-${i}`,clubId:database.clubs[0].id,shirtNumber:i+1}));
  const fullRemote=Array.from({length:1001},(_,i)=>({id:`remote-${i}`,name:`Jogador ${i}`,club_id:"remote-club",average_rating:null}));
  const ranges: number[]=[];
  client.from.mockImplementation((table:string)=>({
    select:()=>({order:()=>({range:(start:number,end:number)=>{
      if(table==="editor_players") ranges.push(start);
      return Promise.resolve({data: table==="editor_players" ? fullRemote.slice(start,end+1) : [{id:"remote-club",name:"Clube",country:"Brasil"}],error:null});
    }})}),
    delete:()=>({in:vi.fn().mockResolvedValue({error:null})}),
    upsert:client.upsert,
  }));
  const loaded=await readCloudDatabase("alice");
  expect(loaded?.players).toHaveLength(1001);
  expect(ranges).toEqual([0,500,1000]);
  await writeCloudDatabase(database,"alice");
  expect(client.upsert.mock.calls.every(([rows])=>rows.length<=250)).toBe(true);
  expect(client.upsert.mock.calls.flatMap(([rows])=>rows).every(row=>row.owner_id==="alice")).toBe(true);
});

it("blocks old careers from being uploaded by the current client", async () => {
  const old = { ...save(), careerRuleset: undefined };
  await expect(writeCloudSave(old, "alice")).rejects.toThrow(/calendário CBF/);
  expect(client.upsert).not.toHaveBeenCalled();
  writeLocalSaves([old, save()], "alice");
  expect(readLocalSaves("alice")).toEqual([save()]);
});

it("reads all cloud pages before removing retired careers, scoped to the authenticated owner", async () => {
  const { readCloudSaves } = await import("./persistence");
  const row = (id: string, current: boolean) => ({ id, state: current ? { careerRuleset: CURRENT_CAREER_RULESET } : {}, name: id });
  const rows = Array.from({ length: 1002 }, (_, i) => row(`c-${i}`, i === 1001));
  const ranges: number[] = [], removed: string[] = [], owners: string[] = [];
  client.from.mockImplementation((table: string) => {
    expect(table).toBe("game_saves");
    return {
      select: () => ({ eq: (key: string, value: string) => {
        expect([key, value]).toEqual(["owner_id", "alice"]);
        return { order: () => ({ range: (from: number, to: number) => {
          ranges.push(from); return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
        } }) };
      } }),
      delete: () => ({ eq: (key: string, owner: string) => {
        expect(key).toBe("owner_id"); owners.push(owner);
        return { in: (key: string, ids: string[]) => {
          expect(key).toBe("id"); expect(ranges).toEqual([0, 500, 1000]);
          expect(ids.length).toBeLessThanOrEqual(100); removed.push(...ids);
          return Promise.resolve({ error: null });
        } };
      } }),
    };
  });
  const current = await readCloudSaves("alice");
  expect(current.map(save => save.id)).toEqual(["c-1001"]);
  expect(removed).toHaveLength(1001);
  expect(removed).not.toContain("c-1001");
  expect(new Set(owners)).toEqual(new Set(["alice"]));
});

it("removes obsolete roster rows from the cloud when updating the catalog", async () => {
  const { createDefaultDatabase } = await import("./editor-data");
  const { writeCloudDatabase } = await import("./persistence");
  const database = createDefaultDatabase();
  database.clubs = database.clubs.slice(0, 1);
  database.players = database.players.filter(player => player.clubId === database.clubs[0].id).slice(0, 2);
  const removed: Record<string, string[]> = {};
  client.from.mockImplementation((table: string) => ({
    select: () => ({ order: () => ({ range: () => Promise.resolve({ data: table === "editor_clubs" ? [{ id: database.clubs[0].id }] : [{ id: database.players[0].id }, { id: "old-roster-player" }], error: null }) }) }),
    delete: () => ({ in: (_key: string, ids: string[]) => { removed[table] = [...(removed[table] ?? []), ...ids]; return Promise.resolve({ error: null }); } }),
    upsert: client.upsert,
  }));
  await writeCloudDatabase(database, "alice");
  expect(removed.editor_players).toEqual(["old-roster-player"]);
  expect(removed.editor_clubs).toBeUndefined();
  expect(client.upsert.mock.calls.flatMap(([rows]) => rows).filter(row => row.club_id).map(row => row.id)).toEqual(database.players.map(player => player.id));
});
