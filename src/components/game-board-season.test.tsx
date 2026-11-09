// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,configure,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {GameBoard} from "./game-board";
import {marketFixture} from "@/lib/game/simulation/market-test-fixture";
import {createCareerSeason,settleSeasonThrough} from "@/lib/game/season";
import {migrateCoachSave} from "@/lib/game/simulation/coaches";
import {engineState} from "@/lib/game/simulation/foundation";
import {readLocalSaves,writeLocalSaves} from "@/lib/game/persistence";
vi.mock("@/lib/game/persistence",async(original)=>({
 ...await original<typeof import("@/lib/game/persistence")>(),
 readCloudDatabase:vi.fn().mockResolvedValue(null),readCloudSaves:vi.fn().mockResolvedValue([]),readCloudCareer:vi.fn().mockResolvedValue(null),
 writeCloudDatabase:vi.fn().mockResolvedValue(undefined),writeCloudSave:vi.fn().mockResolvedValue(undefined),deleteCloudSave:vi.fn().mockResolvedValue(undefined),
}));
configure({asyncUtilTimeout:20000});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it("commits the next season through the hub and retains the immutable archive after reload/autosave",async()=>{
 localStorage.clear();sessionStorage.clear();
 Object.defineProperty(navigator,"locks",{configurable:true,value:{request:async(_key:string,commit:()=>unknown)=>commit()}});
 const {save,database}=marketFixture();
 save.inGameDate="2026-12-31";
 save.progress={...save.progress!,universeSnapshot:database,page:"hub",competitionSeason:settleSeasonThrough(createCareerSeason(database,save.clubId,2026,"domestic-world")!,database,"2026-12-31"),engine:engineState(undefined,save.id,save.inGameDate)};
 Object.assign(save,migrateCoachSave(save,database));
 save.progress!.managerMarket!.staff!.boards[save.clubId].seen=save.progress!.competitionSeason!.fixtures.map(f=>f.id);
 expect(writeLocalSaves([save],"annual-ui")).toBe(true);
 const game=<GameBoard userId="annual-ui" email="annual@example.com" onSignOut={async()=>{}}/>;
 const view=render(game);
 fireEvent.click(await screen.findByRole("button",{name:/CONTINUAR JOGANDO/}));
 fireEvent.click(await screen.findByRole("button",{name:"CONTINUAR"}));
 fireEvent.click(await screen.findByRole("button",{name:/Avançar temporada/}, {timeout:20000}));
 await waitFor(()=>expect(readLocalSaves("annual-ui")[0]?.progress?.competitionSeason?.season).toBe(2027),{timeout:30000});
 const archive=readLocalSaves("annual-ui")[0].progress!.seasonHistory![2026];
 expect(archive.season).toEqual(save.progress.competitionSeason);
 await screen.findByRole("button",{name:/Escalar Time/i});
 view.unmount();render(game);
 // Reopening a career is deliberate; either the account menu or its active session can appear.
 const menu=screen.queryByRole("button",{name:/CONTINUAR JOGANDO/});
 if(menu){fireEvent.click(menu);fireEvent.click(await screen.findByRole("button",{name:"CONTINUAR"}));}
 await screen.findByRole("button",{name:/Escalar Time/i},{timeout:20000});
 await waitFor(()=>expect(readLocalSaves("annual-ui")[0].progress!.seasonHistory![2026]).toEqual(archive));
 expect(readLocalSaves("annual-ui")[0].inGameDate).toBe("2027-01-01");
},60000);

it("refuses a failed annual CAS write without showing or persisting the new season",async()=>{
 localStorage.clear();sessionStorage.clear();
 Object.defineProperty(navigator,"locks",{configurable:true,value:{request:async(_key:string,commit:()=>unknown)=>commit()}});
 const {save,database}=marketFixture();
 save.inGameDate="2026-12-31";
 save.progress={...save.progress!,universeSnapshot:database,page:"hub",competitionSeason:settleSeasonThrough(createCareerSeason(database,save.clubId,2026,"domestic-world")!,database,"2026-12-31"),engine:engineState(undefined,save.id,save.inGameDate)};
 expect(writeLocalSaves([save],"annual-failure")).toBe(true);
 render(<GameBoard userId="annual-failure" email="failure@example.com" onSignOut={async()=>{}}/>);
 fireEvent.click(await screen.findByRole("button",{name:/CONTINUAR JOGANDO/}));
 fireEvent.click(await screen.findByRole("button",{name:"CONTINUAR"}));
 const button=await screen.findByRole("button",{name:/Avançar temporada/});
 const original=Storage.prototype.setItem;
 const blocked=vi.spyOn(Storage.prototype,"setItem").mockImplementation(function(this:Storage,key:string,value:string){
  if(key.includes("futmanager.saves.v1"))throw new DOMException("Full","QuotaExceededError");
  return original.call(this,key,value);
 });
 fireEvent.click(button);
 expect((await screen.findByRole("alert")).textContent).toContain("Sem espaço");
 blocked.mockRestore();
 const persisted=readLocalSaves("annual-failure")[0];
 expect(persisted.progress!.competitionSeason!.season).toBe(2026);
 expect(persisted.progress!.seasonHistory).toBeUndefined();
 expect(persisted.progress!.engine!.revision).toBe(0);
 expect(screen.getByRole("button",{name:/Avançar temporada/})).toBeTruthy();
},60000);
