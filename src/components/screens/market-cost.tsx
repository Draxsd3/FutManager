import { formatBrl } from "@/lib/game/transfers";
import type { marketCostQuote } from "@/lib/game/market-quote";

type Quote = ReturnType<typeof marketCostQuote>;
export function MarketCost({ quote }: { quote: Quote; kind: "sale" | "loan" }) {
  if (!quote) return <section aria-label="Resumo financeiro da proposta" className="text-sm text-[#806135]">Informe valores válidos para calcular a taxa.</section>;
  return <section aria-label="Resumo financeiro da proposta" className="space-y-3 rounded-xl border border-[#dce8dd] bg-white p-4 text-sm text-[#354d3c]">
    <h4 className="font-bold text-[#233e2b]">Pagamento na contratação</h4>
    <dl className="space-y-2"><div className="flex flex-wrap justify-between gap-2"><dt>Taxa à vista</dt><dd className="font-bold">{formatBrl(quote.fee)}</dd></div>{quote.cash !== null && <div className="flex flex-wrap justify-between gap-2"><dt>Caixa atual</dt><dd className="font-bold">{formatBrl(quote.cash)}</dd></div>}</dl>
    {quote.available === null ? <p>Caixa indisponível. Será validado na contratação.</p> : <p className={`rounded-lg p-3 font-semibold ${quote.enough ? "bg-[#eaf5ed] text-[#246e43]" : "bg-[#fff4e3] text-[#80521c]"}`}>{quote.enough ? "Caixa suficiente para pagar a taxa à vista." : `Faltam ${formatBrl(Math.max(0, quote.fee - quote.available))} em caixa para pagar a taxa à vista.`}</p>}
    <p className="text-xs leading-relaxed text-[#536b59]">O salário é pago mensalmente. Se faltar caixa no vencimento, haverá dívida.</p>
  </section>;
}
