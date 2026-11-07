// @vitest-environment jsdom
import { describe,expect,it,vi } from "vitest";
import { publishLocalCheckpoint } from "./local-checkpoint";
import { marketFixture } from "./market-test-fixture";
import { advancePopulation, ageAt, migratePlayerSave, playerEligible, populationDatabase, projectSquadCondition } from "./players";
import { advanceYouth, playerCareAction, promoteCareerYouth, trainCareerPlayers, youthCohort } from "./player-commands";
import { advanceCareer } from "./advance";
import { readLocalSaves,writeLocalSaves } from "../persistence";
import { buildStartingXI } from "../mock-data";
import { canJoinTraining } from "../training";
import { seededRandom } from "../live-match";
import { advanceSeasonBeforeDate, type CareerSeason } from "../season";
import { worldDatabase } from "../world-market";
import { accrueFinance,projectFinance } from "./finance";
import { engineState } from "./foundation";
import { assessMove } from "./market-rules";
function setup(){const f=marketFixture();return {...f,save:migratePlayerSave(f.save,f.database)};}
function match(f:ReturnType<typeof setup>,id="e6-game",date=f.save.inGameDate){return {...f.save.progress!.competitionSeason!,fixtures:[{id,scheduledDate:date,status:"played",homeClubId:f.human.id,awayClubId:f.buyer.id,playerContributions:[...f.database.players.filter(v=>[f.human.id,f.buyer.id].includes(v.clubId)).slice(0,22).map(v=>({playerId:v.id,clubId:v.clubId,playerName:v.name,minutes:90,goals:0,assists:0,rating:6}))]}]} as CareerSeason;}
const input={season:2026,week:1,day:"Segunda" as const,drill:"passe" as const,intensity:"Moderada" as const,playerIds:[1]};
describe("E6 — common population and civil calendar",()=>{
  it("adopts without changing source IDs, statistics or frozen catalog; preserves financially-known legacy identity",()=>{
    const f=marketFixture(),before=structuredClone(f.database),old=f.save.progress!.careerSquad![0];delete old.sourceId;old.goals=17;old.energy=44;old.overall=99;
    const save=migratePlayerSave(f.save,f.database),p=save.progress!,player=p.careerSquad![0];
    expect(player).toMatchObject({id:old.id,sourceId:`local:${save.id}:${save.clubId}:${old.id}`,goals:17,energy:44});
    expect(p.worldMarket!.population!.generated[player.sourceId!].goals).toBe(17);
    expect(p.worldMarket!.population!.people[player.sourceId!].potential).toBe(99);
    expect(migratePlayerSave(save,f.database)).toBe(save);expect(f.database).toEqual(before);
  });
  it("calculates known birth dates and explicitly advances legacy ages on year change",()=>{
    const f=marketFixture();f.database.players[0].transfermarkt={id:"birth-fixture",collectedAt:"2026-01-01",season:"2026",dateOfBirth:"2000-01-12"};
    const save=migratePlayerSave(f.save,f.database),s=save.progress!.worldMarket!.population!,known=s.people[f.database.players[0].id],legacy=s.people[f.database.players[1].id];
    expect(known.age).toBe(25);expect(ageAt(known,"2026-01-12")).toBe(26);expect(ageAt(legacy,"2027-01-01")).toBe(legacy.baseAge+1);
    expect(ageAt(legacy,"2026-12-31")).toBe(legacy.baseAge);
  });
  it("consumes CPU participation, recovers everyone and never repeats a match after reload",()=>{
    const f=setup(),s=f.save.progress!.worldMarket!.population!,season=match(f),cpu=f.database.players.find(v=>v.clubId===f.buyer.id && v.primaryPosition==="L")!;
    const played=advancePopulation(s,f.database,season,f.save.inGameDate,f.save.id);
    expect(played.people[cpu.id].energy).toBeLessThan(s.people[cpu.id].energy);expect(played.people[cpu.id].load).toBeGreaterThan(90);
    expect(advancePopulation(played,f.database,season,f.save.inGameDate,f.save.id)).toEqual(played);
    const recovered=advancePopulation(played,f.database,season,"2026-01-14",f.save.id);
    expect(recovered.people[cpu.id].energy).toBeGreaterThan(played.people[cpu.id].energy);
    expect(f.save.progress!.worldMarket!.population).toEqual(s);
  });
  it("projects actual human stints/energy, not a second generic fatigue loss",()=>{
    const f=setup(),s=f.save.progress!.worldMarket!.population!,squad=f.save.progress!.careerSquad!.map((p,i)=>({...p,energy:i===0?61:p.energy}));
    const next=advancePopulation(s,f.database,match(f),f.save.inGameDate,f.save.id,{clubId:f.human.id,squad,fixtureId:"e6-game",minutes:{1:30}});
    expect(next.people[squad[0].sourceId!].energy).toBe(61);
    expect(projectSquadCondition(squad,next)[0].energy).toBe(61);
  });
  it("records injury, recovery and relapse deterministically; treatment reduces rather than erases risk",()=>{
    const f=setup(),s=f.save.progress!.worldMarket!.population!,target=f.database.players[0].id;
    const id=Array.from({length:10000},(_,i)=>`inj-${i}`).find(id=>seededRandom(`${f.save.id}:injury:${target}:${id}`)()<.001)!;
    const injured=advancePopulation(s,f.database,match(f,id),f.save.inGameDate,f.save.id);
    expect(injured.people[target].injuredUntil).toBe("2026-01-21");expect(injured.events.some(e=>e.personId===target && e.kind==="injury")).toBe(true);
    const recovered=advancePopulation(injured,f.database,undefined,"2026-01-21",f.save.id);
    expect(recovered.people[target].injuredUntil).toBeUndefined();expect(recovered.people[target].relapseUntil).toBe("2026-02-04");
    const repeat=advancePopulation(recovered,f.database,match(f,`${id}-again`,"2026-01-21"),"2026-01-21",f.save.id);
    const forced=Array.from({length:10000},(_,i)=>`rel-${i}`).find(id=>seededRandom(`${f.save.id}:injury:${target}:${id}`)()<.001)!;
    const relapse=advancePopulation(repeat,f.database,match(f,forced,"2026-01-21"),"2026-01-21",f.save.id);
    expect(relapse.events.some(e=>e.personId===target && e.kind==="relapse")).toBe(true);
  });
  it("excludes injured, suspended, retired and pending players from XI, CPU contributions and training",()=>{
    const f=setup(),s=f.save.progress!.worldMarket!.population!,squad=f.save.progress!.careerSquad!;
    const statuses=[{injuredUntil:"2026-02-01"},{suspendedUntil:"2026-02-01"},{retiredOn:f.save.inGameDate}];
    statuses.forEach((v,i)=>Object.assign(s.people[squad[i].sourceId!],v));
    const projected=projectSquadCondition(squad,s);projected[3].registrationStatus="pending";
    for(const p of projected.slice(0,4)){expect(playerEligible(p)).toBe(false);expect(canJoinTraining(p,"passe","Leve")).toBe(false);}
    expect(buildStartingXI("4-3-3",projected).some(id=>projected.slice(0,4).some(v=>v.id===id))).toBe(false);
    const db=populationDatabase(f.database,s),fixture={...match(f).fixtures[0],status:"scheduled" as const};
    const played=advanceSeasonBeforeDate({...match(f),fixtures:[fixture]},"2026-01-12",db).fixtures[0];
    expect(played.playerContributions?.some(v=>statuses.some((_,i)=>v.playerId===squad[i].sourceId))).toBe(false);
  });
  it("uses fixture dates for eligibility across a pending CPU batch, including recovery and retirement birthdays",()=>{
    const condition={validThrough:"2026-12-31",morale:50,load:0,treatment:"rest" as const,origin:"legacy" as const,injuredUntil:"2027-01-02"};
    expect(playerEligible({age:25,condition},"2027-01-01")).toBe(false);
    expect(playerEligible({age:25,condition},"2027-01-02")).toBe(true);
    expect(playerEligible({age:41,condition:{...condition,injuredUntil:undefined}},"2027-01-01")).toBe(false);
    expect(playerEligible({age:41,condition:{...condition,injuredUntil:undefined,birthDate:"1985-02-10"}},"2027-02-09")).toBe(true);
    expect(playerEligible({age:41,condition:{...condition,injuredUntil:undefined,birthDate:"1985-02-10"}},"2027-02-10")).toBe(false);
  });
  it("has calendar granularity invariance, bounded development and no guaranteed potential realization",()=>{
    const f=setup(),s=f.save.progress!.worldMarket!.population!;
    const full=advancePopulation(s,f.database,undefined,"2027-01-01",f.save.id);
    let split=s;for(const date of ["2026-02-01","2026-04-20","2026-07-01","2027-01-01"]) split=advancePopulation(split,f.database,undefined,date,f.save.id);
    expect(split).toEqual(full);
    for(const p of Object.values(full.people)){expect(p.overall).toBeLessThanOrEqual(p.potential);expect(p.overall-s.people[p.id].overall).toBeLessThanOrEqual(2);}
    expect(Object.values(full.people).some(p=>p.overall<p.potential)).toBe(true);
    expect(Object.values(full.people).some(p=>p.trainingDays.some(v=>v.endsWith(":auto")))).toBe(true);
  });
  it("retires on year/birthday policy, retains historic statistics and rejects new employment",()=>{
    const f=setup(),p=f.save.progress!,id=p.careerSquad![0].sourceId!,s=p.worldMarket!.population!;s.people[id].baseAge=41;s.people[id].age=41;s.people[id].birthDate=undefined;
    const seed=Array.from({length:100},(_,i)=>`retire-${i}`).find(value=>seededRandom(`${value}:development:${id}:2026-02`)()<.25)!;
    const next=advancePopulation(s,f.database,undefined,"2027-01-01",seed),db=populationDatabase(f.database,next),retired=db.players.find(v=>v.id===id)!;
    expect(retired.condition?.retiredOn).toBe("2027-01-01");expect(retired.goals).toBe(f.database.players[0].goals);expect(next.events.some(v=>v.personId===id && v.kind==="decline")).toBe(true);
    expect(assessMove(retired,[],"sale",10000).accepted).toBe(false);
  });
  it("settles retirement in the financial calendar while preserving the career archive",()=>{
    const f=setup(),p=f.save.progress!,state=p.worldMarket!.population!,id=p.careerSquad![0].sourceId!,record=structuredClone(p.playerCareers[1]);
    f.save.inGameDate="2026-12-31";p.engine={...engineState(undefined,f.save.id,f.save.inGameDate)};state.through=f.save.inGameDate;
    for(const person of Object.values(state.people)){person.through=f.save.inGameDate;person.lastMonth="2026-12";}
    state.people[id].baseAge=41;state.people[id].age=41;
    p.managerMarket=projectFinance({...p.managerMarket!,finance:accrueFinance(p.managerMarket!.finance!,f.save.inGameDate)});
    const next=advanceCareer(f.save,f.database,{operationId:"retire",expectedRevision:0,fromDate:f.save.inGameDate,targetDate:"2027-01-01"});
    expect(next.progress!.managerMarket!.finance!.contracts[id]).toMatchObject({status:"expired",endsOn:"2026-12-31"});
    expect(next.progress!.playerCareers[1]).toEqual(record);
    expect(next.progress!.worldMarket!.population!.people[id].retiredOn).toBe("2027-01-01");
  });
  it("rejects backward or incompatible population clocks and never fabricates historical match load",()=>{
    const f=setup(),s=f.save.progress!.worldMarket!.population!;
    expect(()=>advancePopulation(s,f.database,undefined,"2026-01-10",f.save.id)).toThrow();
    const historical=advancePopulation(s,f.database,match(f,"past","2025-12-01"),f.save.inGameDate,f.save.id);
    expect(historical.people).toEqual(s.people);expect(historical.fixtures).toContain("past");
    s.through="2026-01-10";expect(()=>migratePlayerSave(f.save,f.database)).toThrow(/preservado/);
  });
});
describe("E6 — commands, independent academy and durable reload",()=>{
  it("caps training per person/date, rejects malformed inputs and cannot farm permanent GER",()=>{
    const f=setup(),first=trainCareerPlayers(f.save,f.database,input);expect(first.record?.overallImprovements).toBe(0);
    expect(first.save.progress!.careerSquad![0].overall).toBe(f.save.progress!.careerSquad![0].overall);
    expect(first.save.progress!.engine!.revision).toBe(1);
    expect(trainCareerPlayers(first.save,f.database,input).save).toBe(first.save);
    const second=trainCareerPlayers(first.save,f.database,{...input,day:"Terça",drill:"recuperacao"});
    expect(second.record).toBeTruthy();expect(trainCareerPlayers(second.save,f.database,{...input,day:"Quarta"}).record).toBeUndefined();
    expect(()=>trainCareerPlayers(f.save,f.database,{...input,day:"inventado" as typeof input.day})).toThrow();
  });
  it("promotes once with a universal career-local identity, real finance and non-expired contract",()=>{
    const f=setup(),team=youthCohort(f.human,f.save.id,2026);f.save.progress!.youthTeams={[f.human.id]:team};
    const result=promoteCareerYouth(f.save,f.database,team.players[0].id),promoted=result.save.progress!.careerSquad!.at(-1)!;
    expect(promoted).toMatchObject({youthId:team.players[0].id,sourceId:`youth:${f.save.id}:${team.players[0].id}`,contractUntil:"2027-01-11"});
    expect(result.save.progress!.managerMarket!.finance!.contracts[promoted.sourceId!]).toMatchObject({status:"active",clubId:f.human.id});
    expect(result.save.progress!.playerCareers[promoted.id].seasons[0].season).toBe(2026);
    const effective=worldDatabase(f.database,[],{},result.save.progress!.worldMarket,result.save.progress!.managerMarket!.finance);
    expect(effective.players.filter(v=>v.id===promoted.sourceId)).toHaveLength(1);
    expect(promoteCareerYouth(result.save,f.database,team.players[0].id).save).toBe(result.save);
    expect(youthCohort(f.human,"other-save",2026).players[0].id).not.toBe(team.players[0].id);
  });
  it("preserves imported academy, creates annual intakes and uses financial CPU promotion without human reset",()=>{
    const f=setup(),team=youthCohort(f.human,f.save.id,2026);team.origin="transfermarkt";team.players[0].origin="transfermarkt";team.players[0].name="Imported youth";
    f.save.progress!.youthTeams={[f.human.id]:team};const state=f.save.progress!.worldMarket!.population!;state.through="2027-01-01";
    const next=advanceYouth(f.save,f.database,"2027-01-01");
    expect(next.progress!.youthTeams![f.human.id].players.some(v=>v.name==="Imported youth")).toBe(true);
    expect(next.progress!.youthTeams![f.buyer.id].season).toBe(2027);
    expect(next.progress!.worldMarket!.population!.generated).not.toEqual(state.generated);
    expect(next.progress!.careerSquad).toEqual(f.save.progress!.careerSquad);
    expect(advanceYouth(next,f.database,"2027-01-01")).toEqual(next);
    expect(advanceYouth({...next,inGameDate:"2027-01-01"},f.database,"2027-01-01")).toEqual({...next,inGameDate:"2027-01-01"});
  });
  it("rejects unaffordable promotion, midmatch training, and rolls back stale checkpoint publication",()=>{
    const f=setup(),team=youthCohort(f.human,f.save.id,2026);f.save.progress!.youthTeams={[f.human.id]:team};
    f.save.progress!.managerMarket!.finance!.clubs[f.human.id].cashCents=0;const before=structuredClone(f.save);
    expect(()=>promoteCareerYouth(f.save,f.database,team.players[0].id)).toThrow(/caixa/);expect(f.save).toEqual(before);
    f.save.progress!.page="matchOverview";expect(()=>trainCareerPlayers(f.save,f.database,input)).toThrow(/partida/);
    const commit=()=>advanceCareer(f.save,f.database,{operationId:"stale",expectedRevision:99,fromDate:f.save.inGameDate,targetDate:"2026-01-12"});
    expect(commit).toThrow(/mudou/);
  });
  it("evaluates promises from recorded minutes, records broken/kept commitments, and persists care with revisions",()=>{
    const f=setup(),a=playerCareAction(f.save,f.database,1,"promise"),id=a.save.progress!.careerSquad![0].sourceId!;
    const state=a.save.progress!.worldMarket!.population!;
    const ids=Array.from({length:100},(_,i)=>`promise-${i}`).filter(key=>seededRandom(`${f.save.id}:injury:${id}:${key}`)()>.5).slice(0,2);
    let participated=state;for(const key of ids) participated=advancePopulation(participated,f.database,match(f,key),f.save.inGameDate,f.save.id);
    expect(participated.people[id].promises[0].played).toBe(180);
    const kept=advancePopulation(participated,f.database,undefined,"2026-02-12",f.save.id);
    expect(kept.people[id].promises[0].status).toBe("kept");expect(kept.people[id].morale).toBeGreaterThan(50);
    const broken=advancePopulation(state,f.database,undefined,"2026-02-12",f.save.id);
    expect(broken.people[id].promises[0].status).toBe("broken");expect(broken.people[id].morale).toBeLessThan(50);
    const care=playerCareAction(a.save,f.database,1,"rehabilitation");expect(care.save.progress!.engine!.revision).toBe(2);
    const rest=playerCareAction(care.save,f.database,1,"rest");expect(rest.save.progress!.engine!.revision).toBe(3);
  });
  it("publishes training atomically, rejects a second tab and preserves the old condition on storage failure",async()=>{
    const f=setup(),owner="e6-cas";writeLocalSaves([f.save],owner);
    Object.defineProperty(navigator,"locks",{configurable:true,value:{request:async (_name:string,task:()=>unknown)=>task()}});
    const trained=trainCareerPlayers(f.save,f.database,input).save;
    await publishLocalCheckpoint(trained,owner,0);
    await expect(publishLocalCheckpoint(trained,owner,0)).rejects.toThrow(/mudou/);
    const second=trainCareerPlayers(trained,f.database,{...input,day:"Terça"}).save;
    const storage=vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("quota");});
    try {await expect(publishLocalCheckpoint(second,owner,1)).rejects.toThrow(/espaço/);expect(readLocalSaves(owner)[0]).toEqual(trained);} finally {storage.mockRestore();}
  });
  it("rejects legacy writers that erase a population or remove a promoted identity",()=>{
    const f=setup(),owner="e6-old-client";expect(writeLocalSaves([f.save],owner)).toBe(true);
    const erased=structuredClone(f.save);delete erased.progress!.worldMarket!.population;
    expect(writeLocalSaves([erased],owner)).toBe(false);expect(readLocalSaves(owner)[0]).toEqual(f.save);
    const removed=structuredClone(f.save);delete removed.progress!.worldMarket!.population!.people[f.database.players[0].id];
    expect(writeLocalSaves([removed],owner)).toBe(false);
  });
  it("runs through the headless calendar and compressed local save without losing condition, potential or identity",()=>{
    const f=setup(),trained=trainCareerPlayers(f.save,f.database,input).save;
    const next=advanceCareer(trained,f.database,{operationId:"e6-headless",expectedRevision:1,fromDate:trained.inGameDate,targetDate:"2026-01-12"});
    expect(next.progress!.worldMarket!.population!.through).toBe(next.inGameDate);
    expect(next.progress!.engine!.events.some(e=>e.type==="player-processed")).toBe(true);
    writeLocalSaves([next],"e6-test");expect(readLocalSaves("e6-test")[0]).toEqual(next);
    expect(advanceCareer(next,f.database,{operationId:"e6-headless",expectedRevision:1,fromDate:trained.inGameDate,targetDate:"2026-01-12"})).toBe(next);
  });
});
