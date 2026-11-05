import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { expect, it } from "vitest";

it("preserves transparency around the browser, Apple and favicon logos", async () => {
  const favicon = await readFile("src/app/favicon.ico");
  const count = favicon.readUInt16LE(4);
  expect(count).toBeGreaterThan(0);
  const images = await Promise.all(["src/app/icon.png", "src/app/apple-icon.png"].map((path) => readFile(path)));
  for (let i = 0; i < count; i++) {
    const entry = 6 + 16 * i;
    const length = favicon.readUInt32LE(entry + 8);
    const offset = favicon.readUInt32LE(entry + 12);
    images.push(favicon.subarray(offset, offset + length));
  }
  for (const image of images) {
    const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0);
    expect(data[(info.width * info.height - 1) * 4 + 3]).toBe(0);
  }
});
