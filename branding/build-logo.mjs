// Builds the CopánQuest logo files in this folder (branding/): SVGs with the lettering converted
// to outlines (no font needed) and PNG exports.
//   npm i --no-save opentype.js@1.3.4 && node branding/build-logo.mjs
// (sharp and @fontsource/pixelify-sans are already project dependencies.)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";
import { iconInner } from "./voxel-icon.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(repo, "branding");
fs.mkdirSync(out, { recursive: true });

const fontDir = path.join(repo, "node_modules/@fontsource/pixelify-sans/files");
const bold = opentype.loadSync(path.join(fontDir, "pixelify-sans-latin-700-normal.woff"));
const regular = opentype.loadSync(path.join(fontDir, "pixelify-sans-latin-400-normal.woff"));

const YELLOW = "#f2c14e";
const SHADOW = "#7a1d10";
const JADE_TOP = "#0d2a20";
const JADE_BOTTOM = "#06140f";
const FRET = "#1c4a36";
const MINT = "#9be3b5";

// The game icon (same as public/favicon.svg): the voxel temple on the jade tile, in a 64-unit box.
const ICON_INNER = iconInner(64, { id: "cq-icon-bg" });

/**
 * "CopánQuest" as outlines, baseline at y = 0, starting at x = 0. Pixelify Sans' capital C is
 * nearly closed and reads as an O, so a notch is cut out of its right side (clip, evenodd).
 * Returns { svg (defs + groups), width, top, bottom } in font units scaled to `size`.
 */
function wordmark(size, id) {
  const text = "CopánQuest";
  const c = bold.getPath("C", 0, 0, size);
  const cb = c.getBoundingBox();
  const wc = bold.getAdvanceWidth("C", size);
  const rest = bold.getPath(text.slice(1), wc, 0, size);
  const width = bold.getAdvanceWidth(text, size);
  const all = bold.getPath(text, 0, 0, size).getBoundingBox();
  const h = cb.y2 - cb.y1;
  const notchY = cb.y1 + h * 0.33;
  const notchH = h * 0.34;
  const notchX = cb.x1 + (cb.x2 - cb.x1) * 0.58;
  const pad = size * 0.2;
  const clip = `<clipPath id="${id}-c" clipPathUnits="userSpaceOnUse"><path clip-rule="evenodd" d="M${cb.x1 - pad} ${cb.y1 - pad}H${cb.x2 + pad}V${cb.y2 + pad}H${cb.x1 - pad}Z M${notchX} ${notchY}H${cb.x2 + pad}V${notchY + notchH}H${notchX}Z"/></clipPath>`;
  const off = size * 0.06;
  const letters = (fill, dx, dy) =>
    `<g transform="translate(${dx} ${dy})" fill="${fill}"><path d="${rest.toPathData(2)}"/><path clip-path="url(#${id}-c)" d="${c.toPathData(2)}"/></g>`;
  return {
    defs: clip,
    body: letters(SHADOW, off, off) + letters(YELLOW, 0, 0),
    width: width + off,
    top: all.y1,
    bottom: all.y2 + off,
  };
}

function textPath(font, s, x, y, size, fill) {
  return `<path fill="${fill}" d="${font.getPath(s, x, y, size).toPathData(2)}"/>`;
}

const svg = (w, h, inner, bg = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(1)} ${h.toFixed(1)}" width="${Math.round(w)}" height="${Math.round(h)}">${bg}${inner}</svg>\n`;

const files = {};

// 1. Icon.
files["copanquest-icon.svg"] = svg(64, 64, ICON_INNER);

// 2. Wordmark alone.
{
  const m = wordmark(100, "wm");
  const padX = 8;
  const padY = 8;
  const H = m.bottom - m.top + padY * 2;
  files["copanquest-wordmark.svg"] = svg(m.width + padX * 2, H, `<defs>${m.defs}</defs><g transform="translate(${padX} ${padY - m.top})">${m.body}</g>`);
}

// 3. Stacked: icon above the wordmark.
{
  const m = wordmark(100, "st");
  const W = m.width + 40;
  const icon = 150;
  const gap = 24;
  const H = 20 + icon + gap + (m.bottom - m.top) + 20;
  files["copanquest-logo-stacked.svg"] = svg(
    W,
    H,
    `<defs>${m.defs}</defs><g transform="translate(${(W - icon) / 2} 20) scale(${icon / 64})">${ICON_INNER}</g><g transform="translate(20 ${20 + icon + gap - m.top})">${m.body}</g>`,
  );
}

