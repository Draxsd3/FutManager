// @vitest-environment jsdom
import { expect,it } from "vitest";
import { buildSquadFromDatabase } from "../editor-data";
import { aggregateReport, applyDiscipline, assertMatchHistory, assertMatchReport, bannedForFixture, canMakeSubstitution, copyDiscipline, liveReport, matchDiscipline, substitutionAllowance } from "./matches";
import { completeCareerFixture, playerContributionsFromMatch, simulateFixture, type CareerSeason, type SeasonFixture } from "../season";
import type { MatchEvent } from "../live-match";
import { marketFixture } from "./market-test-fixture";
import { readLocalSaves,writeLocalSaves } from "../persistence";
import { backgroundClubStrengths,roundFixtures } from "../round-fixtures";
const data=marketFixture();
const fixture=(id="match",round=1):SeasonFixture=>({id,competitionId:"league",competitionName:"Liga",type:"league",season:2026,competitionRound:round,calendarRound:round,roundLabel:"Rodada",scheduledDate:`2026-02-${String(round).padStart(2,"0")}`,homeClubId:data.human.id,home:data.human.name,awayClubId:data.buyer.id,away:data.buyer.name,status:"scheduled"});
const season=(fixtures:SeasonFixture[]):CareerSeason=>({...data.save.progress!.competitionSeason!,fixtures});
const row=(clubId=data.human.id,playerId=data.database.players.find(p=>p.clubId===clubId)!.id)=>({playerId,clubId,playerName:"Atleta",minutes:90,goals:0,assists:0,rating:null});
function played(id="past") {const f:SeasonFixture={...fixture(id),status:"played",homeScore:0,awayScore:0,playerContributions:[row()]};f.report=aggregateReport(f,f.playerContributions!,"live");return f;}
const sub=(minute:number,outId:number,inId:number,interval=false):MatchEvent=>({minute,half:minute<=45?1:2,text:"Troca",team:"home",substitution:{outId,inId,interval}});
it("creates deterministic, reconciled background reports for both teams without mutating inputs",()=>{
 const f=fixture(),before=structuredClone(f),result=simulateFixture(data.database,f);
 expect(result).toEqual(simulateFixture(data.database,f));expect(f).toEqual(before);expect(result.report?.origin).toBe("background");
 expect(()=>assertMatchReport(result)).not.toThrow();expect(new Set(result.playerContributions!.map(p=>p.clubId)).size).toBe(2);
 for(const club of [f.homeClubId,f.awayClubId]) {const lost=result.report!.cards.filter(c=>c.clubId===club && c.card==="red").reduce((n,c)=>n+90-c.minute!,0);expect(result.playerContributions!.filter(p=>p.clubId===club).reduce((n,p)=>n+p.minutes,0)).toBe(990-lost);}
});
it("rejects score/statistic/event contradictions, duplicate people and invalid minutes",()=>{
 const good=played();expect(()=>assertMatchReport(good)).not.toThrow();
 for(const mutate of [(f:SeasonFixture)=>f.homeScore=1,(f:SeasonFixture)=>f.playerContributions![0].assists=1,(f:SeasonFixture)=>f.playerContributions![0].minutes=91,(f:SeasonFixture)=>f.playerContributions!.push(f.playerContributions![0]),(f:SeasonFixture)=>f.report!.goals.push({clubId:"foreign"}),(f:SeasonFixture)=>f.report!.cards.push({clubId:f.homeClubId,playerId:"not-playing",card:"red"})]) {
  const bad=structuredClone(good);mutate(bad);expect(()=>assertMatchReport(bad)).toThrow();
 }
});
it("rejects invalid scores before publication and keeps duplicate completion idempotent",()=>{
 const s=season([fixture()]);expect(()=>completeCareerFixture(s,"match",{home:NaN,away:0},data.database)).toThrow();expect(s.fixtures[0].status).toBe("scheduled");
 const done=simulateFixture(data.database,fixture()),next=completeCareerFixture(s,"match",{home:done.homeScore!,away:done.awayScore!,playerContributions:done.playerContributions,report:done.report},data.database);
 expect(completeCareerFixture(next,"match",{home:99,away:99},data.database)).toBe(next);
});
it.each([true,false])("separates equal numeric player IDs by team and maps home/away correctly (managed home=%s)",managedIsHome=>{
 const human=buildSquadFromDatabase(data.database,data.human.name,true)!.slice(0,11),cpu=buildSquadFromDatabase(data.database,data.buyer.name,true)!.slice(0,11);
 expect(human[0].id).toBe(cpu[0].id);
 const events=[{minute:10,half:1,text:"Gol",scene:{team:"home",action:"goal"},scorerId:human[0].id},{minute:20,half:1,text:"Gol",scene:{team:"away",action:"goal"},scorerId:cpu[0].id},{minute:25,half:1,text:"Vermelho",scene:{team:"away",action:"foul"},actorId:cpu[0].id,card:"red"}] as MatchEvent[];
 const rows=[...playerContributionsFromMatch({database:data.database,clubId:data.human.id,squad:human,events,ratings:{},participation:{[human[0].id]:{entered:0}}}),...playerContributionsFromMatch({database:data.database,clubId:data.buyer.id,squad:cpu,events,ratings:{},side:"away",participation:{[cpu[0].id]:{entered:0,left:25}}})];
 const f={...fixture(),status:"played" as const,homeScore:1,awayScore:1,playerContributions:rows,...(!managedIsHome?{homeClubId:data.buyer.id,awayClubId:data.human.id}:{})};
 const report=liveReport(f,events,{home:human,away:cpu},managedIsHome,"saved-live-seed");
 expect(report.seed).toBe("saved-live-seed");expect(report.cards[0].playerId).toBe(cpu[0].sourceId);expect(report.cards[0].playerId).not.toBe(human[0].sourceId);
 expect(rows.find(p=>p.playerId===cpu[0].sourceId)?.minutes).toBe(25);expect(rows.find(p=>p.playerId===human[0].sourceId)?.minutes).toBe(90);
 expect(()=>liveReport({...f,homeScore:2},events,{home:human,away:cpu},managedIsHome)).toThrow();
});
it("automatic red bans belong to the competition, survive time and are not served by another tournament",()=>{
 const old=played(),id=old.playerContributions![0].playerId;old.report!.cards=[{clubId:old.homeClubId,playerId:id,card:"red",minute:90}];
 const next=fixture("next",2),cup={...fixture("cup",2),competitionId:"cup"},s=season([old,next,cup]);
 expect(bannedForFixture(s,next,id)).toBe(true);expect(bannedForFixture(s,{...next,scheduledDate:"2028-01-01"},id)).toBe(true);expect(bannedForFixture(s,cup,id)).toBe(false);
 const cpu=simulateFixture(data.database,next,copyDiscipline(s));expect(cpu.playerContributions!.some(p=>p.playerId===id)).toBe(false);expect(cpu.report!.servedBans).toContain(id);
 const after=season([old,cpu,fixture("third",3)]);expect(bannedForFixture(after,after.fixtures[2],id)).toBe(false);
 expect(matchDiscipline(s).get("league")?.get(id)).toBe(1); // private simulation did not mutate the cached prior state
});
it("records service at the current owner after a transfer in the same competition",()=>{
 const old=played(),id=old.playerContributions![0].playerId;old.report!.cards=[{clubId:old.homeClubId,playerId:id,card:"red"}];
 const db={...data.database,players:data.database.players.map(p=>p.id===id?{...p,clubId:data.seller.id}:p)};
 const f={...fixture("new-owner",2),homeClubId:data.seller.id,home:data.seller.name};
 const result=simulateFixture(db,f,copyDiscipline(season([old])));expect(result.report!.servedBans).toContain(id);expect(result.playerContributions!.some(p=>p.playerId===id)).toBe(false);
});
it("does not invent old cards, people or attributions for incomplete legacy catalogs",()=>{
 const old={...played(),report:undefined},s=season([old,fixture("next",2)]);
 expect(matchDiscipline(s).size).toBe(0);const done=completeCareerFixture(s,"next",{home:0,away:0},data.database);expect(done.fixtures[0]).toEqual(old);
 const missing=simulateFixture({...data.database,players:[]},fixture());expect(missing.playerContributions).toEqual([]);expect(missing.report?.goals.every(g=>g.playerId===undefined)).toBe(true);expect(()=>assertMatchReport(missing)).not.toThrow();
});
it("CPU selection excludes injury and retirement, preserving legal goal totals",()=>{
 const db=structuredClone(data.database),p=db.players[0];p.condition={morale:50,load:0,origin:"catalog",treatment:"rest",injuredUntil:"2026-04-01"};
 const result=simulateFixture(db,fixture());expect(result.playerContributions!.some(c=>c.playerId===p.id)).toBe(false);expect(()=>assertMatchReport(result)).not.toThrow();
});
it("uses the same condition and competition-ban strength in background previews and settlement",()=>{
 const old=played(),id=old.playerContributions![0].playerId;old.report!.cards=[{clubId:old.homeClubId,playerId:id,card:"red"}];
 const active={...fixture("human",2),homeClubId:data.seller.id,awayClubId:data.seller.id},other=fixture("other",2),s=season([old,active,other]);
 const previews=roundFixtures({season:s,active,database:data.database,strengths:backgroundClubStrengths(data.database),page:"matchOverview",minute:90,userIsHome:true,homeScore:0,awayScore:0});
 const result=simulateFixture(data.database,other,copyDiscipline(s));expect(previews.find(p=>!p.managed && p.home===other.home)?.homeScore).toBe(result.homeScore);expect(previews.find(p=>!p.managed && p.home===other.home)?.awayScore).toBe(result.awayScore);
});
it("permits five replacements in three windows plus half-time; groups the same interruption",()=>{
 const events=[sub(50,1,12),sub(50,2,13),sub(65,3,14),sub(75,4,15)];
 expect(substitutionAllowance(events,"home",75)).toBe(1);expect(canMakeSubstitution(events,"home",5,16,75)).toBe(true);expect(canMakeSubstitution(events,"home",5,16,80)).toBe(false);
 expect(canMakeSubstitution(events,"home",5,16,45,true)).toBe(true);events.push(sub(45,5,16,true));expect(canMakeSubstitution(events,"home",6,17,75)).toBe(false);
 const interval=[sub(45,1,12,true),sub(45,2,13,true)];expect(canMakeSubstitution(interval,"home",3,14,60)).toBe(true);
});
it("never replaces an expelled player, permits no re-entry, and isolates opponent IDs",()=>{
 const red={minute:40,half:1,text:"Expulso",team:"home",actorId:1,card:"red"} as MatchEvent;
 expect(canMakeSubstitution([red],"home",1,12,41)).toBe(false);expect(canMakeSubstitution([{...red,team:"away"}],"home",1,12,41)).toBe(true);
 expect(canMakeSubstitution([sub(50,1,12)],"home",2,1,60)).toBe(false);expect(canMakeSubstitution([],"home",1,12,90)).toBe(false);
});
it("history is immutable, including job archives; benign current progress remains writable",()=>{
 const f=played(),before=structuredClone(data.save);before.progress!.competitionSeason=season([f]);
 const after=structuredClone(before);after.progress!.minute=2;expect(()=>assertMatchHistory(before,after)).not.toThrow();
 const bad=structuredClone(after);bad.progress!.competitionSeason!.fixtures[0].report=undefined;expect(()=>assertMatchHistory(before,bad)).toThrow();
 const archived=structuredClone(after);archived.progress!.jobClubSnapshots={[data.human.id]:{competitionSeason:before.progress!.competitionSeason} as NonNullable<NonNullable<typeof archived.progress>["jobClubSnapshots"]>[string]};archived.progress!.competitionSeason=season([]);
 expect(()=>assertMatchHistory(before,archived)).not.toThrow();
 const corrupt=structuredClone(after);corrupt.progress!.competitionSeason!.fixtures[0].playerContributions![0].playerName="Changed";expect(()=>assertMatchHistory(before,corrupt)).toThrow();
});
it("persists report/ban/replay through the real codec and rejects destructive local writes atomically",()=>{
 localStorage.clear();const f=played(),id=f.playerContributions![0].playerId;f.report!.cards=[{clubId:f.homeClubId,playerId:id,card:"red"}];
 const save=structuredClone(data.save);save.progress!.competitionSeason=season([f,fixture("next",2)]);expect(writeLocalSaves([save],"e7-report")).toBe(true);
 const loaded=readLocalSaves("e7-report")[0];expect(loaded.progress!.competitionSeason!.fixtures[0].report).toEqual(f.report);expect(bannedForFixture(loaded.progress!.competitionSeason,loaded.progress!.competitionSeason!.fixtures[1],id)).toBe(true);
 const invalid=structuredClone(loaded);invalid.progress!.competitionSeason!.fixtures=[];expect(writeLocalSaves([invalid],"e7-report")).toBe(false);expect(readLocalSaves("e7-report")[0]).toEqual(loaded);expect(readLocalSaves("other-account")).toEqual([]);
});
it("does not count a red card twice on reconstruction",()=>{
 const f=played(),id=f.playerContributions![0].playerId;f.report!.cards=[{clubId:f.homeClubId,playerId:id,card:"red",secondYellow:true}];
 const state=copyDiscipline(season([f]));expect(state.get(f.competitionId)?.get(id)).toBe(1);
 const service={...played("served"),report:{...played().report!,servedBans:[id]},playerContributions:[]};applyDiscipline(state,service);expect(state.get(f.competitionId)?.has(id)).toBe(false);
});
