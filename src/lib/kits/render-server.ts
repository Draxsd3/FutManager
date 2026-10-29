import sharp from "sharp";
import { AI_KIT_FRAME, KIT_TEMPLATE } from "./template";
const fabric = () => Buffer.from(KIT_TEMPLATE.image.split(",")[1], "base64");

export async function kitReferenceImage() {
  return sharp(fabric())
    .resize(AI_KIT_FRAME.width, AI_KIT_FRAME.height, {
      fit: "contain",
      background: "#f5f5f5",
    })
    .png()
    .toBuffer();
}
/** Deterministic silhouette enforcement after the provider; never trust prompt geometry alone. */
export async function normalizeGeneratedKit(
  image: Buffer,
  primaryColor: string,
) {
  const metadata = await sharp(image, {
    limitInputPixels: 4_000_000,
  }).metadata();
  if (
    metadata.width !== AI_KIT_FRAME.width ||
    metadata.height !== AI_KIT_FRAME.height
  )
    throw new Error("Unexpected provider frame");
  const surface = await sharp(image)
    .extract({
      left: 0,
      top: AI_KIT_FRAME.top,
      width: AI_KIT_FRAME.width,
      height: AI_KIT_FRAME.contentHeight,
    })
    .resize(KIT_TEMPLATE.width, KIT_TEMPLATE.height)
    .flatten({ background: primaryColor })
    .png()
    .toBuffer();
  return sharp(surface)
    .ensureAlpha()
    .composite([{ input: fabric(), blend: "dest-in" }])
    .webp({ quality: 88, alphaQuality: 100 })
    .toBuffer();
}
