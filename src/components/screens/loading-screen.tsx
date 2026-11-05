import type { CSSProperties } from "react";
import { GameLogo } from "@/components/ui/game-logo";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import styles from "./loading-screen.module.css";

type LoadingPhase = "game" | "careers" | "career";
const phases = {
  game: { label: "Preparando o jogo", message: "Preparando seu lugar à beira do campo.", detail: "O futebol começa com uma boa preparação." },
  careers: { label: "Carregando suas carreiras...", message: "Seu próximo capítulo começa aqui.", detail: "Preparando os dados e os salvamentos da sua conta." },
  career: { label: "Carregando a carreira selecionada...", message: "De volta ao comando.", detail: "Restaurando o universo e o progresso desta carreira." },
};

/** Indeterminate by design: no timer or invented percentage hides the actual load state. */
export function LoadingScreen({ phase = "game" }: { phase?: LoadingPhase }) {
  const content = phases[phase];
  return <section className={styles.screen} aria-label="Carregamento do FutManager" data-loading-phase={phase}>
    <div className={styles.backdrop} aria-hidden="true" />
    <header className={styles.topbar}><div className={styles.brand}><GameLogo /><span>FUTMANAGER<small>SEU CLUBE. SUA HISTÓRIA.</small></span></div><span className={styles.edition}>EDIÇÃO BRASIL <b>2026</b></span></header>
    <div className={styles.stage}>
      <div className={styles.copy}><span className={styles.eyebrow}><i />O JOGO COMEÇA ANTES DO APITO</span><h1>Grandes histórias.<br /><span>Novos capítulos.</span></h1><p>{content.message}</p><div className={styles.rule} aria-hidden="true"><span />FM / BRASIL</div></div>
      <div className={styles.tactics} aria-hidden="true">
        <div className={styles.pitchLabel}><InterfaceIcon name="tactics" size={15} /><span>PREPARAÇÃO TÁTICA</span><b>4–3–3</b></div>
        <svg className={styles.pitch} viewBox="0 0 360 460" fill="none" focusable="false">
          <defs><pattern id="loading-pitch-stripes" width="360" height="80" patternUnits="userSpaceOnUse"><rect width="360" height="40" fill="white" fillOpacity=".025" /></pattern></defs>
          <rect x="16" y="16" width="328" height="428" rx="3" fill="url(#loading-pitch-stripes)" />
          <g stroke="currentColor" strokeWidth="1"><rect x="16" y="16" width="328" height="428" rx="3" /><path d="M16 230h328M100 16v68h160V16M140 16v26h80V16M100 444v-68h160v68M140 444v-26h80v26" /><circle cx="180" cy="230" r="45" /><circle cx="180" cy="230" r="2" fill="currentColor" /><path d="M148 84a38 38 0 0 0 64 0m-64 292a38 38 0 0 1 64 0" /></g>
          <g className={styles.passing} strokeDasharray="4 7" strokeWidth="1.2"><path d="m70 333 110-103 87 103M180 230l-85-72 170-76M180 230l85-72-85-76" /></g>
          {[[180, 409], [60, 333], [140, 349], [220, 349], [300, 333], [180, 254], [105, 197], [255, 197], [70, 112], [180, 82], [290, 112]].map(([x, y], index) => <g key={index} className={styles.player} style={{ "--player-delay": `${index * .14}s` } as CSSProperties}><circle cx={x} cy={y} r="16" className={styles.halo} /><circle cx={x} cy={y} r="11" className={styles.marker} /><text x={x} y={y + 3.5} textAnchor="middle">{[1, 6, 4, 3, 2, 5, 8, 10, 11, 9, 7][index]}</text></g>)}
        </svg><div className={styles.pitchFooter}><span>ONZE EM CAMPO.</span><span>UMA SÓ AMBIÇÃO.</span></div>
      </div>
    </div>
    <footer className={styles.bottom}>
      <div className={styles.statusRow}><div role="status" aria-live="polite" aria-atomic="true" className={styles.status}><span className={styles.spinner} aria-hidden="true" />{content.label}</div><span className={styles.connection}>FUTMANAGER / BR</span></div>
      <div className={styles.progress} role="progressbar" aria-label={content.label}><span /></div>
      <div className={styles.bottomRow}><p>{content.detail}</p><span><InterfaceIcon name="sport_soccer" size={14} />A PAIXÃO MOVE O JOGO</span></div>
    </footer>
  </section>;
}
