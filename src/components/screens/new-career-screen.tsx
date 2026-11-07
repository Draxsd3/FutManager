"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
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
          <ClubSelector key={division} clubs={divisionClubs} value={club} onChange={setClub} />
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

function ClubSelector({ clubs, value, onChange }: { clubs: EditorClub[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [above, setAbove] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const labelId = `${listId}-label`;
  const selectedIndex = Math.max(0, clubs.findIndex((item) => item.name === value));

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-option-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, listId]);

  const show = (index = selectedIndex) => {
    const bounds = trigger.current?.getBoundingClientRect();
    setAbove(Boolean(bounds && window.innerHeight - bounds.bottom < 280 && bounds.top > window.innerHeight - bounds.bottom));
    setActive(index); setOpen(true);
  };
  const choose = (index: number) => {
    const item = clubs[index];
    if (!item) return;
    onChange(item.name);
    setOpen(false);
    trigger.current?.focus();
  };
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) show();
      else setActive((current) => Math.max(0, Math.min(clubs.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
    } else if (open && (event.key === "Home" || event.key === "End")) {
      event.preventDefault(); setActive(event.key === "Home" ? 0 : clubs.length - 1);
    } else if (open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault(); choose(active);
    }
  };

  return <div className={`${styles.field} ${styles.clubField}`} ref={root}>
    <span id={labelId}>Seu clube</span>
    <button ref={trigger} type="button" className={styles.clubTrigger} role="combobox" aria-labelledby={`${labelId} ${listId}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open ? `${listId}-option-${active}` : undefined} disabled={!clubs.length} onKeyDown={handleKey} onClick={() => open ? setOpen(false) : show()}>
      {value && <span className={styles.selectorCrest} aria-hidden="true"><Crest club={value} size="sm" /></span>}
      <span id={`${listId}-value`} className={styles.clubName}>{value || "Nenhum clube disponível"}</span><span className={styles.chevron} aria-hidden="true">⌄</span>
    </button>
    {open && <div id={listId} role="listbox" aria-labelledby={labelId} className={`${styles.clubList} ${above ? styles.clubListAbove : ""}`}>
      {clubs.map((item, index) => <div id={`${listId}-option-${index}`} key={item.id} role="option" aria-selected={item.name === value} className={`${styles.clubOption} ${active === index ? styles.clubOptionActive : ""}`} onMouseMove={() => setActive(index)} onClick={() => choose(index)}>
        <span className={styles.selectorCrest} aria-hidden="true"><Crest club={item.name} size="sm" /></span><span>{item.name}</span>
      </div>)}
    </div>}
  </div>;
}
