// Pixel-art carvings for stelae and altars, at the world's density (32 px per meter).
// Each face is drawn as a relief height map (what is carved deep, what stands out), then
// lit like stone: lit upper-left edges, shadowed lower-right, dark recesses, plus weathering,
// lichen and moss. Compositions follow photos of the Great Plaza stelae (Wikimedia Commons):
// ruler in high relief with a tall headdress, ceremonial bar across the chest, heavy
// apron, sandals; glyph columns on the sides.
import * as THREE from "three";
import { P, rng, pick, type RGB } from "./textures";

export const PX_PER_M = 32;

class Relief {
  h: Float32Array;
  constructor(
    public w: number,
    public hgt: number,
    base = 0.15,
  ) {
    this.h = new Float32Array(w * hgt).fill(base);
  }
  set(x: number, y: number, v: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.hgt) return;
    this.h[y * this.w + x] = v;
  }
  get(x: number, y: number) {
    x = Math.max(0, Math.min(this.w - 1, x));
    y = Math.max(0, Math.min(this.hgt - 1, y));
    return this.h[y * this.w + x];
  }
  rect(x0: number, y0: number, w: number, h: number, v: number) {
    for (let y = Math.round(y0); y < Math.round(y0 + h); y++) for (let x = Math.round(x0); x < Math.round(x0 + w); x++) this.set(x, y, v);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, v: number) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, v);
  }
  line(x0: number, y0: number, x1: number, y1: number, v: number, t = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.rect(x0 + ((x1 - x0) * i) / n - (t - 1) / 2, y0 + ((y1 - y0) * i) / n - (t - 1) / 2, t, t, v);
  }
  frame(v = 0.6) {
    for (let x = 0; x < this.w; x++) {
      this.set(x, 0, v);
      this.set(x, this.hgt - 1, v);
    }
    for (let y = 0; y < this.hgt; y++) {
      this.set(0, y, v);
      this.set(this.w - 1, y, v);
    }
  }
}

interface FigureOpts {
  macawCorners?: boolean;
  beard?: boolean;
  jadeSkirt?: boolean;
  ballplayer?: boolean;
}

