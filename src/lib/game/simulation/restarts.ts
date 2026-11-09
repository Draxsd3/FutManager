import type { MatchEvent, MatchSide } from "../live-match";
export type Restart = { kind:"kickoff"|"free-kick"|"penalty"|"goal-kick"|"corner"|"throw-in"; side:MatchSide; point:{x:number;y:number}; indirect?:boolean };
const opposite=(side:MatchSide):MatchSide=>side==="home"?"away":"home";
/** IFAB Laws 8/11/12/13/14/15/16/17, normalized pitch. Penalty conversion is a game heuristic, not an official xG statistic. */
export function restartAfter(events:MatchEvent[],minute:number,kickoff:MatchSide="home"):Restart|undefined {
 if(minute===1 || minute===46)return {kind:"kickoff",side:minute===1?kickoff:opposite(kickoff),point:{x:50,y:50}};
 const last=[...events].reverse().find(e=>e.scene);if(!last?.scene)return;
 if(last.restartNext)return last.restartNext;
 const scene=last.scene;
 if(scene.action==="goal")return {kind:"kickoff",side:opposite(scene.team),point:{x:50,y:50}};
 if(scene.action==="offside")return {kind:"free-kick",side:opposite(scene.team),point:scene.to,indirect:true};
 if(scene.action==="foul") {
  const side=opposite(scene.team),point=scene.from,progress=side==="home"?point.x:100-point.x;
  return progress>=84.29 && point.y>=20.35 && point.y<=79.65 ? {kind:"penalty",side,point:{x:side==="home"?89.52:10.48,y:50}}:{kind:"free-kick",side,point};
 }
 if(scene.action==="shot" && last.outcome==="missed")return {kind:"goal-kick",side:opposite(scene.team),point:{x:scene.team==="home"?94:6,y:50}};
}
