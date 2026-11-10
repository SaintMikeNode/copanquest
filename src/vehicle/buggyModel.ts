// The archaeologist's buggy: a small open dune buggy (original design: orange tub, dark roll
// cage, exposed engine at the back, a shovel strapped to the side). Pixel art at the world's
// density like the jeep and the characters, but with round wheels.
//
// Body: every box is merged into one geometry (1 draw call). Wheels: one low-poly cylinder
// (14 sides) shared by all four through an InstancedMesh (1 draw call). Its caps sample a
// painted pixel rim, so the tire reads as a round, chunky pixel wheel and the 14-gon outline is
// smooth enough at buggy size, with no stepped "square" boxes.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import { createMonumentMaterial } from "../voxel/material";
import type { Tile, RGB } from "../voxel/textures";

const ORANGE = hex("#e2862a");
const ORANGE_DARK = hex("#b5651c");
const STRIPE = hex("#2f5d4a");
const CAGE = hex("#2a2826");
const SEAT = hex("#5a3a24");
const SEAT_DARK = hex("#45291a");
const METAL = hex("#7b7f83");
const METAL_DARK = hex("#55585b");
const CHROME = hex("#c4c8ca");
const LIGHT = hex("#fff3c4");
const TAIL = hex("#c8452c");
const RED = hex("#b8322a");
const WOOD = hex("#9a6a3a");
const TIRE = hex("#222120");
const TIRE_LIGHT = hex("#34322f");

