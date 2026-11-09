// Rosalila as a painted stucco relief model, at the world's pixel density (32 px per meter).
//
// Reference: the full-size replica in the Copán Sculpture Museum (Wikimedia Commons photos
// "CPN Rosalila 01.jpg", "Rosalila Temple.jpg", "Honduras-0385B", "Rosalila (reproducción).JPG")
// and descriptions by Asociación Copán and Ricardo Agurcia:
//  - Level 1: red walls with doorways; on the lower panels giant masks of a green bird
//    (the founder K'inich Yax K'uk' Mo' as a sun-bird) with outspread feathers, from whose
//    beak emerges the red face of K'inich, the Sun God.
//  - The projecting frieze: a Sun God mask over each door, flanked by serpent bodies that end
//    in big white scrolls, green cartouches, and upright serpent heads at the corners.
//  - Level 2: giant masks of the mountain / earth monster (witz) on the west and east sides,
//    with serpent heads at the sides.
//  - Level 3: vents, and a skeletal face (a giant censer) with serpents like smoke (the white
//    bands).
// Every motif is drawn as color + relief height and lit like the stelae (light from the
// upper left), quantized to a few tones so it reads as pixel art next to the blocks.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { hex, rng, type RGB } from "./textures";
import { PX_PER_M } from "./monumentArt";
import { MASS, type LBox } from "../world/rosalilaShape";

const C = {
  red: hex("#b8402a"),
  redD: hex("#7e2618"),
  redL: hex("#d4583a"),
  green: hex("#2e8a5c"),
  greenL: hex("#62b884"),
  greenD: hex("#1d5a3e"),
  yellow: hex("#e8b53a"),
  yellowD: hex("#b5801c"),
  ochre: hex("#d8862a"),
  white: hex("#efe6d0"),
  whiteD: hex("#c8bb9c"),
  black: hex("#1c110b"),
};

