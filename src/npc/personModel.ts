// Pixel-art Maya people (adults ~1.6 m) and jaguars, built from boxes at 32 px per meter.
// Static parts are merged so each character costs only a few draw calls.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildPixelModel, hex, solid, type FaceName, type PartSpec } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";
import type { Outfit } from "./npcData";

export interface Rig {
  /** Torso + head + clothing, merged. Origin at the feet. */
  body: THREE.BufferGeometry;
  /** Limb geometries hang from their pivot (origin at the joint). */
  legL: THREE.BufferGeometry;
  legR: THREE.BufferGeometry;
  armL: THREE.BufferGeometry;
  armR: THREE.BufferGeometry;
  material: THREE.Material;
  hip: number;
  shoulder: [number, number];
  legX: number;
}

const cache = new Map<string, Rig>();

function place(g: THREE.BufferGeometry, x: number, y: number, z: number) {
  const c = g.clone();
  c.translate(x, y, z);
  return c;
}

export function personRig(o: Outfit): Rig {
  const key = JSON.stringify(o);
  const hit = cache.get(key);
  if (hit) return hit;
  const C = {
    skin: hex(o.skin),
    skinDark: hex(o.skin).map((v) => v * 0.82) as [number, number, number],
    hair: hex(o.hair),
    top: hex(o.top),
    accent: hex(o.accent),
    bottom: hex(o.bottom),
    white: hex("#f4f1e8"),
    eye: hex("#1a1210"),
    basket: hex("#c49e4f"),
    basketDark: hex("#8c6a30"),
  };

  const leg = (t: Tile, f: FaceName) => {
    solid(t, C.skin, 0.05, 2);
    if (f === "top") return;
    if (!o.female) for (let y = 0; y < Math.ceil(t.h * 0.25); y++) for (let x = 0; x < t.w; x++) t.set(x, y, C.bottom);
    if (o.modern) for (let y = 0; y < t.h - 2; y++) for (let x = 0; x < t.w; x++) t.set(x, y, C.bottom);
    for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, o.modern ? C.white : hex("#5a3a22"));
  };
  const arm = (t: Tile, f: FaceName) => {
    solid(t, C.skin, 0.05, 3);
    if (f === "bottom") return;
    const sleeve = o.modern || o.female ? 0.35 : 0;
    for (let y = 0; y < Math.ceil(t.h * sleeve); y++) for (let x = 0; x < t.w; x++) t.set(x, y, C.top);
  };
  const torso = (t: Tile, f: FaceName) => {
    solid(t, C.top, 0.05, 4);
    if (f === "top" || f === "bottom") return;
    if (o.female) {
      // Huipil: embroidered square around the neck and a woven band at the hem.
      if (f === "front" || f === "back") {
        const cx = Math.floor(t.w / 2);
        for (let y = 0; y < 5; y++) for (let x = cx - 4; x <= cx + 3; x++) if (y === 4 || x === cx - 4 || x === cx + 3) t.set(x, y, C.accent);
        for (let x = cx - 3; x <= cx + 2; x++) for (let y = 0; y < 4; y++) t.set(x, y, C.skin);
      }
      for (let x = 0; x < t.w; x++) {
        t.set(x, t.h - 3, C.accent);
        if (x % 3 === 0) t.set(x, t.h - 2, C.white);
        t.set(x, t.h - 1, C.accent);
      }
    } else if (o.modern) {
      for (let y = 2; y < t.h; y += 5) for (let x = 0; x < t.w; x++) if (x % 2 === 0 && f === "front") t.set(x, y, C.accent);
    } else {
      // Cotton cape over the shoulders, sash at the waist.
      for (let y = Math.floor(t.h * 0.55); y < t.h; y++) for (let x = 0; x < t.w; x++) t.set(x, y, C.skin);
      for (let x = 0; x < t.w; x++) {
        t.set(x, Math.floor(t.h * 0.55) - 1, C.accent);
        t.set(x, t.h - 2, C.accent);
        t.set(x, t.h - 1, C.accent);
      }
    }
  };
  const skirt = (t: Tile, f: FaceName) => {
    solid(t, C.bottom, 0.06, 5);
    if (f === "top" || f === "bottom") return;
    for (let x = 0; x < t.w; x++) {
      t.set(x, 2, C.accent);
      if (x % 4 < 2) t.set(x, t.h - 4, C.white);
      t.set(x, t.h - 2, C.accent);
    }
  };
  const hipCloth = (t: Tile, f: FaceName) => {
    solid(t, C.bottom, 0.05, 6);
    if (f === "front" || f === "back") for (let y = 0; y < t.h; y++) t.set(Math.floor(t.w / 2), y, C.accent);
  };
  const head = (t: Tile, f: FaceName) => {
    solid(t, C.skin, 0.04, 7);
    if (f === "top") return solid(t, C.hair, 0.1, 8);
    if (f === "bottom") return;
    const rows = f === "back" ? Math.floor(t.h * (o.female ? 1 : 0.65)) : 3;
    for (let y = 0; y < rows; y++) for (let x = 0; x < t.w; x++) t.set(x, y, C.hair);
    if (f === "front") {
      const ey = 5;
      for (const ex of [2, t.w - 4]) {
        t.set(ex, ey, C.white);
        t.set(ex + 1, ey, C.eye);
        t.set(ex, ey - 1, C.hair);
        t.set(ex + 1, ey - 1, C.hair);
      }
      t.set(Math.floor(t.w / 2), ey + 2, C.skinDark);
      t.set(Math.floor(t.w / 2) - 1, ey + 4, C.skinDark);
      t.set(Math.floor(t.w / 2), ey + 4, C.skinDark);
      if (o.female) for (let y = 3; y < t.h; y++) for (const x of [0, t.w - 1]) t.set(x, y, C.hair);
    }
    if ((f === "left" || f === "right") && o.female) for (let y = 3; y < t.h; y++) for (let x = 0; x < 3; x++) t.set(f === "left" ? t.w - 1 - x : x, y, C.hair);
  };
  const band = (t: Tile, f: FaceName) => {
    solid(t, C.accent, 0.08, 9);
    if (o.head === "turban" && f !== "top" && f !== "bottom") for (let x = 0; x < t.w; x++) if ((x + 1) % 4 === 0) for (let y = 0; y < t.h; y++) t.set(x, y, C.white);
  };
  const capPeak = (t: Tile) => solid(t, C.accent, 0.06, 10);
  const hairBack = (t: Tile) => {
    solid(t, C.hair, 0.12, 11);
    for (let y = 0; y < t.h; y += 4) for (let x = 0; x < t.w; x++) t.set(x, y, C.accent);
  };
  const basket = (t: Tile, f: FaceName) => {
    for (let y = 0; y < t.h; y++)
      for (let x = 0; x < t.w; x++) t.set(x, y, (x + y) % 3 === 0 ? C.basketDark : C.basket);
    if (f === "top") for (let y = 2; y < t.h - 2; y++) for (let x = 2; x < t.w - 2; x++) t.set(x, y, (x * 7 + y) % 5 ? hex("#f0bd2e") : hex("#d69a1c"));
  };

  const parts: PartSpec[] = [
    { size: [0.17, 0.5, 0.19], paint: leg }, // 0
    { size: [0.13, 0.48, 0.14], paint: arm }, // 1
    { size: [0.42, 0.52, 0.25], paint: torso }, // 2
    { size: [0.34, 0.34, 0.32], paint: head }, // 3
    { size: [0.46, 0.5, 0.3], paint: skirt }, // 4
    { size: [0.43, 0.16, 0.27], paint: hipCloth }, // 5
    { size: [0.36, o.head === "turban" ? 0.13 : o.head === "cap" ? 0.09 : 0.05, 0.34], paint: band }, // 6
    { size: [0.3, 0.03, 0.14], paint: capPeak }, // 7
    { size: [0.3, 0.42, 0.06], paint: hairBack }, // 8
    { size: [0.42, 0.16, 0.42], paint: basket }, // 9
  ];
  const { geometries: G, material } = buildPixelModel(parts);

  const hip = 0.5;
  const shoulderY = hip + 0.5;
  const pieces = [place(G[2], 0, hip + 0.26, 0), place(G[3], 0, shoulderY + 0.19, 0)];
  if (o.female) pieces.push(place(G[4], 0, hip - 0.04, 0), place(G[8], 0, shoulderY + 0.02, -0.17));
  else pieces.push(place(G[5], 0, hip + 0.02, 0));
  if (o.head && o.head !== "none") pieces.push(place(G[6], 0, shoulderY + 0.33, 0));
  if (o.head === "cap") pieces.push(place(G[7], 0, shoulderY + 0.31, 0.22));
  if (o.basket) pieces.push(place(G[9], 0, shoulderY + 0.46, 0));
  const body = mergeGeometries(pieces)!;
  const limb = (g: THREE.BufferGeometry, len: number) => place(g, 0, -len / 2, 0);

  const rig: Rig = {
    body,
    legL: limb(G[0], 0.5),
    legR: limb(G[0], 0.5),
    armL: limb(G[1], 0.48),
    armR: limb(G[1], 0.48),
    material,
    hip,
    shoulder: [0.27, shoulderY],
    legX: 0.1,
  };
  cache.set(key, rig);
  return rig;
}

