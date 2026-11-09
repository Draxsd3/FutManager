import { formatBrl } from "@/lib/game/transfers";
import type { marketCostQuote } from "@/lib/game/market-quote";

type Quote = ReturnType<typeof marketCostQuote>;
function Row({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 ${strong ? "font-bold text-[#233e2b]" : ""}`}><dt>{label}</dt><dd className="font-semibold tabular-nums">{formatBrl(value)}</dd></div>;
}
export function MarketCost({ quote, kind }: { quote: Quote; kind: "sale" | "loan" }) {
  if (!quote) return <section aria-label="Resumo financeiro da proposta" className="text-sm text-[#806135]">Informe valores válidos para calcular o compromisso.</section>;
  return <section aria-label="Resumo financeiro da proposta" className="space-y-4 rounded-xl border border-[#dce8dd] bg-white p-4 text-sm leading-relaxed text-[#354d3c]">
    <div><h4 className="mb-2 font-bold text-[#233e2b]">Pagamento na contratação</h4><dl className="space-y-1.5"><Row label="Taxa à vista" value={quote.fee} strong />{quote.cash !== null && <Row label="Caixa atual" value={quote.cash} />}</dl>
      {quote.available === null ? <p className="mt-2">Caixa indisponível. Será validado ao concluir a contratação.</p> : <p className={`mt-3 rounded-lg p-3 font-semibold ${quote.enough ? "bg-[#eaf5ed] text-[#246e43]" : "bg-[#fff4e3] text-[#80521c]"}`}>{quote.enough ? "Caixa suficiente para pagar a taxa à vista." : `Faltam ${formatBrl(Math.max(0, quote.fee - quote.available))} em caixa para pagar a taxa à vista.`}</p>}
    </div>
    <div><h4 className="mb-2 font-bold text-[#233e2b]">Compromissos futuros · estimativa</h4><dl className="space-y-1.5"><Row label={`Salários deste atleta (${kind === "loan" ? 6 : 12} meses)`} value={quote.salary} />{quote.breakdown && <><Row label="Salários já previstos (próximos 12 meses)" value={quote.breakdown.wages} /><Row label="Contas a pagar" value={quote.breakdown.payables} /></>}</dl>
      {quote.breakdown && quote.cash !== null && quote.total > quote.breakdown.unreserved && <p className="mt-2 text-[#795525]">{quote.breakdown.unreserved < 0 && <>Os compromissos previstos já superam o caixa em {formatBrl(-quote.breakdown.unreserved)}. </>}Após esta contratação, a diferença projetada, sem considerar receitas futuras, será de {formatBrl(quote.total - quote.breakdown.unreserved)}.</p>}
    </div>
    <p className="text-xs leading-relaxed text-[#536b59]">Os salários são pagos ao longo do contrato, não reservados antecipadamente. A projeção não considera receitas futuras; se faltar caixa nos vencimentos, haverá dívida. O caixa é revalidado na conclusão.</p>
  </section>;
}
