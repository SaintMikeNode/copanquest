// Procedural pixel-art textures (original art, generated at startup).
// Style: a vivid "texture pack" look — banded palettes, bevelled stones, grass fringes —
// at one consistent density: 16 px per 0.5 m block (32 px per meter) everywhere.
// Palette follows present-day Copán: grey-beige volcanic tuff with moss and lichen,
// green lawns, reddish soil, orange dirt paths, big tropical trees.
import * as THREE from "three";
import { LAYERS, VARIANTS, type LayerName, PLANTS, type PlantName } from "./blocks";

export const TEX = 16;

export type RGB = [number, number, number];
export const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const pal = (...h: string[]) => h.map(hex);

/** Small deterministic PRNG so textures look the same on every load. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const P = {
  // Lawn: a softer, slightly yellow green like Copán's sunny lawns (not neon).
  grass: pal("#43602a", "#587a2f", "#71933c", "#89aa48", "#a3c25a"),
  dirt: pal("#5a3222", "#72412b", "#8a5234", "#a3633e", "#b9764a"),
  path: pal("#8f4a2c", "#a85a36", "#bd6b41", "#cf7f50", "#df9663"),
  stone: pal("#58564e", "#706d63", "#8a8679", "#a5a090", "#bfb9a6", "#d3cdb9"),
  moss: pal("#44622a", "#577a33", "#6d943f", "#84ab4b"),
  lichen: pal("#c4a04a", "#b6c08c", "#d9d2a8"),
  gravel: pal("#857a69", "#9d917d", "#b6aa94", "#cdc2aa"),
  sand: pal("#c2a26f", "#d3b783", "#e1c896", "#ecd8aa"),
  leaves: pal("#174a1c", "#215f24", "#2e762d", "#3f8f37", "#57a844"),
  fig: pal("#123a1a", "#1b4d23", "#27632c", "#357a36", "#4a9142"),
  bark: pal("#3f251b", "#553224", "#6b412e", "#82523a", "#966447"),
  logTop: pal("#7a4f33", "#966546", "#b07d58", "#c7966d"),
  canvas: pal("#bfb8a5", "#d4cdb9", "#e5dfcd", "#f3eee0"),
  wood: pal("#5f3d22", "#78502c", "#916236", "#a87542"),
  rock: pal("#4f4d48", "#66645e", "#7e7b74", "#98958e"),
  water: pal("#1b55a3", "#2368bf", "#2f80d8", "#4b9ceb", "#79bdf6"),
  adobe: pal("#9c7a52", "#b8956a", "#cdab7f", "#dcbf95", "#e9d2ab"),
  thatch: pal("#6e5124", "#8c6a30", "#a9843e", "#c49e4f", "#dab865"),
  clay: pal("#8a3e22", "#a6502c", "#c46a3a", "#d9854e"),
  maize: pal("#b07a12", "#d69a1c", "#f0bd2e", "#ffd95a"),
};

class Tile {
  px: Uint8ClampedArray;
  constructor(
    public w = TEX,
    public h = TEX,
  ) {
    this.px = new Uint8ClampedArray(w * h * 4);
  }
  set(x: number, y: number, c: RGB, a = 255) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
    this.px[i + 3] = a;
  }
  /** Fill from a palette with noise: each pixel picks a band around `level`. */
  fill(p: RGB[], level: number, spread: number, r: () => number) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) this.set(x, y, pick(p, level + (r() - 0.5) * 2 * spread));
  }
}

const pick = (p: RGB[], v: number) => p[Math.max(0, Math.min(p.length - 1, Math.round(v)))];

/** Cut-stone courses: blocks with bevelled edges and dark joints (Copán tuff masonry). */
function masonry(t: Tile, r: () => number, opts: { moss?: number; lichen?: number; rows?: number[] } = {}) {
  const rows = opts.rows ?? [0, 5, 11, 16];
  for (let ri = 0; ri < rows.length - 1; ri++) {
    const y0 = rows[ri];
    const y1 = rows[ri + 1];
    // Irregular block widths per course.
    let x = -Math.floor(r() * 6);
    while (x < TEX) {
      const w = 5 + Math.floor(r() * 6);
      const base = 2.6 + (r() - 0.5) * 1.4;
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x; xx < x + w; xx++) {
          if (xx < 0 || xx >= TEX) continue;
          let v = base + (r() - 0.5) * 0.9;
          if (yy === y1 - 1 || xx === x + w - 1) v = 0; // joint
          else if (yy === y0 || xx === x) v += 1.3; // lit bevel
          else if (yy === y1 - 2 || xx === x + w - 2) v -= 0.8; // shaded bevel
          t.set(xx, yy, pick(P.stone, v));
        }
      x += w;
    }
  }
  sprinkle(t, r, opts.moss ?? 0.04, opts.lichen ?? 0.03);
}