// ---------------------------------------------------------------- jaguar

export interface JaguarRig {
  body: THREE.BufferGeometry;
  leg: THREE.BufferGeometry;
  tail: THREE.BufferGeometry;
  material: THREE.Material;
}

let jaguarCache: JaguarRig | null = null;

/** Jaguar with rosettes (rings of black spots on golden fur), white belly. */
export function jaguarRig(): JaguarRig {
  if (jaguarCache) return jaguarCache;
  const GOLD = hex("#d99a32");
  const GOLD_DARK = hex("#b87c22");
  const BLACK = hex("#1c1610");
  const WHITE = hex("#efe6d2");
  const fur = (t: Tile, f: FaceName) => {
    solid(t, f === "bottom" ? WHITE : GOLD, 0.07, 31);
    if (f === "bottom") return;
    for (let y = 1; y < t.h - 1; y += 5)
      for (let x = (y % 2) * 3; x < t.w - 1; x += 6) {
        // A rosette: a broken ring with a darker center.
        t.set(x, y, BLACK);
        t.set(x + 2, y, BLACK);
        t.set(x + 1, y - 1, BLACK);
        t.set(x + 1, y + 1, BLACK);
        t.set(x + 1, y, GOLD_DARK);
      }
    if (f === "left" || f === "right") for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, WHITE);
  };
  const face = (t: Tile, f: FaceName) => {
    fur(t, f);
    if (f === "front") {
      solid(t, GOLD, 0.05, 32);
      t.set(2, 3, hex("#f2e04a"));
      t.set(3, 3, BLACK);
      t.set(t.w - 4, 3, BLACK);
      t.set(t.w - 3, 3, hex("#f2e04a"));
      for (let x = Math.floor(t.w / 2) - 2; x <= Math.floor(t.w / 2) + 1; x++) t.set(x, t.h - 3, WHITE);
      t.set(Math.floor(t.w / 2) - 1, t.h - 4, BLACK);
      t.set(Math.floor(t.w / 2), t.h - 4, BLACK);
      for (const x of [1, 3, t.w - 2, t.w - 4]) t.set(x, 1, BLACK);
    }
  };
  const ear = (t: Tile) => solid(t, BLACK, 0.1, 33);
  const { geometries: G, material } = buildPixelModel([
    { size: [0.42, 0.4, 1.15], paint: fur }, // body
    { size: [0.34, 0.3, 0.32], paint: face }, // head
    { size: [0.12, 0.42, 0.13], paint: fur }, // leg
    { size: [0.09, 0.09, 0.75], paint: fur }, // tail
    { size: [0.08, 0.08, 0.04], paint: ear },
  ]);
  const body = mergeGeometries([
    place(G[0], 0, 0.62, 0),
    place(G[1], 0, 0.78, 0.7),
    place(G[4], -0.11, 0.96, 0.66),
    place(G[4], 0.11, 0.96, 0.66),
  ])!;
  jaguarCache = { body, leg: place(G[2], 0, -0.21, 0), tail: place(G[3], 0, 0, -0.37), material };
  return jaguarCache;
}
