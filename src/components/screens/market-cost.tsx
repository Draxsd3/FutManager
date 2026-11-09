import { formatBrl } from "@/lib/game/transfers";
import type { marketCostQuote } from "@/lib/game/market-quote";

type Quote = ReturnType<typeof marketCostQuote>;
function Row({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 ${strong ? "font-bold text-[#233e2b]" : ""}`}><dt>{label}</dt><dd className="font-semibold tabular-nums">{formatBrl(Object.is(value, -0) ? 0 : value)}</dd></div>;
}
export function MarketCost({ quote, kind }: { quote: Quote; kind: "sale" | "loan" }) {
  if (!quote) return <section aria-label="Resumo financeiro da proposta" className="text-sm text-[#806135]">Informe valores válidos para calcular o compromisso.</section>;
  return <section aria-label="Resumo financeiro da proposta" className="space-y-4 rounded-xl border border-[#dce8dd] bg-white p-4 text-sm leading-relaxed text-[#354d3c]">
    <div><h4 className="mb-2 font-bold text-[#233e2b]">Custo desta proposta</h4><dl className="space-y-1.5"><Row label="Taxa de transferência" value={quote.fee} /><Row label={`Salários do atleta (${kind === "loan" ? 6 : 12} meses)`} value={quote.salary} /><div className="border-t border-[#e1eae2] pt-2"><Row label="Total necessário" value={quote.total} strong /></div></dl></div>
    {quote.breakdown && quote.cash !== null && quote.available !== null ? <div><h4 className="mb-2 font-bold text-[#233e2b]">Como calculamos o disponível</h4><dl className="space-y-1.5"><Row label="Caixa atual" value={quote.cash} /><Row label="Salários já previstos (próximos 12 meses)" value={-quote.breakdown.wages} /><Row label="Contas a pagar" value={-quote.breakdown.payables} /><Row label="Reservas de outras negociações" value={-quote.breakdown.reservations} /><div className="border-t border-[#e1eae2] pt-2"><Row label="Saldo disponível para propostas" value={quote.available} strong /></div></dl>
      {quote.breakdown.unreserved < 0 && <p className="mt-2 text-[#795525]">Os compromissos existentes ultrapassam o caixa em {formatBrl(-quote.breakdown.unreserved)}. Para novas propostas, o disponível fica em zero. Sem outras mudanças, seriam necessários mais {formatBrl(quote.total - quote.breakdown.unreserved)} no caixa para cobrir os compromissos e esta proposta.</p>}
      <p className={`mt-3 rounded-lg p-3 font-semibold ${quote.enough ? "bg-[#eaf5ed] text-[#246e43]" : "bg-[#fff4e3] text-[#80521c]"}`}>{quote.enough ? "Saldo disponível suficiente para esta proposta." : `Faltam ${formatBrl(Math.max(0, quote.total - quote.available))} no saldo disponível para esta proposta.`}</p>
    </div> : <p>Saldo disponível indisponível. O valor será validado ao enviar a proposta.</p>}
    <p className="text-xs leading-relaxed text-[#536b59]">A taxa é paga na conclusão. Os salários são compromissos futuros, não um pagamento imediato. O cálculo não considera receitas futuras e pode mudar até a confirmação.</p>
  </section>;
}