/** A painted relief: color, relief height (0 = deep … 1 = high) and coverage per pixel. */
class Art {
  col: RGB[];
  h: Float32Array;
  a: Uint8Array;
  sx = 1;
  sy = 1;
  constructor(
    public w: number,
    public hgt: number,
    bg: RGB | null,
    base = 0.3,
  ) {
    const n = w * hgt;
    this.col = new Array(n).fill(bg ?? C.red);
    this.h = new Float32Array(n).fill(base);
    this.a = new Uint8Array(n).fill(bg ? 1 : 0);
  }
  /** Draw in design units: the face is `uw` × `uh` units. */
  units(uw: number, uh: number) {
    this.sx = this.w / uw;
    this.sy = this.hgt / uh;
    return this;
  }
  private put(x: number, y: number, c: RGB, h: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.hgt) return;
    const i = y * this.w + x;
    this.col[i] = c;
    this.h[i] = h;
    this.a[i] = 1;
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, ht: number) {
    const x0 = Math.round(x * this.sx), x1 = Math.round((x + w) * this.sx);
    const y0 = Math.round(y * this.sy), y1 = Math.round((y + h) * this.sy);
    for (let py = y0; py < Math.max(y1, y0 + 1); py++) for (let px = x0; px < Math.max(x1, x0 + 1); px++) this.put(px, py, c, ht);
  }
  ell(cx: number, cy: number, rx: number, ry: number, c: RGB, ht: number) {
    this.ring(cx, cy, 0, 1, c, ht, rx, ry);
  }
  /** Annulus between radii r0..r1 (×rx, ×ry for ell); optional angle range [a0, a1] in radians (y down). */
  ring(cx: number, cy: number, r0: number, r1: number, c: RGB, ht: number, rx = 1, ry = rx, a0 = 0, a1 = Math.PI * 2) {
    const ex = r1 * rx, ey = r1 * ry;
    for (let py = Math.floor((cy - ey) * this.sy) - 1; py <= Math.ceil((cy + ey) * this.sy) + 1; py++)
      for (let px = Math.floor((cx - ex) * this.sx) - 1; px <= Math.ceil((cx + ex) * this.sx) + 1; px++) {
        const dx = ((px + 0.5) / this.sx - cx) / rx;
        const dy = ((py + 0.5) / this.sy - cy) / ry;
        const d = Math.hypot(dx, dy);
        if (d < r0 || d > r1) continue;
        let ang = Math.atan2(dy, dx);
        if (ang < 0) ang += Math.PI * 2;
        if (ang < a0 || ang > a1) continue;
        this.put(px, py, c, ht);
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB, ht: number) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0) * this.sx, Math.abs(y1 - y0) * this.sy, 1));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      this.ell(x, y, t / 2, t / 2, c, ht);
    }
  }
  /** Border of the whole face. */
  frame(t: number, c: RGB, ht: number) {
    const uw = this.w / this.sx, uh = this.hgt / this.sy;
    this.rect(0, 0, uw, t, c, ht);
    this.rect(0, uh - t, uw, t, c, ht);
    this.rect(0, 0, t, uh, c, ht);
    this.rect(uw - t, 0, t, uh, c, ht);
  }
  /** Copy the left half onto the right, mirrored (the façades are symmetric). */
  mirrorX() {
    for (let y = 0; y < this.hgt; y++)
      for (let x = 0; x < this.w / 2; x++) {
        const i = y * this.w + x, j = y * this.w + (this.w - 1 - x);
        this.col[j] = this.col[i];
        this.h[j] = this.h[i];
        this.a[j] = this.a[i];
      }
  }
  /** Outline the opaque shape (cut-out silhouettes) with a color band `t` pixels wide. */
  outline(c: RGB, t = 2) {
    const edge = new Uint8Array(this.w * this.hgt);
    for (let y = 0; y < this.hgt; y++)
      for (let x = 0; x < this.w; x++) {
        if (!this.a[y * this.w + x]) continue;
        let near = false;
        for (let dy = -t; dy <= t && !near; dy++)
          for (let dx = -t; dx <= t; dx++) {
            const X = x + dx, Y = y + dy;
            if (X < 0 || Y < 0 || X >= this.w || Y >= this.hgt || !this.a[Y * this.w + X]) {
              near = Math.abs(dx) + Math.abs(dy) <= t;
              if (near) break;
            }
          }
        if (near) edge[y * this.w + x] = 1;
      }
    for (let i = 0; i < edge.length; i++)
      if (edge[i]) {
        this.col[i] = c;
        this.h[i] = Math.max(this.h[i], 0.7);
      }
  }
  /** Lit RGBA pixels. */
  bake(seed: number): Uint8ClampedArray<ArrayBuffer> {
    const r = rng(seed);
    const out = new Uint8ClampedArray(new ArrayBuffer(this.w * this.hgt * 4));
    const H = (x: number, y: number, h0: number) => (x < 0 || y < 0 || x >= this.w || y >= this.hgt || !this.a[y * this.w + x] ? h0 : this.h[y * this.w + x]);
    for (let y = 0; y < this.hgt; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        const h0 = this.h[i];
        // Rim facing the light (raised above the upper-left neighbor) or in its shadow.
        const lit = (h0 - H(x - 1, y - 1, h0)) - Math.max(0, h0 - H(x + 1, y + 1, h0)) * 0.7;
        const shadow2 = H(x - 2, y - 2, h0) - h0 > 0.15;
        let k = 0.9 + h0 * 0.16;
        if (lit > 0.06) k = 1.2;
        else if (lit < -0.06) k = 0.66;
        else if (shadow2) k *= 0.84;
        if (r() < 0.18) k *= 0.95;
        k *= 1 + (r() - 0.5) * 0.04;
        const c = this.col[i];
        out[i * 4] = c[0] * k;
        out[i * 4 + 1] = c[1] * k;
        out[i * 4 + 2] = c[2] * k;
        out[i * 4 + 3] = this.a[i] ? 255 : 0;
      }
    return out;
  }
}

// ------------------------------------------------------------------ motifs

/** First-level wall: red stucco and a doorway. */
function wall(a: Art, widthM: number, doorM: number) {
  const uw = widthM * 10;
  a.units(uw, 36);
  const cx = uw / 2;
  const dw = doorM * 10;
  a.rect(0, 0, uw, 1, C.redD, 0.25); // under the frieze
  a.rect(0, 34.6, uw, 1.4, C.redD, 0.35); // base
  a.rect(cx - dw / 2 - 1, 8, dw + 2, 28, C.redD, 0.42); // door jambs and lintel
  a.rect(cx - dw / 2, 9, dw, 27, C.black, 0.0);
  a.rect(cx - dw / 2, 9, dw, 2, hex("#2c1810"), 0.0); // lintel soffit
}

