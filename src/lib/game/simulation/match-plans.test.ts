// @vitest-environment jsdom
import { expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { createDefaultDatabase, buildSquadFromDatabase, type EditorDatabase } from "../editor-data";
import { aggregateReport, applyDiscipline, assertMatchReport, copyDiscipline, matchDiscipline } from "./matches";
import { assertCpuState, bindMatchCoaches, clubCoach, coachMatchPlan, reviewCpu, startCpu, type CpuAthlete } from "./match-plans";
import { tacticalFixture } from "./tactical-fixture";
import { restartAfter } from "./restarts";
import { calculateMatchStatistics, createMinuteRandom, createMatchWeather, simulateAction, type MatchEvent } from "../live-match";
import { parseMatchRules } from "../match-rules";
import { simulateFixture, type CareerSeason, type SeasonFixture } from "../season";
import type { Coach } from "./coaches";
const base=createDefaultDatabase(),clubs=base.clubs.slice(0,2),template=base.players[0];
const roles=["G","G","L","L","Z","Z","M","M","M","A","A","A","M","L","Z","A","M","A"] as const;
const db:EditorDatabase={clubs,players:clubs.flatMap((c,index)=>roles.map((role,i)=>({...template,id:`${index}:${i}`,clubId:c.id,name:`P${index}-${i}`,primaryPosition:role,energy:80,overall:65,age:30,condition:undefined,registrationStatus:"registered" as const,loan:undefined})))};
const fixture=(id="sample"):SeasonFixture=>({id,season:2026,competitionId:"league",competitionName:"Liga",type:"league",division:"Série A",competitionRound:1,calendarRound:1,scheduledDate:"2026-02-01",roundLabel:"Rodada",status:"scheduled",homeClubId:clubs[0].id,home:clubs[0].name,awayClubId:clubs[1].id,away:clubs[1].name});
const roster:CpuAthlete[]=db.players.filter(p=>p.clubId===clubs[0].id).map(p=>({id:p.id,role:p.primaryPosition,energy:p.energy,age:p.age,overall:p.overall}));
const coach:Coach={id:"coach-a",name:"Teste",origin:"simulated",clubId:clubs[0].id,reputation:17,availableOn:"2026-01-01",history:[]};
const plan=coachMatchPlan(coach,65,65);
const past=(id:string,card:"yellow"|"red",secondYellow=false):SeasonFixture=>{const f={...fixture(id),status:"played" as const,homeScore:0,awayScore:0,playerContributions:[{playerId:"0:4",playerName:"Teste",clubId:clubs[0].id,goals:0,assists:0,minutes:90,rating:null}]};const report=aggregateReport(f,f.playerContributions,"live");report.disciplinePolicy="brazil-cards-v2";report.cards=[{clubId:clubs[0].id,playerId:"0:4",card,minute:90,...(secondYellow?{secondYellow:true}:{})}];return {...f,report};};
it("binds E5 identity/reputation and opponent strength without inventing real coaching biographies",()=>{
 expect(coachMatchPlan(coach,45,70).tactics.style).toBe("Defensivo");
 expect(coachMatchPlan({...coach,clubId:clubs[1].id},65,65)).toEqual(plan);
 const bound=bindMatchCoaches({...db},{a:coach});expect(clubCoach(bound,clubs[0].id)?.id).toBe(coach.id);expect(clubCoach(db,clubs[0].id)).toBeUndefined();
 expect(plan.origin).toBe("career-coach");expect(coachMatchPlan(undefined,65,65).origin).toBe("interim");
});
it("chooses a goalkeeper, position depth and only eligible nominated people",()=>{
 const state=startCpu({...plan,formation:"4-5-1"},roster);
 expect(state.active).toHaveLength(11);expect(state.active.filter(id=>roster.find(p=>p.id===id)?.role==="G")).toHaveLength(1);expect(state.active.filter(id=>roster.find(p=>p.id===id)?.role==="M")).toHaveLength(5);
 expect(new Set(state.active).size).toBe(11);
});
it("reacts to fatigue, cautions, score and injury while respecting five/three/halftime/no reentry",()=>{
 let state=startCpu(plan,roster);const before=structuredClone(state);
 const injured=state.active[3];state=reviewCpu(state,roster,35,0,[],[],[injured]);expect(state.changes[0]).toMatchObject({out:injured,minute:35,reason:"lesão"});expect(state.active).not.toContain(injured);
 expect(before.changes).toHaveLength(0);
 for(const minute of [45,60,75])state=reviewCpu(state,roster,minute,-1,state.active.slice(0,2));
 expect(state.changes.length).toBeLessThanOrEqual(5);expect(new Set(state.changes.filter(c=>!c.interval).map(c=>c.minute)).size).toBeLessThanOrEqual(3);
 expect(new Set(state.changes.map(c=>c.in)).size).toBe(state.changes.length);expect(state.plan.tactics.style).toBe("Ofensivo");
 expect(reviewCpu(state,roster,75,-1)).toEqual(state);
});
it("never replaces a dismissed player and stops his participation at dismissal",()=>{
 const state=startCpu(plan,roster),id=state.active[0],next=reviewCpu(state,roster,50,0,[],[id]);expect(next.active).toHaveLength(10);expect(next.stints[id].left).toBe(50);expect(next.changes).toHaveLength(0);
});
it("serialized milestone continuation equals uninterrupted continuation",()=>{
 const first=reviewCpu(startCpu(plan,roster),roster,45,0);
 expect(reviewCpu(JSON.parse(JSON.stringify(first)),roster,60,-1)).toEqual(reviewCpu(first,roster,60,-1));
});
it("third yellow is scoped to competition; direct red and third yellow impose two matches",()=>{
 const state:ReturnType<typeof copyDiscipline>=new Map();applyDiscipline(state,past("a","yellow"));applyDiscipline(state,past("b","yellow"));
 const third=past("c","yellow");third.report!.cards.push({clubId:clubs[0].id,playerId:"0:4",card:"red",minute:90});applyDiscipline(state,third);
 expect(state.get("league")?.get("0:4")).toBe(2);expect(state.get("other")).toBeUndefined();
 const service=past("serve","yellow");service.report!.cards=[];service.report!.servedBans=["0:4"];applyDiscipline(state,service);expect(state.get("league")?.get("0:4")).toBe(1);
 applyDiscipline(state,{...service,competitionId:"other"});expect(state.get("league")?.get("0:4")).toBe(1);
});
it("a second-yellow expulsion excludes this match's pair, retaining earlier accumulated yellows",()=>{
 const state:ReturnType<typeof copyDiscipline>=new Map();applyDiscipline(state,past("a","yellow"));applyDiscipline(state,past("b","yellow"));
 const expelled=past("c","red",true);expelled.report!.cards.unshift({clubId:clubs[0].id,playerId:"0:4",card:"yellow",minute:30});applyDiscipline(state,expelled);
 expect(state.get("league")?.get("0:4")).toBe(1);expect(state.yellows?.get("league")?.get("0:4")).toBe(2);
});
it("resets D phase yellows without erasing pending bans or reinterpreting legacy reports",()=>{
 const state:ReturnType<typeof copyDiscipline>=new Map();const a={...past("a","yellow"),division:"Série D" as const,stage:"groups" as const};applyDiscipline(state,a);applyDiscipline(state,{...a,id:"b"});applyDiscipline(state,{...a,id:"c"});
 const knockout={...a,id:"ko",stage:"knockout" as const,knockoutStage:0};knockout.report=structuredClone(a.report);knockout.report!.cards=[];applyDiscipline(state,knockout);
 expect(state.get("league")?.get("0:4")).toBe(1);expect(state.yellows?.get("league")?.size).toBe(0);
 const legacy=past("legacy","yellow");legacy.report!.disciplinePolicy="automatic-red-only-v1";applyDiscipline(state,legacy);expect(state.yellows?.get("league")?.size).toBe(0);
 const season={version:1,season:2026,clubId:clubs[0].id,clubName:clubs[0].name,division:"Série D",fixtures:[a]} as CareerSeason;const copied=copyDiscipline(season);copied.yellows!.get("league")!.set("0:4",99);expect(matchDiscipline(season).yellows?.get("league")?.get("0:4")).toBe(1);
});
it("CPU reports reconcile actual active scorers, substitutions, minutes and cards over fixed seeds",()=>{
 let changes=0,reds=0;
 for(let i=0;i<60;i++) {
  const result=tacticalFixture(db,fixture(`seed-${i}`),new Map());expect(result).toEqual(tacticalFixture(db,fixture(`seed-${i}`),new Map()));expect(()=>assertMatchReport(result)).not.toThrow();
  changes+=result.report!.substitutions!.length;reds+=result.report!.cards.filter(c=>c.card==="red").length;
  for(const club of [clubs[0].id,clubs[1].id]) {const lost=result.report!.cards.filter(c=>c.clubId===club && c.card==="red").reduce((n,c)=>n+90-c.minute!,0);expect(result.playerContributions!.filter(p=>p.clubId===club).reduce((n,p)=>n+p.minutes,0)).toBe(990-lost);}
 }
 expect(changes).toBeGreaterThan(0);expect(reds).toBeGreaterThan(0);
});
it("favors stronger teams over 240 fixed scenarios, but permits defeats and never guarantees victory",()=>{
 const stronger={...db,players:db.players.map(p=>({...p,overall:p.clubId===clubs[0].id?82:55}))};let wins=0,losses=0,awayWins=0,awayLosses=0,goals=0;
 for(let i=0;i<240;i++){const f=tacticalFixture(stronger,fixture(`strength-${i}`),new Map());wins+=Number(f.homeScore!>f.awayScore!);losses+=Number(f.homeScore!<f.awayScore!);goals+=f.homeScore!+f.awayScore!;const reversed=tacticalFixture(stronger,{...fixture(`strength-${i}`),homeClubId:clubs[1].id,awayClubId:clubs[0].id},new Map());awayWins+=Number(reversed.awayScore!>reversed.homeScore!);awayLosses+=Number(reversed.awayScore!<reversed.homeScore!);}
 console.info("E7_CPU_SCENARIOS",JSON.stringify({seed:"strength-0..239",rosters:"18 players/club, GER 82 vs 55, energy 80, age 30",matchesPerVenue:240,strongHomeWins:wins,strongHomeLosses:losses,strongAwayWins:awayWins,strongAwayLosses:awayLosses,homeScenarioGoalsPerMatch:goals/240,granularity:"15-minute-v2",notOfficialXg:true}));
 expect(wins).toBeGreaterThan(140);expect(losses).toBeGreaterThan(0);expect(awayWins).toBeGreaterThan(140);expect(awayLosses).toBeGreaterThan(0);
});
it("leaves inputs and previously published results unchanged",()=>{
 const f=fixture(),before=structuredClone(db);tacticalFixture(db,f,new Map());expect(db).toEqual(before);expect(f.status).toBe("scheduled");
});
const scene=(action:"goal"|"foul"|"offside"|"shot",team:"home"|"away",x=50):MatchEvent=>({minute:20,half:1,text:"Evento",scene:{action,team,actorIndex:0,targetIndex:0,from:{x,y:50},to:{x,y:50}}});
it("uses the correct restarting side, penalty area, indirect offside restart and halftime kickoff",()=>{
 expect(restartAfter([scene("goal","home")],21)).toMatchObject({kind:"kickoff",side:"away"});
 expect(restartAfter([scene("foul","away",90)],21)).toMatchObject({kind:"penalty",side:"home"});
 expect(restartAfter([scene("foul","away",70)],21)).toMatchObject({kind:"free-kick",side:"home"});
 expect(restartAfter([scene("offside","home")],21)).toMatchObject({kind:"free-kick",side:"away",indirect:true});
 expect(restartAfter([],46,"away")).toMatchObject({kind:"kickoff",side:"home"});
 expect(restartAfter([{...scene("shot","home"),outcome:"missed"}],21)).toMatchObject({kind:"goal-kick",side:"away"});
});
it("a v2 penalty is one coherent event and resumes deterministically; legacy has no injected restarts",()=>{
 const rules=parseMatchRules(readFileSync("public/game-assets/match-engine-rules.md","utf8")),players=buildSquadFromDatabase(db,clubs[0].name,true)!.slice(0,11),opponents=buildSquadFromDatabase(db,clubs[1].name,true)!.slice(0,11);
 const input={minute:21,starters:players,opponentStarters:opponents,formation:"4-3-3",positions:{},opponent:"Rival",rules,weather:createMatchWeather("penalty",rules),tactics:{style:"Equilibrado",marking:"Normal",focus:"Pelo meio"},motivationHome:64,motivationAway:64};
 const restart=restartAfter([scene("foul","away",90)],21)!;
 const event=simulateAction({...input,lawVersion:2,restart,random:createMinuteRandom("penalty",21)});
 expect(event.restart?.kind).toBe("penalty");expect(["shot","goal"]).toContain(event.scene?.action);expect(event.chanceQuality).toBe(.76);
 expect(simulateAction({...input,lawVersion:2,restart:JSON.parse(JSON.stringify(restart)),random:createMinuteRandom("penalty",21)})).toEqual(event);
 expect(simulateAction({...input,random:createMinuteRandom("penalty",21)}).restart).toBeUndefined();
 for(const kind of ["corner","throw-in","goal-kick"] as const)for(let i=0;i<60;i++){const direct={kind,side:"home" as const,point:{x:70,y:0}};expect(simulateAction({...input,lawVersion:2,restart:direct,random:createMinuteRandom(`direct-${i}`,21)}).scene?.action).not.toBe("offside");}

});

it("rejects corrupted persisted CPU identities, windows and stints without changing the previous snapshot",()=>{
 const good=startCpu(plan,roster),before=structuredClone(good);expect(()=>assertCpuState(good,roster)).not.toThrow();
 for(const alter of [(s:typeof good)=>s.active.push(s.active[0]),(s:typeof good)=>s.stints[s.active[0]].entered=-1,(s:typeof good)=>s.active[0]="foreign",(s:typeof good)=>s.reviewed.push(999)]){const bad=structuredClone(good);alter(bad);expect(()=>assertCpuState(bad,roster)).toThrow();}expect(good).toEqual(before);
});

it("B playoffs and D after-fourth-phase reset only yellows, not outstanding automatic bans",()=>{
 for(const division of ["Série B","Série D"] as const){const state:ReturnType<typeof copyDiscipline>=new Map();let f:SeasonFixture={...past("before","yellow"),division,stage:(division==="Série D"?"knockout":"groups") as "knockout"|"groups",knockoutStage:2};applyDiscipline(state,f);applyDiscipline(state,{...f,id:"second"});state.get("league")?.set("0:4",2);f={...f,id:"after",stage:"knockout",knockoutStage:3,report:structuredClone(f.report)};f.report!.cards=[];applyDiscipline(state,f);expect(state.yellows?.get("league")?.size).toBe(0);expect(state.get("league")?.get("0:4")).toBe(2);}
});
it("an injured player leaves even with no healthy bench, without an illegal replacement",()=>{const state=startCpu(plan,roster.slice(0,11)),injured=state.active[4],next=reviewCpu(state,roster.slice(0,11),67,0,[],[],[injured]);expect(next.active).not.toContain(injured);expect(next.stints[injured].left).toBe(67);expect(next.changes).toHaveLength(0);});

it("match statistics count both cautions while the cumulative series excludes the expulsion pair",()=>{const foul=scene("foul","away");expect(calculateMatchStatistics([{...foul,card:"yellow"},{...foul,minute:30,card:"red",secondYellow:true}]).away).toMatchObject({yellowCards:2,redCards:1});});

it("rejects a reconciled goal if its supposed scorer had already left the field",()=>{const f=tacticalFixture(db,fixture("timeline"),new Map()),change=f.report!.substitutions![0],row=f.playerContributions!.find(p=>p.playerId===change.out)!;row.goals++;if(change.clubId===f.homeClubId)f.homeScore!++;else f.awayScore!++;f.report!.goals.push({clubId:change.clubId,playerId:change.out,minute:change.minute+15});expect(()=>assertMatchReport(f)).toThrow("Evento fora da participação");});
it("assesses the strongest eligible eleven, not the arbitrary size or weakness of the bench",()=>{
 const data={...db,players:db.players.map(p=>({...p,overall:p.clubId===clubs[0].id?Number(p.id.split(":")[1])<11?80:10:68}))};
 expect(tacticalFixture(data,fixture("bench-depth"),new Map()).report!.plans![0]).toEqual(coachMatchPlan(undefined,80,68));
});

it("does not resimulate or apply discipline twice to a published result, including the legacy contract",()=>{const f=past("published","red");f.report!.disciplinePolicy="automatic-red-only-v1";const bans:ReturnType<typeof copyDiscipline>=new Map();expect(simulateFixture(db,f,bans)).toBe(f);expect(tacticalFixture(db,f,bans)).toBe(f);expect(bans.size).toBe(0);});
