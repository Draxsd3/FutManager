"use client";

import Image from "next/image";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { Crest } from "@/components/ui/club-sidebar";
import styles from "./settings-screen.module.css";

type Speed = 1 | 2 | 4;
export function SettingsScreen({ club, coach, speed, onSpeedChange, onMenu, onBackToClub }: { club: string; coach: string; speed: Speed; onSpeedChange: (speed: Speed) => void; onMenu: () => void; onBackToClub: () => void }) {
  return <section className={styles.screen} data-management-surface="settings">
    <aside className={styles.sidebar}>
      <div className={styles.identity}><Crest club={club} size="sm" /><div><small>SUA CARREIRA</small><strong>{club}</strong><span>{coach}</span></div></div>
      <div className={styles.selected}><InterfaceIcon name="tactics" />Preferências de jogo<span>01</span></div>
      <p>Do seu jeito.<br /><strong>Dentro de campo.</strong></p>
      <div className={styles.sidebarBottom}><InterfaceIcon name="shield" /><span>Universo independente<small>Seu progresso, suas decisões.</small></span></div>
    </aside>
    <div className={styles.content}>
      <header className={styles.intro}><span>PREFERÊNCIAS / CARREIRA</span><p>Ajuste o ritmo. Comande o jogo.</p><small>As preferências abaixo são salvas apenas nesta carreira.</small></header>
      <section className={styles.match} aria-labelledby="match-preferences">
        <div className={styles.sectionHeading}><span className={styles.icon}><Image src="/football-icons/digital-stopwatch.svg" alt="" width={42} height={42} /></span><div><small>NO SEU RITMO</small><h2 id="match-preferences">Partida</h2></div><span className={styles.tag}>AO VIVO</span></div>
        <div className={styles.speedHeading}><h3>Velocidade padrão para novas partidas</h3><span>{speed}×</span></div>
        <p>Escolha como acompanhar os 90 minutos. Você também pode mudar a velocidade durante cada jogo.</p>
        <div className={styles.speeds} role="group" aria-label="Velocidade padrão para novas partidas">{([1, 2, 4] as const).map((value) => <button type="button" key={value} aria-label={`${value}× ${value === 1 ? "Ritmo real" : value === 2 ? "Dinâmico" : "Acelerado"}`} aria-pressed={speed === value} onClick={() => onSpeedChange(value)}><InterfaceIcon name={value === 1 ? "sport_soccer" : value === 2 ? "activity" : "arrow_right"} size={24} /><strong>{value}×</strong><span>{value === 1 ? "Ritmo real" : value === 2 ? "Dinâmico" : "Acelerado"}</span><small>{value === 1 ? "Cada lance importa" : value === 2 ? "O equilíbrio ideal" : "Direto ao resultado"}</small><i aria-hidden="true">{speed === value ? "✓" : ""}</i></button>)}</div>
        <div className={styles.saved} role="status"><InterfaceIcon name="accept_button" size={15} />Preferência incluída no salvamento automático da carreira</div>
      </section>
      <div className={styles.notice}><InterfaceIcon name="shield" size={25} /><div><h2>Sua carreira tem seu próprio universo</h2><p>Alterações de equipes e elencos no Editor de Universo valem para novas carreiras. Este progresso permanece independente, exceto por correções estruturais de compatibilidade.</p><small>Importações e consultas de dados são feitas somente no Editor de Universo, pelo menu inicial.</small></div></div>
      <footer className={styles.footer}><div><InterfaceIcon name="clock_history_frame" /><span><strong>Hora de sair do vestiário?</strong><small>A carreira é salva antes de voltar ao menu inicial.</small></span></div><div className={styles.actions}><button onClick={onBackToClub}><InterfaceIcon name="tactics" size={17} />Continuar no clube</button><button onClick={onMenu}><InterfaceIcon name="door_out" size={17} />Voltar ao menu inicial</button></div></footer>
    </div>
  </section>;
}
