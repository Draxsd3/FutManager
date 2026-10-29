"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { EditorClub } from "@/lib/game/editor-data";
import {
  buildKitPrompt,
  emptyKitProject,
  kitRequestSchema,
  manualKitSvg,
  svgImage,
  type CustomKit,
  type KitProject,
} from "@/lib/kits/design";
import { readKitProject, writeKitProject } from "@/lib/kits/storage";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { clubKitAsset } from "@/lib/game/assets";
import styles from "./kit-studio.module.css";

export function KitStudio({
  club,
  userId,
}: {
  club: EditorClub;
  userId: string;
}) {
  const [project, setProject] = useState<KitProject>(emptyKitProject);
  const [ready, setReady] = useState(false),
    [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Carregando biblioteca deste clube…");
  const [sponsors, setSponsors] = useState(""),
    [noSponsors, setNoSponsors] = useState(false);
  const [brief, setBrief] = useState(
    "Camisa contemporânea, com textura sutil e gola esportiva, respeitando a identidade do clube.",
  );
  const [primary, setPrimary] = useState(club.primaryColor),
    [secondary, setSecondary] = useState(club.secondaryColor);
  const [pattern, setPattern] = useState(club.kitStyle),
    [name, setName] = useState("Modelo personalizado");
  const [draft, setDraft] = useState<{
    image: string;
    prompt: string;
    source: CustomKit["source"];
  } | null>(null);
  const controller = useRef<AbortController | null>(null),
    lock = useRef(false);
  const upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    readKitProject(userId, club.id)
      .then((value) => {
        if (live) {
          setProject(value);
          setSponsors(value.sponsors.join("\n"));
          setNoSponsors(value.noSponsors);
          setReady(true);
          setStatus("Biblioteca local pronta. Modelos existentes preservados.");
        }
      })
      .catch(() => {
        if (live)
          setStatus(
            "Armazenamento local indisponível. Não é possível salvar modelos neste navegador.",
          );
      });
    fetch("/api/kits/generate", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (live) setConfigured(data.configured === true);
      })
      .catch(() => {});
    return () => {
      live = false;
      controller.current?.abort();
    };
  }, [userId, club.id]);
  const listedSponsors = noSponsors
    ? []
    : sponsors
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
  const request = {
    club: {
      name: club.name,
      shortName: club.shortName,
      primaryColor: club.primaryColor,
      secondaryColor: club.secondaryColor,
      kitStyle: club.kitStyle,
    },
    sponsors: listedSponsors,
    noSponsors,
    brief,
  };
  const parsed = kitRequestSchema.safeParse(request);
  const prompt = parsed.success
    ? buildKitPrompt(parsed.data)
    : "Cadastre os patrocinadores (um por linha, com a posição desejada) ou confirme que não há patrocínio para montar o prompt completo.";
  const shownPrompt = draft?.source === "ai" ? draft.prompt : prompt;
  const manual = svgImage(
    manualKitSvg(request.club, primary, secondary, pattern, listedSponsors),
  );
  const preview = draft?.image ?? manual;

  async function persist(next: KitProject) {
    try {
      await writeKitProject(userId, club.id, next);
      setProject(next);
      return true;
    } catch {
      setStatus(
        "Não foi possível salvar. Verifique o espaço disponível neste navegador e tente novamente.",
      );
      return false;
    }
  }
  async function saveSponsors() {
    if (!parsed.success) {
      setStatus(
        "Preencha os patrocinadores ou confirme que o modelo não terá patrocínio.",
      );
      return;
    }
    setBusy(true);
    try {
      if (await persist({ ...project, sponsors: listedSponsors, noSponsors }))
        setStatus(
          "Patrocínios salvos para este clube, nesta conta e navegador.",
        );
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    if (lock.current || !ready || !configured || project.kits.length >= 8)
      return;
    if (!parsed.success) {
      setStatus(
        "Preencha nome, cores, patrocínios e descrição antes de gerar.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setStatus(
      "Gerando um novo conceito… Pode levar até 100 segundos. Não feche esta tela.",
    );
    controller.current = new AbortController();
    try {
      if (
        !(await persist({ ...project, sponsors: listedSponsors, noSponsors }))
      )
        return;
      const client = createBrowserSupabaseClient();
      const { data } = await client.auth.getSession();
      if (!data.session) throw new Error("Entre novamente para gerar com IA.");
      const response = await fetch("/api/kits/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify(parsed.data),
        signal: controller.current.signal,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível gerar o modelo.");
      if (
        typeof result.prompt !== "string" ||
        typeof result.image !== "string" ||
        !result.image.startsWith("data:image/webp;base64,")
      )
        throw new Error("Imagem retornada inválida.");
      setDraft({ image: result.image, prompt: result.prompt, source: "ai" });
      setStatus(
        "Conceito gerado. Revise escudo, marcas e textos antes de adicionar à coleção.",
      );
    } catch (error) {
      if (!controller.current.signal.aborted)
        setStatus(
          error instanceof Error ? error.message : "Serviço indisponível.",
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function saveKit() {
    if (!parsed.success) {
      setStatus("Confirme os patrocínios antes de adicionar um modelo.");
      return;
    }
    if (project.kits.length >= 8) {
      setStatus(
        "Limite de 8 modelos personalizados por clube. Exclua um modelo para adicionar outro.",
      );
      return;
    }
    if (!name.trim()) {
      setStatus("Dê um nome ao novo modelo.");
      return;
    }
    setBusy(true);
    const kit: CustomKit = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 60),
      image: preview,
      source: draft?.source ?? "manual",
      prompt: draft?.source === "ai" ? draft.prompt : prompt,
      createdAt: new Date().toISOString(),
    };
    try {
      if (
        await persist({
          sponsors: listedSponsors,
          noSponsors,
          kits: [...project.kits, kit],
        })
      )
        setStatus(
          "Modelo adicionado à coleção local. Os três uniformes existentes não foram substituídos.",
        );
    } finally {
      setBusy(false);
    }
  }
  async function importImage(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5000000
    ) {
      setStatus("Importe PNG, JPG ou WebP de até 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      setDraft({
        image: canvas.toDataURL("image/webp", 0.85),
        prompt,
        source: "import",
      });
      setStatus("Imagem importada. Revise a identidade e adicione à coleção.");
    } catch {
      setStatus("Não foi possível ler esta imagem. Tente outro arquivo.");
    } finally {
      setBusy(false);
      if (upload.current) upload.current.value = "";
    }
  }
  return (
    <section className={styles.studio} aria-labelledby="studio-title">
      <header className={styles.heading}>
        <div>
          <p>IDENTIDADE / LABORATÓRIO CRIATIVO</p>
          <h2 id="studio-title">
            Estúdio de uniformes<span>.</span>
          </h2>
          <span>
            Modelos exclusivos para {club.name}, sem substituir os uniformes
            cadastrados.
          </span>
        </div>
        <b>{project.kits.length}/8 personalizados</b>
      </header>
      <section className={styles.originals} aria-label="Uniformes existentes">
        {([1, 2, 3] as const).map((n) => (
          <article key={n}>
            {clubKitAsset(club.name, n) ? (
              <Image
                src={clubKitAsset(club.name, n)!}
                alt={`Uniforme ${n} existente do ${club.name}`}
                width={80}
                height={95}
                unoptimized
              />
            ) : (
              <Image
                src={svgImage(
                  manualKitSvg(
                    request.club,
                    n === 2 ? club.secondaryColor : club.primaryColor,
                    club.secondaryColor,
                    club.kitStyle,
                    [],
                  ),
                )}
                alt={`Modelo ${n} cadastrado`}
                width={80}
                height={95}
                unoptimized
              />
            )}
            <div>
              <small>ACERVO EXISTENTE</small>
              <h3>Uniforme {n}</h3>
              <span>Preservado</span>
            </div>
          </article>
        ))}
      </section>
      <div className={styles.workspace}>
        <div className={styles.controls}>
          <section className={styles.panel}>
            <h3>01 / Identidade e patrocínios</h3>
            <p>
              Clube e cores entram automaticamente em todos os pedidos à IA. Não
              presumimos patrocinadores atuais.
            </p>
            <div className={styles.identity}>
              <strong>{club.name}</strong>
              <span style={{ background: club.primaryColor }} />
              <span style={{ background: club.secondaryColor }} />
            </div>
            <label>
              Patrocínios e posições
              <textarea
                aria-label="Patrocínios e posições"
                rows={3}
                maxLength={1200}
                disabled={busy || noSponsors}
                value={sponsors}
                onChange={(e) => {
                  setSponsors(e.target.value);
                  setDraft((current) =>
                    current?.source === "ai" ? null : current,
                  );
                }}
                placeholder="Um por linha. Ex.: Marca cadastrada — peito"
              />
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={noSponsors}
                disabled={busy}
                onChange={(e) => {
                  setNoSponsors(e.target.checked);
                  setDraft((current) =>
                    current?.source === "ai" ? null : current,
                  );
                }}
              />
              Confirmo que este modelo não terá patrocinadores
            </label>
            <button disabled={!ready || busy} onClick={saveSponsors}>
              Salvar patrocínios deste clube
            </button>
          </section>
          <section className={styles.panel}>
            <h3>02 / Direção criativa</h3>
            <label>
              Nome do modelo
              <input
                maxLength={60}
                value={name}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Descreva a nova camisa
              <textarea
                rows={3}
                maxLength={1200}
                value={brief}
                disabled={busy}
                onChange={(e) => setBrief(e.target.value)}
              />
            </label>
            <div className={styles.manualControls}>
              <label>
                Cor principal
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => {
                    setPrimary(e.target.value);
                    setDraft(null);
                  }}
                  disabled={busy}
                />
              </label>
              <label>
                Cor secundária
                <input
                  type="color"
                  value={secondary}
                  onChange={(e) => {
                    setSecondary(e.target.value);
                    setDraft(null);
                  }}
                  disabled={busy}
                />
              </label>
              <label>
                Padrão manual
                <select
                  value={pattern}
                  onChange={(e) => {
                    setPattern(e.target.value as typeof pattern);
                    setDraft(null);
                  }}
                  disabled={busy}
                >
                  <option value="lisa">Lisa</option>
                  <option value="listrada">Listrada</option>
                  <option value="faixa">Faixa</option>
                </select>
              </label>
            </div>
            <p>
              As cores acima alteram o criador manual. A IA recebe as cores
              oficiais cadastradas no clube e sua direção criativa.
            </p>
            <p>
              A prévia manual exibe até 5 inscrições abreviadas, sem reproduzir
              logotipos ou posicionamento oficial. O prompt da IA inclui todos
              os patrocínios cadastrados.
            </p>
            {!configured && (
              <p className={styles.warning}>
                IA não configurada neste ambiente. Criador manual, importação e
                cópia do prompt continuam disponíveis.
              </p>
            )}
            <button
              className={styles.primary}
              onClick={generate}
              disabled={
                !ready ||
                busy ||
                !configured ||
                !parsed.success ||
                project.kits.length >= 8
              }
            >
              {busy ? "Aguarde…" : "✦ Gerar novo modelo com IA"}
            </button>
            <small>
              Ao gerar, nome, cores, patrocínios e descrição são enviados à
              OpenAI. Até 3 tentativas por hora/conta quando ativado. IA pode
              distorcer textos e logotipos; revise o resultado.
            </small>
          </section>
        </div>
        <div className={styles.previewColumn}>
          <section className={styles.preview}>
            <span className={styles.tag}>
              {draft?.source === "ai"
                ? "CONCEITO GERADO POR IA"
                : draft?.source === "import"
                  ? "IMAGEM IMPORTADA"
                  : "CRIADOR MANUAL / NÃO É IA"}
            </span>
            <Image
              src={preview}
              alt={`Prévia de camisa personalizada do ${club.name}`}
              width={400}
              height={500}
              unoptimized
            />
            <div>
              <h3>{name || "Seu próximo uniforme"}</h3>
              <p>Proporção frontal padronizada · conceito personalizado</p>
            </div>
            <button
              className={styles.primary}
              onClick={saveKit}
              disabled={!ready || busy || project.kits.length >= 8}
            >
              Adicionar à coleção
            </button>
            <div className={styles.previewActions}>
              <button disabled={busy} onClick={() => setDraft(null)}>
                Voltar ao criador manual
              </button>
              <button
                disabled={busy || !ready}
                onClick={() => upload.current?.click()}
              >
                Importar imagem
              </button>
              <input
                ref={upload}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => void importImage(e.target.files?.[0])}
              />
            </div>
          </section>
          <details className={styles.prompt}>
            <summary>Ver prompt completo da geração</summary>
            <textarea
              aria-label="Prompt completo"
              readOnly
              value={shownPrompt}
              rows={10}
            />
            <button
              disabled={!parsed.success}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shownPrompt);
                  setStatus(
                    "Prompt completo copiado, incluindo clube e patrocínios.",
                  );
                } catch {
                  setStatus(
                    "Não foi possível copiar. Selecione o texto do prompt manualmente.",
                  );
                }
              }}
            >
              Copiar prompt completo
            </button>
          </details>
        </div>
      </div>
      <p className={styles.status} role="status">
        {status}
      </p>
      <section className={styles.collection}>
        <header>
          <h3>Coleção personalizada</h3>
          <p>
            Somente nesta conta e navegador. Exporte imagens para backup. Não
            sincroniza com a nuvem nem altera as camisas usadas nas partidas.
          </p>
        </header>
        <div className={styles.collectionGrid}>
          {project.kits.map((kit) => (
            <article key={kit.id}>
              <Image
                src={kit.image}
                alt={kit.name}
                width={180}
                height={220}
                unoptimized
              />
              <h4>{kit.name}</h4>
              <span>
                {
                  { ai: "IA", manual: "Manual", import: "Importado" }[
                    kit.source
                  ]
                }
              </span>
              <div>
                <button
                  disabled={busy}
                  onClick={() => {
                    setDraft({
                      image: kit.image,
                      prompt: kit.prompt,
                      source: kit.source,
                    });
                    setName(kit.name);
                  }}
                >
                  Visualizar
                </button>
                <a
                  href={kit.image}
                  download={`${club.shortName}-${kit.id}.${kit.source === "manual" ? "svg" : "webp"}`}
                >
                  Baixar
                </a>
                <button
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm(`Excluir ${kit.name}?`)) return;
                    setBusy(true);
                    try {
                      if (
                        await persist({
                          ...project,
                          kits: project.kits.filter(
                            (item) => item.id !== kit.id,
                          ),
                        })
                      )
                        setStatus("Modelo removido da coleção local.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
        {!project.kits.length && (
          <p className={styles.empty}>
            Sua coleção começa aqui. Crie uma camisa manualmente ou prepare seu
            primeiro pedido à IA.
          </p>
        )}
      </section>
    </section>
  );
}
