import type { EditorPlayer } from "@/lib/game/editor-data";
import { isFreeAgent } from "@/lib/game/player-contract";
import { estimatedWageExpectation } from "@/lib/game/simulation/market-rules";
import { civilDate } from "@/lib/game/simulation/foundation";
import { FINANCE_RULES } from "@/lib/game/simulation/finance";
import { formatBrl } from "@/lib/game/transfers";

export function MarketPlayerTerms({ player, roster, date }: { player: EditorPlayer; roster: EditorPlayer[]; date?: string }) {
  const expected = estimatedWageExpectation(player, roster);
  const ends = player.contractEndsOn;
  let match: RegExpExecArray | null = null;
  try { civilDate(ends); match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ends); } catch { /* Unknown dates are not presented as facts. */ }
  const currentContract = isFreeAgent(player) ? "Sem contrato" : !match ? "Data não informada" : date && ends < date ? "Data cadastrada vencida; vínculo não confirmado" : `Até ${match[3]}/${match[2]}/${match[1]}${player.transfermarkt?.estimatedFields?.includes("contractEndsOn") ? " (estimado)" : ""}`;
  const salary = Number.isFinite(player.salaryMonthlyBrl) && player.salaryMonthlyBrl >= 0 ? `${formatBrl(player.salaryMonthlyBrl)} / mês` : "Não informado";
  return <section aria-label="Condições do jogador" className="space-y-3 rounded-xl border border-[#dce9de] bg-white p-4">
    <h4 className="font-bold text-[#233e2b]">Condições do jogador</h4>
    <dl className="grid gap-2 sm:grid-cols-2"><div className="rounded-lg bg-[#f5f8f5] p-3"><dt className="text-xs text-[#536b59]">Salário atual no jogo</dt><dd className="mt-1 text-sm font-bold">{salary}</dd></div><div className="rounded-lg bg-[#f5f8f5] p-3"><dt className="text-xs text-[#536b59]">Contrato atual</dt><dd className="mt-1 text-sm font-bold">{currentContract}</dd></div><div className="rounded-lg bg-[#eaf5ed] p-3"><dt className="text-xs text-[#536b59]">Salário desejado · referência simulada</dt><dd className="mt-1 text-sm font-bold">{expected === null ? "Indisponível" : `${formatBrl(expected)} / mês`}</dd></div><div className="rounded-lg bg-[#f5f8f5] p-3"><dt className="text-xs text-[#536b59]">Novo contrato</dt><dd className="mt-1 text-sm font-bold">{FINANCE_RULES.newContractMonths === 12 ? "1 ano (duração fixa)" : `${FINANCE_RULES.newContractMonths} meses (duração fixa)`}</dd></div></dl>
    <p className="text-xs leading-relaxed text-[#536b59]">Salários são estimados pelo jogo. A referência considera o elenco e o papel previsto; não é uma exigência real nem garante aceite se as condições mudarem.</p>
  </section>;
}
