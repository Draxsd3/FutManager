// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MarketCost } from "./market-cost";
import { marketCostQuote } from "@/lib/game/market-quote";
import type { FinanceState } from "@/lib/game/simulation/finance";
afterEach(cleanup);
it("explica caixa, obrigações existentes, saldo limitado a zero e custo da proposta", () => {
 const finance: FinanceState = {version:1,rulesVersion:"finance-v1",adoptedOn:"2026-01-01",through:"2026-01-01",clubs:{club:{cashCents:100000,projectedThousands:1}},contracts:{p:{id:"p",playerId:"p",clubId:"club",startsOn:"2026-01-01",endsOn:null,monthlyCents:10000,accruedThrough:"2026-01-01",origin:"legacy",status:"active"}},history:[],registrations:{},loans:{},ledger:[],payables:{p:{clubId:"club",amountCents:10000,paidCents:5000,dueOn:"2026-02-01"}},reservations:{a:{clubId:"club",cents:10000}},settlements:{}};
 render(<MarketCost quote={marketCostQuote(finance,"club","sale",500,10,100)} kind="sale" />);
 const panel=within(screen.getByRole("region",{name:"Resumo financeiro da proposta"}));
 expect(panel.getByText("Salários já previstos (próximos 12 meses)")).toBeTruthy();
 expect(panel.getByText("Contas a pagar")).toBeTruthy();
 expect(panel.getByText(/superam o caixa em/).textContent).toContain("250");
 expect(panel.getByText(/superam o caixa em/).textContent).toContain("870");
 expect(panel.getByText(/Caixa suficiente/)).toBeTruthy();
 expect(panel.getByText(/não reservados antecipadamente/)).toBeTruthy();
});
it("informa quando não há dados financeiros para calcular", () => {
 render(<MarketCost quote={marketCostQuote(undefined,"club","loan",100,10,50)} kind="loan" />);
 expect(screen.getByText(/Caixa indisponível/)).toBeTruthy();
});
