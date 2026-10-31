// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { cacheDatabase, readCachedDatabase, hasPendingDatabaseSync } from "./database-cache";
import { createDefaultDatabase } from "@/lib/game/editor-data";
it("stores a full database independently of localStorage, isolates accounts and marks pending cloud synchronization", async () => {
 const database=createDefaultDatabase();
 expect(await readCachedDatabase("cache-alice")).toBeNull();
 await cacheDatabase(database,"cache-alice");
 expect(await readCachedDatabase("cache-alice")).toEqual(database);
 expect(await hasPendingDatabaseSync("cache-alice")).toBe(true);
 expect(await readCachedDatabase("cache-bob")).toBeNull();
 await cacheDatabase(database,"cache-alice",false);
 expect(await hasPendingDatabaseSync("cache-alice")).toBe(false);
});
it("serializes writes so the newest database wins",async()=>{
 const first=createDefaultDatabase(), last={...first,clubs:[]};
 await Promise.all([cacheDatabase(first,"cache-sequence"),cacheDatabase(last,"cache-sequence")]);
 expect((await readCachedDatabase("cache-sequence"))?.clubs).toEqual([]);
});
it("keeps career snapshots beyond localStorage quota, isolated by player account", async()=>{
 const {cacheCareerSaves,readCachedCareerSaves}=await import("./database-cache");
 const saves=[{id:"large",name:"large snapshot",managerName:"Coach",clubId:"club",clubName:"ABC",division:"Série D" as const,round:1,budget:10,inGameDate:"2026-01-22",updatedAt:"2026-10-31T03:00:00Z"}];
 await cacheCareerSaves(saves,"large-owner");
 expect(await readCachedCareerSaves("large-owner")).toEqual(saves);
 expect(await readCachedCareerSaves("other-owner")).toBeNull();
 await cacheCareerSaves([],"large-owner");
 expect(await readCachedCareerSaves("large-owner")).toEqual([]);
});
