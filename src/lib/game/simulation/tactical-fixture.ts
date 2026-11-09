import type { EditorDatabase, EditorPlayer } from "../editor-data";
import type { SeasonFixture, SeasonPlayerContribution } from "../season";
import { seededRandom } from "../live-match";
import { playerEligible } from "./players";
import { aggregateReport, assertMatchReport, assertParticipantsEligible, servedBans, type Discipline } from "./matches";
import { clubCoach, coachMatchPlan, cpuEnergy, reviewCpu, startCpu, type CpuAthlete } from "./match-plans";

const rosters=new WeakMap<EditorDatabase,Map<string,EditorPlayer[]>>();
function roster(db:EditorDatabase,club:string) {
 let index=rosters.get(db);if(!index){index=new Map();for(const p of db.players){const list=index.get(p.clubId) ?? [];list.push(p);index.set(p.clubId,list);}rosters.set(db,index);}return index.get(club) ?? [];
}
/** Coarse CPU granularity is explicit: six 15-minute intervals, not fabricated live commentary.
 * Decisions, substitutions, dismissals and goals all use the active people at that point. */
export function tacticalFixture(db:EditorDatabase,f:SeasonFixture,discipline:Discipline):SeasonFixture {
 const clubs=[f.homeClubId,f.awayClubId],bans=discipline.get(f.competitionId);
 const sources=clubs.map(club=>roster(db,club).filter(p=>playerEligible(p,f.scheduledDate) && !bans?.has(p.id)));
 const athletes=sources.map(list=>list.map(p=>({id:p.id,role:p.primaryPosition,overall:p.overall,energy:p.energy,age:p.age} satisfies CpuAthlete)));
 const strength=(list:CpuAthlete[])=>list.length ? list.reduce((n,p)=>n+p.overall,0)/list.length:45;
 const states=athletes.map((list,i)=>startCpu(coachMatchPlan(clubCoach(db,clubs[i]),strength(list),strength(athletes[1-i])),list));
 const rows=new Map<string,SeasonPlayerContribution>(),scores=[0,0],random=seededRandom(`${f.season}|${f.id}|cpu-v2`);
 const report=aggregateReport({...f,homeScore:0,awayScore:0},[],"background",servedBans(db,f,discipline));
 report.seed=`${f.season}|${f.id}|cpu-v2`;report.disciplinePolicy="brazil-cards-v2";report.granularity="15-minute-v2";report.plans=states.map(s=>s.plan);
 const booked=new Set<string>(),expelled=new Set<string>();
 for(let minute=15;minute<=90;minute+=15) {
  const intervalStrength=states.map((state,i)=>strength(athletes[i].filter(p=>state.active.includes(p.id)).map(p=>({...p,overall:p.overall*(.78+.22*cpuEnergy(p,minute-7.5,state.stints[p.id].entered)/100)}))));
  for(let i=0;i<2;i++) {
   const state=states[i],active=athletes[i].filter(p=>state.active.includes(p.id));
   const own=intervalStrength[i],opposing=intervalStrength[1-i];
   const risk=state.plan.tactics.style==="Ofensivo" ? 1.18:state.plan.tactics.style==="Defensivo" ? .84:1;
   const lambda=1.25/6*Math.exp(Math.max(-1.6,Math.min(1.6,(own-opposing)/30)))*risk*(i===0?1.10:1)*Math.pow(active.length/11,1.5);
   // Poisson goals per interval; no guaranteed winner and no human/CPU identity branch.
   let product=random(),goals=0;const limit=Math.exp(-lambda);while(product>limit && goals<8){goals++;product*=random();}
   const attackers=active.filter(p=>p.role!=="G");
   for(let g=0;g<goals && attackers.length;g++) {const scorer=attackers[Math.floor(random()*attackers.length)];scores[i]++;report.goals.push({clubId:clubs[i],playerId:scorer.id,minute});const p=sources[i].find(p=>p.id===scorer.id)!;const row=rows.get(p.id) ?? {playerId:p.id,playerName:p.name,clubId:clubs[i],minutes:0,goals:0,assists:0,rating:null};row.goals++;rows.set(p.id,row);
    if(attackers.length>1 && random()<.72){const alternatives=attackers.filter(a=>a.id!==scorer.id),assist=alternatives[Math.floor(random()*alternatives.length)],source=sources[i].find(p=>p.id===assist.id)!;const assisted=rows.get(assist.id) ?? {playerId:assist.id,playerName:source.name,clubId:clubs[i],minutes:0,goals:0,assists:0,rating:null};assisted.assists++;rows.set(assist.id,assisted);}
}
   for(const p of active) {
    if(random()<.027) {
     const secondYellow=booked.has(p.id),direct=!secondYellow && random()<.035;
     report.cards.push({clubId:clubs[i],playerId:p.id,minute,card:secondYellow||direct?"red":"yellow",...(secondYellow?{secondYellow:true}:{})});
     if(secondYellow||direct){expelled.add(p.id);state.active=state.active.filter(id=>id!==p.id);state.stints[p.id].left=minute;}else booked.add(p.id);
    }
   }
  }
  for(let i=0;i<2;i++)states[i]=reviewCpu(states[i],athletes[i],minute,scores[i]-scores[1-i],[...booked],[...expelled]);
 }
 for(let i=0;i<2;i++)for(const [id,stint] of Object.entries(states[i].stints)) {const p=sources[i].find(p=>p.id===id)!;const row=rows.get(id) ?? {playerId:id,playerName:p.name,clubId:clubs[i],goals:0,assists:0,rating:null,minutes:0};row.minutes=(stint.left ?? 90)-stint.entered;rows.set(id,row);}
 report.substitutions=states.flatMap((s,i)=>s.changes.map(c=>({...c,clubId:clubs[i]})));
 const result:SeasonFixture={...f,status:"played",homeScore:scores[0],awayScore:scores[1],playerContributions:[...rows.values()],report};
 if(f.type==="cup")result.winnerClubId=scores[0]===scores[1] ? clubs[random()<.5?0:1]:clubs[scores[0]>scores[1]?0:1];
 assertParticipantsEligible(result,db,discipline);assertMatchReport(result);return result;
}
