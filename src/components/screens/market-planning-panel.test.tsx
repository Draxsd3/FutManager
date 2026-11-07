// @vitest-environment jsdom
import { afterEach,expect,it,vi } from "vitest";
import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import { MarketPlanningPanel } from "./market-planning-panel";
import { marketFixture } from "@/lib/game/simulation/market-test-fixture";
import { advanceCareerWithMarketPolicy } from "@/lib/game/simulation/market-policy";
import { setMarketMode } from "@/lib/game/simulation/market-settings";
import { readLocalSaves,writeLocalSaves } from "@/lib/game/persistence";
import { simulateWorldMarket } from "@/lib/game/world-market";
afterEach(()=>{cleanup();localStorage.clear();});
it("shows actual plans/audit and offers a per-career policy control without claiming an unconfigured AI is active",async()=>{
 const {input,database}=marketFixture(), state=simulateWorldMarket(input).world.marketState!, onMode=vi.fn(async()=>{});
 const {container}=render(<MarketPlanningPanel state={state} database={database} onMode={onMode}/>);
 container.querySelector("details")!.open=true;
 expect(screen.getByText(/Disponível após compromissos/)).toBeTruthy();
 fireEvent.change(screen.getByLabelText("Política do mercado"),{target:{value:"comparison"}});
 await waitFor(()=>expect(onMode).toHaveBeenCalledWith("comparison"));
 expect(screen.getByText(/exige configuração segura/)).toBeTruthy();
 expect(screen.queryByText("IA ativa")).toBeNull();
});
it("real advance, mode, chosen action and compressed market commitments survive reload and account isolation",async()=>{
 const {save,database}=marketFixture(), enabled=setMarketMode(save,"assisted"), before=structuredClone(save);
 const command={operationId:"market-integration",fromDate:save.inGameDate,targetDate:"2026-01-18",expectedRevision:enabled.progress!.engine!.revision};
 const provider={decide:vi.fn(async(_id,ctx)=>({decisionId:ctx.decisionId,stateRevision:ctx.stateRevision,actionId:"wait",reason:"Preservar caixa."}))};
 const next=await advanceCareerWithMarketPolicy(enabled,database,command,provider);
 expect(writeLocalSaves([next],"market-account")).toBe(true);
 const encoded=Object.values(localStorage).join(""); expect(encoded).toContain("market-dictionary-deflate-v1");
 const reopened=readLocalSaves("market-account")[0];
 expect(reopened.progress!.worldMarket!.marketState).toEqual(next.progress!.worldMarket!.marketState);
 expect(reopened.progress!.managerMarket!.finance).toEqual(next.progress!.managerMarket!.finance);
 expect(readLocalSaves("other-market-account")).toEqual([]);
 expect(await advanceCareerWithMarketPolicy(reopened,database,command,provider)).toBe(reopened);
 expect(provider.decide).toHaveBeenCalledTimes(1); expect(save).toEqual(before);
});
