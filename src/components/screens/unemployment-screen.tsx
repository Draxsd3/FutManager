"use client";
import { useState } from "react";
import { ManagerJobs, type ManagerJobsProps } from "./manager-jobs";
import styles from "./agenda-screen.module.css";
export function UnemploymentScreen({coach,jobs,onAdvance}:{coach:string;jobs:ManagerJobsProps;onAdvance:()=>Promise<string|undefined>}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  return <main className={styles.schedule} aria-label="Treinador sem clube"><div className={styles.sectionHeader}><h2>{coach} · Sem clube</h2><button disabled={busy} onClick={async()=>{setBusy(true);try {setMessage(await onAdvance() ?? "Uma semana simulada. Confira as vagas e propostas.");}catch{setMessage("Não foi possível avançar; o save anterior foi preservado.");}finally{setBusy(false);}}}>{busy ? "Avançando…" : "Avançar uma semana"}</button></div><p className={styles.tableFoot}>Seu vínculo terminou. A carreira continua: procure um clube ou avance o calendário. Você não controla mais o elenco, as finanças ou as partidas do antigo clube.</p>{message && <p role="status">{message}</p>}<ManagerJobs {...jobs}/></main>;
}
