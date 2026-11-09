import {expect,it} from "vitest";
import {createDefaultDatabase} from "../editor-data";
import {marketFixture} from "./market-test-fixture";
import {createCareerSeason,settleSeasonThrough,nextCareerFixture,simulateFixture,completeCareerFixture} from "../season";
import {copyDiscipline,assertMatchHistory} from "./matches";
import {engineState} from "./foundation";
import {transitionCareerSeason,nextSeasonDivisions} from "./season-transition";
import {auditSeason} from "./season-lifecycle";

function finished() {
 const {save,database}=marketFixture();
 save.progress!.competitionSeason=settleSeasonThrough(createCareerSeason(database,save.clubId,2026,"domestic-world")!,database,"2026-12-31");
 save.inGameDate="2026-12-31";save.progress!.engine=engineState(undefined,save.id,save.inGameDate);
 // Adopted condition/finance must share the saved civil date (advanceCareer performs all effects).
 return {save,database,command:{operationId:"annual:2026",expectedRevision:0,fromDate:save.inGameDate}};
}
it("continues the entire cup after human elimination and archives its real CPU final",()=>{
 const {save,database}=marketFixture();
 let season=createCareerSeason(database,save.clubId,2026,"domestic-world")!;
 for(let i=0;i<200;i++) {
  const f=nextCareerFixture(season);if(!f) break;
  const result=simulateFixture(database,f,copyDiscipline(season));
  season=completeCareerFixture(season,f.id,{home:result.homeScore!,away:result.awayScore!,winnerClubId:result.winnerClubId,playerContributions:result.playerContributions,report:result.report},database);
  season=settleSeasonThrough(season,database,"2026-12-31",save.clubId);
 }
 season=settleSeasonThrough(season,database,"2026-12-31",save.clubId);
 expect(auditSeason(season,database,"2026-12-31").issues).toEqual([]);
 const cup=season.fixtures.filter(f=>f.type==="cup");
 const final=cup.find(f=>f.competitionRound===Math.max(...cup.map(v=>v.competitionRound)))!;
 expect(final.status).toBe("played");expect(final.winnerClubId).toBeTruthy();
});
it("rolls over without resetting results, cash, people or the frozen catalog; repeat is idempotent",()=>{
 const {save,database,command}=finished();const before=structuredClone(save),catalog=structuredClone(database);
 const next=transitionCareerSeason(save,database,command);
 expect(save).toEqual(before);expect(database).toEqual(catalog);
 expect(next.inGameDate).toBe("2027-01-01");expect(next.progress!.competitionSeason!.season).toBe(2027);
 expect(next.progress!.seasonHistory![2026].season).toEqual(save.progress!.competitionSeason);
 expect(next.progress!.seasonHistory![2026].honours.length).toBeGreaterThan(0);
 expect(next.progress!.engine!.revision).toBeGreaterThan(0);
 expect(transitionCareerSeason(next,database,command)).toBe(next);
 expect(()=>assertMatchHistory(save,next)).not.toThrow();
 expect(next.progress!.worldMarket!.population!.through).toBe(next.inGameDate);
});
it("rejects stale revision, ongoing or pending human matches without side effects",()=>{
 const {save,database,command}=finished();const before=structuredClone(save);
 expect(()=>transitionCareerSeason(save,database,{...command,expectedRevision:99})).toThrow("outra aba");
 const pending={...save,progress:{...save.progress!,competitionSeason:createCareerSeason(database,save.clubId,2026)!}};
 expect(()=>transitionCareerSeason(pending,database,command)).toThrow("pendentes");
 expect(()=>transitionCareerSeason({...save,progress:{...save.progress!,page:"result"}},database,command)).toThrow("volte ao clube");
 expect(save).toEqual(before);
});
it("division exchanges conserve populations and never move the same club twice",()=>{
 const {save,database}=finished(),season=save.progress!.competitionSeason!;
 const result=nextSeasonDivisions(season,database);
 for(const d of new Set(database.clubs.map(c=>c.division)))expect(Object.values(result).filter(v=>v===d).length).toBe(database.clubs.filter(c=>c.division===d).length);
});

it("legacy cup saves never resurrect the eliminated human in later projected rounds",()=>{
 const database=createDefaultDatabase(),club=database.clubs.find(c=>c.name==="Flamengo")!;
 let season=createCareerSeason(database,club.id,2026,"domestic-world")!;
 season={...season,tournaments:[],fixtures:season.fixtures.filter(f=>f.type==="cup").map(f=>({...f,cupHomeSource:undefined,cupAwaySource:undefined}))};
 const first=nextCareerFixture(season)!;
 season=completeCareerFixture(season,first.id,{home:first.homeClubId===club.id?0:2,away:first.awayClubId===club.id?0:2},database);
 season=settleSeasonThrough(season,database,"2026-12-31",club.id);
 expect(season.fixtures.every(f=>f.status==="played")).toBe(true);
 expect(season.fixtures.filter(f=>f.competitionRound>first.competitionRound).some(f=>[f.homeClubId,f.awayClubId].includes(club.id))).toBe(false);
 expect(auditSeason(season,database,"2026-12-31").issues).toEqual([]);
});
