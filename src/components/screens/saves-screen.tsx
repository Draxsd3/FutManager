"use client";

import { useMemo, useState } from "react";
import type { CareerSave } from "@/lib/game/editor-data";
import { Crest } from "@/components/ui/club-sidebar";
import styles from "./saves-screen.module.css";

export function SavesScreen({
  saves,
  onLoad,
  onDelete,
  onBack,
}: {
  saves: CareerSave[];
  onLoad: (save: CareerSave) => unknown;
  onDelete: (id: string) => unknown;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [pending, setPending] = useState<string | null>(null);
  const visible = useMemo(
    () =>
      saves
        .filter((save) =>
          `${save.name} ${save.clubName} ${save.managerName}`
            .toLocaleLowerCase("pt-BR")
            .includes(query.trim().toLocaleLowerCase("pt-BR")),
        )
        .sort((a, b) =>
          sort === "club"
            ? a.clubName.localeCompare(b.clubName, "pt-BR")
            : sort === "round"
              ? b.round - a.round
              : Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
        ),
    [saves, query, sort],
  );
  async function action(id: string, callback: () => unknown) {
    if (pending) return;
    setPending(id);
    try {
      await callback();
    } finally {
      setPending(null);
    }
  }
  return (
    <section className={styles.screen} aria-labelledby="saves-title">
      <div className={styles.container}>
        <header className={styles.topbar}>
          <span className={styles.brand}>
            FM<span> / FUTMANAGER</span>
          </span>
          <button onClick={onBack} aria-label="Voltar ao menu">
            ← Voltar ao início
          </button>
        </header>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>SUA HISTÓRIA CONTINUA</p>
            <h1 id="saves-title">
              Carreiras salvas<span>.</span>
            </h1>
            <p>Seu clube, suas decisões. Escolha de onde quer continuar.</p>
          </div>
          <div className={styles.counter}>
            <strong>{String(saves.length).padStart(2, "0")}</strong>
            <span>
              {saves.length === 1
                ? "carreira na sua conta"
                : "carreiras na sua conta"}
            </span>
          </div>
        </header>
        {saves.length > 0 && (
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                aria-label="Buscar carreira"
                placeholder="Buscar por clube, técnico ou carreira"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className={styles.sort}>
              Ordenar por
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="recent">Mais recentes</option>
                <option value="club">Nome do clube</option>
                <option value="round">Rodada mais avançada</option>
              </select>
            </label>
          </div>
        )}
        {visible.length ? (
          <div className={styles.grid}>
            {visible.map((save, index) => (
              <article
                className={`${styles.card} ${index === 0 && sort === "recent" && !query ? styles.latest : ""}`}
                key={save.id}
                aria-label={`Carreira ${save.name}`}
              >
                <div className={styles.cardTop}>
                  <span className={styles.league}>{save.division}</span>
                  {index === 0 && sort === "recent" && !query && (
                    <span className={styles.recent}>ÚLTIMA CARREIRA</span>
                  )}
                </div>
                <div className={styles.club}>
                  <Crest club={save.clubName} />
                  <div>
                    <h2>{save.clubName}</h2>
                    <p>{save.name}</p>
                    <span>Técnico: {save.managerName}</span>
                  </div>
                </div>
                <div className={styles.details}>
                  <div>
                    <small>PROGRESSO</small>
                    <strong>{save.round}ª rodada</strong>
                  </div>
                  <div>
                    <small>DATA NA CARREIRA</small>
                    <strong>
                      {new Date(
                        `${save.inGameDate}T12:00:00`,
                      ).toLocaleDateString("pt-BR")}
                    </strong>
                  </div>
                  <div>
                    <small>CAIXA DO CLUBE</small>
                    <strong>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(save.budget * 1000)}
                    </strong>
                  </div>
                </div>
                <div className={styles.cardBottom}>
                  <span>
                    Salvo em{" "}
                    {new Date(save.updatedAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className={styles.actions}>
                    <button
                      className={styles.delete}
                      disabled={!!pending}
                      onClick={() =>
                        void action(save.id, () => onDelete(save.id))
                      }
                    >
                      EXCLUIR
                    </button>
                    <button
                      className={styles.continue}
                      disabled={!!pending}
                      onClick={() => void action(save.id, () => onLoad(save))}
                    >
                      {pending === save.id ? "AGUARDE..." : "CONTINUAR"}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span aria-hidden="true">◎</span>
            <h2>
              {saves.length
                ? "Nenhuma carreira corresponde à busca"
                : "Nenhuma carreira encontrada"}
            </h2>
            <p>
              {saves.length
                ? "Tente o nome de outro clube ou treinador."
                : "Volte ao início e crie sua primeira carreira. O próximo capítulo é seu."}
            </p>
            {saves.length ? (
              <button onClick={() => setQuery("")}>Limpar busca</button>
            ) : (
              <button onClick={onBack}>Voltar ao início →</button>
            )}
          </div>
        )}
        <footer className={styles.footer}>
          <span>FUTMANAGER / CENTRAL DE CARREIRAS</span>
          <span>Somente os progressos da sua conta</span>
        </footer>
      </div>
    </section>
  );
}
