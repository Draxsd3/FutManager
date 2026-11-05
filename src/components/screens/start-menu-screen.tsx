"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import type { CareerSave } from "@/lib/game/editor-data";
import { Crest } from "@/components/ui/club-sidebar";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { GameLogo } from "@/components/ui/game-logo";
import styles from "./start-menu-screen.module.css";

export interface StartMenuScreenProps {
  email?: string;
  onSignOut?: () => Promise<void>;
  onLogin?: () => void;
  saveCount: number;
  syncLabel: string;
  onNewGame: () => void;
  onSaves: () => void;
  onEdit: () => void;
  latestSave?: CareerSave | null;
  latestClubColor?: string;
  clubCount?: number;
  playerCount?: number;
  onContinueLatest?: (save: CareerSave) => unknown;
}

function formatSaveDate(isoDate?: string): string | null {
  if (!isoDate) return null;
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSaveBudget(budgetThousands?: number): string | null {
  if (typeof budgetThousands !== "number" || !Number.isFinite(budgetThousands)) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(budgetThousands * 1000);
}

export function StartMenuScreen({
  email,
  onSignOut,
  onLogin,
  saveCount,
  syncLabel,
  onNewGame,
  onSaves,
  onEdit,
  latestSave,
  latestClubColor,
  clubCount,
  playerCount,
  onContinueLatest,
}: StartMenuScreenProps) {
  const [resuming, setResuming] = useState(false);

  const hasValidLatest = Boolean(latestSave && latestSave.clubName);
  const saveDateLabel = formatSaveDate(latestSave?.inGameDate);
  const saveBudgetLabel = formatSaveBudget(latestSave?.budget);
  const spotlightStyle = (
    latestClubColor ? { "--spotlight-accent": latestClubColor } : undefined
  ) as CSSProperties | undefined;

  async function handleResumeLatest() {
    if (!latestSave || !onContinueLatest || resuming) return;
    setResuming(true);
    try {
      await onContinueLatest(latestSave);
    } finally {
      setResuming(false);
    }
  }

  return (
    <main className={styles.screen} data-menu-version="stadium-v3">
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.pitchOverlay} aria-hidden="true" />

      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <a
            className={styles.brand}
            href="#menu-principal"
            aria-label="FutManager — menu principal"
          >
            <GameLogo />
            <span className={styles.brandText}>
              <strong>FUTMANAGER</strong>
              <small>EDIÇÃO BRASIL · 2026</small>
            </span>
          </a>

          <div className={styles.topRight}>
            <span className={styles.syncBadge} role="status">
              <i className={styles.syncDot} aria-hidden="true" />
              <span>{syncLabel}</span>
            </span>

            <div className={styles.account}>
              {email ? (
                <>
                  <span className={styles.accountEmail} title={email}>
                    {email}
                  </span>
                  <button
                    type="button"
                    className={styles.signOutBtn}
                    onClick={() => void onSignOut?.()}
                  >
                    Sair
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.loginBtn}
                  onClick={onLogin}
                >
                  Entrar / Criar conta
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={styles.stage} id="menu-principal">
        <div className={styles.heroRow}>
          <section className={styles.identity} aria-label="Apresentação do jogo">
            <div className={styles.kicker}>
              <span className={styles.kickerPulse} aria-hidden="true" />
              <span>TEMPORADA OFICIAL 2026 · CALENDÁRIO BRASILEIRO</span>
            </div>

            <h1 className={styles.title}>
              <GameLogo variant="full" /> <span className={styles.visuallyHidden}>FUTMANAGER </span><span className={styles.seasonTag}>26</span>
            </h1>

            <p className={styles.subtitle}>
              Assuma o vestiário, arme sua equipe na prancheta tática e dispute as divisões
              nacionais, a Copa do Brasil e os campeonatos estaduais.
            </p>

            <div className={styles.leaguePills} aria-label="Competições disponíveis">
              <span>Brasileirão A · B · C · D</span>
              <span>Copa do Brasil</span>
              <span>Estaduais</span>
            </div>
          </section>

          {hasValidLatest && latestSave ? (
            <aside
              className={`${styles.spotlight} ${styles.spotlightCareer}`}
              style={spotlightStyle}
              aria-label="Última carreira salva"
            >
              <div className={styles.spotlightHeader}>
                <span className={styles.spotlightEyebrow}>
                  <i aria-hidden="true" /> ÚLTIMA SESSÃO
                </span>
                <span className={styles.spotlightBadge}>
                  {latestSave.division || "Futebol Brasileiro"}
                </span>
              </div>

              <div className={styles.careerBody}>
                <div className={styles.careerCrestWrap}>
                  <Crest club={latestSave.clubName} size="md" />
                </div>
                <div className={styles.careerInfo}>
                  <strong className={styles.careerClub}>{latestSave.clubName}</strong>
                  <span className={styles.careerCoach}>
                    Técnico · {latestSave.managerName || "Treinador"}
                  </span>
                  <div className={styles.careerMeta}>
                    {typeof latestSave.round === "number" && (
                      <span>{latestSave.round}ª rodada</span>
                    )}
                    {saveDateLabel && <span>{saveDateLabel}</span>}
                    {saveBudgetLabel && <span>Caixa {saveBudgetLabel}</span>}
                  </div>
                </div>
              </div>

              {onContinueLatest && (
                <button
                  type="button"
                  className={styles.resumeBtn}
                  disabled={resuming}
                  onClick={() => void handleResumeLatest()}
                >
                  <span>
                    {resuming
                      ? "Carregando carreira..."
                      : `Retomar ${latestSave.clubName}`}
                  </span>
                  <InterfaceIcon name="arrow_right" size={16} />
                </button>
              )}
            </aside>
          ) : (
            <aside
              className={styles.spotlight}
              aria-label="Resumo da temporada 2026"
            >
              <div className={styles.spotlightHeader}>
                <span className={styles.spotlightEyebrow}>
                  <i aria-hidden="true" /> PIRÂMIDE NACIONAL
                </span>
                <span className={styles.spotlightBadge}>TEMPORADA 2026</span>
              </div>

              <div className={styles.seasonBody}>
                <Image
                  src="/icons/navigation/estadio.webp"
                  alt=""
                  aria-hidden="true"
                  width={64}
                  height={64}
                  unoptimized
                  className={styles.seasonIcon}
                />
                <div className={styles.careerInfo}>
                  <strong className={styles.careerClub}>Futebol Brasileiro</strong>
                  <span className={styles.careerCoach}>
                    {clubCount && playerCount
                      ? `${clubCount.toLocaleString("pt-BR")} clubes e ${playerCount.toLocaleString("pt-BR")} atletas prontos no catálogo`
                      : "Séries A, B, C e D, Copa do Brasil e Estaduais"}
                  </span>
                </div>
              </div>

              <div className={styles.divisionStrip} aria-hidden="true">
                <span>SÉRIE A</span>
                <span>SÉRIE B</span>
                <span>SÉRIE C</span>
                <span>SÉRIE D</span>
              </div>
            </aside>
          )}
        </div>

        <nav className={styles.modeDeck} aria-label="Ações da carreira">
          <button
            type="button"
            className={`${styles.modeCard} ${styles.modePrimary}`}
            onClick={onNewGame}
          >
            <div className={styles.modeCardTop}>
              <span className={styles.modeChip}>MODO CARREIRA</span>
              <Image
                src="/icons/navigation/tecnicos.webp"
                alt=""
                aria-hidden="true"
                width={56}
                height={56}
                unoptimized
                className={styles.modeIcon}
              />
            </div>
            <div className={styles.modeCardBody}>
              <strong className={styles.modeTitle}>INICIAR NOVA CARREIRA</strong>
              <p className={styles.modeDesc}>
                Escolha um clube brasileiro, defina seu perfil de treinador e inicie a caminhada na
                temporada 2026.
              </p>
            </div>
            <span className={styles.modeAction}>
              <span>Escolher clube</span>
              <InterfaceIcon name="arrow_right" size={16} className={styles.modeArrow} />
            </span>
          </button>

          <button
            type="button"
            className={styles.modeCard}
            onClick={onSaves}
          >
            <div className={styles.modeCardTop}>
              <span className={styles.modeChip}>
                CARREIRAS SALVAS
                {saveCount > 0 && <b className={styles.saveCounter}>{saveCount}</b>}
              </span>
              <Image
                src="/icons/navigation/trofeus.webp"
                alt=""
                aria-hidden="true"
                width={56}
                height={56}
                unoptimized
                className={styles.modeIcon}
              />
            </div>
            <div className={styles.modeCardBody}>
              <strong className={styles.modeTitle}>CONTINUAR JOGANDO</strong>
              <p className={styles.modeDesc}>
                {saveCount
                  ? `${saveCount} carreira${saveCount === 1 ? " salva pronta" : "s salvas prontas"} para continuar.`
                  : email
                    ? "Nenhuma carreira salva nesta conta."
                    : "Entre para acessar suas carreiras."}
              </p>
            </div>
            <span className={styles.modeAction}>
              <span>{saveCount ? "Selecionar carreira" : "Ver carreiras"}</span>
              <InterfaceIcon name="arrow_right" size={16} className={styles.modeArrow} />
            </span>
          </button>

          <button
            type="button"
            className={styles.modeCard}
            onClick={onEdit}
          >
            <div className={styles.modeCardTop}>
              <span className={styles.modeChip}>CENTRAL DE DADOS</span>
              <Image
                src="/icons/navigation/times.webp"
                alt=""
                aria-hidden="true"
                width={56}
                height={56}
                unoptimized
                className={styles.modeIcon}
              />
            </div>
            <div className={styles.modeCardBody}>
              <strong className={styles.modeTitle}>EDITAR O UNIVERSO</strong>
              <p className={styles.modeDesc}>
                Personalize clubes, elencos e uniformes ou sincronize os dados pela API e pacotes
                JSON.
              </p>
            </div>
            <span className={styles.modeAction}>
              <span>Abrir editor</span>
              <InterfaceIcon name="arrow_right" size={16} className={styles.modeArrow} />
            </span>
          </button>
        </nav>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerInfo}>
            Salvamento automático vinculado por conta · Prancheta tática livre
          </span>
          <span className={styles.footerBrand}>FUTMANAGER · TEMPORADA 2026</span>
        </div>
      </footer>
    </main>
  );
}


