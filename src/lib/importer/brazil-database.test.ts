import { expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import source from "@/data/brazil-clubs.json";
import assets from "@/data/brazil-assets.json";
import report from "../../../docs/import-brazil-2026-report.json";
import { importBrazilDatabase } from "./brazil-database";
import { clubCrestAsset, clubKitAsset } from "@/lib/game/assets";
import { createDefaultDatabase } from "@/lib/game/editor-data";

it("imports all validated Brazilian clubs with correct 2026 national divisions and senior rosters", async () => {
 const database = await importBrazilDatabase();
 expect(database.clubs).toHaveLength(706);
 expect(database.players).toHaveLength(15992);
 expect(new Set(database.clubs.map(c=>c.name)).size).toBe(706);
 const counts = Object.fromEntries(["Série A","Série B","Série C","Série D","Sem divisão nacional"].map(division=>[division,database.clubs.filter(c=>c.division===division).length]));
 expect(counts).toEqual(report.divisions);
 expect(database.clubs.every(c=>c.country==="Brasil" && c.state)).toBe(true);
 const playersByClub = new Map<string, typeof database.players>();
 for (const player of database.players) {
  const players=playersByClub.get(player.clubId) ?? []; players.push(player); playersByClub.set(player.clubId,players);
  expect(player.goals).toBe(0); expect(player.averageRating).toBeNull();
 }
 for (const club of database.clubs) {
  const players=playersByClub.get(club.id)!;
  expect(players.length).toBeGreaterThanOrEqual(11); expect(players.length).toBeLessThanOrEqual(35);
  expect(new Set(players.map(p=>p.shirtNumber)).size).toBe(players.length);
  expect(players.some(p=>p.primaryPosition==="G"),club.name).toBe(true);
 }
 for (const [name, division] of [["Santos","Série A"],["Remo","Série A"],["Náutico","Série B"],["Ferroviária","Série C"],["ABC","Série D"]]) {
  expect(database.clubs.find(c=>c.name===name)?.division).toBe(division);
 }
 const corinthians=database.clubs.find(c=>c.name==="Corinthians")!;
 expect(playersByClub.get(corinthians.id)?.some(p=>p.name==="Hugo Souza")).toBe(true);
});
it("preserves source data, explicitly records missing files and only references images that exist", () => {
 expect(source.reduce((n,c)=>n+c.players.length,0)).toBe(16040);
 expect(report.missingMappedFiles).toEqual([]);
 expect(report.missing2026Participants).toHaveLength(8);
 for (const [name, item] of Object.entries(assets)) {
  const crest=clubCrestAsset(name);
  expect(Boolean(crest)).toBe(item.crest);
  if(crest) expect(existsSync(join(process.cwd(),"public",crest))).toBe(true);
  for (const kit of [1,2,3] as const) {
   const path=clubKitAsset(name,kit);
   expect(Boolean(path)).toBe((item.kits as number[]).includes(kit));
   if(path) expect(existsSync(join(process.cwd(),"public",path))).toBe(true);
  }
 }
});
it("keeps matching club IDs for kit projects, preserves custom clubs, avoids account-global UUIDs and is idempotent", async () => {
 const existing=createDefaultDatabase();
 const custom={...existing.clubs[0],id:crypto.randomUUID(),name:"Meu clube personalizado"};
 existing.clubs.push(custom);
 const snapshot=structuredClone(existing);
 const imported=await importBrazilDatabase(existing);
 expect(imported.clubs.find(c=>c.name==="Corinthians")?.id).toBe(existing.clubs.find(c=>c.name==="Corinthians")!.id);
 expect(imported.clubs.find(c=>c.id===custom.id)).toEqual(custom);
 expect(existing).toEqual(snapshot);
 const repeated=await importBrazilDatabase(imported);
 expect(repeated.clubs.map(c=>c.id)).toEqual(imported.clubs.map(c=>c.id));
 expect(repeated.players).toHaveLength(imported.players.length);
 const otherAccount=await importBrazilDatabase();
 const ids=new Set(imported.clubs.map(c=>c.id));
 expect(otherAccount.clubs.some(c=>ids.has(c.id))).toBe(false);
});