/** Giant bird mask (K'inich Yax K'uk' Mo' as a sun-bird): feather fan, wings, serpent base. */
function birdPanel(a: Art) {
  a.units(50, 29);
  a.frame(0.6, C.redD, 0.3);
  const cx = 25, cy = 18;
  // Feather fan over the top.
  const N = 15;
  for (let i = 0; i < N; i++) {
    const ang = Math.PI * (1.02 + (0.96 * i) / (N - 1));
    const dx = Math.cos(ang), dy = Math.sin(ang);
    a.line(cx + dx * 8.5, cy + dy * 8.5, cx + dx * 15.5, cy + dy * 15.5, 2.8, i % 2 ? C.green : C.greenL, 0.75);
    a.line(cx + dx * 10, cy + dy * 10, cx + dx * 14.5, cy + dy * 14.5, 0.7, C.greenD, 0.66);
    a.ell(cx + dx * 16.3, cy + dy * 16.3, 1.3, 1.3, C.greenL, 0.82);
  }
  a.ring(cx, cy, 6.6, 8.6, C.yellow, 0.72, 1, 1, Math.PI, Math.PI * 2);
  // Wings with feather notches and curled tips.
  a.rect(3, 19, 17, 4.5, C.yellow, 0.7);
  a.rect(3, 23.3, 17, 1, C.yellowD, 0.62);
  for (let x = 6; x < 19; x += 3) a.rect(x, 20.5, 1, 2.6, C.ochre, 0.62);
  a.ring(5.2, 21.8, 1.8, 4.2, C.yellow, 0.76);
  a.ell(5.2, 21.8, 1.4, 1.4, C.redD, 0.5);
  // Serpent base band with jade dots.
  a.rect(6, 25.4, 38, 2.6, C.yellow, 0.6);
  for (let x = 8; x < 43; x += 4) a.rect(x, 26, 1.5, 1.4, C.green, 0.7);
  // Behind the head and the earflares.
  a.rect(18, 9, 14, 16, C.green, 0.6);
  a.ell(15, 17, 2.5, 2.5, C.green, 0.82);
  a.ell(15, 17, 1, 1, C.white, 0.9);
  a.mirrorX();
}

/** The bird's head: a green head and yellow beak, with the red face of the Sun God inside. */
function birdHead(a: Art) {
  a.units(14, 16);
  a.frame(0.5, C.greenD, 0.55);
  a.rect(1.5, 1, 11, 3, C.yellow, 0.88);
  a.rect(5.5, 3.6, 3, 1.6, C.yellow, 0.88);
  a.rect(6.2, 5, 1.6, 1, C.ochre, 0.84);
  a.rect(3, 2, 1, 1, C.ochre, 0.7);
  a.rect(10, 2, 1, 1, C.ochre, 0.7);
  a.rect(3, 6, 8, 8, C.red, 0.78);
  a.rect(3.8, 7.3, 2.2, 1.7, C.white, 0.9);
  a.rect(8, 7.3, 2.2, 1.7, C.white, 0.9);
  a.rect(5.2, 7.9, 0.8, 0.8, C.black, 0.86); // crossed eyes, like K'inich
  a.rect(8, 7.9, 0.8, 0.8, C.black, 0.86);
  a.rect(6.3, 8.4, 1.4, 2.6, C.redL, 0.96);
  a.rect(5, 11.6, 4, 1.3, C.black, 0.6);
  a.rect(6.4, 11.6, 1.2, 1.3, C.white, 0.86); // filed T-shaped tooth
  a.rect(5.9, 11.6, 2.2, 0.5, C.white, 0.86);
  a.rect(2, 14.2, 10, 1.3, C.greenL, 0.72);
}

/** One half of the frieze: serpent body ending in a big white scroll, cartouche, red curls. */
function friezeHalf(a: Art, x0: number, x1: number) {
  const L = x1 - x0;
  const X = (t: number) => x0 + t * L;
  // Cartouche (green ∩) with a glyph.
  const cw = 0.3 * L;
  a.rect(X(0.3), 3, cw, 10.5, C.green, 0.66);
  a.rect(X(0.3) + 2, 5, cw - 4, 8.5, C.red, 0.42);
  a.rect(X(0.3) + cw / 2 - 3, 6.5, 6, 5, C.redD, 0.56);
  a.ell(X(0.3) + cw / 2, 9, 1.5, 1.5, C.yellow, 0.72);
  // Red relief curls above the band.
  a.line(X(0.08), 4, X(0.26), 4, 1.3, C.redD, 0.5);
  a.line(X(0.08), 4, X(0.08), 11, 1.3, C.redD, 0.5);
  a.rect(X(0.15), 7, 3, 2, C.yellow, 0.72);
  a.ring(X(0.76), 8, 1.4, 3.4, C.redD, 0.5);
  a.ell(X(0.76), 8, 1.2, 1.2, C.white, 0.7);
  // The serpent body: green-edged white band.
  a.rect(X(0.08), 13.5, X(0.86) - X(0.08), 5.6, C.greenL, 0.62);
  a.rect(X(0.08), 14.5, X(0.86) - X(0.08), 3.6, C.white, 0.78);
  for (let x = X(0.12); x < X(0.82); x += 5) a.rect(x, 15.7, 2.2, 1.2, C.whiteD, 0.72);
  // Big scroll at the inner end, a small one at the outer end.
  const s = X(0.86);
  a.ring(s, 17, 7, 8.3, C.greenL, 0.7);
  a.ring(s, 17, 3.3, 7, C.white, 0.82);
  a.ell(s, 17, 3.3, 3.3, C.red, 0.5);
  a.ring(s, 17, 1.2, 2.3, C.white, 0.78);
  a.ring(s, 17, 3.3, 7.1, C.red, 0.46, 1, 1, Math.PI * 0.62, Math.PI * 0.95); // the opening of the spiral
  const t = X(0.08) + 1;
  a.ring(t, 14.5, 4.4, 5.4, C.greenL, 0.7);
  a.ring(t, 14.5, 2, 4.4, C.white, 0.82);
  a.ell(t, 14.5, 2, 2, C.red, 0.5);
  // Below the band: curls, a jade square, yellow eyes.
  for (const k of [0.35, 0.6]) {
    a.ring(X(k), 24.5, 2, 4, C.redD, 0.52);
    a.ell(X(k), 24.5, 2, 2, C.redL, 0.56);
  }
  a.rect(X(0.35), 27.6, X(0.6) - X(0.35), 1.2, C.redD, 0.52);
  a.rect(X(0.46), 22.4, 3, 2, C.yellow, 0.72);
  a.rect(X(0.18), 22, 4.5, 4.5, C.green, 0.62);
  a.rect(X(0.18) + 1.5, 23.5, 1.5, 1.5, C.redD, 0.5);
}

