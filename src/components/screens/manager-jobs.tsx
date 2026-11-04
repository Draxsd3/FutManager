"use client";

import { useState } from "react";
import { availableManagerJobs, type ManagerAppointment } from "@/lib/game/manager-jobs";
import { refreshJobOffers } from "@/lib/game/manager-jobs";
import type { ManagerMarket } from "@/lib/game/manager-market";
import type { EditorDatabase } from "@/lib/game/editor-data";
import { formatCalendarDate } from "@/lib/game/brazilian-calendar";
import styles from "./agenda-screen.module.css";

export type ManagerJobsProps = {
  market: ManagerMarket; database: EditorDatabase; currentClubId: string; date: string;
  appointments?: ManagerAppointment[];
  onApply: (clubId: string) => string | undefined;
  onDecline: (applicationId: string) => void;
  onAccept: (applicationId: string) => Promise<string | undefined>;
};
const statusNames = { offered: "Proposta recebida", rejected: "Candidatura recusada", declined: "Proposta recusada", accepted: "Contratação confirmada", expired: "Proposta expirada", cancelled: "Proposta encerrada" };

export function ManagerJobs({ market, database, currentClubId, date, appointments = [], onApply, onDecline, onAccept }: ManagerJobsProps) {
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const current = refreshJobOffers(market, date);
  const vacancies = availableManagerJobs(database, current, currentClubId);
  const applications = current.applications ?? [];
  const clubName = (id: string) => database.clubs.find(club => club.id === id)?.name ?? "Clube não disponível";
  const offer = applications.find(application => application.id === confirmation && application.status === "offered");
  return <section className={styles.schedule} aria-labelledby="jobs-title">
    <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>CARREIRA DO TREINADOR</p><h2 id="jobs-title">Central de empregos</h2></div><span className={styles.pill}>{vacancies.length} vaga(s)</span></div>
    <p className={styles.tableFoot}>Vagas da simulação da sua carreira, não ofertas reais. A diretoria avalia o nível do clube e sua experiência; propostas ficam válidas por sete dias. Candidatar-se não encerra seu vínculo atual.</p>
    {message && <p role="status" className={styles.tableFoot}>{message}</p>}
    {offer && <div className={styles.jobConfirmation} role="group" aria-label="Confirmar mudança de clube"><strong>Assumir o {clubName(offer.clubId)}?</strong><p>Você deixará o clube atual. O elenco e o orçamento serão os do novo clube; sua trajetória continuará nesta mesma carreira.</p><div className={styles.jobActions}><button disabled={busy} onClick={async () => { setBusy(true); try { const error = await onAccept(offer.id); if (error) setMessage(error); else setConfirmation(null); } catch { setMessage("Não foi possível concluir a mudança. Tente novamente."); } finally { setBusy(false); } }}>{busy ? "Confirmando…" : "Confirmar mudança de clube"}</button><button disabled={busy} onClick={() => setConfirmation(null)}>Cancelar mudança</button></div></div>}
    <div className={styles.tableWrap} role="region" aria-label="Vagas de treinador" tabIndex={0}><table><caption className={styles.srOnly}>Vagas de treinador disponíveis</caption><thead><tr><th>Clube</th><th>Divisão</th><th>Orçamento do clube</th><th>Candidatura</th></tr></thead><tbody>{vacancies.length ? vacancies.map(club => {
      const applied = applications.some(application => application.clubId === club.id && application.vacancyVersion === (current.clubs[club.id].vacancyVersion ?? 0));
      return <tr key={club.id}><td><strong>{club.name}</strong><small>{club.state ?? "Estado não informado"}</small></td><td>{club.division}</td><td>{(current.clubs[club.id].budget * 1000).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</td><td><button className={styles.textButton} disabled={applied || busy} onClick={() => { setMessage(onApply(club.id) ?? "Candidatura analisada. Confira a resposta da diretoria abaixo."); }}>{applied ? "Candidatura enviada" : `Candidatar-se ao ${club.name}`}</button></td></tr>;
    }) : <tr><td colSpan={4} className={styles.emptyRow}>Nenhuma vaga aberta neste momento. Novas vagas podem surgir com as demissões dos técnicos na simulação das partidas.</td></tr>}</tbody></table></div>
    <div className={styles.sectionHeader}><h2>Suas candidaturas e propostas</h2></div>
    <div className={styles.tableWrap}><table><caption className={styles.srOnly}>Histórico de candidaturas</caption><thead><tr><th>Clube</th><th>Data</th><th>Resposta da diretoria</th><th>Ações</th></tr></thead><tbody>{applications.length ? applications.map(application => <tr key={application.id}><td><strong>{clubName(application.clubId)}</strong></td><td>{formatCalendarDate(application.appliedOn)}{application.status === "offered" && <small>Válida até {formatCalendarDate(application.expiresOn)}</small>}</td><td><strong>{statusNames[application.status]}</strong><small>{application.message}</small></td><td>{application.status === "offered" && <div className={styles.jobActions}><button className={styles.textButton} disabled={busy} onClick={() => { setMessage(""); setConfirmation(application.id); }}>Aceitar proposta do {clubName(application.clubId)}</button><button className={styles.textButton} disabled={busy} onClick={() => { onDecline(application.id); setConfirmation(null); }}>Recusar proposta do {clubName(application.clubId)}</button></div>}</td></tr>) : <tr><td colSpan={4} className={styles.emptyRow}>Você ainda não enviou candidaturas.</td></tr>}</tbody></table></div>
    {appointments.length > 0 && <div className={styles.tableFoot}><strong>Sua trajetória</strong><ul>{appointments.map((appointment, index) => <li key={`${appointment.clubId}:${index}`}>{appointment.club} · {/^\d{4}-\d{2}-\d{2}$/.test(appointment.startedOn) ? formatCalendarDate(appointment.startedOn) : appointment.startedOn} — {appointment.endedOn ? formatCalendarDate(appointment.endedOn) : "Atual"}</li>)}</ul></div>}
  </section>;
}
