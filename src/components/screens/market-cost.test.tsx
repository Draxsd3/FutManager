// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MarketCost } from "./market-cost";
import { marketCostQuote } from "@/lib/game/market-quote";
import type { FinanceState } from "@/lib/game/simulation/finance";
afterEach(cleanup);
it("mostra apenas taxa, caixa e aviso salarial sem projeção de 12 meses", () => {
 const finance: FinanceState = {version:1,rulesVersion:"finance-v1",adoptedOn:"2026-01-01",through:"2026-01-01",clubs:{club:{cashCents:100000,projectedThousands:1}},contracts:{p:{id:"p",playerId:"p",clubId:"club",startsOn:"2026-01-01",endsOn:null,monthlyCents:10000,accruedThrough:"2026-01-01",origin:"legacy",status:"active"}},history:[],registrations:{},loans:{},ledger:[],payables:{p:{clubId:"club",amountCents:10000,paidCents:5000,dueOn:"2026-02-01"}},reservations:{a:{clubId:"club",cents:10000}},settlements:{}};
 render(<MarketCost quote={marketCostQuote(finance,"club","sale",500,10,100)} kind="sale" />);
 const panel=within(screen.getByRole("region",{name:"Resumo financeiro da proposta"}));
 expect(panel.getByText("Taxa à vista")).toBeTruthy();
 expect(panel.getByText("Caixa atual")).toBeTruthy();
 expect(panel.getByText(/Caixa suficiente/)).toBeTruthy();
 expect(panel.getByText(/salário é pago mensalmente/)).toBeTruthy();
 expect(panel.queryByText(/12 meses/)).toBeNull();
});
it("informa quando não há dados financeiros para calcular", () => {
 render(<MarketCost quote={marketCostQuote(undefined,"club","loan",100,10,50)} kind="loan" />);
 expect(screen.getByText(/Caixa indisponível/)).toBeTruthy();
});