/** The frieze face: two mirrored halves, the corner serpent bodies, plaster edge. */
function frieze(a: Art, widthM: number, seed: number) {
  const uw = widthM * 10;
  a.units(uw, 32);
  const r = rng(seed);
  a.rect(0, 0, uw, 0.8, C.redD, 0.25);
  for (let x = 0; x < uw; x += 1.5) a.rect(x, 30.4, 1.5, 1.6, r() < 0.8 ? C.whiteD : C.red, 0.36);
  // Corner: upright serpent body (the head is a cut-out crest above).
  a.rect(1, 2, 7, 27, C.yellow, 0.6);
  a.rect(2, 3, 5, 25, C.red, 0.55);
  a.ring(4.5, 9, 1.4, 2.8, C.yellow, 0.66);
  for (let y = 14; y < 27; y += 3) a.rect(2.5, y, 4, 1, C.redD, 0.5);
  friezeHalf(a, 11, uw / 2 - 12);
  a.mirrorX();
}

/** Sun God mask over the door: headdress, red face with square eyes, jade column, bead. */
function sunGod(a: Art) {
  a.units(22, 34);
  a.rect(2, 0, 18, 4, C.green, 0.76);
  for (let x = 3; x < 18; x += 3) a.rect(x, 0, 2, 1.5, C.greenL, 0.82);
  a.rect(2, 3.2, 18, 1, C.yellow, 0.76);
  a.rect(4, 4.5, 14, 10, C.red, 0.8);
  a.rect(5.5, 5.5, 4, 0.8, C.redD, 0.86);
  a.rect(12.5, 5.5, 4, 0.8, C.redD, 0.86);
  a.rect(5.5, 6.6, 4, 2.6, C.white, 0.9);
  a.rect(12.5, 6.6, 4, 2.6, C.white, 0.9);
  a.rect(8, 7.4, 1.3, 1.3, C.black, 0.86);
  a.rect(12.7, 7.4, 1.3, 1.3, C.black, 0.86);
  a.rect(10, 8, 2, 4, C.redL, 0.96);
  a.rect(7, 12.2, 8, 1.8, C.black, 0.6);
  a.rect(7.5, 12.2, 1.2, 1.8, C.white, 0.86);
  a.rect(13.3, 12.2, 1.2, 1.8, C.white, 0.86);
  a.rect(10.4, 12.2, 1.2, 1.5, C.white, 0.86);
  a.ell(2, 9.5, 2, 2.6, C.green, 0.82);
  a.ell(2, 9.5, 0.8, 0.8, C.white, 0.9);
  a.rect(3, 15.5, 3, 12, C.green, 0.66);
  a.rect(6, 15.5, 10, 12, C.white, 0.76);
  for (let k = 0; k < 3; k++) {
    a.rect(7, 16.3 + k * 3.8, 3.4, 3, C.green, 0.86);
    a.rect(11.6, 16.3 + k * 3.8, 3.4, 3, C.green, 0.86);
  }
  a.rect(8, 27.5, 6, 2, C.greenL, 0.7);
  a.ell(11, 31, 2, 2.3, C.white, 0.9);
  a.ell(11, 31, 0.8, 0.8, C.whiteD, 0.82);
  a.mirrorX();
}

/** Second level: red relief scrolls, jade bars, yellow eyes. The front leaves room for the
 * smoke-serpent bands (u ±2.1…2.8 m) and the witz mask (±1.8 m). */
