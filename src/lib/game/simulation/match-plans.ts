import type { MatchTactics } from "../live-match";
import { seededRandom } from "../live-match";
import type { Coach } from "./coaches";

export type MatchPlan = { version: 2; coachId: string; origin: "career-coach" | "interim"; formation: string; tactics: MatchTactics; reason: string };
export type CpuAthlete = { id: string; role: string; overall: number; energy: number; age: number };
export type CpuState = { version: 2; plan: MatchPlan; active: string[]; stints: Record<string,{entered:number;left?:number}>; changes: {minute:number;out:string;in:string;interval:boolean;reason:string}[]; reviewed: number[] };
/** Preferences are simulated attributes of the E5 identity, NOT invented real coaching biographies. */
export function coachMatchPlan(coach: Coach | undefined, ownStrength: number, opponentStrength: number): MatchPlan {
 const random=seededRandom(`${coach?.id ?? "interim"}:tactical-preference-v2`);
 const preference=random(), gap=ownStrength-opponentStrength;
 const style=gap < -8 ? "Defensivo" : gap>8 && preference>.3 ? "Ofensivo" : preference<.25 ? "Defensivo" : "Equilibrado";
 return {version:2,coachId:coach?.id ?? "interim",origin:coach ? "career-coach":"interim",formation:style==="Defensivo" ? "4-5-1":"4-3-3",tactics:{style,marking:coach && coach.reputation>=14 && gap>=0 ? "Pesada":"Normal",focus:random()<.5 ? "Pelas laterais":"Pelo meio"},reason:`Preferência simulada do técnico; diferença de força ${Math.round(gap)}; reputação ${coach?.reputation ?? "interina"}.`};
}
export function startCpu(plan:MatchPlan, roster:CpuAthlete[], selected?:string[]):CpuState {
 const sorted=[...roster].sort((a,b)=>(b.overall+b.energy*.08)-(a.overall+a.energy*.08) || a.id.localeCompare(b.id));
 const targets=plan.formation==="4-5-1" ? {G:1,Z:2,L:2,M:5,A:1}:{G:1,Z:2,L:2,M:3,A:3};
 const preferred=Object.entries(targets).flatMap(([role,count])=>sorted.filter(p=>p.role===role).slice(0,count).map(p=>p.id));
 for(const p of sorted)if(preferred.length<11 && !preferred.includes(p.id))preferred.push(p.id);
 const active=(selected ?? preferred).filter(id=>roster.some(p=>p.id===id)).slice(0,11);
 const keeper=sorted.find(p=>p.role==="G");if(keeper && active.length && !active.some(id=>roster.find(p=>p.id===id)?.role==="G"))active[active.length-1]=keeper.id;
 return {version:2,plan,active,stints:Object.fromEntries(active.map(id=>[id,{entered:0}])),changes:[],reviewed:[]};
}
export const cpuEnergy=(p:CpuAthlete,minute:number,entered=0)=>Math.max(0,Math.min(100,p.energy-(minute-entered)*(p.role==="G"?.10:p.role==="L"?.52:.38)*(p.age>30?1.2:1)));
/** One deterministic decision per milestone/interruption, shared by watched CPU and coarse CPU.
 * Initial selection is eligibility-filtered; review receives known athletes plus explicit unavailable IDs. */
