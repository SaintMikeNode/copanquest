// Generates the favicon and the PWA icons from the voxel temple icon (branding/voxel-icon.mjs).
// public/favicon.svg is the rounded brand tile (also shown in the menu, the loading screen and on
// the bedroom computer's CRT); the PNG app icons are full-bleed squares, and the maskable one keeps
// the temple inside Android's safe zone.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import { iconSvg } from "../branding/voxel-icon.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const out = path.join(pub, "icons");

const png = (svg, size, file) =>
  sharp(Buffer.from(svg), { density: 72 * (size / 64) * 1.5 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, file));

await mkdir(out, { recursive: true });
await writeFile(path.join(pub, "favicon.svg"), iconSvg(64, { tile: "rounded" }));
const square = iconSvg(512, { tile: "square", pad: 0.03 });
await png(square, 192, "icon-192.png");
await png(square, 512, "icon-512.png");
await png(square, 180, "apple-touch-icon.png");
await png(iconSvg(512, { tile: "square", pad: 0.12 }), 512, "icon-maskable-512.png");
console.log("Favicon and icons written to public/");
