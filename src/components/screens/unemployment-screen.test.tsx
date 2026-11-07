// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UnemploymentScreen } from "./unemployment-screen";
import { CoachesScreen } from "./coaches-screen";
import { marketFixture } from "@/lib/game/simulation/market-test-fixture";
import { migrateCoachSave, processCoaches } from "@/lib/game/simulation/coaches";
afterEach(cleanup);
function unemployed() {
  const f=marketFixture();
  const save=migrateCoachSave(f.save,f.database), market=save.progress!.managerMarket!, human=market.staff!.coaches[market.staff!.humanId];
  human.contract!.endsOn="2026-01-10";
  market.finance!.contracts[`coach:${human.id}`].endsOn="2026-01-10";
  return {...f,market:processCoaches(market,f.database,undefined,save.inGameDate)};
}
it("lets an unemployed human advance without a match and keeps the job center playable after a failure",async()=>{
  const f=unemployed(), onAdvance=vi.fn().mockResolvedValueOnce("Save indisponível").mockResolvedValueOnce(undefined);
  render(<UnemploymentScreen coach="Teste" jobs={{market:f.market,database:f.database,currentClubId:f.human.id,date:f.save.inGameDate,onApply:vi.fn(),onAccept:vi.fn(),onDecline:vi.fn()}} onAdvance={onAdvance}/>);
  expect(screen.getByRole("heading",{name:"Teste · Sem clube"})).toBeTruthy();
  expect(screen.getByRole("heading",{name:"Central de empregos"})).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Avançar uma semana"}));
  await screen.findByText("Save indisponível");
  fireEvent.click(screen.getByRole("button",{name:"Avançar uma semana"}));
  await waitFor(()=>expect(onAdvance).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("button",{name:/Escalar/})).toBeNull();
});
it("projects the same human ID as unemployed, with an ended simulated contract and career-only history",()=>{
  const f=unemployed();
  render(<CoachesScreen database={f.database} managerMarket={f.market} club={f.human.name} coach={f.save.managerName} date={f.save.inGameDate}/>);
  fireEvent.change(screen.getByRole("searchbox",{name:"Buscar técnico"}),{target:{value:f.save.managerName}});
  expect(screen.getByRole("heading",{name:f.save.managerName})).toBeTruthy();
  expect(screen.getAllByText("Sem clube").length).toBeGreaterThan(0);
  expect(screen.getByText("Sem vínculo simulado")).toBeTruthy();
  expect(screen.getByText("Trajetória nesta carreira")).toBeTruthy();
  expect(screen.getByText(/Contrato encerrado/)).toBeTruthy();
});
