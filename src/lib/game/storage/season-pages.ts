import type {SeasonArchive} from "../simulation/season-lifecycle";
import {archiveFingerprint} from "../simulation/season-lifecycle";
import {digest,makePages,refOf,type PageRef} from "./pages";
export type ColdSeason={pages:PageRef[];fingerprint:string;fixtures:Record<string,string>};
export function archiveSeason(archive:SeasonArchive){
 if(archive.cold)return {archive,pages:[]};
 const pages=makePages("season",archive.season.fixtures);
 const cold:ColdSeason={pages:pages.map(refOf),fingerprint:digest(archiveFingerprint(archive)),fixtures:Object.fromEntries(archive.season.fixtures.filter(f=>f.report).map(f=>[f.id,digest(archiveFingerprint(f))]))};
 return {archive:{...archive,season:{...archive.season,fixtures:[]},cold},pages};
}
export function assertSeasonConversion(previous:SeasonArchive,next:SeasonArchive){
 return archiveFingerprint(archiveSeason(previous).archive)===archiveFingerprint(next);
}
