"use client";
import { useMemo, useState } from "react";
import type { CareerSave, EditorDatabase } from "@/lib/game/editor-data";
import {
  careerMessages,
  MAJOR_TRANSFER_BRL,
  type MessageCategory,
} from "@/lib/game/messages";
import styles from "./messages-screen.module.css";
const categories: { id: MessageCategory | "all"; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "market", label: "Mercado da Bola" },
  { id: "team", label: "Time" },
  { id: "board", label: "Diretoria" },
  { id: "players", label: "Jogadores" },
];
export function MessagesScreen({
  save,
  database,
  readIds,
  onRead,
}: {
  save: CareerSave;
  database: EditorDatabase;
  readIds: string[];
  onRead: (ids: string[]) => void;
}) {
  const messages = useMemo(
    () => careerMessages(save, database),
    [save, database],
  );
  const [category, setCategory] = useState<MessageCategory | "all">("all"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [page, setPage] = useState(0),
    [unreadOnly, setUnreadOnly] = useState(false);
  const read = new Set(readIds),
    filtered = messages.filter(
      (m) =>
        (category === "all" || m.category === category) &&
        (!unreadOnly || !read.has(m.id)) &&
        `${m.sender} ${m.subject} ${m.body}`
          .toLocaleLowerCase("pt-BR")
          .includes(query.toLocaleLowerCase("pt-BR")),
    );
  const current = messages.find((m) => m.id === selected),
    lastPage = Math.max(0, Math.ceil(filtered.length / 20) - 1),
    safePage = Math.min(page, lastPage);
  return (
    <div className={styles.screen}>
      <nav className={styles.tabs} aria-label="Categorias de mensagens">
        {categories.map((c) => (
          <button
            key={c.id}
            aria-pressed={category === c.id}
            onClick={() => {
              setCategory(c.id);
              setPage(0);
              setSelected(null);
            }}
          >
            {c.label}{" "}
            <span>
              {
                messages.filter(
                  (m) =>
                    (c.id === "all" || m.category === c.id) && !read.has(m.id),
                ).length
              }
            </span>
          </button>
        ))}
      </nav>
      <div className={styles.tools}>
        <input
          aria-label="Pesquisar mensagens"
          placeholder="Pesquisar remetente ou assunto…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
        <label>
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              setPage(0);
            }}
          />{" "}
          Só não lidas
        </label>
        <button
          disabled={!filtered.some((m) => !read.has(m.id))}
          onClick={() => onRead(filtered.map((m) => m.id))}
        >
          Marcar seleção filtrada como lida
        </button>
      </div>
      {category === "market" && (
        <p className={styles.note}>
          Negociações registradas no universo desta carreira a partir de{" "}
          {(MAJOR_TRANSFER_BRL / 1e6).toLocaleString("pt-BR")} milhões de reais.
          Acordo não significa transferência concluída; não são notícias do
          futebol em tempo real.
        </p>
      )}
      <div className={styles.layout}>
        <section aria-label="Caixa de entrada" className={styles.inbox}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>
              Nenhuma mensagem nesta seleção. Novos acontecimentos da carreira
              aparecerão aqui.
            </p>
          ) : (
            filtered.slice(safePage * 20, safePage * 20 + 20).map((m) => (
              <button
                key={m.id}
                aria-label={`${m.sender} — ${m.subject} — ${m.date ?? "Sem data registrada"}${read.has(m.id) ? "" : " — Não lida"}`}
                className={`${styles.row} ${!read.has(m.id) ? styles.unread : ""}`}
                aria-pressed={selected === m.id}
                onClick={() => {
                  setSelected(m.id);
                  onRead([m.id]);
                }}
              >
                <span className={styles.sender}>
                  {!read.has(m.id) && <i aria-label="Não lida" />}
                  {m.sender}
                </span>
                <strong>{m.subject}</strong>
                <small>
                  {m.date
                    ? m.date.split("-").reverse().join("/")
                    : "Sem data registrada"}
                </small>
              </button>
            ))
          )}
          <footer className={styles.pagination}>
            <button disabled={!safePage} onClick={() => setPage(safePage - 1)}>
              ← Anterior
            </button>
            <span>
              {filtered.length} mensagens · página {safePage + 1} de{" "}
              {lastPage + 1}
            </span>
            <button
              disabled={safePage >= lastPage}
              onClick={() => setPage(safePage + 1)}
            >
              Próxima →
            </button>
          </footer>
        </section>
        <article aria-label="Leitura da mensagem" className={styles.detail}>
          {current ? (
            <>
              <span className={styles.sender}>{current.sender}</span>
              <h2>{current.subject}</h2>
              <p className={styles.note}>
                {current.date
                  ? current.date.split("-").reverse().join("/")
                  : "Data não registrada na origem"}
              </p>
              {current.amount !== undefined && (
                <b>
                  {current.amount.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </b>
              )}
              <p>{current.body}</p>
              <small>
                Comunicado gerado a partir dos registros da sua carreira.
              </small>
            </>
          ) : (
            <p className={styles.empty}>Selecione uma mensagem para ler.</p>
          )}
        </article>
      </div>
    </div>
  );
}