function rect(t: Tile, x0: number, y0: number, w: number, h: number, c: RGB) {
  for (let y = Math.max(0, y0); y < Math.min(t.h, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(t.w, x0 + w); x++) t.set(x, y, c);
}

/** Wheel layout in buggy space (x across, z toward the front, y up from the ground at rest). */
export const WHEELS = [
  { x: 0.63, z: 0.74, r: 0.27, w: 0.2, front: true },
  { x: -0.63, z: 0.74, r: 0.27, w: 0.2, front: true },
  { x: 0.64, z: -0.68, r: 0.32, w: 0.27, front: false },
  { x: -0.64, z: -0.68, r: 0.32, w: 0.27, front: false },
];

/** Where the driver sits (hips), in buggy space. */
export const SEAT_POS: [number, number, number] = [0, 0.64, -0.12];

export function buggyBody() {
  const tub = (t: Tile, f: FaceName) => {
    solid(t, ORANGE, 0.05, 71);
    rect(t, 0, t.h - 2, t.w, 2, ORANGE_DARK); // dust along the bottom
    if (f === "left" || f === "right") {
      rect(t, 0, 2, t.w, 2, STRIPE);
      // A round "jade" badge on the doors.
      const cx = Math.round(t.w * 0.5);
      rect(t, cx - 2, 0, 4, 1, STRIPE);
      rect(t, cx - 3, t.h - 5, 6, 3, STRIPE);
      rect(t, cx - 2, t.h - 4, 4, 1, hex("#5fb08a"));
    }
  };
  const nose = (t: Tile, f: FaceName) => {
    solid(t, ORANGE, 0.04, 72);
    if (f === "top") rect(t, Math.round(t.w / 2) - 1, 0, 2, t.h, STRIPE);
    if (f === "front") {
      rect(t, 2, 1, 5, 4, LIGHT);
      rect(t, t.w - 7, 1, 5, 4, LIGHT);
      rect(t, 3, 2, 3, 2, hex("#ffffff"));
      rect(t, t.w - 6, 2, 3, 2, hex("#ffffff"));
    }
  };
  const engine = (t: Tile, f: FaceName) => {
    solid(t, METAL, 0.08, 73);
    if (f === "top") for (let x = 1; x < t.w - 1; x += 3) rect(t, x, 1, 2, t.h - 2, METAL_DARK); // cooling fins
    if (f === "back") {
      rect(t, 2, 2, t.w - 4, 3, METAL_DARK);
      rect(t, 2, t.h - 4, 3, 2, TAIL);
      rect(t, t.w - 5, t.h - 4, 3, 2, TAIL);
    }
  };
  const seat = (t: Tile, f: FaceName) => {
    solid(t, SEAT, 0.08, 74);
    if (f === "front" || f === "top") for (let x = 2; x < t.w; x += 4) rect(t, x, 0, 1, t.h, SEAT_DARK); // stitching
  };
  const tube = (t: Tile) => solid(t, CAGE, 0.04, 75);
  const bar = (t: Tile, f: FaceName) => {
    solid(t, CAGE, 0.03, 76);
    if (f === "front") for (let i = 0; i < 4; i++) rect(t, 1 + i * Math.floor((t.w - 2) / 4), 1, Math.floor((t.w - 2) / 4) - 1, t.h - 2, LIGHT);
  };
  const chrome = (t: Tile) => solid(t, CHROME, 0.05, 77);
  const fender = (t: Tile) => solid(t, ORANGE_DARK, 0.05, 78);
  const can = (t: Tile, f: FaceName) => {
    solid(t, RED, 0.05, 79);
    if (f === "left" || f === "right") {
      rect(t, 1, 2, t.w - 2, 1, hex("#e0d6c0"));
      rect(t, 1, t.h - 3, t.w - 2, 1, hex("#e0d6c0"));
    }
  };
  const wood = (t: Tile) => solid(t, WOOD, 0.08, 80);
  const blade = (t: Tile) => solid(t, METAL, 0.06, 81);
  const wheelHub = (t: Tile) => solid(t, CAGE, 0.03, 82);
  const exhaust = (t: Tile) => solid(t, METAL_DARK, 0.05, 83);

  const { geometries: G, material } = buildPixelModel([
    { size: [1.0, 0.22, 1.66], paint: tub }, // 0 floor tub
    { size: [0.86, 0.18, 0.5], paint: nose }, // 1 nose
    { size: [0.78, 0.3, 0.42], paint: engine }, // 2 engine
    { size: [0.52, 0.1, 0.44], paint: seat }, // 3 seat base
    { size: [0.52, 0.46, 0.1], paint: seat }, // 4 seat back
    { size: [0.06, 0.86, 0.06], paint: tube }, // 5 rear post (tub top 0.53 → rail top 1.39)
    { size: [1.0, 0.06, 0.06], paint: tube }, // 6 cross bar
    { size: [0.06, 0.06, 0.74], paint: tube }, // 7 side rail
    { size: [0.06, 0.86, 0.06], paint: tube }, // 8 front post (same: meets the rails, no gap)
    { size: [0.62, 0.1, 0.07], paint: bar }, // 9 light bar
    { size: [1.16, 0.07, 0.07], paint: chrome }, // 10 bumper
    { size: [0.24, 0.05, 0.6], paint: fender }, // 11 rear fender
    { size: [0.2, 0.05, 0.5], paint: fender }, // 12 front fender
    { size: [0.1, 0.24, 0.17], paint: can }, // 13 jerry can
    { size: [0.04, 0.04, 0.7], paint: wood }, // 14 shovel handle
    { size: [0.03, 0.16, 0.2], paint: blade }, // 15 shovel blade
    { size: [0.28, 0.28, 0.04], paint: wheelHub }, // 16 steering wheel
    { size: [0.05, 0.05, 0.3], paint: tube }, // 17 steering column
    { size: [0.07, 0.07, 0.22], paint: exhaust }, // 18 exhaust pipe
  ]);

  const at = (i: number, x: number, y: number, z: number, rx = 0) => {
    const g = G[i].clone();
    if (rx) g.rotateX(rx);
    g.translate(x, y, z);
    return g;
  };
  const parts = [
    at(0, 0, 0.42, -0.02),
    at(1, 0, 0.6, 0.66),
    at(2, 0, 0.68, -0.68),
    at(3, 0, 0.58, -0.12),
    at(4, 0, 0.84, -0.37),
    // Roll cage: two rear posts, two front posts, side rails, cross bars, light bar.
    at(5, -0.47, 0.96, -0.44),
    at(5, 0.47, 0.96, -0.44),
    at(8, -0.47, 0.96, 0.26),
    at(8, 0.47, 0.96, 0.26),
    at(7, -0.47, 1.36, -0.09),
    at(7, 0.47, 1.36, -0.09),
    at(6, 0, 1.36, -0.44),
    at(6, 0, 1.36, 0.26),
    at(9, 0, 1.44, 0.26),
    at(10, 0, 0.4, 1.0),
    at(10, 0, 0.42, -0.94),
    at(11, 0.64, 0.68, -0.68),
    at(11, -0.64, 0.68, -0.68),
    at(12, 0.63, 0.6, 0.74),
    at(12, -0.63, 0.6, 0.74),
    at(13, -0.56, 0.66, -0.2),
    at(14, 0.53, 0.62, -0.1),
    at(15, 0.53, 0.62, 0.32),
    at(17, 0, 0.78, 0.26, -0.75),
    at(16, 0, 0.86, 0.15, -0.75),
    at(18, 0.24, 0.6, -0.98),
  ];
  return { geometry: mergeGeometries(parts)!, material };
}

/**
 * One wheel of radius 1 and width 1 along x (scaled per instance). 14 sides; the side samples
 * the tread (right half of the texture), both caps the painted rim (left half).
 */
export function buggyWheel() {
  const S = 32;
  const canvas = document.createElement("canvas");
  canvas.width = S * 2;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(S * 2, S);
  const set = (x: number, y: number, c: RGB) => {
    const i = (y * S * 2 + x) * 4;
    img.data[i] = c[0];
    img.data[i + 1] = c[1];
    img.data[i + 2] = c[2];
    img.data[i + 3] = 255;
  };
  // Rim: tire ring, orange rim with a dark lip, five lug holes, a chrome hub.
  const c = S / 2;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / c;
      let col: RGB = TIRE;
      if (d > 0.62) col = d > 0.72 && d < 0.78 ? TIRE_LIGHT : TIRE; // tire, with a sidewall ring
      else if (d > 0.55) col = ORANGE_DARK;
      else if (d > 0.22) {
        col = ORANGE;
        // Six round holes, evenly spaced.
        for (let h = 0; h < 6; h++) {
          const ha = (h / 6) * Math.PI * 2;
          if (Math.hypot(x + 0.5 - c - Math.cos(ha) * c * 0.39, y + 0.5 - c - Math.sin(ha) * c * 0.39) < c * 0.09) col = CAGE;
        }
      } else if (d > 0.14) col = CHROME;
      else col = METAL_DARK;
      set(x, y, col);
    }
  // Tread: knobs across the tire, alternating.
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const knob = (x % 4 < 2) !== (y % 8 < 4);
      set(S + x, y, knob ? TIRE_LIGHT : TIRE);
    }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;

  const g = new THREE.CylinderGeometry(1, 1, 1, 14, 1);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // Remap each vertex once: an index lists shared vertices several times (one per triangle),
  // and remapping them again shrank the rim art off center.
  const done = new Set<number>();
  for (const grp of g.groups) {
    for (let k = grp.start; k < grp.start + grp.count; k++) {
      const i = g.index!.getX(k);
      if (done.has(i)) continue;
      done.add(i);
      // Each vertex belongs to one group only (side and caps don't share vertices).
      const u = uv.getX(i);
      const v = uv.getY(i);
      // Side: once around the tire (a repeat would wrap mid-face and smear the knobs).
      if (grp.materialIndex === 0) uv.setXY(i, 0.5 + u * 0.5 * 0.999, v);
      else uv.setXY(i, u * 0.5 * 0.999, v);
    }
  }
  g.clearGroups();
  g.rotateZ(Math.PI / 2); // axis along x
  return { geometry: g, material: createMonumentMaterial(tex) };
}
