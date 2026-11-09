// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MarketPlayerTerms } from "./market-player-terms";
import { createDefaultDatabase } from "@/lib/game/editor-data";
import { assessMove, estimatedWageExpectation } from "@/lib/game/simulation/market-rules";
afterEach(cleanup);
it("exibe salário e contrato atuais, referência coerente e duração fixa do novo vínculo",()=>{
 const db=createDefaultDatabase(), p={...db.players[0],salaryMonthlyBrl:10000,contractEndsOn:"2028-06-30"};
 const roster=db.players.filter(x=>x.clubId!==p.clubId).slice(0,11), expected=estimatedWageExpectation(p,roster)!;
 render(<MarketPlayerTerms player={p} roster={roster} date="2026-01-01" />);
 expect(screen.getByText("Salário atual no jogo").nextElementSibling?.textContent).toBe("R$ 10.000 / mês");
 expect(screen.getByText("Até 30/06/2028")).toBeTruthy();
 expect(screen.getByText("1 ano (duração fixa)")).toBeTruthy();
 expect(screen.getByText(/não é uma exigência real/)).toBeTruthy();
 expect(assessMove(p,roster,"sale",expected).accepted).toBe(true);
 expect(assessMove(p,roster,"sale",expected-1).accepted).toBe(false);
});
it("não inventa dados faltantes ou considera contrato vencido prova de liberdade",()=>{
 const p={...createDefaultDatabase().players[0],salaryMonthlyBrl:NaN,contractEndsOn:"2024-01-01"};
 render(<MarketPlayerTerms player={p} roster={[]} date="2026-01-01" />);
 expect(screen.getByText("Não informado")).toBeTruthy(); expect(screen.getByText("Indisponível")).toBeTruthy();
 expect(screen.getByText(/vínculo não confirmado/)).toBeTruthy();
});

it("reflete o prêmio salarial quando o projeto exige compensação",()=>{
 const db=createDefaultDatabase(), p={...db.players[0], overall:90, salaryMonthlyBrl:10001}, roster=db.players.slice(1,12).map(x=>({...x,overall:50}));
 const target=estimatedWageExpectation(p,roster)!; expect(target).toBe(12002);
 expect(assessMove(p,roster,"sale",target-1).accepted).toBe(false); expect(assessMove(p,roster,"sale",target).accepted).toBe(true);
});
it("explica a redução contextual e mostra a mesma referência usada no aceite",()=>{
 const db=createDefaultDatabase(), buyer=db.clubs[0], seller=db.clubs[1]; buyer.division="Série A"; seller.division="Série B";
 const p={...db.players.find(x=>x.clubId===seller.id)!,salaryMonthlyBrl:10000,contractEndsOn:"2028-01-01"};
 const roster=db.players.filter(x=>x.clubId===buyer.id);
 render(<MarketPlayerTerms player={p} roster={roster} database={db} buyerClubId={buyer.id} date="2026-01-01" />);
 const reference=estimatedWageExpectation(p,roster,{database:db,buyerClubId:buyer.id,date:"2026-01-01"})!;
 expect(screen.getByText("Salário desejado · referência simulada").nextElementSibling?.textContent).toBe(`R$ ${reference.toLocaleString("pt-BR")} / mês`);
 expect(screen.getByText(/Projeto em divisão nacional superior/)).toBeTruthy();
 expect(assessMove(p,roster,"sale",reference,{database:db,buyerClubId:buyer.id,date:"2026-01-01"}).accepted).toBe(true);
});
