// The CopánQuest icon: a stepped Maya temple built from voxels, drawn in isometric view, with a
// pixel sun behind it on the game's dark jade tile. Red-painted stucco like Copán around AD 800,
// a gold stairway up the front to a cream temple with a dark doorway and a roof comb.
// Pure SVG (no dependencies): used by branding/build-logo.mjs (logo files) and
// scripts/make-icons.mjs (public/favicon.svg and the PWA icons).

const C = {
  red: "#b3402a",
  redLight: "#c9553a",
  gold: "#e9b949",
  cream: "#e8dcc0",
  dark: "#2a211c",
  sun: "#f2c14e",
  jadeTop: "#0d2a20",
  jadeBottom: "#06140f",
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const shade = (c, k) => toHex(hex(c).map((v) => v * k));
const hash = (x, y, z) => {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** A slight per-voxel color jitter, like the game's block textures. */
const jitter = (c, x, y, z, amt) => shade(c, 1 + (hash(x, y, z) - 0.5) * 2 * amt);

/** The temple as voxels: Map "x,y,z" → { x, y, z, color, top?, left? (+z face), right? (+x face) }. */
function temple() {
  const v = new Map();
  const set = (x, y, z, color, faces = {}) => v.set(`${x},${y},${z}`, { x, y, z, color, ...faces });
  const box = (x0, y0, z0, x1, y1, z1, color, faces) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, color, faces);
  };
  // Three stepped tiers, two voxels tall each: 9×9, 7×7, 5×5.
  box(0, 0, 0, 8, 1, 8, C.red, { top: C.redLight });
  box(1, 2, 1, 7, 3, 7, C.red, { top: C.redLight });
  box(2, 4, 2, 6, 5, 6, C.red, { top: C.redLight });
  // A stairway projecting from the front (+z), three wide, gold steps between red side walls.
  for (let z = 6; z <= 11; z++)
    for (let x = 3; x <= 5; x++) for (let y = 0; y < 12 - z; y++) set(x, y, z, x === 4 ? C.gold : C.redLight, { top: C.gold });
  // The temple on top: cream walls, a dark doorway facing the stair, a red frieze and a roof comb
  // with a slot through it.
  box(2, 6, 2, 6, 8, 5, C.cream);
  set(4, 6, 5, C.cream, { left: C.dark });
  set(4, 7, 5, C.cream, { left: C.dark });
  for (let x = 2; x <= 6; x++) set(x, 8, 5, C.red, { top: C.redLight });
  for (let z = 2; z <= 5; z++) set(6, 8, z, C.red, { top: C.redLight });
  box(2, 8, 2, 5, 8, 4, C.red, { top: C.redLight });
  box(3, 9, 3, 5, 10, 3, C.red, { top: C.redLight });
  v.delete("4,9,3");
  return v;
}

const COS = Math.cos(Math.PI / 6);
/** Isometric projection: x runs right-down, z left-down, y up. */
const proj = (x, y, z) => [(x - z) * COS, (x + z) * 0.5 - y];

/** The visible faces of the voxels as polygons, fitted into a `size` box with `margin`. */
function voxelPolygons(vox, size, margin, dy, decimals) {
  const list = [...vox.values()];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const { x, y, z } of list)
    for (const [a, b, c] of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]]) {
      const [px, py] = proj(x + a, y + b, z + c);
      minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
  const s = Math.min((size - 2 * margin) / (maxX - minX), (size - 2 * margin) / (maxY - minY));
  const ox = size / 2 - ((minX + maxX) / 2) * s;
  const oy = size / 2 - ((minY + maxY) / 2) * s + dy * size;
  const P = (x, y, z) => {
    const [px, py] = proj(x, y, z);
    return `${+(px * s + ox).toFixed(decimals)},${+(py * s + oy).toFixed(decimals)}`;
  };
  const has = (x, y, z) => vox.has(`${x},${y},${z}`);
  list.sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z) || a.y - b.y || a.x - b.x);
  const line = +Math.max(0.15, s * 0.045).toFixed(decimals);
  let out = "";
  for (const q of list) {
    const { x, y, z } = q;
    const faces = [];
    if (!has(x, y + 1, z)) faces.push([q.top ?? q.color, 1.0, [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)]]);
    if (!has(x, y, z + 1)) faces.push([q.left ?? q.color, 0.8, [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)]]);
    if (!has(x + 1, y, z)) faces.push([q.right ?? q.color, 0.62, [P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)]]);
    for (const [c, k, pts] of faces) {
      const fill = jitter(shade(c, k), x, y + k * 7, z, 0.06);
      out += `<polygon points="${pts.join(" ")}" fill="${fill}" stroke="${shade(fill, 0.78)}"/>`;
    }
  }
  return `<g stroke-width="${line}" stroke-linejoin="round">${out}</g>`;
}

/** The pixel sun: a disc of square cells. */
function sun(cx, cy, r, cell, decimals) {
  let out = "";
  const f = (n) => +n.toFixed(decimals);
  for (let y = -r; y < r - 1e-9; y += cell)
    for (let x = -r; x < r - 1e-9; x += cell)
      if ((x + cell / 2) ** 2 + (y + cell / 2) ** 2 <= r * r) out += `<rect x="${f(cx + x)}" y="${f(cy + y)}" width="${f(cell * 1.04)}" height="${f(cell * 1.04)}"/>`;
  return `<g fill="${C.sun}" opacity="0.95">${out}</g>`;
}

/**
 * The icon's inner markup for a `size`×`size` box.
 * - `tile`: "rounded" (the brand tile, favicon), "square" (full-bleed app icons) or "none".
 * - `pad`: extra inset of the drawing as a fraction of the size (maskable icons need ~0.1).
 * - `id`: gradient id (unique per document when several icons share one SVG).
 */
export function iconInner(size, { tile = "rounded", pad = 0, id = "cq-icon-bg" } = {}) {
  const decimals = 1;
  const inset = pad * size;
  const inner = size - 2 * inset;
  const bg =
    tile === "none"
      ? ""
      : `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.jadeTop}"/><stop offset="1" stop-color="${C.jadeBottom}"/></linearGradient></defs>` +
        `<rect width="${size}" height="${size}"${tile === "rounded" ? ` rx="${+(size * 0.19).toFixed(2)}"` : ""} fill="url(#${id})"/>`;
  const art =
    sun(inner * 0.66, inner * 0.3, inner * 0.17, inner * 0.024, decimals) + voxelPolygons(temple(), inner, inner * 0.13, 0.04, decimals);
  return bg + (inset ? `<g transform="translate(${+inset.toFixed(2)} ${+inset.toFixed(2)})">${art}</g>` : art);
}

/** A complete SVG document of the icon. */
export function iconSvg(size, opts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${iconInner(size, opts)}</svg>\n`;
}