// 4. Horizontal: icon left, wordmark right.
{
  const m = wordmark(100, "hz");
  const textH = m.bottom - m.top;
  const icon = textH * 1.25;
  const gap = 28;
  const W = 20 + icon + gap + m.width + 20;
  const H = 20 + icon + 20;
  files["copanquest-logo-horizontal.svg"] = svg(
    W,
    H,
    `<defs>${m.defs}</defs><g transform="translate(20 20) scale(${icon / 64})">${ICON_INNER}</g><g transform="translate(${20 + icon + gap} ${20 + (icon - textH) / 2 - m.top})">${m.body}</g>`,
  );
}

// 5. Title card on dark jade, like the CRT title screen: frets, icon, wordmark, tagline.
{
  const m = wordmark(100, "dk");
  const W = 1000;
  const H = 560;
  const icon = 130;
  const textY = 300;
  let frets = "";
  for (let x = 0; x < W; x += 40) {
    frets += `<rect x="${x}" y="26" width="25" height="7"/><rect x="${x + 18}" y="33" width="7" height="10"/>`;
    frets += `<rect x="${x}" y="${H - 43}" width="25" height="7"/><rect x="${x + 18}" y="${H - 36}" width="7" height="10"/>`;
  }
  const tag = "Copán, Honduras · ca. 800 d. C.";
  const tagSize = 30;
  const tagW = regular.getAdvanceWidth(tag, tagSize);
  const bg = `<defs><linearGradient id="dk-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${JADE_TOP}"/><stop offset="1" stop-color="${JADE_BOTTOM}"/></linearGradient>${m.defs}</defs><rect width="${W}" height="${H}" rx="36" fill="url(#dk-bg)"/><g fill="${FRET}">${frets}</g>`;
  files["copanquest-logo-dark.svg"] = svg(
    W,
    H,
    `<g transform="translate(${(W - icon) / 2} 80) scale(${icon / 64})">${ICON_INNER}</g><g transform="translate(${(W - m.width) / 2} ${textY})">${m.body}</g>${textPath(regular, tag, (W - tagW) / 2, textY + 85, tagSize, MINT)}`,
    bg,
  );
}

// 6. Square version of the title card (profile pictures, app stores, social posts).
{
  const S = 1000;
  const scale = 1.3;
  const m = wordmark(100 * scale, "sq");
  const icon = 230;
  const tag = "Copán, Honduras · ca. 800 d. C.";
  const tagSize = 38;
  const tagW = regular.getAdvanceWidth(tag, tagSize);
  const textH = m.bottom - m.top;
  // Icon, gap, wordmark, gap, tagline, centered as a block.
  const block = icon + 70 + textH + 60 + tagSize;
  const y0 = (S - block) / 2;
  let frets = "";
  for (let x = 0; x < S; x += 40) {
    frets += `<rect x="${x}" y="34" width="25" height="7"/><rect x="${x + 18}" y="41" width="7" height="10"/>`;
    frets += `<rect x="${x}" y="${S - 51}" width="25" height="7"/><rect x="${x + 18}" y="${S - 44}" width="7" height="10"/>`;
  }
  const bg = `<defs><linearGradient id="sq-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${JADE_TOP}"/><stop offset="1" stop-color="${JADE_BOTTOM}"/></linearGradient>${m.defs}</defs><rect width="${S}" height="${S}" fill="url(#sq-bg)"/><g fill="${FRET}">${frets}</g>`;
  const textY = y0 + icon + 70 - m.top;
  files["copanquest-logo-square.svg"] = svg(
    S,
    S,
    `<g transform="translate(${(S - icon) / 2} ${y0}) scale(${icon / 64})">${ICON_INNER}</g><g transform="translate(${(S - m.width) / 2} ${textY})">${m.body}</g>${textPath(regular, tag, (S - tagW) / 2, y0 + icon + 70 + textH + 60 + tagSize * 0.75, tagSize, MINT)}`,
    bg,
  );
}

for (const [name, s] of Object.entries(files)) fs.writeFileSync(path.join(out, name), s);

// PNG exports.
const png = async (svgName, pngName, width) => {
  await sharp(Buffer.from(files[svgName]), { density: 600 }).resize({ width }).png().toFile(path.join(out, pngName));
};
await png("copanquest-icon.svg", "copanquest-icon-512.png", 512);
await png("copanquest-icon.svg", "copanquest-icon-1024.png", 1024);
await png("copanquest-wordmark.svg", "copanquest-wordmark.png", 2000);
await png("copanquest-logo-stacked.svg", "copanquest-logo-stacked.png", 1200);
await png("copanquest-logo-horizontal.svg", "copanquest-logo-horizontal.png", 2000);
await png("copanquest-logo-dark.svg", "copanquest-logo-dark.png", 2000);
await png("copanquest-logo-square.svg", "copanquest-logo-square.png", 2048);
await png("copanquest-logo-square.svg", "copanquest-logo-square-1024.png", 1024);
console.log(fs.readdirSync(out).filter((f) => !f.startsWith("._")).join("\n"));
