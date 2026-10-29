import { expect, it } from "vitest";
import sharp from "sharp";
import { KIT_TEMPLATE, fittedKitSvg } from "./template";
import { kitReferenceImage, normalizeGeneratedKit } from "./render-server";
import { automaticKitSvg, manualKitSvg } from "./design";
const club = {
  name: "Clube sem camisa",
  shortName: "CSC",
  primaryColor: "#cc0000",
  secondaryColor: "#000000",
  kitStyle: "lisa" as const,
};
it("keeps the reference free of checkerboard and every manual pattern on the identical alpha silhouette", async () => {
  const base = Buffer.from(KIT_TEMPLATE.image.split(",")[1], "base64");
  const { data: mask, info } = await sharp(base)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(info.width).toBe(870);
  expect(info.height).toBe(1000);
  expect(mask[3]).toBe(0);
  const templateAlpha = Array.from(
    { length: 870 * 1000 },
    (_, i) => mask[i * 4 + 3] > 127,
  );
  for (const pattern of ["lisa", "listrada", "faixa"] as const) {
    const raw = await sharp(
      Buffer.from(
        manualKitSvg(club, club.primaryColor, club.secondaryColor, pattern, []),
      ),
    )
      .ensureAlpha()
      .raw()
      .toBuffer();
    const alpha = Array.from(
      { length: 870 * 1000 },
      (_, i) => raw[i * 4 + 3] > 127,
    );
    expect(
      alpha.reduce(
        (sum, value, index) => sum + Number(value !== templateAlpha[index]),
        0,
      ),
    ).toBeLessThan(1000);
  }
  const home = await sharp(Buffer.from(automaticKitSvg(club, 1)))
    .raw()
    .toBuffer();
  const away = await sharp(Buffer.from(automaticKitSvg(club, 2)))
    .raw()
    .toBuffer();
  const pixel = (500 * 870 + 435) * 4;
  expect(home[pixel]).toBeGreaterThan(home[pixel + 1] * 3);
  expect(away[pixel]).toBeLessThan(40);
  expect(away[pixel + 1]).toBeLessThan(40);
});
it("attaches a real photographic reference and deterministically cuts AI output to its exact silhouette", async () => {
  const reference = await kitReferenceImage();
  const meta = await sharp(reference).metadata();
  expect([meta.width, meta.height]).toEqual([1024, 1536]);
  const fakeProvider = await sharp({
    create: { width: 1024, height: 1536, channels: 3, background: "#cc0000" },
  })
    .webp()
    .toBuffer();
  const result = await normalizeGeneratedKit(fakeProvider, "#cc0000");
  const output = await sharp(result).ensureAlpha().raw().toBuffer();
  const base = await sharp(
    Buffer.from(KIT_TEMPLATE.image.split(",")[1], "base64"),
  )
    .ensureAlpha()
    .raw()
    .toBuffer();
  let mismatch = 0;
  for (let i = 3; i < base.length; i += 4)
    mismatch += Number(output[i] !== base[i]);
  expect(mismatch).toBe(0);
  await expect(
    normalizeGeneratedKit(Buffer.from("invalid"), "#cc0000"),
  ).rejects.toThrow();
  const wrong = await sharp({
    create: { width: 40, height: 40, channels: 3, background: "red" },
  })
    .webp()
    .toBuffer();
  await expect(normalizeGeneratedKit(wrong, "#cc0000")).rejects.toThrow(
    "frame",
  );
});
it("projects raster imports onto the same mold without accepting arbitrary markup or remote URLs", async () => {
  const image = (
    await sharp({
      create: { width: 300, height: 300, channels: 3, background: "red" },
    })
      .webp()
      .toBuffer()
  ).toString("base64");
  const svg = fittedKitSvg(`data:image/webp;base64,${image}`, "#cc0000");
  expect((await sharp(Buffer.from(svg)).metadata()).width).toBe(870);
  expect(() => fittedKitSvg("https://evil.test/image", "red")).toThrow();
  expect(() => fittedKitSvg("data:image/svg+xml,<svg/>", "#cc0000")).toThrow();
});
