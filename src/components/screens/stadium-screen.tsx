"use client";

import { useState } from "react";
import type { EditorClub } from "@/lib/game/editor-data";
import { EXPANSIONS, finishConstruction, newStadium, projectStadiumGate, stadiumCapacity, type StadiumSector, type StadiumState } from "@/lib/game/stadium";
import { Crest } from "@/components/ui/club-sidebar";
import styles from "./stadium-screen.module.css";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
const number = (value: number) => value.toLocaleString("pt-BR");
const formatDate = (value: string) => value.split("-").reverse().join("/");

type Props = {
  club?: EditorClub;
  budget: number;
  payroll: number;
  onBack: () => void;
  onAgenda?: () => void;
  date?: string;
  stadium?: StadiumState;
  onPriceChange?: (sector: StadiumSector, price: number) => void;
  onExpand?: (seats: number) => string | undefined;
};

export function StadiumScreen({ club, budget, onBack, onAgenda, date = "2026-01-22", stadium = newStadium(), onPriceChange, onExpand }: Props) {
  const [error, setError] = useState("");
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const state = finishConstruction(stadium, date);
  const capacity = stadiumCapacity(club?.stadiumCapacity ?? 0, state, date);
  const gate = projectStadiumGate(capacity, state.prices);
  const last = state.receipts.at(-1);
  const total = state.receipts.reduce((sum, receipt) => sum + receipt.net, 0);
  const name = club?.stadiumName || "Estádio não cadastrado";
  return <section className={styles.screen} aria-labelledby="stadium-title">
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.identity}>{club && <Crest club={club.name} size="sm" />}<div><span className={styles.eyebrow}>GESTÃO DO ESTÁDIO · {club?.name ?? "CLUBE"}</span><h1 id="stadium-title">{name}</h1></div></div>
        <div className={styles.actions}>{onAgenda && <button type="button" onClick={onAgenda}>Agenda</button>}<button type="button" onClick={onBack}>Voltar</button></div>
      </header>
      <div className={styles.summary}>
        <div><span>CAPACIDADE ATUAL</span><strong>{number(capacity)} <small>lugares</small></strong></div>
        <div><span>CAIXA DO CLUBE</span><strong>{money(budget * 1000)}</strong></div>
        <div><span>RECEITA LÍQUIDA ACUMULADA</span><strong>{money(total)}</strong></div>
        <div><span>ÚLTIMA BILHETERIA</span><strong>{last ? money(last.net) : "Sem jogos em casa"}</strong>{last && <small>{formatDate(last.date)} · vs. {last.opponent}</small>}</div>
      </div>
      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby="prices-title">
          <div className={styles.panelHeader}><div><span className={styles.eyebrow}>DIA DE JOGO</span><h2 id="prices-title">Ingressos por setor</h2></div><span className={styles.tag}>70% de ocupação</span></div>
          <p className={styles.description}>Preços em reais. O público é simulado com ocupação fixa de 70% em cada setor.</p>
          <div className={styles.sectorTable}>
            <div className={styles.tableHead}><span>SETOR</span><span>LUGARES</span><span>INGRESSO (R$)</span><span>BRUTO EST.</span></div>
            {gate.sectors.map(sector => <div className={styles.sector} key={sector.id}>
              <strong>{sector.name}<small>{sector.share}% da capacidade</small></strong><span>{number(sector.capacity)}</span>
              <PriceInput key={`${sector.id}:${state.prices[sector.id]}`} label={sector.name} price={state.prices[sector.id]} disabled={!onPriceChange} onCommit={price => onPriceChange?.(sector.id, price)} />
              <b>{money(sector.gross)}</b>
            </div>)}
          </div>
          <div className={styles.gateSummary}><div><span>Público estimado</span><strong>{number(gate.audience)}</strong></div><div><span>Bruto estimado</span><strong>{money(gate.gross)}</strong></div><div><span>Operação (10%)</span><strong>− {money(gate.costs)}</strong></div><div><span>Líquido estimado</span><strong>{money(gate.net)}</strong></div></div>
          <p className={styles.note}>Ao concluir um jogo em casa, a bilheteria líquida é creditada no caixa. Valores e custos são uma simulação; jogos fora não geram receita para o clube.</p>
        </section>
        <section className={styles.panel} aria-labelledby="works-title">
          <div className={styles.panelHeader}><div><span className={styles.eyebrow}>INFRAESTRUTURA</span><h2 id="works-title">Ampliação do estádio</h2></div><span className={styles.tag}>{state.construction ? "EM OBRAS" : "DISPONÍVEL"}</span></div>
          {state.construction ? <div className={styles.progress}><strong>+ {number(state.construction.seats)} lugares em construção</strong><span>Início {formatDate(state.construction.startedOn)} · conclusão {formatDate(state.construction.endsOn)}</span><p>A capacidade aumenta ao atingir a data de conclusão na carreira.</p></div> : <p className={styles.description}>Escolha um projeto. O custo é debitado no início; a capacidade só aumenta após a conclusão.</p>}
          <div className={styles.projects}>{EXPANSIONS.map(project => <div className={styles.project} key={project.seats}><div><strong>+ {number(project.seats)} lugares</strong><span>{money(project.cost)} · {project.days} dias</span></div><button type="button" disabled={!club || !onExpand || !!state.construction || budget * 1000 < project.cost} onClick={() => { setSelectedProject(project.seats); setError(""); }}>Selecionar obra</button></div>)}</div>
          {selectedProject !== null && !state.construction && <div className={styles.confirm}>
            <span>Confirmar + {number(selectedProject)} lugares por {money(EXPANSIONS.find(item => item.seats === selectedProject)!.cost)}?</span>
            <button type="button" onClick={() => { const message = onExpand?.(selectedProject); setError(message ?? ""); if (!message) setSelectedProject(null); }}>Confirmar obra</button>
            <button type="button" onClick={() => setSelectedProject(null)}>Cancelar</button>
          </div>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <p className={styles.note}>A distribuição entre setores permanece proporcional. Uma obra por vez; sem redução de capacidade durante a construção.</p>
        </section>
      </div>
    </div>
  </section>;
}

function PriceInput({ label, price, disabled, onCommit }: { label: string; price: number; disabled: boolean; onCommit: (price: number) => void }) {
  const [draft, setDraft] = useState(String(price));
  const [invalid, setInvalid] = useState(false);
  function commit() {
    const value = Number(draft);
    if (!draft.trim() || !Number.isFinite(value) || value < 0 || value > 10000) { setInvalid(true); return; }
    setInvalid(false);
    onCommit(value);
  }
  return <label className={styles.price}><span className={styles.srOnly}>Ingresso {label} (R$)</span><input type="number" aria-label={`Ingresso ${label} (R$)`} aria-invalid={invalid} min="0" max="10000" step="0.01" value={draft} disabled={disabled} onChange={event => { setDraft(event.target.value); setInvalid(false); }} onBlur={commit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />{invalid && <small>Valor entre 0 e 10.000</small>}</label>;
}
