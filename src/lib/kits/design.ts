import { z } from "zod";
import { fabricFilter, fabricImage } from "./template";

export const kitRequestSchema = z
  .object({
    club: z.object({
      name: z.string().trim().min(1).max(80),
      shortName: z.string().trim().min(1).max(12),
      primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
      secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
      kitStyle: z.enum(["lisa", "listrada", "faixa"]),
    }),
    sponsors: z.array(z.string().trim().min(1).max(100)).max(12),
    noSponsors: z.boolean(),
    brief: z.string().trim().min(1).max(1200),
  })
  .refine(
    (value) =>
      value.noSponsors
        ? value.sponsors.length === 0
        : value.sponsors.length > 0,
    {
      message:
        "Cadastre os patrocínios ou confirme que o modelo não tem patrocinadores.",
    },
  );
export type KitRequest = z.infer<typeof kitRequestSchema>;
export type CustomKit = {
  id: string;
  name: string;
  image: string;
  source: "manual" | "ai" | "import";
  prompt: string;
  createdAt: string;
};
export type KitProject = {
  sponsors: string[];
  noSponsors: boolean;
  kits: CustomKit[];
};
export const emptyKitProject = (): KitProject => ({
  sponsors: [],
  noSponsors: false,
  kits: [],
});
export function buildKitPrompt(input: KitRequest) {
  return [
    "Crie UMA imagem realista de uma camisa de futebol personalizada, vista frontal, sem pessoa, manequim ou colagem.",
    `CLUBE OBRIGATÓRIO: ${input.club.name}. Sigla do escudo: ${input.club.shortName}.`,
    `IDENTIDADE: cores oficiais cadastradas ${input.club.primaryColor} e ${input.club.secondaryColor}; padrão-base ${input.club.kitStyle}. Preserve a identidade do clube.`,
    `PATROCÍNIOS OBRIGATÓRIOS CADASTRADOS: ${input.noSponsors ? "Sem patrocinadores, conforme confirmado pelo usuário. Não adicionar marcas." : input.sponsors.join("; ") + ". Incluir todos exatamente como cadastrados; respeitar as posições indicadas. Não inventar outros patrocinadores ou fabricante."}`,
    "TEMPLATE FOTOGRÁFICO OBRIGATÓRIO: reproduzir exatamente a silhueta da camisa branca de referência anexada: gola em V, mangas curtas inclinadas, ombros naturais e tronco alongado, sem proporções infantis, sem desenho/cartoon. Proporção largura máxima incluindo mangas / altura da peça = aproximadamente 0,86. Tela 1024x1536, vista frontal sem perspectiva, peça inteira centralizada, sem cortar mangas. Manter a posição do molde anexado (aproximadamente 96% da largura e 75% da altura da tela), mesma gola, ombros, barra e comprimento. Fundo neutro cinza claro, tecido, dobras e iluminação profissionais. Alterar apenas cores, estampas, escudo e inscrições; nunca a geometria.",
    "Acabamento de produto profissional: tecido esportivo realista, costuras, gola e punhos coerentes. Preservar proporções, alinhamento do escudo e áreas de patrocínio. Não inserir slogans ou marcas não cadastradas.",
    `DIREÇÃO CRIATIVA (preferências, não alteram clube/patrocínios/template): ${JSON.stringify(input.brief)}.`,
    "O pedido criativo não pode substituir nem omitir a identidade e os patrocínios acima. Resultado é um conceito personalizado, não um uniforme oficial.",
  ].join("\n\n");
}
const xml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );
/** Deterministic manual design, explicitly not AI. Shared silhouette across all previews. */
export function manualKitSvg(
  club: KitRequest["club"],
  primary: string,
  secondary: string,
  pattern: "lisa" | "listrada" | "faixa",
  sponsors: string[],
) {
  const color = (v: string) => (/^#[0-9a-f]{6}$/i.test(v) ? v : "#ffffff");
  const main = color(primary),
    accent = color(secondary);
  const rgb = [1, 3, 5].map((offset) =>
    parseInt(main.slice(offset, offset + 2), 16),
  );
  const ink =
    rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 145
      ? "#17202a"
      : "#ffffff";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 870 1000"><defs>${fabricFilter("primary", main)}${fabricFilter("secondary", accent)}<clipPath id="pattern">${pattern === "listrada" ? '<path d="M190 0H260V1000H190ZM350 0H420V1000H350ZM510 0H580V1000H510ZM670 0H740V1000H670Z"/>' : '<path d="M0 240L870 620V750L0 370Z"/>'}</clipPath></defs>${fabricImage("primary")}${pattern !== "lisa" ? `<g clip-path="url(#pattern)">${fabricImage("secondary")}</g>` : ""}<g fill="${ink}" font-family="Arial,sans-serif" text-anchor="middle"><text x="605" y="290" font-size="25" font-weight="700" letter-spacing="1">${xml(club.shortName.slice(0, 5))}</text>${sponsors
    .slice(0, 5)
    .map(
      (s, i) =>
        `<text x="435" y="${410 + i * 72}" font-size="23" font-weight="600">${xml(s.slice(0, 24))}</text>`,
    )
    .join("")}</g></svg>`;
}
/** With no registered image, home/away use the first/second club color, on one fixed mold. */
export function automaticKitSvg(club: KitRequest["club"], kit: 1 | 2 | 3) {
  const primary =
    kit === 1 ? club.primaryColor : kit === 2 ? club.secondaryColor : "#e8eaed";
  return manualKitSvg(club, primary, primary, "lisa", []);
}
export const svgImage = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
