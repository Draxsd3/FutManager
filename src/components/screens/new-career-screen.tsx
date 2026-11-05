"use client";

import type { CSSProperties } from "react";
import type { EditorClub } from "@/lib/game/editor-data";
import { divisionKeys, type DivisionKey } from "@/lib/game/mock-data";
import { GameLogo } from "@/components/ui/game-logo";
import { Crest } from "@/components/ui/club-sidebar";
import { clubThemeStyle } from "@/components/ui/app-shell";
import styles from "./new-career-screen.module.css";

export function NewCareerScreen({ coach, setCoach, division, setDivision, club, setClub, onStart, onBack, availableClubs }: {
  coach: string;
  setCoach: (value: string) => void;
  division: DivisionKey;
  setDivision: (value: DivisionKey) => void;
  club: string;
  setClub: (value: string) => void;
  onStart: () => void;
  onBack: () => void;
  availableClubs: EditorClub[];
}) {
  const divisionClubs = availableClubs.filter((item) => item.division === division);
  const selectedClub = availableClubs.find((item) => item.name === club);
  const clubColor = selectedClub?.primaryColor ?? "#d4ad64";
  const style = {
    ...(selectedClub ? clubThemeStyle(selectedClub.name, selectedClub) : { "--team-accent": "#d4ad64", "--team-accent-text": "#15161b" }),
    "--club-color": clubColor,
  } as CSSProperties & Record<`--${string}`, string>;
  return <main className={styles.screen} style={style}>
    <header className={styles.topbar}>
      <div className={styles.brand}><GameLogo /> FUTMANAGER <i>·</i> NOVA CARREIRA</div>
      <button type="button" onClick={onBack}>← <span>Voltar ao início</span></button>
    </header>
    <div className={styles.layout}>
      <section className={styles.formPanel} aria-labelledby="career-title">
        <div className={styles.step}><span>01</span><i /> VOCÊ COMEÇA NO BANCO</div>
        <h1 id="career-title">Todo clube<br/>começa com <em>uma decisão.</em></h1>
        <p className={styles.intro}>Escolha onde sua história vai acontecer. O resto se decide em campo.</p>
        <div className={styles.fields}>
          <Field label="País"><input value="Brasil" disabled readOnly /></Field>
          <label className={styles.field}><span>Divisão</span><select value={division} onChange={(event) => { const next = event.target.value as DivisionKey; setDivision(next); setClub(availableClubs.find((item) => item.division === next)?.name ?? ""); }}>
            {divisionKeys.map((item) => <option key={item}>{item}</option>)}
          </select></label>
          <label className={styles.field}><span>Seu clube</span><select value={club} onChange={(event) => setClub(event.target.value)}>
            {divisionClubs.map((item) => <option key={item.id}>{item.name}</option>)}
          </select></label>
          <label className={`${styles.field} ${styles.coachField}`}><span>Nome do técnico</span><input value={coach} onChange={(event) => setCoach(event.target.value)} placeholder="Seu nome" autoComplete="name" /></label>
        </div>
        <div className={styles.formFooter}>
          <span>Você poderá mudar a tática a qualquer momento.</span>
          <button type="button" className={styles.start} disabled={!coach.trim() || !selectedClub} onClick={onStart}>Iniciar jogo <b aria-hidden="true">↗</b></button>
        </div>
      </section>
      <aside className={styles.clubCard} aria-label="Clube selecionado">
        <div className={styles.cardGrid} aria-hidden="true" />
        <div className={styles.cardTop}><span>O SEU VESTIÁRIO</span><span>BR · 2026</span></div>
        {selectedClub ? <>
          <div className={styles.crestStage}><span className={styles.orbit} /><Crest club={selectedClub.name} /><span className={styles.cardIndex}>FM / {String(availableClubs.indexOf(selectedClub) + 1).padStart(3, "0")}</span></div>
          <div className={styles.clubIdentity}><p>{selectedClub.state ?? "BRASIL"} <span>·</span> {selectedClub.division}</p><h2>{selectedClub.name}</h2><span className={styles.clubCoach}>{selectedClub.coachName ? `Comando atual · ${selectedClub.coachName}` : "Um escudo. Uma cidade. Uma história."}</span></div>
          <div className={styles.stadiumInfo}><div><span>CASA</span><b>{selectedClub.stadiumName}</b></div><div><span>CAPACIDADE</span><b>{selectedClub.stadiumCapacity.toLocaleString("pt-BR")}</b></div></div>
          <div className={styles.cardBottom}><span>PREPARE-SE PARA O APITO</span><span className={styles.clubStripe} /></div>
        </> : <p className={styles.noClub}>Nenhum clube disponível nesta divisão.</p>}
      </aside>
    </div>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>;
}