function level2(a: Art, widthM: number, front: boolean) {
  const uw = widthM * 10;
  a.units(uw, 24);
  a.rect(0, 0, uw, 1, C.redD, 0.25);
  a.rect(1.5, 1.5, 1, 21, C.redD, 0.45);
  const cx = front ? 9 : 13;
  a.ring(cx, 12, 3, 6, C.redD, 0.52);
  a.ell(cx, 12, 3, 3, C.redL, 0.56);
  a.ell(cx, 12, 1.2, 1.2, C.yellow, 0.72);
  const bx = front ? 15.2 : 21;
  a.rect(bx, 4, front ? 4 : 7, 2.5, C.green, 0.72);
  a.rect(bx, 17, front ? 4 : 7, 2.5, C.green, 0.72);
  a.rect(bx + 0.3, 9, 3.4, 3, C.yellow, 0.76);
  a.rect(bx + 1.5, 10, 1, 1, C.black, 0.7);
  if (!front) {
    a.rect(uw / 2 - 4, 7, 8, 10, C.green, 0.62);
    a.rect(uw / 2 - 2.5, 8.5, 5, 7, C.red, 0.45);
  }
  a.mirrorX();
}

/** Earth monster / mountain (witz) mask: cleft head, square eyes, snout, fanged mouth. */
function witz(a: Art) {
  a.units(36, 24);
  a.rect(16, 0, 4, 4, C.green, 0.82);
  a.rect(17.3, 0, 1.4, 3, C.greenD, 0.7);
  a.rect(4, 3, 10, 2, C.redD, 0.78);
  a.ring(4, 6, 1, 2.6, C.redD, 0.78);
  a.rect(5, 6, 8, 6, C.yellow, 0.86);
  a.ring(9, 9, 0.8, 2.3, C.black, 0.62);
  a.ell(9, 9, 0.7, 0.7, C.black, 0.62);
  a.rect(15, 5, 6, 11, C.redL, 0.96);
  a.ell(18, 13, 2.2, 1.7, C.green, 1.0);
  a.rect(8, 17, 20, 4, C.black, 0.4);
  a.rect(8.5, 17, 2, 3.2, C.white, 0.82);
  for (let x = 12; x < 18; x += 2.5) a.rect(x, 17, 1.4, 1.4, C.white, 0.76);
  a.ell(2.2, 12, 2.2, 3, C.green, 0.82);
  a.ell(2.2, 12, 0.9, 0.9, C.white, 0.9);
  a.rect(6, 21.5, 24, 2, C.yellow, 0.72);
  a.mirrorX();
}

/** Third level: vents (dark slots) on a red wall. */
function level3(a: Art, widthM: number, vents: number[]) {
  const uw = widthM * 10;
  a.units(uw, 27);
  a.rect(0, 0, uw, 1, C.redL, 0.4);
  a.rect(0, 25.6, uw, 1.4, C.redD, 0.3);
  a.rect(2, 20, uw - 4, 2, C.redD, 0.36);
  for (const vx of vents) {
    a.rect(vx - 4, 3, 8, 14, C.redD, 0.25);
    a.rect(vx - 3, 4, 6, 12, C.black, 0.0);
    a.rect(vx - 3, 4, 6, 1.5, hex("#2c1810"), 0.0);
  }
}

/** Skeletal face of the giant censer. */
function skull(a: Art) {
  a.units(26, 16);
  a.frame(0.6, C.whiteD, 0.55);
  a.rect(3, 2, 20, 1.5, C.whiteD, 0.8);
  a.ell(8, 6.6, 3, 2.6, C.black, 0.3);
  a.ell(8, 6.6, 0.9, 0.9, C.red, 0.42);
  a.rect(12, 8.6, 2, 2.6, C.black, 0.3);
  a.rect(5, 12, 16, 3, C.white, 0.76);
  for (let x = 5; x < 21; x += 2) a.rect(x + 1.4, 12, 0.6, 3, C.black, 0.5);
  a.rect(5, 15, 16, 1, C.whiteD, 0.6);
  a.ring(1.8, 3.4, 0.6, 1.6, C.greenL, 0.8);
  a.mirrorX();
}

/** Serpent body rising like smoke: white braid with green edges and red diamonds. */
function smokeBand(a: Art) {
  const uw = a.w / (PX_PER_M / 10);
  a.units(uw, 46);
  for (let y = 0; y < a.hgt; y++)
    for (let x = 0; x < a.w; x++) {
      const m1 = (((x + y) % 12) + 12) % 12, m2 = (((x - y) % 12) + 12) % 12;
      if (m1 < 3 || m2 < 3) {
        a.col[y * a.w + x] = C.whiteD;
        a.h[y * a.w + x] = 0.5;
      }
    }
  a.rect(0, 0, 0.8, 46, C.greenL, 0.7);
  a.rect(uw - 0.8, 0, 0.8, 46, C.greenL, 0.7);
  for (let y = 4; y < 46; y += 9) a.ell(uw / 2, y, 1.2, 1.2, C.red, 0.76);
}

