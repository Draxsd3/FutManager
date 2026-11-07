"use client";
import { useState } from "react";
import type { EditorDatabase } from "@/lib/game/editor-data";
import type { DecisionRecord } from "@/lib/game/simulation/foundation";
import type { MarketStrategy } from "@/lib/game/simulation/market-planning";
import { formatBrl } from "@/lib/game/transfers";

export function MarketPlanningPanel({state,database,onMode}: {state?: MarketStrategy;database: EditorDatabase;onMode:(mode: DecisionRecord["mode"])=>Promise<void>}) {
  const [clubId,setClubId]=useState(""); const [busy,setBusy]=useState(false);
  const plans=Object.values(state?.plans ?? {}), plan=plans.find(p=>p.clubId===clubId) ?? plans[0];
  const clubName=(id: string)=>database.clubs.find(c=>c.id===id)?.name ?? id;
  const last=state?.rounds.at(-1);
  return <details className="border-b border-[#d5e0d8] py-3">
    <summary className="cursor-pointer text-sm font-bold">Bastidores do mercado</summary>
    <div className="space-y-3 py-3 text-xs">
      <label>Decisões dos clubes <select aria-label="Política do mercado" disabled={busy} value={state?.mode ?? "internal"} onChange={async e=>{setBusy(true);try{await onMode(e.target.value as DecisionRecord["mode"]);}finally{setBusy(false);}}}>
        <option value="internal">Motor interno</option><option value="assisted">Piloto assistido por IA</option><option value="comparison">Comparar IA com o motor</option>
      </select></label>
      <p>O piloto avalia no máximo um clube por avanço e exige configuração segura no servidor. Falha ou cota esgotada usa o motor interno. Na comparação, só a decisão interna é executada.</p>
      {last && <p>Última rodada: {last.proposals} propostas · {last.completed} negócios concluídos · {last.rejected} encerrados. Não há obrigação de contratar.</p>}
      {!!plans.length && <><label>Planejamento do clube <select aria-label="Clube do planejamento" value={plan?.clubId ?? ""} onChange={e=>setClubId(e.target.value)}>{plans.map(p=><option key={p.clubId} value={p.clubId}>{clubName(p.clubId)}</option>)}</select></label>
        {plan && <><p>Disponível após compromissos: {formatBrl(plan.availableCents/100)} · Limite da rodada: {formatBrl(plan.spendingLimitCents/100)} · {plan.fixturesNext21Days} jogos nos próximos 21 dias.</p>
          <table className="w-full text-left"><caption className="sr-only">Profundidade planejada</caption><thead><tr><th>Setor</th><th>Elenco / alvo</th><th>Prioridade</th></tr></thead><tbody>{plan.needs.map(n=><tr key={n.position}><td>{n.position}</td><td>{n.count} / {n.target}</td><td>{n.priority ? "Reforçar" : "Coberto"}</td></tr>)}</tbody></table>
          {plan.replacements.map(r=><p key={r.departedId}>{r.position}: {r.reason}</p>)}</>}
      </>}
      {!!state?.audit.length && <ul aria-label="Decisões recentes de mercado">{state.audit.slice(-6).reverse().map(a=><li key={a.decisionId}>{clubName(a.actorId)} · {a.date}: {a.fallback ? "Motor interno (fallback)" : a.mode==="assisted" ? "Escolha assistida validada" : a.mode==="comparison" ? "Comparação; executado motor interno" : "Motor interno"}. {a.reason}</li>)}</ul>}
    </div>
  </details>;
}
