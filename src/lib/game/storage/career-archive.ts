import type {CareerSave} from "../editor-data";
import {archiveSeason} from "./season-pages";
import {archiveFinance} from "./finance-archive";
import type {ArchivePage,PageRef} from "./pages";
export function prepareCareerArchive(save:CareerSave):{save:CareerSave;pages:ArchivePage[]}{
 const pages:ArchivePage[]=[];let progress=save.progress;
 if(!progress)return {save,pages};
 const finance=progress.managerMarket?.finance;
 if(finance){const prepared=archiveFinance(finance);pages.push(...prepared.pages);if(prepared.finance!==finance)progress={...progress,managerMarket:{...progress.managerMarket!,finance:prepared.finance}};}
 const history=progress.seasonHistory;
 if(history && Object.values(history).some(a=>!a.cold)){
  progress={...progress,seasonHistory:Object.fromEntries(Object.entries(history).map(([year,a])=>{const archived=archiveSeason(a);pages.push(...archived.pages);return [year,archived.archive];}))};
 }
 return {save:progress===save.progress?save:{...save,progress},pages};
}

export function careerPageRefs(save:CareerSave):PageRef[]{return [...(save.progress?.managerMarket?.finance?.archive?.pages ?? []),...Object.values(save.progress?.seasonHistory ?? {}).flatMap(a=>a.cold?.pages ?? [])];}
export function assertArchiveRefs(previous:CareerSave|undefined,next:CareerSave){
 const old=previous?.progress?.managerMarket?.finance?.archive?.pages ?? [],refs=next.progress?.managerMarket?.finance?.archive?.pages ?? [];
 for(let i=0;i<old.length;i++)if(JSON.stringify(refs[i])!==JSON.stringify(old[i]))throw new Error("Referência histórica não pode ser removida ou reescrita.");
}
