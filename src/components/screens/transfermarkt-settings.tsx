"use client";

import { useEffect, useRef, useState } from "react";

export type TransfermarktSyncResult = { clubs: number; players: number; collectedAt: string; cloudPending: boolean };

export function TransfermarktSettings({ onSynchronize }: { onSynchronize: (progress: (message: string) => void, signal: AbortSignal) => Promise<TransfermarktSyncResult> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const running = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState("");
  useEffect(() => () => controller.current?.abort(), []);
  async function synchronize() {
    if (running.current) return;
    running.current = true;
    setBusy(true); setFailed(false); setMessage(""); setProgress("Iniciando coleta das Séries A/B/C/D de 2026…");
    controller.current = new AbortController();
    try {
      const result = await onSynchronize(setProgress, controller.current.signal);
      const collected = new Date(result.collectedAt).toLocaleString("pt-BR");
      setMessage(`${result.clubs} clubes e ${result.players} jogadores sincronizados no catálogo. Coleta: ${collected}. Disponível ao voltar ao menu inicial para novas carreiras. ${result.cloudPending ? "Salvo neste dispositivo; sincronização com a nuvem pendente." : "Salvo neste dispositivo e na nuvem."}`);
    } catch (error) {
      setFailed(true);
      setMessage(controller.current?.signal.aborted ? "Coleta pausada. Clique em Rodar para retomar. Seu catálogo não foi alterado." : error instanceof Error ? error.message : "Não foi possível sincronizar. Tente novamente.");
    } finally { running.current = false; setBusy(false); }
  }
  return <section aria-labelledby="transfermarkt-settings-title" aria-busy={busy} className="rounded-2xl border border-[#dfe9e1] bg-white p-6">
    <h2 id="transfermarkt-settings-title" className="text-lg font-black">Transfermarkt</h2>
    <p className="mt-1 text-sm text-[#718477]">Importe da API online os 156 clubes profissionais das Séries A, B, C e D de 2026 e seus elencos completos. Clubes ausentes serão criados.</p>
    <p className="mt-2 text-xs text-[#718477]">Coleta ao vivo em etapas: mantenha esta tela aberta. O progresso é salvo neste dispositivo para retomar em caso de falha. Clubes com dados incompletos ficam para revisão no final, sem parar os demais. Você confirma a aplicação após a validação completa. A carreira atual, cores e uniformes existentes são preservados. Força, salários e valores em reais são estimativas do jogo, não dados oficiais.</p>
    <button type="button" disabled={busy} onClick={() => { void synchronize(); }} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#246e43] px-4 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 17.9 17" /></svg>
      {busy ? "Coletando Transfermarkt…" : "Rodar importação — Séries A/B/C/D"}
    </button>
    {busy && <><p role="status" className="mt-3 text-sm">{progress}</p><button type="button" className="mt-2 text-sm underline" onClick={() => controller.current?.abort()}>Pausar coleta</button></>}
    {message && <p role={failed ? "alert" : "status"} className={`mt-3 whitespace-pre-wrap break-words text-sm ${failed ? "text-[#a33333]" : "text-[#246e43]"}`}>{message}</p>}
  </section>;
}