function sprinkle(t: Tile, r: () => number, moss: number, lichen: number) {
  for (let y = 0; y < t.h; y++)
    for (let x = 0; x < t.w; x++) {
      const q = r();
      if (q < moss) t.set(x, y, pick(P.moss, r() * 3));
      else if (q < moss + lichen) t.set(x, y, pick(P.lichen, r() * 2));
    }
}

/** Grass overhang along the top rows (image row 0 is the top of the block face). */
function grassFringe(t: Tile, r: () => number, min = 2, max = 5) {
  for (let x = 0; x < TEX; x++) {
    const d = min + Math.floor(r() * (max - min + 1));
    for (let y = 0; y < d; y++) t.set(x, y, pick(P.grass, y === d - 1 ? 1 : 2 + r() * 2));
  }
}

function pebbles(t: Tile, r: () => number, p: RGB[], n: number) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * TEX);
    const y = Math.floor(r() * TEX);
    const v = 2 + r() * (p.length - 2);
    t.set(x, y, pick(p, v + 1));
    t.set(x + 1, y, pick(p, v));
    t.set(x, y + 1, pick(p, v - 1));
    t.set(x + 1, y + 1, pick(p, v - 2));
  }
}

const painters: Record<LayerName, (t: Tile, r: () => number, variant: number) => void> = {
  grassTop(t, r) {
    t.fill(P.grass, 2, 0.9, r);
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(r() * TEX);
      const y = Math.floor(r() * TEX);
      t.set(x, y, P.grass[4]);
      t.set(x, y + 1, P.grass[3]);
    }
    for (let i = 0; i < 6; i++) t.set(Math.floor(r() * TEX), Math.floor(r() * TEX), P.grass[0]);
  },
  grassSide(t, r) {
    t.fill(P.dirt, 2, 1, r);
    pebbles(t, r, P.dirt, 3);
    grassFringe(t, r, 3, 6);
  },
  dirt(t, r) {
    t.fill(P.dirt, 2, 1, r);
    pebbles(t, r, P.dirt, 4);
  },
  path(t, r) {
    for (let y = 0; y < TEX; y++)
      for (let x = 0; x < TEX; x++) {
        const stripe = (x + y) % 6 < 3 ? 0.4 : -0.3;
        t.set(x, y, pick(P.path, 2.2 + stripe + (r() - 0.5) * 1.2));
      }
    pebbles(t, r, P.gravel, 2);
  },
  stone(t, r, v) {
    masonry(t, r, { moss: v === 2 ? 0.1 : 0.03, lichen: v === 1 ? 0.07 : 0.03 });
  },
  stoneTop(t, r, v) {
    masonry(t, r, { rows: [0, 8, 16], moss: v === 2 ? 0.16 : 0.07, lichen: 0.03 });
  },
  grassStone(t, r, v) {
    masonry(t, r, { moss: v === 2 ? 0.08 : 0.03, lichen: 0.03, rows: [0, 6, 11, 16] });
    grassFringe(t, r, 2, v === 1 ? 6 : 4);
  },
  stair(t, r) {
    // Riser face: worn nosing on top, shadow under it, stone below.
    masonry(t, r, { rows: [0, 16], moss: 0.03, lichen: 0.02 });
    for (let x = 0; x < TEX; x++) {
      t.set(x, 0, pick(P.stone, 5 - r()));
      t.set(x, 1, pick(P.stone, 4));
      t.set(x, 2, pick(P.stone, 1));
    }
  },
  stairTop(t, r) {
    t.fill(P.stone, 3.6, 0.8, r);
    for (let x = 0; x < TEX; x++) t.set(x, TEX - 1, pick(P.stone, 5));
    sprinkle(t, r, 0.03, 0.04);
  },
  glyph(t, r) {
    // Two carved glyph blocks per riser (Hieroglyphic Stairway), warm weathered tuff.
    t.fill(P.stone, 3, 0.6, r);
    for (const ox of [0, 8]) {
      for (let y = 3; y < 15; y++)
        for (let x = 1; x < 7; x++) {
          const edge = y === 3 || y === 14 || x === 1 || x === 6;
          const corner = (y === 3 || y === 14) && (x === 1 || x === 6);
          if (corner) continue;
          if (edge) t.set(ox + x, y, pick(P.stone, y === 3 || x === 1 ? 4.5 : 1));
          else if (r() < 0.35) t.set(ox + x, y, pick(P.stone, 1.5));
        }
      t.set(ox + 3, 7, P.stone[0]);
      t.set(ox + 4, 7, P.stone[0]);
      t.set(ox + 3, 10, P.stone[5]);
    }
    for (let x = 0; x < TEX; x++) {
      t.set(x, 0, pick(P.stone, 5));
      t.set(x, 1, pick(P.stone, 1));
    }
    sprinkle(t, r, 0.02, 0.05);
  },
  rubble(t, r) {
    t.fill(P.stone, 2, 0.6, r);
    for (let i = 0; i < 7; i++) {
      const cx = Math.floor(r() * TEX);
      const cy = Math.floor(r() * TEX);
      const s = 2 + Math.floor(r() * 3);
      for (let y = -s; y <= s; y++)
        for (let x = -s; x <= s; x++)
          if (x * x + y * y <= s * s) t.set(cx + x, cy + y, pick(P.stone, 3.5 - (x + y) * 0.35 + (r() - 0.5)));
    }
    sprinkle(t, r, 0.14, 0.04);
  },
  gravel(t, r) {
    t.fill(P.gravel, 1.6, 0.9, r);
    pebbles(t, r, P.gravel, 9);
  },
  sand(t, r) {
    for (let y = 0; y < TEX; y++)
      for (let x = 0; x < TEX; x++) t.set(x, y, pick(P.sand, 1.8 + Math.sin((x + y * 2) * 0.7) * 0.5 + (r() - 0.5)));
  },
  leaves(t, r) {
    t.fill(P.leaves, 1.2, 0.8, r);
    for (let i = 0; i < 11; i++) {
      const x = Math.floor(r() * TEX);
      const y = Math.floor(r() * TEX);
      t.set(x, y, P.leaves[4]);
      t.set(x + 1, y, P.leaves[3]);
      t.set(x, y + 1, P.leaves[3]);
      t.set(x + 1, y + 1, P.leaves[2]);
    }
    for (let i = 0; i < 6; i++) t.set(Math.floor(r() * TEX), Math.floor(r() * TEX), P.leaves[0]);
  },
  fig(t, r) {
    t.fill(P.fig, 1.4, 0.8, r);
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(r() * TEX);
      const y = Math.floor(r() * TEX);
      t.set(x, y, P.fig[4]);
      t.set(x + 1, y + 1, P.fig[3]);
      t.set(x - 1, y + 1, P.fig[3]);
    }
  },
  logSide(t, r) {
    for (let x = 0; x < TEX; x++) {
      const groove = r() < 0.3;
      for (let y = 0; y < TEX; y++) t.set(x, y, pick(P.bark, groove ? 0.5 : 2 + (r() - 0.5) * 1.6));
    }
    sprinkle(t, r, 0.05, 0.02);
  },
  logTop(t, r) {
    for (let y = 0; y < TEX; y++)
      for (let x = 0; x < TEX; x++) {
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        if (d > 6.5) t.set(x, y, pick(P.bark, 1.5 + r()));
        else t.set(x, y, pick(P.logTop, Math.round(d) % 2 ? 2 : 1 + r() * 0.5));
      }
  },
  canvas(t, r) {
    for (let y = 0; y < TEX; y++)
      for (let x = 0; x < TEX; x++) t.set(x, y, pick(P.canvas, 2.4 + ((x + y) % 2 ? 0.3 : -0.3) + (r() - 0.5) * 0.6));
    for (let x = 0; x < TEX; x++) t.set(x, 15, P.canvas[0]);
  },
  wood(t, r) {
    for (let x = 0; x < TEX; x++)
      for (let y = 0; y < TEX; y++) t.set(x, y, pick(P.wood, x % 4 === 3 ? 0 : 2 + (r() - 0.5)));
  },
  rock(t, r) {
    t.fill(P.rock, 2, 0.8, r);
    pebbles(t, r, P.rock, 5);
  },
  adobe(t, r) {
    // Earthen daub over a pole frame: smooth plaster with faint post lines and cracks.
    t.fill(P.adobe, 2.6, 0.7, r);
    for (const x of [3, 11]) for (let y = 0; y < TEX; y++) if (r() < 0.7) t.set(x, y, pick(P.adobe, 1.4));
    for (let i = 0; i < 2; i++) {
      let x = Math.floor(r() * TEX);
      for (let y = Math.floor(r() * 8); y < TEX && r() < 0.9; y++) {
        t.set(x, y, P.adobe[0]);
        x += r() < 0.3 ? 1 : 0;
      }
    }
    for (let x = 0; x < TEX; x++) if (r() < 0.5) t.set(x, TEX - 1, pick(P.adobe, 1));
  },
  thatch(t, r) {
    // Palm thatch: overlapping rows of drooping strands.
    for (let y = 0; y < TEX; y++)
      for (let x = 0; x < TEX; x++) {
        const row = y % 5;
        const strand = (x + Math.floor(y / 5) * 2) % 3 === 0 ? -0.8 : 0;
        t.set(x, y, pick(P.thatch, 3.2 - row * 0.45 + strand + (r() - 0.5) * 0.9));
      }
    for (let x = 0; x < TEX; x++) for (const y of [4, 9, 14]) if (r() < 0.8) t.set(x, y, P.thatch[0]);
  },
  ladder(t, r) {
    // Two rails and three rungs on a dark (see-through-looking) background.
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) t.set(x, y, pick(P.stone, 1.2 + (r() - 0.5) * 0.6));
    for (let y = 0; y < TEX; y++)
      for (const x of [2, 3, 12, 13]) t.set(x, y, pick(P.wood, x === 2 || x === 12 ? 3 : 1.6));
    for (const y of [2, 7, 12]) for (let x = 2; x < 14; x++) {
      t.set(x, y, pick(P.wood, 3));
      t.set(x, y + 1, pick(P.wood, 1));
    }
  },
  cloth(t, r) {
    const stripes = [hex("#d23a2e"), hex("#f2c42c"), hex("#f4f1e8"), hex("#1f62d0")];
    for (let y = 0; y < TEX; y++)
      for (let x = 0; x < TEX; x++) {
        const c = stripes[Math.floor(x / 4) % 4];
        const k = 0.92 + r() * 0.12 - ((x + y) % 2) * 0.04;
        t.set(x, y, [c[0] * k, c[1] * k, c[2] * k]);
      }
  },
  pottery(t, r) {
    t.fill(P.clay, 2, 0.6, r);
    for (let x = 0; x < TEX; x++) {
      t.set(x, 4, hex("#2a1a12"));
      if (x % 4 < 2) t.set(x, 6, hex("#f1e6cf"));
      t.set(x, 8, hex("#2a1a12"));
    }
  },
  earth(t, r) {
    t.fill(P.adobe, 1.6, 0.8, r);
    pebbles(t, r, P.adobe, 3);
  },
  rosaRed(t, r) {
    // Rosalila's red stucco, still glowing after being sealed in white plaster.
    t.fill(pal("#8e2a1c", "#a8361f", "#bf4428", "#d25a3a"), 2, 0.6, r);
  },
  rosaGreen(t, r) {
    t.fill(pal("#24614a", "#2f7a5c", "#3f8f6a", "#58a882"), 2, 0.6, r);
    for (let x = 0; x < TEX; x++) {
      t.set(x, 0, hex("#e3b23c"));
      t.set(x, TEX - 1, hex("#1a3a2c"));
    }
  },
  rosaYellow(t, r) {
    t.fill(pal("#b8861c", "#d69a1c", "#e3b23c", "#f2cc5a"), 2, 0.6, r);
    for (let x = 0; x < TEX; x += 4) for (let y = 0; y < TEX; y++) t.set(x, y, hex("#a8361f"));
  },
  rosaMask(t, r) {
    // Sun-bird deity mask (Rosalila's facade): yellow face, round eyes, hooked beak, green plumes.
    t.fill(pal("#a8361f", "#bf4428"), 0.5, 0.5, r);
    const G = hex("#3f8f6a");
    const GL = hex("#58a882");
    const Y = hex("#e3b23c");
    const YL = hex("#f2cc5a");
    const W = hex("#f1ead8");
    const K = hex("#2a1a12");
    for (let y = 1; y < 15; y++) {
      t.set(0, y, G);
      t.set(1, y, y % 2 ? GL : G);
      t.set(15, y, G);
      t.set(14, y, y % 2 ? GL : G);
    }
    for (let x = 2; x < 14; x++) t.set(x, 1, x % 2 ? G : GL);
    for (let y = 3; y < 10; y++) for (let x = 3; x < 13; x++) t.set(x, y, y === 3 ? YL : Y);
    for (const ex of [4, 9]) {
      for (let y = 4; y < 7; y++) for (let x = ex; x < ex + 3; x++) t.set(x, y, W);
      t.set(ex + 1, 5, K);
    }
    // Hooked beak.
    for (let x = 6; x < 10; x++) t.set(x, 8, hex("#d98a2a"));
    for (let x = 6; x < 10; x++) t.set(x, 9, hex("#d98a2a"));
    t.set(7, 10, hex("#d98a2a"));
    t.set(8, 10, hex("#d98a2a"));
    t.set(8, 11, hex("#b5651d"));
    for (let x = 3; x < 13; x++) t.set(x, 13, x % 3 ? Y : G);
  },
  blossom(t, r) {
    t.fill(pal("#a8487a", "#c95c96", "#e27ab0", "#f29cc8", "#ffc2de"), 2.2, 0.9, r);
    for (let i = 0; i < 7; i++) t.set(Math.floor(r() * TEX), Math.floor(r() * TEX), P.leaves[2]);
  },
  blossomYellow(t, r) {
    t.fill(pal("#c08a12", "#d9a41c", "#f0c22e", "#ffd95a", "#fff09a"), 2.2, 0.9, r);
    for (let i = 0; i < 7; i++) t.set(Math.floor(r() * TEX), Math.floor(r() * TEX), P.leaves[2]);
  },
  maize(t, r) {
    // Cobs lying in a pile.
    t.fill(P.maize, 1, 0.5, r);
    for (let i = 0; i < 6; i++) {
      const x0 = Math.floor(r() * 12);
      const y = Math.floor(r() * 15);
      for (let x = x0; x < x0 + 5; x++) {
        t.set(x, y, pick(P.maize, x % 2 ? 3 : 2.4));
        t.set(x, y + 1, pick(P.maize, 1.5));
      }
    }
  },
};

