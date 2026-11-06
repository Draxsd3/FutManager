import { GameLogo } from "@/components/ui/game-logo";
import styles from "./loading-screen.module.css";

type LoadingPhase = "game" | "careers" | "career";
const labels: Record<LoadingPhase, string> = {
  game: "Preparando o jogo",
  careers: "Carregando suas carreiras...",
  career: "Carregando a carreira selecionada...",
};

/** Indeterminate: the status reflects the real loading phase, not an estimated percentage. */
export function LoadingScreen({ phase = "game" }: { phase?: LoadingPhase }) {
  return (
    <section className={styles.screen} aria-label="Carregamento do FutManager" data-loading-phase={phase}>
      <div className={styles.content}>
        <GameLogo variant="full" className={styles.brand} />
        <div className={styles.status} role="status" aria-live="polite" aria-atomic="true">
          <span className={styles.spinner} aria-hidden="true" />
          <span>{labels[phase]}</span>
        </div>
      </div>
    </section>
  );
}