/** Upright serpent head in profile, facing right (cut-out). */
function serpentHead(a: Art, edge: RGB) {
  a.units(20, 26);
  a.rect(4, 13, 7, 13, C.red, 0.5);
  a.rect(2, 4, 15, 10, C.red, 0.6);
  a.rect(13, 1, 5, 5, C.red, 0.6);
  a.ring(16.5, 2.8, 0.9, 2.5, C.red, 0.64);
  a.ell(2, 6.5, 2.2, 4, C.red, 0.55);
  a.ell(1.6, 1.8, 1.5, 2, C.red, 0.55);
  a.rect(4, 3, 7, 2, C.redD, 0.76);
  a.rect(5.6, 6, 3.4, 2.7, C.white, 0.86);
  a.rect(7.6, 6.6, 1.3, 1.3, C.black, 0.8);
  a.ell(15, 5.4, 1, 1, C.redD, 0.6);
  a.rect(9, 12, 8, 2.6, C.red, 0.6);
  a.ell(17, 13.2, 1.5, 1.5, C.red, 0.6);
  // Open jaws (cut out) with fangs.
  for (let py = Math.round(10 * a.sy); py < Math.round(12 * a.sy); py++)
    for (let px = Math.round(10.5 * a.sx); px < a.w; px++) a.a[py * a.w + px] = 0;
  a.rect(12, 9.5, 1.2, 2.6, C.white, 0.86);
  a.rect(15.5, 10, 1, 2, C.white, 0.86);
  for (let y = 15; y < 25; y += 2.5) a.rect(5, y, 5, 1, C.redD, 0.46);
  a.outline(edge, 2);
}

// ------------------------------------------------------------------ model

type FaceName = "right" | "left" | "top" | "bottom" | "front" | "back";
const ORDER: FaceName[] = ["right", "left", "top", "bottom", "front", "back"];

interface TileDef {
  w: number;
  h: number;
  paint: (a: Art) => void;
  bg?: RGB | null;
  base?: number;
}

const px = (m: number) => Math.max(2, Math.round(m * PX_PER_M));

/** Atlas of painted faces, built once. */
class Atlas {
  defs = new Map<string, TileDef>();
  rects = new Map<string, [number, number, number, number]>();
  W = 1024;
  H = 0;
  canvas!: HTMLCanvasElement;
  add(key: string, d: TileDef) {
    if (!this.defs.has(key)) this.defs.set(key, d);
    return key;
  }
  solid(c: RGB) {
    return this.add(`solid-${c.join(",")}`, { w: 8, h: 8, paint: () => {}, bg: c, base: 0.5 });
  }
  build() {
    const keys = [...this.defs.keys()].sort((a, b) => this.defs.get(b)!.h - this.defs.get(a)!.h);
    const pad = 2;
    let x = 0, y = 0, row = 0;
    for (const k of keys) {
      const d = this.defs.get(k)!;
      if (x + d.w + pad > this.W) {
        x = 0;
        y += row + pad;
        row = 0;
      }
      this.rects.set(k, [x + pad, y + pad, d.w, d.h]);
      x += d.w + pad * 2;
      row = Math.max(row, d.h + pad);
    }
    this.H = Math.pow(2, Math.ceil(Math.log2(y + row + pad)));
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    const ctx = this.canvas.getContext("2d")!;
    let seed = 571;
    for (const k of keys) {
      const d = this.defs.get(k)!;
      const a = new Art(d.w, d.h, d.bg === undefined ? C.red : d.bg, d.base ?? 0.3);
      d.paint(a);
      const [rx, ry] = this.rects.get(k)!;
      const img = new ImageData(a.bake(seed++), d.w, d.h);
      ctx.putImageData(img, rx, ry);
      // Bleed edges into the padding so mipmaps don't pick up neighbors.
      if (d.bg !== null) {
        ctx.putImageData(img, rx, ry - 1, 0, 0, d.w, 1);
        ctx.putImageData(img, rx, ry + 1, 0, d.h - 1, d.w, 1);
      }
    }
  }
  /** Map a (0..1) face UV into the tile; solids use their middle. */
  uv(key: string, u: number, v: number, mirror = false): [number, number] {
    const [x, y, w, h] = this.rects.get(key)!;
    if (mirror) u = 1 - u;
    const solid = key.startsWith("solid-");
    const fx = solid ? x + 2 + u * (w - 4) : x + u * w;
    const fy = solid ? y + 2 + (1 - v) * (h - 4) : y + (1 - v) * h;
    return [fx / this.W, 1 - fy / this.H];
  }
}

