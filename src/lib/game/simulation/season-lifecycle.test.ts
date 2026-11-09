// @vitest-environment jsdom
import { afterEach,expect,it,vi } from "vitest";
import { accountStorageKey } from "../save-utils";
import { publishLocalCheckpoint } from "./local-checkpoint";
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
import { marketFixture } from "./market-test-fixture";
import { buildRoundRobinGroups,simulateFixture } from "../season";
import { closeCareerSeason,auditSeason } from "./season-lifecycle";
import { assertMatchHistory,copyDiscipline } from "./matches";
import { engineState } from "./foundation";
import { readLocalSaves,writeLocalSaves } from "../persistence";

function completed() {
 const {save,database}=marketFixture();
 const planned=buildRoundRobinGroups({clubs:database.clubs,season:2026,competitionId:"league:Brasil:Série A",competitionName:"Brasileirão Série A",type:"league",division:"Série A",doubleRoundRobin:true}).flatMap(g=>g.fixtures);
 const discipline:ReturnType<typeof copyDiscipline>=new Map();
 const fixtures=planned.map((f,i)=>simulateFixture(database,{...f,scheduledDate:`2026-02-${String(i+1).padStart(2,"0")}`},discipline));
 save.inGameDate="2026-12-31";save.progress!.engine=engineState(undefined,save.id,save.inGameDate);
 save.progress!.competitionSeason={version:1,season:2026,clubId:save.clubId,clubName:save.clubName,division:save.division,fixtures};
 const command={operationId:"close:2026",expectedRevision:0,fromDate:save.inGameDate};
 return {save,database,command};
}
it("audits the actual calendar and reports missing world coverage without pretending it is simulated",()=>{
 const {save,database}=completed(),season=save.progress!.competitionSeason!;
 const report=auditSeason(season,database,save.inGameDate);
 expect(report.issues).toEqual([]);expect(report.summary.played).toBe(6);expect(report.summary.clubs).toHaveLength(3);
 expect(report.summary.goals).toBe(season.fixtures.reduce((n,f)=>n+f.homeScore!+f.awayScore!,0));
 const partial={...season,fixtures:season.fixtures.filter(f=>f.homeClubId!==database.clubs[2].id && f.awayClubId!==database.clubs[2].id)};
 expect(auditSeason(partial,database,save.inGameDate).summary.missingNationalClubIds).toEqual([database.clubs[2].id]);
});
it("creates an additive cloned archive and honours, without advancing the clock or paying an invented prize",()=>{
 const {save,database,command}=completed(),before=structuredClone(save),next=closeCareerSeason(save,database,command);
 expect(save).toEqual(before);expect(next.inGameDate).toBe(save.inGameDate);expect(next.budget).toBe(save.budget);
 expect(next.progress!.seasonHistory![2026].season).toEqual(save.progress!.competitionSeason);
 expect(next.progress!.seasonHistory![2026].season).not.toBe(save.progress!.competitionSeason);
 expect(next.progress!.championHistory).toHaveLength(1);expect(next.progress!.engine!.revision).toBe(1);
 expect(next.progress!.engine!.events.at(-1)?.type).toBe("season-closed");
 expect(()=>assertMatchHistory(save,next)).not.toThrow();
});
it("retries the same command and same business year without duplicate archives, honours or events",()=>{
 const {save,database,command}=completed(),closed=closeCareerSeason(save,database,command);
 expect(closeCareerSeason(closed,database,command)).toBe(closed);
 expect(closeCareerSeason(closed,database,{...command,operationId:"close-again",expectedRevision:1})).toBe(closed);
});
it("refuses stale revisions, reused operation IDs, ongoing matches and unresolved calendars without mutation",()=>{
 const {save,database,command}=completed(),before=structuredClone(save);
 expect(()=>closeCareerSeason(save,database,{...command,expectedRevision:1})).toThrow("outra aba");
 expect(()=>closeCareerSeason({...save,progress:{...save.progress!,page:"matchOverview"}},database,command)).toThrow("Conclua a partida");
 for(const status of ["scheduled","locked"] as const){const bad=structuredClone(save);bad.progress!.competitionSeason!.fixtures[0].status=status;expect(()=>closeCareerSeason(bad,database,command)).toThrow("não encerrada");}
 const closed=closeCareerSeason(save,database,command);closed.progress!.competitionSeason={...closed.progress!.competitionSeason!,season:2027};
 expect(()=>closeCareerSeason(closed,database,command)).toThrow("outro encerramento");expect(save).toEqual(before);
});
it("rejects malformed scores, duplicate IDs, foreign years/clubs, future played dates and empty calendars",()=>{
 const {save,database}=completed(),season=save.progress!.competitionSeason!;
 for(const alter of [(s:typeof season)=>s.fixtures.push(s.fixtures[0]),(s:typeof season)=>s.fixtures[0].homeScore=-1,(s:typeof season)=>s.fixtures[0].season=2025,(s:typeof season)=>s.fixtures[0].homeClubId="foreign",(s:typeof season)=>s.fixtures[0].scheduledDate="2027-01-02",(s:typeof season)=>s.fixtures=[]]) {const bad=structuredClone(season);alter(bad);expect(auditSeason(bad,database,save.inGameDate).issues.length).toBeGreaterThan(0);}
});
it("moving results from the active calendar to the archive preserves the entire immutable report",()=>{
 const {save,database,command}=completed(),closed=closeCareerSeason(save,database,command);
 const moved=structuredClone(closed);moved.progress!.competitionSeason={...moved.progress!.competitionSeason!,season:2027,fixtures:[]};
 expect(()=>assertMatchHistory(save,moved)).not.toThrow();
 for(const alter of [(s:typeof moved)=>delete s.progress!.seasonHistory![2026],(s:typeof moved)=>s.progress!.seasonHistory![2026].season.fixtures[0].homeScore!++,(s:typeof moved)=>s.progress!.seasonHistory![2026].honours=[],(s:typeof moved)=>s.progress!.seasonHistory![2026].summary.goals++]){const bad=structuredClone(moved);alter(bad);expect(()=>assertMatchHistory(closed,bad)).toThrow();}
});
it("round-trips the full archive through the existing bounded codec and rejects archive removal in local storage",()=>{
 const {save,database,command}=completed();localStorage.clear();expect(writeLocalSaves([save],"season-owner")).toBe(true);
 const closed=closeCareerSeason(save,database,command);expect(writeLocalSaves([closed],"season-owner")).toBe(true);
 expect(readLocalSaves("season-owner")[0].progress!.seasonHistory).toEqual(closed.progress!.seasonHistory);
 const bad=structuredClone(closed);delete bad.progress!.seasonHistory;
 expect(writeLocalSaves([bad],"season-owner")).toBe(false);expect(readLocalSaves("season-owner")[0].progress!.seasonHistory).toEqual(closed.progress!.seasonHistory);
 expect(readLocalSaves("another-owner")).toEqual([]);
});
it("builds an explicit domestic-world calendar without changing the default legacy career scope",async()=>{
 const {createCareerSeason}=await import("../season");const {save,database}=completed();
 const world=createCareerSeason(database,save.clubId,2026,"domestic-world")!,legacy=createCareerSeason(database,save.clubId,2026)!;
 expect(world.scope).toBe("domestic-world");expect(legacy.scope).toBe("career");
 for(const club of database.clubs.filter(c=>c.division!=="Sem divisão nacional"))expect(world.fixtures.some(f=>f.type==="league" && [f.homeClubId,f.awayClubId].includes(club.id))).toBe(true);
 expect(new Set(world.fixtures.map(f=>f.id)).size).toBe(world.fixtures.length);
});
it("does not turn a cancelled projected cup final into a completed championship",()=>{
 const {save,database,command}=completed(),f=save.progress!.competitionSeason!.fixtures[0];
 save.progress!.competitionSeason!.fixtures.push({...f,id:"cup-final",competitionId:"cup:Brasil",type:"cup",status:"cancelled",winnerClubId:undefined,report:undefined});
 expect(auditSeason(save.progress!.competitionSeason!,database,save.inGameDate).issues.some(i=>i.detail.includes("Final da copa"))).toBe(true);
 expect(()=>closeCareerSeason(save,database,command)).toThrow("sem resultado confirmado");
});