/** Ruler in high relief, scaled to the face size. */
function figure(R: Relief, r: () => number, o: FigureOpts) {
  const sx = R.w / 32;
  const sy = R.hgt / 112;
  const X = (x: number) => x * sx;
  const Y = (y: number) => y * sy;
  const rect = (x: number, y: number, w: number, h: number, v: number) => R.rect(X(x), Y(y), w * sx, h * sy, v);
  const ell = (x: number, y: number, rx: number, ry: number, v: number) => R.ellipse(X(x), Y(y), rx * sx, ry * sy, v);

  R.frame(0.55);
  // Headdress: feather crest, deity mask, headband, side plumes.
  for (let i = 0; i < 6; i++) {
    const fx = 3 + i * 5;
    rect(fx, 2 + (i % 2) * 2, 3, 9, 0.62 + r() * 0.1);
    rect(fx + 1, 2 + (i % 2) * 2, 1, 9, 0.45);
  }
  if (o.macawCorners) {
    for (const [cx, dir] of [[4, 1], [28, -1]] as const) {
      rect(cx - 3, 2, 6, 6, 0.85);
      R.line(X(cx), Y(8), X(cx + dir * 3), Y(12), 0.85, 2 * sx);
      rect(cx - dir * 1, 4, 1, 1, 0.3);
    }
  }
  rect(6, 11, 20, 13, 0.74);
  rect(9, 14, 4, 3, 0.35);
  rect(19, 14, 4, 3, 0.35);
  rect(10, 15, 2, 1, 0.9);
  rect(20, 15, 2, 1, 0.9);
  rect(8, 19, 16, 3, 0.9);
  ell(4, 17, 3, 4, 0.66);
  ell(28, 17, 3, 4, 0.66);
  rect(5, 24, 22, 4, 0.82);
  for (let x = 6; x < 27; x += 3) rect(x, 25, 1.5, 2, 0.97);
  R.line(X(6), Y(28), X(1), Y(36), 0.6, 2 * sx);
  R.line(X(26), Y(28), X(31), Y(36), 0.6, 2 * sx);
  // Face, earflares.
  ell(16, 36, 6, 8, 0.86);
  rect(12, 33, 3, 1.4, 0.55);
  rect(18, 33, 3, 1.4, 0.55);
  rect(15.5, 35, 1.5, 4, 1.0);
  rect(14, 41, 5, 1, 0.6);
  for (const ex of [8, 24]) {
    ell(ex, 37, 3, 3, 0.8);
    ell(ex, 37, 1, 1, 0.4);
  }
  if (o.beard) for (let x = 12; x < 21; x += 2) rect(x, 42, 1, 6, 0.72);
  // Collar of beads and pectoral.
  for (let x = 7; x <= 25; x += 2) ell(x, 47 + Math.abs(x - 16) / 6, 1, 1, 0.92);
  rect(14, 50, 4, 4, 0.92);
  // Ceremonial bar held across the chest, serpent heads at the ends.
  rect(3, 55, 26, 4, 0.84);
  for (let x = 4; x < 28; x += 3) rect(x, 56, 1, 2, 0.6);
  for (const [hx, dir] of [[1, 1], [27, -1]] as const) {
    rect(hx, 52, 4, 10, 0.76);
    rect(hx + (dir > 0 ? 1 : 2), 54, 1, 1, 0.35);
    rect(hx, 60, 4, 1, 0.5);
  }
  rect(9, 53, 4, 8, 0.96);
  rect(19, 53, 4, 8, 0.96);
  // Belt (or a ballplayer's thick yoke) with small masks.
  if (o.ballplayer) {
    rect(4, 61, 24, 9, 0.9);
    rect(4, 65, 24, 1, 0.6);
  } else {
    rect(5, 62, 22, 6, 0.8);
  }
  for (const mx of [9, 16, 23]) {
    ell(mx, 65, 2, 2, 0.97);
    rect(mx - 1, 64, 1, 1, 0.5);
  }
  // Apron / skirt.
  if (o.jadeSkirt) {
    for (let y = 70; y < 96; y++)
      for (let x = 6; x < 27; x++) if ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0) rect(x, y, 1, 1, 0.86);
  } else {
    rect(12, 70, 8, 26, 0.76);
    for (let y = 72; y < 96; y += 4) rect(12, y, 8, 1, 0.55);
    for (let k = 0; k < 4; k++) {
      rect(6 + k * 1.5, 70, 1, 18 + k * 2, 0.6);
      rect(25 - k * 1.5, 70, 1, 18 + k * 2, 0.6);
    }
  }
  // Small attendant figures at the sides.
  rect(1, 72, 4, 4, 0.66);
  rect(1, 76, 4, 10, 0.58);
  rect(27, 72, 4, 4, 0.66);
  rect(27, 76, 4, 10, 0.58);
  // Legs, ankle cuffs, sandals.
  rect(10, 96, 4, 10, 0.82);
  rect(18, 96, 4, 10, 0.82);
  rect(9, 102, 6, 2, 0.96);
  rect(17, 102, 6, 2, 0.96);
  rect(7, 106, 9, 4, 0.86);
  rect(17, 106, 9, 4, 0.86);
}

