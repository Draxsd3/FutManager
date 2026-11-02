// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCloudSave, readLocalSaves, writeCloudSave, writeLocalSaves } from "./persistence";
import type { CareerSave } from "./editor-data";

const client = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), upsert: vi.fn(), remove: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabaseClient: () => ({ auth: { getUser: client.getUser }, from: client.from }) }));
const save = (round = 1): CareerSave => ({ id: "career", name: "Minha carreira", managerName: "Alice", clubId: "club", clubName: "Flamengo", division: "Série A", round, budget: 12624, inGameDate: "2026-01-22", updatedAt: "2026-10-29T15:00:00Z" });
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
