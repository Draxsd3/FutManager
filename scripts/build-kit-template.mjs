// Rebuild the transparent fabric template from the user's 1536×1024 reference.
// Usage: node scripts/build-kit-template.mjs /path/to/reference.png
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
const source = process.argv[2];
if (!source) throw new Error("Informe a referência original 1536×1024.");
const meta = await sharp(source).metadata();
if (meta.width !== 1536 || meta.height !== 1024)
  throw new Error("A referência deve ter 1536×1024 pixels.");
const outline =
  "M670 35 Q779 55 890 35 Q911 40 902 72 L1050 128 Q1104 145 1129 211 L1203 434 Q1205 451 1192 458 L1062 475 Q1045 477 1040 460 L1023 386 Q1010 452 1018 566 L1043 965 Q1048 988 1020 997 Q784 1025 537 997 Q508 993 512 965 L537 562 Q543 456 525 389 L520 459 Q517 477 500 474 L382 455 Q365 451 369 434 L433 214 Q456 152 491 137 L647 73 Q656 49 670 35Z";
const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><path d="${outline}" fill="white"/></svg>`,
);
const clipped = await sharp(source)
  .ensureAlpha()
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toBuffer();
const fabric = await sharp(clipped)
  .extract({ left: 350, top: 20, width: 870, height: 1000 })
  .png({ palette: true, colours: 128, dither: 0, effort: 10 })
  .toBuffer();
await writeFile(
  "src/lib/kits/fabric-template.json",
  JSON.stringify({
    width: 870,
    height: 1000,
    image: `data:image/png;base64,${fabric.toString("base64")}`,
  }),
);
console.log("Template transparente:", fabric.length, "bytes");
