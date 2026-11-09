// Generates the PWA icons (a stylized red stepped temple) without image tools.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { encodePNG } from "./lib/png.mjs";

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const SKY = hex("#f1d9a6");
const RED = hex("#b3402a");
const GOLD = hex("#e9b949");
const GROUND = hex("#2f6b4f");

function draw(size, pad) {
  const data = new Uint8Array(size * size * 4);
  // shapes in a 64-unit design space, shrunk by `pad` (fraction) for maskable safe zone
  const s = (size * (1 - 2 * pad)) / 64;
  const o = size * pad;
  const rects = [
    [0, 56, 64, 8, GROUND],
    [8, 48, 48, 8, RED],
    [14, 40, 36, 8, RED],
    [20, 32, 24, 8, RED],
    [25, 20, 14, 12, RED],
    [27, 14, 10, 6, RED],
    [29, 34, 6, 22, GOLD],
  ];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let c = SKY;
      const u = (x - o) / s;
      const v = (y - o) / s;
      for (const [rx, ry, rw, rh, col] of rects) {
        if (u >= rx && u < rx + rw && v >= ry && v < ry + rh) c = col;
      }
      if (pad > 0 && (y - o) / s >= 56) c = GROUND; // extend ground to the bottom edge
      const i = (y * size + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
  return encodePNG({ width: size, height: size, bitDepth: 8, colorType: 6, data });
}

await mkdir(out, { recursive: true });
await writeFile(path.join(out, "icon-192.png"), draw(192, 0.06));
await writeFile(path.join(out, "icon-512.png"), draw(512, 0.06));
await writeFile(path.join(out, "icon-maskable-512.png"), draw(512, 0.16));
await writeFile(path.join(out, "apple-touch-icon.png"), draw(180, 0.06));
console.log("Icons written to public/icons/");