/** Block textures: LAYERS × VARIANTS tiles in a mipmapped, nearest-filtered texture array. */
export function createBlockTextures(): THREE.DataArrayTexture {
  const count = LAYERS.length * VARIANTS;
  const data = new Uint8Array(TEX * TEX * 4 * count);
  LAYERS.forEach((name, layer) => {
    for (let v = 0; v < VARIANTS; v++) {
      const t = new Tile();
      painters[name](t, rng(1000 + layer * 7919 + v * 104729), v);
      // Row 0 of the texture is v = 0 (bottom of a block face), so flip vertically.
      const dst = (layer * VARIANTS + v) * TEX * TEX * 4;
      for (let y = 0; y < TEX; y++) {
        const src = (TEX - 1 - y) * TEX * 4;
        data.set(t.px.subarray(src, src + TEX * 4), dst + y * TEX * 4);
      }
    }
  });
  const tex = new THREE.DataArrayTexture(data, TEX, TEX, count);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------- plants (cutout, 16 × 32)

const PH = 32;

function blade(t: Tile, r: () => number, x0: number, height: number, p: RGB[]) {
  let x = x0;
  const lean = (r() - 0.5) * 0.5;
  for (let i = 0; i < height; i++) {
    const y = PH - 1 - i;
    t.set(Math.round(x), y, pick(p, 1 + (i / height) * (p.length - 1.5)));
    x += lean;
  }
}

function stemWithLeaves(t: Tile, r: () => number, x: number, top: number) {
  for (let y = PH - 1; y >= top; y--) t.set(x, y, P.grass[1]);
  for (let k = 0; k < 2; k++) {
    const y = PH - 4 - Math.floor(r() * (PH - top - 6));
    t.set(x - 1, y, P.grass[2]);
    t.set(x - 2, y - 1, P.grass[3]);
    t.set(x + 1, y + 1, P.grass[2]);
    t.set(x + 2, y, P.grass[3]);
  }
}

function flowerHead(t: Tile, cx: number, cy: number, petals: RGB[], center: RGB) {
  t.set(cx, cy - 1, petals[1]);
  t.set(cx - 1, cy, petals[0]);
  t.set(cx + 1, cy, petals[1]);
  t.set(cx, cy + 1, petals[0]);
  t.set(cx - 1, cy - 1, petals[2] ?? petals[1]);
  t.set(cx + 1, cy + 1, petals[0]);
  t.set(cx, cy, center);
}

const plantPainters: Record<PlantName, (t: Tile, r: () => number) => void> = {
  tallGrass(t, r) {
    for (let i = 0; i < 9; i++) blade(t, r, 2 + r() * 12, 14 + Math.floor(r() * 16), P.grass);
  },
  grass(t, r) {
    for (let i = 0; i < 8; i++) blade(t, r, 2 + r() * 12, 6 + Math.floor(r() * 8), P.grass);
  },
  fern(t, r) {
    for (let f = 0; f < 5; f++) {
      const dir = f - 2;
      let x = 8;
      for (let i = 0; i < 16; i++) {
        const y = PH - 1 - i + Math.floor((i * i * Math.abs(dir)) / 60);
        x += dir * 0.35;
        t.set(Math.round(x), y, pick(P.leaves, 2 + i / 8));
        if (i % 2 === 0 && i > 2) {
          t.set(Math.round(x) - 1, y - 1, P.leaves[3]);
          t.set(Math.round(x) + 1, y - 1, P.leaves[3]);
        }
      }
      void r;
    }
  },
  flowerRed(t, r) {
    for (const x of [4, 10]) {
      const top = 14 + Math.floor(r() * 6);
      stemWithLeaves(t, r, x, top);
      flowerHead(t, x, top, pal("#b51f2a", "#e0353b", "#ff6a5c"), hex("#ffd34a"));
    }
  },
  flowerYellow(t, r) {
    for (const x of [5, 11]) {
      const top = 15 + Math.floor(r() * 6);
      stemWithLeaves(t, r, x, top);
      flowerHead(t, x, top, pal("#d69a12", "#f2c42c", "#ffe36a"), hex("#8a4a12"));
    }
  },
  flowerPink(t, r) {
    for (const x of [3, 8, 12]) {
      const top = 16 + Math.floor(r() * 6);
      stemWithLeaves(t, r, x, top);
      flowerHead(t, x, top, pal("#c2457e", "#e86aa4", "#ff9cc8"), hex("#fff2a8"));
    }
  },
  flowerWhite(t, r) {
    for (const x of [4, 11]) {
      const top = 17 + Math.floor(r() * 5);
      stemWithLeaves(t, r, x, top);
      flowerHead(t, x, top, pal("#d8d8e6", "#f4f4fa", "#ffffff"), hex("#f2c42c"));
    }
  },
  flowerBlue(t, r) {
    for (const x of [6, 10]) {
      const top = 15 + Math.floor(r() * 6);
      stemWithLeaves(t, r, x, top);
      flowerHead(t, x, top, pal("#4053b8", "#6a7fe0", "#a3b4ff"), hex("#ffffff"));
    }
  },
  heliconia(t, r) {
    // Lobster-claw heliconia: tall stalk with alternating red bracts tipped yellow.
    for (let y = PH - 1; y >= 4; y--) t.set(8, y, P.grass[1]);
    for (let k = 0; k < 2; k++) {
      // big paddle leaves
      const side = k ? 1 : -1;
      for (let i = 0; i < 9; i++) {
        t.set(8 + side * (1 + Math.floor(i / 2)), PH - 6 - i, P.leaves[2 + (i % 2)]);
        t.set(8 + side * (2 + Math.floor(i / 2)), PH - 6 - i, P.leaves[3]);
      }
    }
    for (let b = 0; b < 4; b++) {
      const y = 6 + b * 4;
      const side = b % 2 ? 1 : -1;
      for (let i = 0; i < 4; i++) t.set(8 + side * (i + 1), y + (i >> 1), hex(i === 3 ? "#f2c42c" : "#d42a2a"));
      t.set(8 + side * 4, y - 1, hex("#3f8f37"));
    }
    void r;
  },
  maizeLow(t, r) {
    for (let y = 0; y < PH; y++) {
      t.set(7, y, P.grass[1]);
      t.set(8, y, P.grass[2]);
    }
    for (let k = 0; k < 4; k++) maizeLeaf(t, 8, PH - 6 - k * 7, k % 2 ? 1 : -1, 8);
    // An ear of maize in its husk.
    for (let y = 10; y < 16; y++) {
      t.set(9, y, hex("#b9c46a"));
      t.set(10, y, hex("#a7b45a"));
    }
    t.set(10, 9, hex("#c98a3a"));
    void r;
  },
  maizeTop(t, r) {
    for (let y = 12; y < PH; y++) {
      t.set(7, y, P.grass[1]);
      t.set(8, y, P.grass[2]);
    }
    for (let k = 0; k < 2; k++) maizeLeaf(t, 8, PH - 4 - k * 8, k % 2 ? -1 : 1, 7);
    // Tassel.
    for (let i = 0; i < 6; i++) {
      t.set(8 - Math.floor(i / 2), 12 - i, hex("#d9b45a"));
      t.set(8 + Math.floor(i / 2), 12 - i, hex("#e6c46a"));
      t.set(8, 12 - i, hex("#c9a04a"));
    }
    void r;
  },
  agave(t, r) {
    // Maguey: stiff blue-green leaves fanning from the ground.
    const A = pal("#3f6f5e", "#4f8a74", "#66a38a", "#86bca2");
    for (let k = -3; k <= 3; k++) {
      const len = 12 - Math.abs(k) * 2 + Math.floor(r() * 2);
      for (let i = 0; i < len; i++) {
        const x = 8 + Math.round(k * i * 0.32);
        const y = PH - 1 - i;
        t.set(x, y, pick(A, 1 + (i / len) * 2.5));
        if (i < len - 3) t.set(x + (k >= 0 ? 1 : -1), y, A[0]);
      }
    }
  },
  squash(t, r) {
    // Squash vine: big round leaves and a yellow flower near the ground.
    for (let k = 0; k < 4; k++) {
      const cx = 3 + Math.floor(r() * 10);
      const cy = PH - 3 - Math.floor(r() * 5);
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) t.set(cx + x, cy + y, pick(P.grass, 2 + (x + y) * 0.3));
    }
    flowerHead(t, 8, PH - 6, pal("#e8a812", "#f2c42c", "#ffe36a"), hex("#e07a12"));
  },
};

