import fabric from "./fabric-template.json";

/** One photographic silhouette, traced from the owner's supplied reference. */
export const KIT_TEMPLATE = {
  ...fabric,
  version: "professional-v1",
  pieceRatio: 0.86,
} as const;
export const AI_KIT_FRAME = {
  width: 1024,
  height: 1536,
  top: 179,
  contentHeight: 1177,
} as const;

// Multiply the fabric by the selected dye; retain 10% of the highlights even on black.
export function fabricFilter(id: string, color: string) {
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feFlood flood-color="${color}" result="dye"/><feComposite in="dye" in2="SourceGraphic" operator="in" result="color"/><feBlend in="SourceGraphic" in2="color" mode="multiply" result="tinted"/><feComposite in="tinted" in2="SourceGraphic" operator="arithmetic" k2="0.9" k3="0.1"/><feComponentTransfer result="lit"><feFuncA type="table" tableValues="1 1"/></feComponentTransfer><feComposite in="lit" in2="SourceGraphic" operator="in"/></filter>`;
}
export const fabricImage = (filter = "") =>
  `<image href="${KIT_TEMPLATE.image}" width="870" height="1000"${filter ? ` filter="url(#${filter})"` : ""}/>`;

/** Imports are designs projected onto the same silhouette, not an alternate garment shape. */
export function fittedKitSvg(image: string, baseColor: string) {
  const safeColor = /^#[0-9a-f]{6}$/i.test(baseColor) ? baseColor : "#ffffff";
  // Only locally rasterized image data may enter this SVG, never arbitrary markup/URLs.
  if (!/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(image))
    throw new Error("Imagem inválida.");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 870 1000"><defs>${fabricFilter("base", safeColor)}<mask id="shape" mask-type="alpha">${fabricImage()}</mask></defs>${fabricImage("base")}<image href="${image}" width="870" height="1000" preserveAspectRatio="xMidYMid slice" mask="url(#shape)"/></svg>`;
}