/** Columns of glyph blocks (cartouches with signs inside). */
function glyphs(R: Relief, r: () => number, cols: number, fullFigure = false) {
  R.frame(0.55);
  const gw = Math.floor((R.w - 2) / cols);
  const gh = gw;
  for (let gy = 1; gy + gh <= R.hgt - 1; gy += gh)
    for (let c = 0; c < cols; c++) {
      const x0 = 1 + c * gw;
      R.rect(x0 + 1, gy + 1, gw - 2, gh - 2, 0.42);
      // Rounded raised border.
      for (let x = x0 + 2; x < x0 + gw - 2; x++) {
        R.set(x, gy + 1, 0.75);
        R.set(x, gy + gh - 2, 0.6);
      }
      for (let y = gy + 2; y < gy + gh - 2; y++) {
        R.set(x0 + 1, y, 0.75);
        R.set(x0 + gw - 2, y, 0.6);
      }
      const cx = x0 + gw / 2;
      const cy = gy + gh / 2;
      if (fullFigure) {
        // Full-figure glyph: a tiny crouching person/animal.
        R.ellipse(cx - 1, cy - 2, 2, 2, 0.9);
        R.rect(cx - 2, cy, 4, 3, 0.82);
        R.rect(cx - 3, cy + 3, 2, 1, 0.82);
        R.rect(cx + 1, cy + 3, 2, 1, 0.82);
        R.set(cx - 2, cy - 2, 0.3);
      } else {
        // Main sign + affix.
        const k = r();
        if (k < 0.33) R.ellipse(cx, cy, gw / 4, gh / 4, 0.85);
        else if (k < 0.66) R.rect(cx - gw / 4, cy - gh / 5, gw / 2, gh / 2.5, 0.85);
        else {
          R.ellipse(cx - 1, cy, gw / 5, gh / 4, 0.85);
          R.ellipse(cx + 2, cy - 1, gw / 6, gh / 6, 0.9);
        }
        R.set(cx - 1, cy - 1, 0.3);
        R.set(cx + 1, cy, 0.3);
        if (r() < 0.6) R.rect(x0 + 2, gy + 2, 2, gh - 4, 0.8); // prefix
        if (r() < 0.4) for (let x = x0 + 3; x < x0 + gw - 3; x += 2) R.set(x, gy + gh - 3, 0.95); // dots
      }
    }
}

/** Seated ruler (Altar Q side): 4 per side, cross-legged on their name glyphs. */
function seatedRulers(R: Relief, r: () => number) {
  R.frame(0.55);
  const n = 4;
  const cw = R.w / n;
  for (let i = 0; i < n; i++) {
    const cx = i * cw + cw / 2;
    R.rect(cx - cw / 2 + 1, R.hgt - 7, cw - 2, 5, 0.5); // name glyph cushion
    R.rect(cx - 3, R.hgt - 7, 6, 2, 0.85); // crossed legs
    R.rect(cx - 2, R.hgt - 13, 4, 6, 0.82); // torso
    R.ellipse(cx, R.hgt - 16, 2, 2.5, 0.92); // head
    R.rect(cx - 3, R.hgt - 21, 6, 3, 0.7 + r() * 0.15); // headdress
    R.rect(cx + 2, R.hgt - 12, 3, 1, 0.9); // arm reaching to the neighbor
  }
}

/** Lit stone from a relief map. */
function paint(R: Relief, r: () => number, opts: { redTraces?: boolean; mossBottom?: boolean }): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(R.w * R.hgt * 4));
  for (let y = 0; y < R.hgt; y++)
    for (let x = 0; x < R.w; x++) {
      const h = R.get(x, y);
      const lit = (R.get(x - 1, y - 1) - h) * -1 + (h - R.get(x + 1, y + 1));
      let v = 1.4 + h * 3.2 + lit * 5 + (r() - 0.5) * 0.8;
      if (h < 0.2) v -= 0.8;
      let c: RGB = pick(P.stone, v);
      const grime = y / R.hgt;
      if (grime > 0.88 && r() < 0.35) c = pick(P.stone, v - 1.5);
      if (opts.mossBottom && grime > 0.93 && r() < 0.4) c = pick(P.moss, r() * 3);
      const lichen = Math.sin(x * 0.7 + y * 0.31) * Math.sin(y * 0.17 - x * 0.2);
      if (lichen > 0.82 && r() < 0.6) c = pick(P.lichen, r() * 2);
      if (opts.redTraces && h < 0.5 && h > 0.2 && r() < 0.2) c = [150 + r() * 30, 60 + r() * 20, 45];
      const i = (y * R.w + x) * 4;
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = 255;
    }
  return out;
}

export interface MonumentFaces {
  front: Relief;
  back: Relief;
  side: Relief;
  top: Relief;
}

function stelaFaces(id: string, w: number, h: number, d: number, r: () => number): MonumentFaces {
  const W = Math.round(w * PX_PER_M);
  const H = Math.round(h * PX_PER_M);
  const D = Math.round(d * PX_PER_M);
  const front = new Relief(W, H);
  const back = new Relief(W, H);
  const side = new Relief(D, H);
  const top = new Relief(W, D, 0.5);
  const o: FigureOpts = {
    macawCorners: id === "stela-b",
    jadeSkirt: id === "stela-h",
    ballplayer: id === "stela-4" || id === "stela-f",
  };
  figure(front, r, o);
  if (id === "stela-c") figure(back, r, { beard: true }); // two faces: young king east, old king west
  else glyphs(back, r, 2, id === "stela-d"); // Stela D: full-figure glyphs on the back
  glyphs(side, r, 2);
  return { front, back, side, top };
}

