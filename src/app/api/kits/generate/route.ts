import {
  kitReferenceImage,
  normalizeGeneratedKit,
} from "@/lib/kits/render-server";
import { createClient } from "@supabase/supabase-js";
import { buildKitPrompt, kitRequestSchema } from "@/lib/kits/design";

export const runtime = "nodejs";
export const maxDuration = 120;
const reply = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  return reply({
    configured: Boolean(
      process.env.OPENAI_API_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  });
}
export async function POST(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token)
    return reply({ error: "Entre na sua conta para gerar uniformes." }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishable || !process.env.OPENAI_API_KEY)
    return reply(
      {
        error:
          "Geração por IA não configurada neste ambiente. Use o criador manual ou copie o prompt.",
      },
      503,
    );
  const client = createClient(url, publishable, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous)
      return reply({ error: "Sua sessão expirou. Entre novamente." }, 401);
  } catch {
    return reply(
      { error: "Não foi possível validar sua sessão. Tente novamente." },
      503,
    );
  }
  const text = await request.text();
  if (text.length > 10000) return reply({ error: "Pedido muito longo." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return reply({ error: "Pedido inválido." }, 400);
  }
  const parsed = kitRequestSchema.safeParse(body);
  if (!parsed.success)
    return reply(
      { error: "Confira nome, cores, patrocínios e descrição do modelo." },
      400,
    );
  // Atomic, persistent per-account quota; fail closed if the migration was not applied.
  try {
    const quota = await client.rpc("claim_kit_generation");
    if (quota.error)
      return reply(
        {
          error:
            "Proteção de uso da IA ainda não configurada no banco. Contate a administração.",
        },
        503,
      );
    if (quota.data !== true)
      return reply(
        {
          error: "Limite de 3 tentativas por hora atingido. Tente mais tarde.",
        },
        429,
      );
  } catch {
    return reply(
      { error: "Proteção de uso indisponível. A geração não foi iniciada." },
      503,
    );
  }
  const prompt = buildKitPrompt(parsed.data);
  try {
    const form = new FormData();
    form.set("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
    form.set("prompt", prompt);
    form.set("n", "1");
    form.set("size", "1024x1536");
    form.set("quality", "medium");
    form.set("input_fidelity", "high");
    form.set("output_format", "webp");
    form.set("output_compression", "70");
    form.set(
      "image[]",
      new Blob([new Uint8Array(await kitReferenceImage())], {
        type: "image/png",
      }),
      "molde-profissional.png",
    );
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(100000),
    });
    if (!response.ok)
      return reply(
        {
          error:
            "O provedor não conseguiu gerar a camisa. Verifique a configuração ou tente depois.",
        },
        502,
      );
    const result = await response.json();
    const image = result.data?.[0]?.b64_json;
    if (
      typeof image !== "string" ||
      image.length > 6000000 ||
      !/^[A-Za-z0-9+/]+=*$/.test(image)
    )
      return reply({ error: "O provedor retornou uma imagem inválida." }, 502);
    const bytes = Buffer.from(image, "base64");
    if (
      bytes.subarray(0, 4).toString() !== "RIFF" ||
      bytes.subarray(8, 12).toString() !== "WEBP"
    )
      return reply(
        { error: "O provedor retornou um formato de imagem inesperado." },
        502,
      );
    let normalized: Buffer;
    try {
      normalized = await normalizeGeneratedKit(
        bytes,
        parsed.data.club.primaryColor,
      );
    } catch {
      return reply(
        {
          error:
            "O provedor retornou uma imagem fora do molde esperado. Nenhum modelo foi salvo.",
        },
        502,
      );
    }
    return reply({
      image: `data:image/webp;base64,${normalized.toString("base64")}`,
      prompt,
    });
  } catch {
    return reply(
      {
        error:
          "A geração demorou demais ou o serviço está indisponível. Nenhum modelo foi salvo.",
      },
      504,
    );
  }
}
