"use client";

import { useRef, useState } from "react";

export type TransfermarktSyncResult = { clubs: number; players: number; collectedAt: string; cloudPending: boolean };

export function TransfermarktSettings({ onSynchronize }: { onSynchronize: () => Promise<TransfermarktSyncResult> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const running = useRef(false);
  async function synchronize() {
    if (running.current) return;
    running.current = true;
    setBusy(true); setFailed(false); setMessage("");
    try {
      const result = await onSynchronize();
      const collected = new Date(result.collectedAt).toLocaleString("pt-BR");
      setMessage(`${result.clubs} clubes e ${result.players} jogadores sincronizados no catálogo. Coleta: ${collected}. Disponível ao voltar ao menu inicial para novas carreiras. ${result.cloudPending ? "Salvo neste dispositivo; sincronização com a nuvem pendente." : "Salvo neste dispositivo e na nuvem."}`);
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Não foi possível sincronizar. Tente novamente.");
    } finally { running.current = false; setBusy(false); }
  }
  return <section aria-labelledby="transfermarkt-settings-title" aria-busy={busy} className="rounded-2xl border border-[#dfe9e1] bg-white p-6">
    <h2 id="transfermarkt-settings-title" className="text-lg font-black">Transfermarkt</h2>
    <p className="mt-1 text-sm text-[#718477]">Atualize o catálogo de times e jogadores usando a última coleta aprovada e publicada. A coleta percorre os clubes da competição selecionada, cria os que faltam e importa os elencos completos.</p>
    <p className="mt-2 text-xs text-[#718477]">A sincronização não faz uma consulta ao vivo ao site e não altera a carreira em andamento. Os novos dados serão usados nas novas carreiras. Cores e uniformes dos clubes existentes são preservados.</p>
    <button type="button" disabled={busy} onClick={() => { void synchronize(); }} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#246e43] px-4 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 17.9 17" /></svg>
      {busy ? "Sincronizando Transfermarkt…" : "Sincronizar Transfermarkt"}
    </button>
    {busy && <p role="status" className="mt-3 text-sm">Verificando a coleta e salvando o catálogo…</p>}
    {message && <p role={failed ? "alert" : "status"} className={`mt-3 text-sm ${failed ? "text-[#a33333]" : "text-[#246e43]"}`}>{message}</p>}
  </section>;
}