export function reviewCpu(state:CpuState, roster:CpuAthlete[], minute:number, difference:number, booked:string[]=[], expelled:string[]=[], unavailable:string[]=[]):CpuState {
 const next:CpuState=structuredClone(state);
 for(const id of expelled) {next.active=next.active.filter(v=>v!==id);if(next.stints[id] && next.stints[id].left===undefined)next.stints[id].left=minute;}
 if(next.reviewed.includes(minute) || minute>=90)return next;
 const emergency=next.active.some(id=>unavailable.includes(id));
 if(![45,60,75].includes(minute) && !emergency)return next;
 next.reviewed.push(minute);
 if(difference<0 && minute>=60)next.plan.tactics={...next.plan.tactics,style:"Ofensivo",marking:minute>=75 ? "Pesada":"Normal"};
 else if(difference>0 && minute>=75 || next.active.length<11)next.plan.tactics={...next.plan.tactics,style:"Defensivo",marking:"Leve"};
 const finish=()=>{for(const id of unavailable)if(next.active.includes(id)){next.active=next.active.filter(p=>p!==id);if(next.stints[id])next.stints[id].left=minute;}return next;};
 const windows=new Set(next.changes.filter(c=>!c.interval).map(c=>c.minute));
 if(next.changes.length>=5 || minute!==45 && windows.size>=3 && !windows.has(minute))return finish();
 const lookup=new Map(roster.map(p=>[p.id,p]));
 const fatigue=(p:CpuAthlete)=>cpuEnergy(p,minute,next.stints[p.id]?.entered ?? 0);
 const candidates=next.active.map(id=>lookup.get(id)).filter((p):p is CpuAthlete=>!!p).sort((a,b)=>Number(unavailable.includes(b.id))*1000+Number(booked.includes(b.id))*15-fatigue(b) -(Number(unavailable.includes(a.id))*1000+Number(booked.includes(a.id))*15-fatigue(a)) || a.id.localeCompare(b.id));
 const reserves=roster.filter(p=>!next.stints[p.id] && !expelled.includes(p.id) && !unavailable.includes(p.id));
 const count=minute===45 ? 1:2;
 for(const out of candidates) {
  if(next.changes.filter(c=>c.minute===minute).length>=count || next.changes.length>=5)break;
  const incoming=reserves.filter(p=>!next.stints[p.id] && (out.role==="G" ? p.role==="G":p.role!=="G")).sort((a,b)=>((b.role===out.role ? 18:0)+b.overall+b.energy*.15)-((a.role===out.role ? 18:0)+a.overall+a.energy*.15) || a.id.localeCompare(b.id))[0];
  if(!incoming)continue;
  const injured=unavailable.includes(out.id), caution=booked.includes(out.id), tired=fatigue(out)<68;
  if(!injured && !caution && !tired && !(difference<0 && minute>=60 && incoming.role==="A"))continue;
  next.active[next.active.indexOf(out.id)]=incoming.id;next.stints[out.id].left=minute;next.stints[incoming.id]={entered:minute};
  next.changes.push({minute,out:out.id,in:incoming.id,interval:minute===45,reason:injured ? "lesão":caution ? "advertência":tired ? "desgaste":"buscar resultado"});
 }
 return finish();
}

const contexts=new WeakMap<import("../editor-data").EditorDatabase,Record<string,Coach>>();
export function bindMatchCoaches(db:import("../editor-data").EditorDatabase,coaches?:Record<string,Coach>) {if(coaches)contexts.set(db,coaches);return db;}
export function clubCoach(db:import("../editor-data").EditorDatabase,clubId:string) {return Object.values(contexts.get(db) ?? {}).find(c=>c.clubId===clubId);}

export function assertCpuState(state:CpuState,roster:CpuAthlete[]) {
 const known=new Set(roster.map(p=>p.id)),integer=(n:number)=>Number.isInteger(n)&&n>=0&&n<=90;
 if(state.version!==2 || state.plan.version!==2 || !["4-3-3","4-5-1"].includes(state.plan.formation) || !["Equilibrado","Defensivo","Ofensivo"].includes(state.plan.tactics.style) || new Set(state.active).size!==state.active.length || state.active.length>11 || state.active.some(id=>!known.has(id)||!state.stints[id]||state.stints[id].left!==undefined) || state.changes.length>5 || new Set(state.changes.filter(c=>!c.interval).map(c=>c.minute)).size>3 || new Set(state.reviewed).size!==state.reviewed.length || state.reviewed.some(m=>!integer(m)))throw new Error("Estado CPU incompatível; partida preservada.");
 for(const [id,stint] of Object.entries(state.stints))if(!known.has(id)||!integer(stint.entered)||stint.left!==undefined&&(!integer(stint.left)||stint.left<stint.entered))throw new Error("Participação CPU inválida.");
 const entered=new Set<string>();
 for(const c of state.changes){if(!known.has(c.in)||!known.has(c.out)||c.in===c.out||!integer(c.minute)||c.minute>=90||c.interval&&c.minute!==45||entered.has(c.in)||state.stints[c.out]?.left!==c.minute||state.stints[c.in]?.entered!==c.minute)throw new Error("Troca CPU inválida.");entered.add(c.in);}
}