type Faces = Partial<Record<FaceName, string>>;

interface Placed {
  c: [number, number, number];
  s: [number, number, number];
  rotY: number;
  faces: Faces;
  fallback: string;
}

/** Puts a decoration box on the outside of a massing box's side, `u` along that side. */
function onSide(m: LBox, side: "front" | "back" | "right" | "left", u: number, y: number, w: number, h: number, d: number, faces: Faces, fallback: string, out = 0): Placed {
  const zf = m.c[2] + m.s[2] / 2 + out + d / 2;
  const xf = m.c[0] + m.s[0] / 2 + out + d / 2;
  const s: [number, number, number] = [w, h, d];
  switch (side) {
    case "front":
      return { c: [u, y, zf], s, rotY: 0, faces, fallback };
    case "back":
      return { c: [-u, y, -zf], s, rotY: Math.PI, faces, fallback };
    case "right":
      return { c: [xf, y, -u], s, rotY: Math.PI / 2, faces, fallback };
    case "left":
      return { c: [-xf, y, u], s, rotY: -Math.PI / 2, faces, fallback };
  }
}

interface Card {
  c: [number, number, number];
  w: number;
  h: number;
  rotY: number;
  tile: string;
  mirror: boolean;
}

/** A cut-out card at (x, z); the motif faces right, mirrored so it faces `outward`. */
function card(x: number, y: number, z: number, w: number, h: number, rotY: number, outward: [number, number], tile: string): Card {
  const right: [number, number] = [Math.cos(rotY), -Math.sin(rotY)];
  return { c: [x, y, z], w, h, rotY, tile, mirror: right[0] * outward[0] + right[1] * outward[1] < 0 };
}

