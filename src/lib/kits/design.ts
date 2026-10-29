import { z } from "zod";

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
    "TEMPLATE FIXO: tela 1024x1536, camisa inteira centralizada, vista frontal ortográfica, sem perspectiva; mesma silhueta de camisa de manga curta, ombros simétricos, gola no centro. Margem de 10% ao redor, camisa ocupando 80% da largura, proporção largura/altura da peça 0,90. Não cortar mangas. Fundo neutro cinza muito claro, iluminação de estúdio suave e uniforme.",
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><path id="shirt" d="M130 70L160 88Q200 116 240 88L270 70L365 145L320 215L280 190V430H120V190L80 215L35 145Z"/><clipPath id="cut"><use href="#shirt"/></clipPath><pattern id="stripes" width="44" height="500" patternUnits="userSpaceOnUse"><rect width="22" height="500" fill="${color(secondary)}"/></pattern></defs><rect width="400" height="500" rx="20" fill="#edf0e9"/><use href="#shirt" fill="${color(primary)}" stroke="#526457" stroke-width="2"/><g clip-path="url(#cut)">${pattern === "listrada" ? '<rect width="400" height="500" fill="url(#stripes)"/>' : pattern === "faixa" ? `<path d="M25 140L390 330L355 385L10 190Z" fill="${color(secondary)}"/>` : ""}<path d="M160 88Q200 130 240 88M120 410H280" fill="none" stroke="${color(secondary)}" stroke-width="8"/></g><rect x="227" y="150" width="42" height="42" rx="7" fill="#fff" stroke="#22382b"/><text x="248" y="176" font-family="Arial" font-size="12" text-anchor="middle" fill="#172d20">${xml(club.shortName.slice(0, 5))}</text>${sponsors
    .slice(0, 5)
    .map(
      (s, i) =>
        `<rect x="132" y="${227 + i * 32}" width="136" height="25" rx="3" fill="#fffffff0"/><text x="200" y="${244 + i * 32}" font-family="Arial" font-size="11" text-anchor="middle" fill="#172d20">${xml(s.slice(0, 24))}</text>`,
    )
    .join("")}</svg>`;
}
export const svgImage = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
