import type { CareerSave } from "../editor-data";
import { engineState, type DecisionRecord } from "./foundation";
/** Settings are a revisioned command in the same career, not a global localStorage switch. */
export function setMarketMode(save: CareerSave, mode: DecisionRecord["mode"]): CareerSave {
  if(!["internal","assisted","comparison"].includes(mode) || !save.progress || save.progress.page==="matchOverview") throw new Error("Configuração de mercado indisponível.");
  const p=structuredClone(save.progress), engine=engineState(p.engine,save.id,save.inGameDate);
  const world=p.worldMarket ?? {listings:{},events:[]};
  const state=world.marketState ?? {version:1 as const,mode:"internal" as const,plans:{},audit:[],rounds:[]};
  if(state.mode===mode && world.marketState) return save;
  state.mode=mode; world.marketState=state; p.worldMarket=world;
  engine.revision++;
  const id=`market-mode:${engine.revision}:${mode}`;
  engine.operations.push({id,from:save.inGameDate,to:save.inGameDate,revision:engine.revision});
  engine.events.push({id:`${id}:checkpoint`,operationId:id,date:save.inGameDate,type:"checkpoint",entityIds:[save.clubId],revision:engine.revision});
  p.engine=engine;
  return {...save,progress:p};
}
