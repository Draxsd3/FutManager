// Rebuild after adding or replacing imported club kits: node scripts/measure-kit-bounds.mjs
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = "public/game-assets/clubs";
const result = {};
for (const club of (await readdir(root)).sort()) {
  const directory = path.join(root, club);
  let files;
  try { files = await readdir(directory); } catch { continue; }
  for (const file of files.filter((name) => /^kit-[123]\.png$/.test(name)).sort()) {
    const { data, info } = await sharp(path.join(directory, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = info.width, top = info.height, right = -1, bottom = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 30) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (right >= left && bottom >= top) result[`/game-assets/clubs/${club}/${file}`] = [info.width, info.height, left, top, right + 1, bottom + 1];
  }
}
await writeFile("src/data/kit-bounds.json", JSON.stringify(result) + "\n");
