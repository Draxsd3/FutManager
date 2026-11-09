import {expect,it} from "vitest";
import {importBrazilDatabase} from "@/lib/importer/brazil-database";
import {applyNovemberDatabase} from "@/lib/importer/november-database";
import {createCareerSeason,settleSeasonThrough} from "../season";
import {auditSeason} from "./season-lifecycle";
it("finishes a domestic world without cancelling the human's projected cup path",async()=>{
 const db=(await applyNovemberDatabase(await importBrazilDatabase())).database;
 const club=db.clubs.find(c=>c.name==="Flamengo")!;
 const season=createCareerSeason(db,club.id,2026,"domestic-world")!;
 const finished=settleSeasonThrough(season,db,"2026-12-31");
 const audit=auditSeason(finished,db,"2026-12-31");
 console.log(JSON.stringify({fixtures:season.fixtures.length,issues:audit.issues.slice(0,20),pending:finished.fixtures.filter(f=>f.status!=="played").map(f=>({id:f.id,status:f.status,date:f.scheduledDate})).slice(0,20),missing:audit.summary.missingNationalClubIds.length}));
 expect(audit.issues).toEqual([]);
 expect(audit.summary.missingNationalClubIds).toEqual([]);
},180000);