function maizeLeaf(t: Tile, x: number, y: number, dir: number, len: number) {
  for (let i = 0; i < len; i++) {
    t.set(x + dir * i, y - Math.floor(i / 2) + Math.floor((i * i) / 18), P.grass[2 + (i % 2)]);
  }
}

/** Plant textures (RGBA cutout, 16 × 32 px = 0.5 × 1 m), texture array. */
export function createPlantTextures(): THREE.DataArrayTexture {
  const data = new Uint8Array(TEX * PH * 4 * PLANTS.length);
  PLANTS.forEach((name, layer) => {
    const t = new Tile(TEX, PH);
    plantPainters[name](t, rng(5000 + layer * 31337));
    const dst = layer * TEX * PH * 4;
    for (let y = 0; y < PH; y++) {
      const src = (PH - 1 - y) * TEX * 4;
      data.set(t.px.subarray(src, src + TEX * 4), dst + y * TEX * 4);
    }
  });
  const tex = new THREE.DataArrayTexture(data, TEX, PH, PLANTS.length);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** Animated water tile (16 × 16), a few frames stacked in a texture array. */
export function createWaterTexture(frames = 8): THREE.DataArrayTexture {
  const data = new Uint8Array(TEX * TEX * 4 * frames);
  for (let f = 0; f < frames; f++) {
    const t = new Tile();
    const r = rng(777);
    for (let y = 0; y < TEX; y++)
      for (let x = 0; x < TEX; x++) {
        const wave = Math.sin(((x + f * 2) / TEX) * Math.PI * 2 + y * 0.9) + Math.sin(((y - f) / TEX) * Math.PI * 4 + x * 0.4);
        let v = 2 + wave * 0.7 + (r() - 0.5) * 0.5;
        if (wave > 1.45) v = 4.5;
        t.set(x, y, pick(P.water, v), 215);
      }
    data.set(t.px, f * TEX * TEX * 4);
  }
  const tex = new THREE.DataArrayTexture(data, TEX, TEX, frames);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export { Tile, pick };
