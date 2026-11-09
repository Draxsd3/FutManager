import { formatBrl } from "@/lib/game/transfers";
import type { marketCostQuote } from "@/lib/game/market-quote";

type Quote = ReturnType<typeof marketCostQuote>;
export function MarketCost({ quote, kind }: { quote: Quote; kind: "sale" | "loan" }) {
  if (!quote) return <p className="text-xs text-[#806135]">Informe valores válidos para calcular o compromisso.</p>;
  return <div aria-label="Resumo financeiro da proposta" className="rounded-lg border border-[#dce8dd] bg-white p-3 text-xs leading-relaxed text-[#354d3c]">
    <p>Taxa: <b>{formatBrl(quote.fee)}</b> · Salários reservados ({kind === "loan" ? 6 : 12} meses): <b>{formatBrl(quote.salary)}</b> · Total necessário: <b>{formatBrl(quote.total)}</b></p>
    {quote.available === null ? <p>Saldo disponível após compromissos: indisponível. Será validado ao enviar.</p> : <p>Caixa: <b>{formatBrl(quote.cash!)}</b> · Disponível após compromissos existentes: <b>{formatBrl(quote.available)}</b> · <b>{quote.enough ? "Saldo suficiente" : `Faltam ${formatBrl(Math.max(0, quote.total - quote.available))}`}</b></p>}
    <p>O saldo disponível desconta salários previstos, contas e reservas; a taxa é paga na conclusão e salários são compromissos futuros. Valores sujeitos à validação.</p>
  </div>;
}
