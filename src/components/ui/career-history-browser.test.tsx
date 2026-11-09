// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {CareerHistoryBrowser} from "./career-history-browser";
import {marketFixture} from "@/lib/game/simulation/market-test-fixture";
import {makePages,refOf} from "@/lib/game/storage/pages";
const mocks=vi.hoisted(()=>({read:vi.fn()}));
vi.mock("@/lib/game/storage/cloud-pages",()=>({readCareerPage:mocks.read}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it("loads only requested page and displays at most 50 entries; a failed query is retryable",async()=>{
 const {save}=marketFixture(),page=makePages("ledger",Array.from({length:120},(_,i)=>({id:`row${i}`,date:"2026-01-01",reference:`Registro ${i}`,amountCents:i})))[0];
 save.progress!.managerMarket!.finance!.archive={version:1,pages:[refOf(page)],ledgerCount:120,invoiceCount:0,contractCount:0};
 mocks.read.mockRejectedValueOnce(new Error("Página temporariamente indisponível")).mockResolvedValue(page);
 render(<CareerHistoryBrowser owner="owner" save={save}/>);
 await screen.findByRole("alert");expect(screen.getByText(/Página temporariamente/)).toBeTruthy();
 fireEvent.click(screen.getByText("Tentar novamente"));
 await screen.findByText(/Registro 0 ·/);expect(document.querySelectorAll("details")).toHaveLength(50);
 expect(screen.queryByText(/Registro 50 ·/)).toBeNull();
 fireEvent.click(screen.getByText("Próxima →"));await screen.findByText(/Registro 50 ·/);
 expect(document.querySelectorAll("details")).toHaveLength(50);expect(mocks.read).toHaveBeenCalledTimes(2);
 await waitFor(()=>expect(mocks.read).toHaveBeenLastCalledWith("owner",save.id,refOf(page)));
});
