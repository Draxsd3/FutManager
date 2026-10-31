import { expect, it } from "vitest";
import { buildCompetitionCatalog, competitionCategories } from "./competitions";
import { createDefaultDatabase } from "./editor-data";

it("lists exactly the requested Brazilian competitions even without registered clubs", () => {
 const catalog = buildCompetitionCatalog({clubs:[],players:[]});
 expect(catalog).toHaveLength(34);
 expect(new Set(catalog.map(c=>c.id)).size).toBe(34);
 expect(competitionCategories.map(c=>c.id)).toEqual(["national","state","regional"]);
 expect(catalog.filter(c=>c.category==="national").map(c=>c.name)).toEqual([
  "Brasileirão · Série A", "Brasileirão · Série B", "Brasileirão · Série C", "Brasileirão · Série D", "Copa do Brasil",
 ]);
 expect(catalog.filter(c=>c.category==="state")).toHaveLength(27);
 expect(catalog.find(c=>c.location==="Distrito Federal")?.name).toBe("Campeonato Brasiliense");
 expect(catalog.filter(c=>c.category==="regional").map(c=>c.name)).toEqual(["Copa do Nordeste","Copa Verde"]);
 expect(catalog.every(c=>c.clubs.length===0)).toBe(true);
});
it("includes only registered Brazilian clubs in their own division and does not mutate the database", () => {
 const db=createDefaultDatabase();
 db.clubs.push({...db.clubs[0],id:"foreign",name:"Clube estrangeiro",country:"Portugal"});
 const original=structuredClone(db);
 const catalog=buildCompetitionCatalog(db);
 expect(catalog.some(c=>c.location==="Portugal" || c.clubs.includes("Clube estrangeiro"))).toBe(false);
 for (const competition of catalog) {
  if (competition.division) {
   expect(competition.clubs).toEqual(db.clubs.filter(c=>c.country==="Brasil" && c.division===competition.division).map(c=>c.name));
  } else {
   expect(competition.clubs.every(name=>db.clubs.some(c=>c.country==="Brasil" && c.name===name))).toBe(true);
  }
 }
 expect(db).toEqual(original);
});