function altarFaces(id: string, w: number, h: number, r: () => number): MonumentFaces {
  const W = Math.round(w * PX_PER_M);
  const H = Math.round(h * PX_PER_M);
  const front = new Relief(W, H);
  const top = new Relief(W, W, 0.5);
  if (id === "altar-q") {
    seatedRulers(front, r);
    glyphs(top, r, 6); // 36 glyph blocks on top
  } else if (id === "altar-c") {
    // Turtle altar: shell plates on top, a head on the front.
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if ((x % 8 === 0 || y % 8 === 0) && x > 2 && y > 2 && x < W - 3 && y < W - 3) top.set(x, y, 0.4);
    top.ellipse(W / 2, W / 2, W / 2 - 2, W / 2 - 2, 0.7);
    front.ellipse(W / 2, H / 2, W / 6, H / 3, 0.85);
    front.set(W / 2 - 2, H / 2 - 2, 0.3);
    front.frame(0.5);
  } else if (id === "altar-4") {
    // A ball tied with rope.
    front.rect(1, 1, W - 2, H - 2, 0.7);
    for (let x = 2; x < W - 2; x++) {
      front.set(x, Math.round(H / 2), 0.95);
      front.set(x, Math.round(H / 2) + 1, 0.4);
    }
    for (let y = 2; y < H - 2; y++) front.set(Math.round(W / 2), y, 0.95);
    front.frame(0.5);
    top.ellipse(W / 2, W / 2, W / 2 - 1, W / 2 - 1, 0.7);
    for (let x = 0; x < W; x++) top.set(x, W / 2, 0.9);
  } else {
    glyphs(front, r, Math.max(2, Math.round(W / 12)));
  }
  return { front, back: front, side: front, top };
}

/**
 * Builds the texture atlas and a BoxGeometry with matching UVs for one monument.
 * Atlas layout: [front | back | right | left] on the first row, [top] below.
 */
export function buildMonument(id: string, kind: "stela" | "altar", size: [number, number, number], seed: number) {
  const r = rng(seed);
  const [w, h, d] = size;
  const faces = kind === "stela" ? stelaFaces(id, w, h, d, r) : altarFaces(id, w, h, r);
  const tiles = [faces.front, faces.back, faces.side, faces.side];
  const rowW = tiles.reduce((n, t) => n + t.w, 0);
  const atlasW = Math.max(rowW, faces.top.w);
  const atlasH = faces.front.hgt + faces.top.hgt;
  const canvas = document.createElement("canvas");
  canvas.width = atlasW;
  canvas.height = atlasH;
  const ctx = canvas.getContext("2d")!;
  const opts = { redTraces: id === "stela-c", mossBottom: true };
  const rects: [number, number, number, number][] = [];
  let x = 0;
  for (const t of tiles) {
    ctx.putImageData(new ImageData(paint(t, r, opts), t.w, t.hgt), x, 0);
    rects.push([x, 0, t.w, t.hgt]);
    x += t.w;
  }
  ctx.putImageData(new ImageData(paint(faces.top, r, { mossBottom: false }), faces.top.w, faces.top.hgt), 0, faces.front.hgt);
  const topRect: [number, number, number, number] = [0, faces.front.hgt, faces.top.w, faces.top.hgt];

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;

  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // BoxGeometry face order: +x, −x, +y, −y, +z, −z (4 vertices each).
  const faceRect: [number, number, number, number][] = [rects[2], rects[3], topRect, topRect, rects[0], rects[1]];
  for (let f = 0; f < 6; f++) {
    const [rx, ry, rw, rh] = faceRect[f];
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, (rx + u * rw) / atlasW, 1 - (ry + (1 - v) * rh) / atlasH);
    }
  }
  uv.needsUpdate = true;
  return { geometry: geo, texture: tex };
}
