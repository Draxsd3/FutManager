const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_RESULT_LENGTH = 200_000;
const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Store a small portrait in the career save rather than a large original image. */
export async function preparePlayerPhoto(file: File): Promise<string> {
  if (!accepted.has(file.type)) throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  if (file.size === 0 || file.size > MAX_FILE_BYTES) throw new Error("Escolha uma imagem de até 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível ler esta imagem."));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Imagem inválida.");
    const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a foto neste navegador.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/webp", 0.8);
    if (!result.startsWith("data:image/") || result.length > MAX_RESULT_LENGTH) throw new Error("Não foi possível reduzir a imagem. Escolha outra foto.");
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}
