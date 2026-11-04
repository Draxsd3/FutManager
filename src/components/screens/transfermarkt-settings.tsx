"use client";

import { TransfermarktCorrections } from "./transfermarkt-corrections";
import { useEffect, useRef, useState } from "react";

export type TransfermarktSyncResult = { clubs: number; players: number; collectedAt: string; cloudPending: boolean };

export function TransfermarktSettings({ onSynchronize, userId }: { userId?: string; onSynchronize: (progress: (message: string) => void, signal: AbortSignal, resume?: boolean) => Promise<TransfermarktSyncResult> }) {
  const [correctionsOpen, setCorrectionsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const running = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState("");
  useEffect(() => () => controller.current?.abort(), []);
  async function synchronize(resume = false) {
    if (running.current) return;
    running.current = true;
    setBusy(true); setFailed(false); setMessage(""); setProgress("Iniciando coleta das Séries A/B/C/D de 2026…");
    controller.current = new AbortController();
    try {
      const result = await onSynchronize(setProgress, controller.current.signal, resume);
      const collected = new Date(result.collectedAt).toLocaleString("pt-BR");
      setMessage(`${result.clubs} clubes e ${result.players} jogadores sincronizados no catálogo. Coleta: ${collected}. Disponível ao voltar ao menu inicial para novas carreiras. ${result.cloudPending ? "Salvo neste dispositivo; sincronização com a nuvem pendente." : "Salvo neste dispositivo e na nuvem."}`);
    } catch (error) {
      setFailed(true);
      setMessage(controller.current?.signal.aborted ? "Coleta pausada. Use Retomar coleta para continuar. Seu catálogo não foi alterado." : error instanceof Error ? error.message : "Não foi possível sincronizar. Tente novamente.");
    } finally { running.current = false; setBusy(false); }
  }
  return <section aria-labelledby="transfermarkt-settings-title" aria-busy={busy} className="rounded-2xl border border-[#dfe9e1] bg-white p-6">
    <h2 id="transfermarkt-settings-title" className="text-lg font-black">Transfermarkt</h2>
    <p className="mt-1 text-sm text-[#718477]">Rodar inicia uma nova atualização completa na API: participantes, clubes, elencos, empréstimos e galerias de títulos. Novos campos da integração fazem parte dessa mesma coleta. O arquivo antigo não substitui consultas novas.</p>
    <p className="mt-2 text-xs text-[#718477]">A consulta de milhares de jogadores pode levar horas. Mantenha esta tela aberta; use Pausar e depois Retomar coleta para continuar o mesmo trabalho, sem reiniciar. Rodar novamente descarta o staging e consulta tudo de novo. Pendências ficam para revisão no fim; correções manuais salvas são reaplicadas e identificadas. Confirmação antes de aplicar, preservando carreiras atuais e uniformes personalizados. Títulos históricos da fonte não são títulos conquistados no jogo. Empréstimos usam a abertura em 22/01/2026; sem data explícita de devolução não se inventa prazo. Valores BRL, força e salários são estimativas do jogo.</p>
    <a href="/api/transfermarkt/seed?report=1" target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs text-[#246e43] underline">Ver relatório de pendências do arquivo</a>
    <button type="button" disabled={busy} onClick={() => { void synchronize(); }} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#246e43] px-4 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 17.9 17" /></svg>
      {busy ? "Coletando Transfermarkt…" : "Rodar importação — Séries A/B/C/D"}
    </button>
    <button type="button" disabled={busy} onClick={() => { void synchronize(true); }} className="ml-3 mt-4 rounded-lg border border-[#246e43] px-4 py-2 text-xs font-bold text-[#246e43] disabled:opacity-60">Retomar coleta</button>
    {userId && <button type="button" disabled={busy} onClick={() => setCorrectionsOpen(true)} className="ml-3 mt-4 rounded-lg border border-[#246e43] px-4 py-2 text-xs font-bold text-[#246e43] disabled:opacity-60">Corrigir pendências</button>}
    {correctionsOpen && userId && <TransfermarktCorrections userId={userId} onClose={() => setCorrectionsOpen(false)} />}
    {busy && <><p role="status" className="mt-3 text-sm">{progress}</p><button type="button" className="mt-2 text-sm underline" onClick={() => controller.current?.abort()}>Pausar coleta</button></>}
    {message && <p role={failed ? "alert" : "status"} className={`mt-3 whitespace-pre-wrap break-words text-sm ${failed ? "text-[#a33333]" : "text-[#246e43]"}`}>{message}</p>}
  </section>;
}
