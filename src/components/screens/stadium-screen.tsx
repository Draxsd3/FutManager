"use client";

import { useState } from "react";
import type { EditorClub } from "@/lib/game/editor-data";
import { simulateGate } from "@/lib/game/stadium";
import { Crest } from "@/components/ui/club-sidebar";
import styles from "./stadium-screen.module.css";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
const number = (value: number) => value.toLocaleString("pt-BR");
export function StadiumScreen({
  club,
  budget,
  payroll,
  onBack,
  onAgenda,
}: {
  club?: EditorClub;
  budget: number;
  payroll: number;
  onBack: () => void;
  onAgenda?: () => void;
}) {
  const [tab, setTab] = useState("overview");
  const [occupancy, setOccupancy] = useState(70);
  const [price, setPrice] = useState(50);
  const [cost, setCost] = useState(0);
  const capacity = club?.stadiumCapacity ?? 0;
  const projection = simulateGate(capacity, occupancy, price, cost);
  const name = club?.stadiumName || "Estádio não cadastrado";
  return (
    <section className={styles.screen} aria-labelledby="stadium-title">
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>PATRIMÔNIO / ESTÁDIO</p>
            <h1 id="stadium-title">
              A casa da sua torcida<span>.</span>
            </h1>
            <p>
              Estrutura, capacidade e planejamento de receitas em um só lugar.
            </p>
          </div>
          <button onClick={onBack}>← Voltar ao clube</button>
        </header>
        <article className={styles.hero}>
          <div className={styles.heroOverlay} />
          <span className={styles.imageNote}>Imagem ilustrativa</span>
          <div className={styles.heroContent}>
            <span className={styles.heroLabel}>NOSSA CASA</span>
            <div className={styles.heroClub}>
              {club && <Crest club={club.name} />}
              <div>
                <h2>{name}</h2>
                <p>
                  {club?.name ?? "Clube não encontrado"} ·{" "}
                  {club?.country ?? "País não cadastrado"}
                </p>
              </div>
            </div>
            <div className={styles.heroFacts}>
              <span>
                <strong>{number(capacity)}</strong> lugares cadastrados
              </span>
              <span>
                <strong>{club?.division ?? "—"}</strong> divisão do clube
              </span>
            </div>
          </div>
        </article>
        <nav className={styles.tabs} aria-label="Seções do estádio">
          {[
            { id: "overview", label: "Visão geral" },
            { id: "revenue", label: "Simulador de bilheteria" },
            { id: "structure", label: "Infraestrutura" },
          ].map((item) => (
            <button
              key={item.id}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {tab === "overview" && (
          <>
            <div className={styles.metrics}>
              <Metric
                label="CAPACIDADE"
                value={number(capacity)}
                detail="Lugares no cadastro do clube"
              />
              <Metric
                label="CAIXA DISPONÍVEL"
                value={money(budget * 1000)}
                detail="Saldo atual da carreira"
              />
              <Metric
                label="FOLHA DO ELENCO"
                value={money(payroll)}
                detail="Salários mensais dos atletas"
              />
            </div>
            <div className={styles.twoColumns}>
              <section className={styles.panel}>
                <p className={styles.eyebrow}>FICHA DO ESTÁDIO</p>
                <h2>Um patrimônio do clube</h2>
                <dl className={styles.facts}>
                  <div>
                    <dt>Nome</dt>
                    <dd>{name}</dd>
                  </div>
                  <div>
                    <dt>Clube</dt>
                    <dd>{club?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Capacidade cadastrada</dt>
                    <dd>{number(capacity)} lugares</dd>
                  </div>
                  <div>
                    <dt>País</dt>
                    <dd>{club?.country ?? "—"}</dd>
                  </div>
                </dl>
                <p className={styles.note}>
                  Nome e capacidade vêm do banco de clubes. A imagem é
                  ilustrativa e não representa necessariamente o estádio real.
                </p>
              </section>
              <section className={`${styles.panel} ${styles.planCard}`}>
                <p className={styles.eyebrow}>PLANEJE O DIA DO JOGO</p>
                <h2>
                  Arquibancada cheia.
                  <br />
                  Decisões bem calculadas.
                </h2>
                <p>
                  Compare cenários de ocupação, ingresso médio e custo
                  operacional antes de planejar suas receitas.
                </p>
                <button
                  className={styles.primary}
                  onClick={() => setTab("revenue")}
                >
                  Simular bilheteria <span aria-hidden="true">→</span>
                </button>
                {onAgenda && (
                  <button className={styles.link} onClick={onAgenda}>
                    Consultar agenda do clube →
                  </button>
                )}
              </section>
            </div>
          </>
        )}
        {tab === "revenue" && (
          <div className={styles.twoColumns}>
            <section className={styles.panel}>
              <p className={styles.eyebrow}>CENÁRIO DE PLANEJAMENTO</p>
              <h2>Quanto uma partida pode render?</h2>
              <p className={styles.description}>
                Ajuste as hipóteses abaixo. Esta simulação não altera o preço
                dos ingressos nem o caixa da carreira.
              </p>
              <label className={styles.range}>
                Ocupação estimada <strong>{occupancy}%</strong>
                <input
                  aria-label="Ocupação estimada"
                  type="range"
                  min={0}
                  max={100}
                  value={occupancy}
                  onChange={(event) => setOccupancy(Number(event.target.value))}
                />
              </label>
              <div className={styles.inputs}>
                <label>
                  Ingresso médio (R$)
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={price}
                    onChange={(event) =>
                      setPrice(
                        Math.min(
                          10000,
                          Math.max(0, Number(event.target.value)),
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Custo operacional (R$)
                  <input
                    type="number"
                    min={0}
                    max={100000000}
                    value={cost}
                    onChange={(event) =>
                      setCost(
                        Math.min(
                          100000000,
                          Math.max(0, Number(event.target.value)),
                        ),
                      )
                    }
                  />
                </label>
              </div>
              <button
                className={styles.link}
                onClick={() => {
                  setOccupancy(70);
                  setPrice(50);
                  setCost(0);
                }}
              >
                Restaurar cenário padrão
              </button>
            </section>
            <section
              className={`${styles.panel} ${styles.projection}`}
              aria-live="polite"
            >
              <p className={styles.eyebrow}>PROJEÇÃO / NÃO É RECEITA REAL</p>
              <h2>{number(projection.audience)} torcedores</h2>
              <p>
                {occupancy}% de {number(capacity)} lugares
              </p>
              <div className={styles.meter}>
                <span style={{ width: `${occupancy}%` }} />
              </div>
              <dl className={styles.facts}>
                <div>
                  <dt>Bilheteria bruta estimada</dt>
                  <dd>{money(projection.gross)}</dd>
                </div>
                <div>
                  <dt>Custo informado</dt>
                  <dd>{money(cost)}</dd>
                </div>
              </dl>
              <div className={styles.net}>
                <span>Resultado estimado</span>
                <strong>{money(projection.net)}</strong>
              </div>
              <p className={styles.note}>
                Sem deduções tributárias, gratuidades ou receitas extras. O
                resultado depende das hipóteses informadas e pode ser negativo.
              </p>
            </section>
          </div>
        )}
        {tab === "structure" && (
          <section className={styles.panel}>
            <div className={styles.structureHeading}>
              <div>
                <p className={styles.eyebrow}>MAPA DE INFRAESTRUTURA</p>
                <h2>Conheça o que ainda precisa ser avaliado</h2>
              </div>
              <span className={styles.status}>Sem avaliação técnica</span>
            </div>
            <div className={styles.structures}>
              {[
                {
                  title: "Arquibancadas",
                  description: `Capacidade registrada: ${number(capacity)} lugares. Setorização ainda não cadastrada.`,
                },
                {
                  title: "Gramado",
                  description:
                    "Condição, drenagem e manutenção ainda não avaliadas.",
                },
                {
                  title: "Iluminação",
                  description:
                    "Equipamentos e capacidade de iluminação não cadastrados.",
                },
                {
                  title: "Acesso e segurança",
                  description:
                    "Portões, acessibilidade e serviços ao torcedor não cadastrados.",
                },
              ].map((item, index) => (
                <article key={item.title}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
            <p className={styles.note}>
              Obras, manutenção e ampliação ainda não são executáveis nesta
              versão. Nenhum valor é debitado do clube por esta tela.
            </p>
          </section>
        )}
        <footer className={styles.footer}>
          <span>FUTMANAGER / GESTÃO DO ESTÁDIO</span>
          <span>{name}</span>
        </footer>
      </div>
    </section>
  );
}
function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}
