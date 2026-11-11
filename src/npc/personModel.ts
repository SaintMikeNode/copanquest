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
    bottomDark: hex(o.bottom).map((v) => v * 0.75) as [number, number, number],
    hair: hex(o.hair),
    top: hex(o.top),
    accent: hex(o.accent),
    bottom: hex(o.bottom),
    white: hex("#f4f1e8"),
    eye: hex("#1a1210"),
    basket: hex("#c49e4f"),
    topDark: hex(o.top).map((v) => v * 0.78) as [number, number, number],
    boot: hex("#6a4426"),
    bootDark: hex("#4a2e18"),
    scarf: hex("#b8322a"),
    hat: hex("#8c6b45"),
    hatBand: hex("#3d2a1a"),
    basketDark: hex("#8c6a30"),
    jade: hex("#2f9e6e"),
    jadeDark: hex("#1d6b4a"),
    gold: hex("#f2c42c"),
    goggle: hex("#e8eef0"),
    goggleDark: hex("#9fb4bc"),
    quetzal: hex("#1f8a4c"),
    quetzalLight: hex("#5cc884"),
    macaw: hex("#d0362a"),
    macawBlue: hex("#2a5ca8"),
  };

  const leg = (t: Tile, f: FaceName) => {
    solid(t, C.skin, 0.05, 2);
    if (f === "top") return solid(t, C.bottom, 0.05, 2);
    if (o.explorer) {
      // Long trousers tucked into brown boots.
      solid(t, C.bottom, 0.05, 2);
      for (let y = t.h - 5; y < t.h; y++) for (let x = 0; x < t.w; x++) t.set(x, y, y === t.h - 1 ? C.bootDark : C.boot);
      return;
    }
    if (o.modern) {
      // Shorts to the knee, then skin, white socks and sneakers.
      const shorts = Math.ceil(t.h * 0.5);
      for (let y = 0; y < shorts; y++) for (let x = 0; x < t.w; x++) t.set(x, y, y === shorts - 1 ? C.bottomDark : C.bottom);
      for (let y = t.h - 4; y < t.h; y++) for (let x = 0; x < t.w; x++) t.set(x, y, y >= t.h - 2 ? C.white : hex("#e8e8e8"));
      for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, hex("#c0392b"));
      return;
    }
    // Woven hip cloth to mid-thigh (women's legs are under the skirt).
    if (!o.female) {
      const cloth = Math.ceil(t.h * 0.4);
      for (let y = 0; y < cloth; y++) for (let x = 0; x < t.w; x++) t.set(x, y, y === cloth - 1 ? C.accent : C.bottom);
    }
    if (o.royal) for (let x = 0; x < t.w; x++) t.set(x, t.h - 3, x % 2 ? C.jade : C.jadeDark); // jade anklet
    for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, hex("#5a3a22")); // sandals
  };
  const arm = (t: Tile, f: FaceName) => {
    solid(t, C.skin, 0.05, 3);
    if (f === "bottom") return;
    const sleeve = o.royal ? 0 : o.explorer ? 0.8 : o.modern || o.female ? 0.35 : 0;
    for (let y = 0; y < Math.ceil(t.h * sleeve); y++) for (let x = 0; x < t.w; x++) t.set(x, y, C.top);
    if (o.royal) for (let y = t.h - 5; y < t.h - 2; y++) for (let x = 0; x < t.w; x++) t.set(x, y, y === t.h - 4 ? C.jade : C.jadeDark); // jade cuff
  };
  const torso = (t: Tile, f: FaceName) => {
    if (o.royal) {
      // Bare chest, a wide collar of jade beads, a jade pectoral, a red belt with gold.
      solid(t, f === "top" ? C.jade : C.skin, 0.04, 4);
      if (f === "top" || f === "bottom") return;
      for (let y = 0; y < 3; y++) for (let x = 0; x < t.w; x++) t.set(x, y, (x + y) % 3 === 0 ? C.white : y === 1 ? C.jade : C.jadeDark);
      if (f === "front") {
        const cx = Math.floor(t.w / 2);
        for (let y = 3; y < 8; y++) for (let x = cx - 2; x < cx + 2; x++) t.set(x, y, y === 3 || y === 7 || x === cx - 2 || x === cx + 1 ? C.gold : C.jade);
      }
      for (let x = 0; x < t.w; x++) {
        t.set(x, t.h - 3, C.macaw);
        t.set(x, t.h - 2, x % 3 === 1 ? C.gold : C.macaw);
        t.set(x, t.h - 1, C.macaw);
      }
      return;
    }
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
    } else if (o.explorer) {
      // Open jacket: the shirt shows down the front, a red neckerchief at the collar, a belt.
      if (f === "front") {
        const cx = Math.floor(t.w / 2);
        for (let y = 0; y < t.h - 3; y++) for (let x = cx - 2; x < cx + 2; x++) t.set(x, y, C.accent);
        for (let x = cx - 3; x < cx + 3; x++) for (let y = 0; y < 2; y++) t.set(x, y, C.scarf);
        t.set(cx - 1, 2, C.scarf);
        t.set(cx, 2, C.scarf);
        for (let y = 5; y < 9; y++) for (const x of [2, t.w - 4]) t.set(x, y, C.topDark); // pockets
      }
      for (let x = 0; x < t.w; x++) t.set(x, t.h - 3, C.bootDark);
      for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, C.topDark);
    } else if (o.modern) {
      for (let y = 2; y < t.h; y += 5) for (let x = 0; x < t.w; x++) if (x % 2 === 0 && f === "front") t.set(x, y, C.accent);
    } else {
      // Cotton tunic with a woven band at the chest and a sash at the waist.
      for (let x = 0; x < t.w; x++) {
        t.set(x, 1, C.accent);
        if (x % 3 === 0) t.set(x, 2, C.white);
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
    if (f === "front" && o.royal) {
      // Goggles: a pale ring around each eye (Altar Q, in the style of Teotihuacan).
      const ey = 5;
      for (const ex of [2, t.w - 4]) {
        for (let y = ey - 2; y <= ey + 1; y++) for (let x = ex - 1; x <= ex + 2; x++) t.set(x, y, y === ey + 1 ? C.goggleDark : C.goggle);
        t.set(ex, ey, C.white);
        t.set(ex + 1, ey, C.eye);
        t.set(ex, ey - 1, C.eye);
        t.set(ex + 1, ey - 1, C.eye);
      }
      const mx = Math.floor(t.w / 2);
      t.set(mx, ey + 2, C.skinDark);
      for (const x of [mx - 1, mx]) t.set(x, ey + 4, C.skinDark);
    } else if (f === "front") {
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
  const hatCrown = (t: Tile, f: FaceName) => {
    solid(t, C.hat, 0.07, 12);
    if (f === "top") for (let x = 1; x < t.w - 1; x++) t.set(x, Math.floor(t.h / 2), C.hatBand); // pinch
    else if (f !== "bottom") for (let y = t.h - 2; y < t.h; y++) for (let x = 0; x < t.w; x++) t.set(x, y, C.hatBand);
  };
  const hatBrim = (t: Tile) => solid(t, C.hat, 0.08, 13);
  const hairBack = (t: Tile) => {
    solid(t, C.hair, 0.12, 11);
    for (let y = 0; y < t.h; y += 4) for (let x = 0; x < t.w; x++) t.set(x, y, C.accent);
  };
  const basket = (t: Tile, f: FaceName) => {
    for (let y = 0; y < t.h; y++)
      for (let x = 0; x < t.w; x++) t.set(x, y, (x + y) % 3 === 0 ? C.basketDark : C.basket);
    if (f === "top") for (let y = 2; y < t.h - 2; y++) for (let x = 2; x < t.w - 2; x++) t.set(x, y, (x * 7 + y) % 5 ? hex("#f0bd2e") : hex("#d69a1c"));
  };

  const royalBand = (t: Tile, f: FaceName) => {
    solid(t, C.jade, 0.06, 14);
    if (f === "top" || f === "bottom") return;
    for (let x = 0; x < t.w; x++) {
      t.set(x, 0, C.gold);
      if (x % 3 === 1) t.set(x, Math.floor(t.h / 2), C.white);
      t.set(x, t.h - 1, C.jadeDark);
    }
  };
  // Long green quetzal tail feathers rising from red and yellow macaw feathers.
  const plume = (t: Tile, f: FaceName) => {
    solid(t, C.quetzal, 0.08, 15);
    if (f === "top" || f === "bottom") return;
    const mid = Math.floor(t.w / 2);
    for (let y = 0; y < t.h; y++) t.set(mid, y, C.quetzalLight);
    for (let x = 0; x < t.w; x++) {
      t.set(x, 0, C.quetzalLight);
      for (let y = t.h - 4; y < t.h; y++) t.set(x, y, y >= t.h - 2 ? C.macaw : C.gold);
    }
  };
  const earFlare = (t: Tile, f: FaceName) => {
    solid(t, C.jade, 0.06, 16);
    if (f === "left" || f === "right") {
      const cx = Math.floor(t.w / 2);
      const cy = Math.floor(t.h / 2);
      t.set(cx, cy, C.white);
      t.set(cx - 1, cy, C.jadeDark);
    }
  };
  // Small square shield: red frame, ochre face with a goggle eye, a fringe of green feathers.
  const shield = (t: Tile, f: FaceName) => {
    solid(t, C.macaw, 0.05, 17);
    if (f !== "left" && f !== "right") return;
    for (let y = 1; y < t.h - 3; y++) for (let x = 1; x < t.w - 1; x++) t.set(x, y, hex("#e0b25a"));
    const cx = Math.floor(t.w / 2);
    const cy = Math.floor((t.h - 3) / 2);
    for (let y = cy - 2; y <= cy + 1; y++) for (let x = cx - 2; x <= cx + 1; x++) t.set(x, y, C.goggle);
    for (let y = cy - 1; y <= cy; y++) for (let x = cx - 1; x <= cx; x++) t.set(x, y, C.eye);
    for (let y = t.h - 3; y < t.h; y++) for (let x = 0; x < t.w; x++) t.set(x, y, (x + y) % 2 ? C.quetzal : C.quetzalLight);
  };
  // Front of the headdress: bands of macaw red, yellow and blue.
  const crest = (t: Tile, f: FaceName) => {
    solid(t, C.macaw, 0.05, 18);
    if (f === "top" || f === "bottom") return;
    for (let x = 0; x < t.w; x++) {
      t.set(x, 1, C.gold);
      t.set(x, t.h - 2, C.macawBlue);
    }
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
    { size: [0.34, 0.14, 0.32], paint: hatCrown }, // 10
    { size: [0.6, 0.035, 0.58], paint: hatBrim }, // 11
    // The king (royal): headband, quetzal plumes (3 heights), ear flares, shield, macaw crest.
    { size: [0.38, 0.12, 0.36], paint: royalBand }, // 12
    { size: [0.1, 0.52, 0.06], paint: plume }, // 13
    { size: [0.1, 0.42, 0.06], paint: plume }, // 14
    { size: [0.1, 0.3, 0.06], paint: plume }, // 15
    { size: [0.05, 0.1, 0.1], paint: earFlare }, // 16
    { size: [0.04, 0.24, 0.22], paint: shield }, // 17
    { size: [0.16, 0.12, 0.05], paint: crest }, // 18
  ];
  const { geometries: G, material } = buildPixelModel(parts);

  const hip = 0.5;
  const shoulderY = hip + 0.5;
  const pieces = [place(G[2], 0, hip + 0.26, 0), place(G[3], 0, shoulderY + 0.19, 0)];
  if (o.female) pieces.push(place(G[4], 0, hip - 0.04, 0), place(G[8], 0, shoulderY + 0.02, -0.17));
  else pieces.push(place(G[5], 0, hip + 0.02, 0));
  if (o.head && o.head !== "none" && !o.royal) pieces.push(place(G[6], 0, shoulderY + 0.33, 0));
  if (o.royal) {
    const top = shoulderY + 0.42; // top of the headband
    pieces.push(
      place(G[12], 0, shoulderY + 0.36, 0),
      place(G[18], 0, shoulderY + 0.4, 0.19),
      place(G[13], 0, top + 0.26, -0.1),
      place(G[14], -0.11, top + 0.21, -0.1),
      place(G[14], 0.11, top + 0.21, -0.1),
      place(G[15], -0.22, top + 0.15, -0.1),
      place(G[15], 0.22, top + 0.15, -0.1),
      place(G[16], -0.195, shoulderY + 0.16, 0),
      place(G[16], 0.195, shoulderY + 0.16, 0),
    );
  }
  if (o.head === "cap") pieces.push(place(G[7], 0, shoulderY + 0.31, 0.22));
  if (o.basket) pieces.push(place(G[9], 0, shoulderY + 0.46, 0));
  if (o.explorer) pieces.push(place(G[11], 0, shoulderY + 0.36, 0), place(G[10], 0, shoulderY + 0.44, 0));
  const body = mergeGeometries(pieces)!;
  const limb = (g: THREE.BufferGeometry, len: number) => place(g, 0, -len / 2, 0);

  const rig: Rig = {
    body,
    legL: limb(G[0], 0.5),
    legR: limb(G[0], 0.5),
    // The king's shield rides on the outside of his right forearm (the −x arm: he faces +z).
    armL: o.royal ? mergeGeometries([limb(G[1], 0.48), place(G[17], -0.085, -0.33, 0)])! : limb(G[1], 0.48),
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