it("preserves the durable pre-closure checkpoint when the browser refuses the archive write",()=>{
 const {save,database,command}=completed();localStorage.clear();expect(writeLocalSaves([save],"quota-owner")).toBe(true);
 const closed=closeCareerSeason(save,database,command),before=localStorage.getItem(accountStorageKey("futmanager.saves.v1","quota-owner"));
 expect(before).not.toBeNull();
 const spy=vi.spyOn(Storage.prototype,"setItem").mockImplementationOnce(()=>{throw new DOMException("Full","QuotaExceededError");});
 expect(writeLocalSaves([closed],"quota-owner")).toBe(false);spy.mockRestore();
 expect(localStorage.getItem(accountStorageKey("futmanager.saves.v1","quota-owner"))).toBe(before);
 expect(readLocalSaves("quota-owner")[0].progress!.engine!.revision).toBe(0);expect(readLocalSaves("quota-owner")[0].progress!.seasonHistory).toBeUndefined();
});
it("publishes closure under the existing CAS and rejects a stale second writer",async()=>{
 vi.stubGlobal("navigator",{locks:{request:async(_name:string,commit:()=>unknown)=>commit()}});
 const {save,database,command}=completed();localStorage.clear();expect(writeLocalSaves([save],"cas-owner")).toBe(true);
 const closed=closeCareerSeason(save,database,command);await publishLocalCheckpoint(closed,"cas-owner",0);
 await expect(publishLocalCheckpoint(closed,"cas-owner",0)).rejects.toThrow("outra aba");
 expect(readLocalSaves("cas-owner")[0].progress!.engine!.revision).toBe(1);expect(readLocalSaves("cas-owner")[0].progress!.seasonHistory).toEqual(closed.progress!.seasonHistory);
});