export function buildRosalila() {
  const A = new Atlas();
  const M = MASS;
  const red = A.solid(C.red);
  const redD = A.solid(C.redD);
  const green = A.solid(C.green);
  const white = A.solid(C.white);

  const T = (key: string, wM: number, hM: number, paint: (a: Art) => void, bg: RGB | null = C.red, base = 0.3) =>
    A.add(key, { w: px(wM), h: px(hM), paint, bg, base });

  const W = M.level1.s[0], D = M.level1.s[2];
  const tiles = {
    wallF: T("wallF", W, 3.6, (a) => wall(a, W, 2.4)),
    wallS: T("wallS", D, 3.6, (a) => wall(a, D, 1.8)),
    friezeF: T("friezeF", M.frieze.s[0], 3.2, (a) => frieze(a, M.frieze.s[0], 1)),
    friezeS: T("friezeS", M.frieze.s[2], 3.2, (a) => frieze(a, M.frieze.s[2], 2)),
    mold1F: T("mold1F", M.mold1.s[0], 0.3, molding),
    mold1S: T("mold1S", M.mold1.s[2], 0.3, molding),
    mold2F: T("mold2F", M.mold2.s[0], 0.3, molding),
    mold2S: T("mold2S", M.mold2.s[2], 0.3, molding),
    plinthF: T("plinthF", M.plinth.s[0], 0.4, plinth),
    plinthS: T("plinthS", M.plinth.s[2], 0.4, plinth),
    l2F: T("l2F", M.level2.s[0], 2.4, (a) => level2(a, M.level2.s[0], true)),
    l2S: T("l2S", M.level2.s[2], 2.4, (a) => level2(a, M.level2.s[2], false)),
    l3F: T("l3F", M.level3.s[0], 2.7, (a) => level3(a, M.level3.s[0], [M.level3.s[0] * 5 - 15.5, M.level3.s[0] * 5 + 15.5])),
    l3S: T("l3S", M.level3.s[2], 2.7, (a) => level3(a, M.level3.s[2], [M.level3.s[2] * 5])),
    birdF: T("birdF", 5.0, 2.9, birdPanel, C.red, 0.35),
    birdS: T("birdS", 4.0, 2.9, birdPanel, C.red, 0.35),
    head: T("head", 1.4, 1.6, birdHead, C.green, 0.6),
    sun: T("sun", 2.2, 3.4, sunGod, C.red, 0.5),
    witz: T("witz", 3.6, 2.4, witz, C.red, 0.6),
    skull: T("skull", 2.0, 1.6, skull, C.white, 0.6),
    bandF: T("bandF", 0.7, 4.6, smokeBand, C.white, 0.6),
    bandS: T("bandS", 1.1, 4.6, smokeBand, C.white, 0.6),
    crest: T("crest", 2.4, 3.2, (a) => serpentHead(a, C.yellow), null),
    serpent: T("serpent", 2.8, 3.6, (a) => serpentHead(a, C.white), null),
  };

  const boxes: Placed[] = [];
  const mass = (b: LBox, f: string, s: string) =>
    boxes.push({ c: b.c, s: b.s, rotY: 0, faces: { front: f, back: f, left: s, right: s, top: red, bottom: redD }, fallback: red });
  mass(M.plinth, tiles.plinthF, tiles.plinthS);
  mass(M.level1, tiles.wallF, tiles.wallS);
  mass(M.mold1, tiles.mold1F, tiles.mold1S);
  mass(M.frieze, tiles.friezeF, tiles.friezeS);
  mass(M.mold2, tiles.mold2F, tiles.mold2S);
  mass(M.level2, tiles.l2F, tiles.l2S);
  mass(M.level3, tiles.l3F, tiles.l3S);

  for (const side of ["front", "back", "left", "right"] as const) {
    const long = side === "front" || side === "back";
    // Bird masks either side of each door, with the head standing out.
    const pu = long ? 4.9 : 3.6;
    for (const u of [-pu, pu]) {
      boxes.push(onSide(M.level1, side, u, 2.05, long ? 5.0 : 4.0, 2.9, 0.25, { front: long ? tiles.birdF : tiles.birdS }, red));
      boxes.push(onSide(M.level1, side, u, 2.2, 1.4, 1.6, 0.3, { front: tiles.head }, green, 0.25));
    }
    // Sun God mask in the middle of the frieze.
    boxes.push(onSide(M.frieze, side, 0, 5.8, 2.2, 3.4, 0.45, { front: tiles.sun }, red));
    if (long) {
      boxes.push(onSide(M.level2, side, 0, 9.0, 3.6, 2.4, 0.5, { front: tiles.witz }, red));
      boxes.push(onSide(M.level3, side, 0, 11.3, 2.0, 1.6, 0.35, { front: tiles.skull }, white));
      for (const u of [-2.45, 2.45])
        boxes.push(onSide(M.level3, side, u, 10.1, 0.7, 4.6, 1.1, { front: tiles.bandF, left: tiles.bandS, right: tiles.bandS, top: white }, white));
    }
  }

  // Cut-out serpent heads: on the four frieze corners (one card per side) and beside level 2.
  const cards: Card[] = [];
  const Wf = M.mold2.s[0], Df = M.mold2.s[2];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      // Corner crests rise ~1.6 m above the frieze (6.6 → 9.4 m).
      cards.push(card(sx * (Wf / 2 - 1.2), 8.0, sz * (Df / 2 + 0.03), 2.4, 3.2, sz > 0 ? 0 : Math.PI, [sx, 0], tiles.crest));
      cards.push(card(sx * (Wf / 2 + 0.03), 8.0, sz * (Df / 2 - 1.2), 2.4, 3.2, sx * (Math.PI / 2), [0, sz], tiles.crest));
      cards.push(card(sx * (M.level2.s[0] / 2 + 1.3), 9.6, sz * 1.8, 2.8, 3.6, sz > 0 ? 0 : Math.PI, [sx, 0], tiles.serpent));
    }

  A.build();

  const mtx = new THREE.Matrix4();
  const boxGeos = boxes.map((b) => {
    const g = new THREE.BoxGeometry(b.s[0], b.s[1], b.s[2]);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    ORDER.forEach((name, fi) => {
      const key = b.faces[name] ?? b.fallback;
      for (let k = 0; k < 4; k++) {
        const i = fi * 4 + k;
        const [U, V] = A.uv(key, uv.getX(i), uv.getY(i));
        uv.setXY(i, U, V);
      }
    });
    g.applyMatrix4(mtx.makeRotationY(b.rotY).setPosition(b.c[0], b.c[1], b.c[2]));
    return g;
  });
  const cardGeos = cards.map((c) => {
    const g = new THREE.PlaneGeometry(c.w, c.h);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      const [U, V] = A.uv(c.tile, uv.getX(i), uv.getY(i), c.mirror);
      uv.setXY(i, U, V);
    }
    g.applyMatrix4(mtx.makeRotationY(c.rotY).setPosition(c.c[0], c.c[1], c.c[2]));
    return g;
  });

  const texture = new THREE.CanvasTexture(A.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.anisotropy = 4;
  return { body: mergeGeometries(boxGeos)!, cards: mergeGeometries(cardGeos)!, texture };
}

function molding(a: Art) {
  a.units(10, 10);
  a.rect(0, 0, 10, 1.5, C.redL, 0.5);
  a.rect(0, 8, 10, 2, C.redD, 0.3);
}

function plinth(a: Art) {
  a.units(10, 10);
  for (let i = 0; i < a.col.length; i++) a.col[i] = C.redD;
  a.rect(0, 0, 10, 1.5, C.red, 0.45);
}
