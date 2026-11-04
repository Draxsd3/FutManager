"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CareerWindow } from "@/components/ui/career-workspace";
import { readTransfermarktCorrections, saveTransfermarktCorrections } from "@/lib/importer/database-cache";
import { correctionPositions, fetchCorrectedSeed, manualCorrectionSchema, type ManualCorrection } from "@/lib/importer/transfermarkt-corrections";

const positionNames = ["Goleiro", "Zagueiro", "Lateral esquerdo", "Lateral direito", "Volante", "Meia central", "Meia ofensivo", "Meia esquerdo", "Meia direito", "Ponta esquerda", "Ponta direita", "Segundo atacante", "Centroavante"];
type Preview = Awaited<ReturnType<typeof fetchCorrectedSeed>>;
export function TransfermarktCorrections({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [corrections, setCorrections] = useState<ManualCorrection[]>([]);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await readTransfermarktCorrections(userId);
        const result = await fetchCorrectedSeed(stored);
        if (active) { setCorrections(stored); setPreview(result); setSelected(result.reviewPlayers[0]?.playerId ?? ""); }
      } catch { if (active) setError("Não foi possível abrir as pendências. Feche e tente novamente."); }
      finally { if (active) setBusy(false); }
    })();
    return () => { active = false; };
  }, [userId]);
  const player = preview?.reviewPlayers.find(player => player.playerId === selected);
  const previous = corrections.find(item => item.playerId === selected && item.clubId === player?.clubId);
  async function persist(next: ManualCorrection[]) {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await fetchCorrectedSeed(next);
      await saveTransfermarktCorrections(userId, next);
      setCorrections(next); setPreview(result);
      setMessage(`Correções salvas neste dispositivo, nesta conta. ${result.report.validClubs}/156 clubes válidos; ${result.report.pendingClubs} pendentes. Feche e clique em Rodar para revalidar e continuar. A carreira e o arquivo original não foram alterados.`);
    } catch (error) { setError(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!player || busy) return;
    const values = new FormData(event.currentTarget);
    const draft: Record<string, unknown> = { clubId: player.clubId, playerId: player.playerId, correctedAt: new Date().toISOString() };
    for (const [key, value] of values) if (String(value).trim()) draft[key] = ["age", "shirtNumber"].includes(key) ? Number(value) : value;
    const parsed = manualCorrectionSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join(" ")); return; }
    void persist([...corrections.filter(item => !(item.playerId === player.playerId && item.clubId === player.clubId)), parsed.data]);
  }
  return <CareerWindow title="Corrigir pendências Transfermarkt" onClose={onClose} style={{}} classicContent={false}>
    <div className="h-full overflow-auto bg-[#f1f5f2] p-5 text-[#263a2c]">
      <p className="text-sm">Informe somente os campos que deseja corrigir. Campos vazios mantêm a fonte original. Correções são manuais, por conta e salvas apenas neste dispositivo; não são dados oficiais da API.</p>
      {preview && <p className="my-2 text-sm font-bold">{preview.report.validClubs}/156 clubes válidos · {preview.report.pendingClubs} clubes pendentes · {preview.report.playerIssues.length} jogadores com pendências</p>}
      {error && <p role="alert" className="my-3 text-sm text-[#a33333]">{error}</p>}
      {message && <p role="status" className="my-3 text-sm text-[#246e43]">{message}</p>}
      {busy && <p role="status">Validando correções…</p>}
      {preview && <div className="mt-4 grid gap-4 md:grid-cols-[minmax(200px,1fr)_2fr]">
        <div><label className="block text-sm font-bold">Buscar jogador ou clube<input value={query} onChange={e => setQuery(e.target.value)} className="my-2 w-full rounded border bg-white p-2 font-normal" /></label>
          <div className="max-h-80 overflow-auto rounded border bg-white">{preview.reviewPlayers.filter(p => `${p.playerName} ${p.clubName}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).map(p => <button key={`${p.clubId}:${p.playerId}`} type="button" disabled={busy} aria-pressed={selected === p.playerId} onClick={() => { setSelected(p.playerId); setError(""); setMessage(""); }} className={`block w-full border-b p-3 text-left text-xs ${selected === p.playerId ? "bg-[#dfe9e1]" : ""}`}><strong>{p.playerName}</strong><span className="block">{p.clubName}</span>{corrections.some(item => item.playerId === p.playerId && item.clubId === p.clubId) && <span className="block text-[#246e43]">Correção manual salva</span>}</button>)}</div>
        </div>
        {player && <form key={`${player.playerId}:${previous?.correctedAt ?? "original"}`} onSubmit={submit} className="rounded border bg-white p-4">
          <h3 className="font-black">{player.playerName} — {player.clubName}</h3><p className="mt-1 text-xs">ID {player.playerId} · {player.message}</p>
          <p className="my-2 text-xs">Na fonte: nascimento {player.dateOfBirth ?? "não informado"}; posição {player.position ?? "não informada"}. Não adicione jogadores fictícios para completar elencos.</p>
          <fieldset disabled={busy} className="grid gap-3 text-sm sm:grid-cols-2">
            <label>Nascimento<input aria-label="Nascimento" name="dateOfBirth" type="date" defaultValue={previous?.dateOfBirth ?? ""} className="block w-full rounded border p-2" /></label>
            <label>Idade (somente sem nascimento)<input name="age" type="number" min={14} max={65} defaultValue={previous?.age ?? ""} className="block w-full rounded border p-2" /></label>
            <label>Posição<select name="position" defaultValue={previous?.position ?? ""} className="block w-full rounded border p-2"><option value="">Manter fonte / não informado</option>{correctionPositions.map((position, index) => <option key={position} value={position}>{positionNames[index]}</option>)}</select></label>
            <label>Camisa<input name="shirtNumber" type="number" min={1} max={999} defaultValue={previous?.shirtNumber ?? ""} className="block w-full rounded border p-2" /></label>
            <label>Pé<select name="foot" defaultValue={previous?.foot ?? ""} className="block w-full rounded border p-2"><option value="">Manter fonte / não informado</option><option value="left">Esquerdo</option><option value="right">Direito</option><option value="both">Ambidestro</option></select></label>
            <label>Fim do contrato<input name="contract" type="date" defaultValue={previous?.contract ?? ""} className="block w-full rounded border p-2" /></label>
          </fieldset>
          <button disabled={busy} type="submit" className="mt-4 rounded bg-[#246e43] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">Salvar correção</button>
          {previous && <button disabled={busy} type="button" onClick={() => { void persist(corrections.filter(item => !(item.playerId === player.playerId && item.clubId === player.clubId))); }} className="ml-3 text-sm underline">Remover correção manual</button>}
        </form>}
      </div>}
      {preview && <details className="mt-4 text-sm"><summary>Outras pendências de clubes e elencos</summary><ul className="mt-2 space-y-2">{preview.checkpoint.issues?.map(issue => <li key={issue.clubId} className="whitespace-pre-wrap break-words"><strong>{issue.clubName}:</strong> {issue.message}</li>)}</ul></details>}
    </div>
  </CareerWindow>;
}
