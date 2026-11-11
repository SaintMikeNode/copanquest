// The great carving that crowns the Jaguar Stairway (west side of the East Court): the head of
// the Jaguar God, the "Night Sun" (the sun traveling through the underworld after sunset), coming
// out of the jaws of a Vision Serpent, flanked by two giant Venus signs. His features follow the
// description: big eyes with scroll pupils, a twisted "cruller" between the eyes, an upswept
// topknot (mayaruins.com, "Jaguar Staircase, East Court"; Maudslay's 1890-91 photo shows part of
// the Venus signs). Sizes are estimates, and the Venus signs' shape is a stylized Maya star sign
// (the sources checked don't describe it): an interpretation at game scale, in the same blocky
// pixel style as the stone jaguars below (JaguarStatues.tsx).
import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";
import { LAYER_WORLD } from "../game/layers";
import { ACROPOLIS_TOP } from "./siteData";
import { useGroundYs } from "./useGroundYs";

/** On the stairway's top platform, at its east edge, centered on the stair (siteData "jaguar-stairs"). */
const AT: [number, number] = [87.3, 285];
const YAW = Math.PI / 2; // model front (+z) → east, over the court

const STONE = hex("#9d978a");
const STONE_LIGHT = hex("#b3ad9f");
const STONE_DARK = hex("#7a7468");
const DEEP = hex("#3a352e");

/** Fill a rectangle (clipped to the tile). */
function rect(t: Tile, x0: number, y0: number, w: number, h: number, c: [number, number, number]) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) t.set(x, y, c);
}
/** A carved outline: dark lower/right edges, light upper/left edges (light from above). */
function relief(t: Tile, x0: number, y0: number, w: number, h: number) {
  for (let x = x0; x < x0 + w; x++) {
    t.set(x, y0, STONE_LIGHT);
    t.set(x, y0 + h - 1, STONE_DARK);
  }
  for (let y = y0; y < y0 + h; y++) {
    t.set(x0, y, STONE_LIGHT);
    t.set(x0 + w - 1, y, STONE_DARK);
  }
}
/** A square spiral (scroll) inside a w×h box, drawn in `c`. */
function scroll(t: Tile, x0: number, y0: number, w: number, h: number, c: [number, number, number]) {
  let [l, tp, r, b] = [x0, y0, x0 + w - 1, y0 + h - 1];
  while (l < r && tp < b) {
    for (let x = l; x <= r; x++) t.set(x, tp, c);
    for (let y = tp; y <= b; y++) t.set(r, y, c);
    for (let x = r; x >= l + 2; x--) t.set(x, b, c);
    for (let y = b; y >= tp + 2; y--) t.set(l + 2, y, c);
    l += 2;
    tp += 2;
    r -= 2;
    b -= 2;
  }
}
/** Weathered stone: noise, lichen at the bottom, a few pits. */
function stone(seed: number) {
  return (t: Tile, f: FaceName) => {
    solid(t, STONE, 0.07, seed);
    if (f === "bottom") return;
    let s = seed * 31 + f.length;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let x = 0; x < t.w; x++) if (rnd() < 0.45) t.set(x, t.h - 1, STONE_DARK);
    for (let k = 0; k < (t.w * t.h) / 160; k++) t.set(Math.floor(rnd() * t.w), Math.floor(rnd() * t.h), STONE_DARK);
  };
}

/** The Jaguar God's face (front of the head block). */
function jaguarFace(t: Tile, f: FaceName) {
  stone(81)(t, f);
  if (f !== "front") return;
  const W = t.w;
  const H = t.h;
  const cx = Math.floor(W / 2);
  relief(t, 1, 1, W - 2, H - 2);
  // Brow band.
  rect(t, 4, 6, W - 8, 4, STONE_LIGHT);
  rect(t, 4, 10, W - 8, 1, STONE_DARK);
  // Big square eyes with scroll pupils.
  const ew = 18;
  const eh = 15;
  for (const ex of [cx - 6 - ew, cx + 6]) {
    rect(t, ex, 13, ew, eh, STONE_LIGHT);
    relief(t, ex, 13, ew, eh);
    scroll(t, ex + 3, 15, ew - 6, eh - 4, DEEP);
  }
  // The twisted "cruller" between the eyes: a braided band over the bridge of the nose.
  for (let y = 9; y < 32; y++) {
    const k = Math.floor(y / 3) % 2;
    rect(t, cx - 3, y, 6, 1, k ? STONE_LIGHT : STONE_DARK);
    t.set(cx - 3 + ((y * 2) % 6), y, DEEP);
  }
  // Broad jaguar nose.
  rect(t, cx - 7, 32, 14, 6, STONE_LIGHT);
  relief(t, cx - 7, 32, 14, 6);
  t.set(cx - 4, 36, DEEP);
  t.set(cx + 3, 36, DEEP);
  // Cheek spots.
  for (const [sx, sy] of [
    [8, 32],
    [13, 38],
    [8, 44],
    [W - 10, 32],
    [W - 15, 38],
    [W - 10, 44],
  ])
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) t.set(sx + dx, sy + dy, dx * dx + dy * dy <= 2 ? DEEP : STONE_DARK);
  // Open mouth with fangs.
  const my = H - 18;
  rect(t, cx - 16, my, 32, 9, DEEP);
  relief(t, cx - 17, my - 1, 34, 11);
  for (let x = cx - 14; x < cx + 14; x += 5) rect(t, x, my, 3, 3, STONE_LIGHT); // upper teeth
  for (const fx of [cx - 13, cx + 10]) rect(t, fx, my, 3, 7, STONE_LIGHT); // fangs
  for (let x = cx - 11; x < cx + 11; x += 5) rect(t, x, my + 6, 3, 3, STONE_LIGHT); // lower teeth
}

/** A serpent jaw: a row of teeth along the edge that faces the god (`teethAtBottom` for the upper jaw). */
function jaw(teethAtBottom: boolean) {
  return (t: Tile, f: FaceName) => {
    stone(teethAtBottom ? 82 : 83)(t, f);
    if (f !== "front" && f !== "bottom" && f !== "top") return;
    if (f === "front") {
      relief(t, 0, 0, t.w, t.h);
      const y = teethAtBottom ? t.h - 5 : 1;
      for (let x = 3; x < t.w - 3; x += 4) rect(t, x, y, 3, 4, STONE_LIGHT);
      // The serpent's eye scrolls at both ends of the upper jaw.
      if (teethAtBottom) for (const ex of [2, t.w - 14]) scroll(t, ex, 2, 12, 9, DEEP);
    }
  };
}

/** A Venus sign: a stylized four-lobed Maya star in a square cartouche. */
function venus(t: Tile, f: FaceName) {
  stone(84)(t, f);
  if (f !== "front") return;
  const W = t.w;
  const H = t.h;
  relief(t, 1, 1, W - 2, H - 2);
  relief(t, 4, 4, W - 8, H - 8);
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 8;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      // Four rounded lobes (a quatrefoil) with a ring at the center.
      const lobe = R * (0.62 + 0.38 * Math.abs(Math.cos(2 * a)));
      if (r < lobe && r > lobe - 3) t.set(x, y, DEEP);
      else if (r < lobe - 3) t.set(x, y, STONE_LIGHT);
      if (r < R * 0.32 && r > R * 0.32 - 3) t.set(x, y, DEEP);
    }
  // A dot in each lobe.
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ])
    rect(t, Math.round(cx + dx * R * 0.66) - 2, Math.round(cy + dy * R * 0.66) - 2, 4, 4, DEEP);
}

/** The upswept topknot. */
function topknot(t: Tile, f: FaceName) {
  stone(85)(t, f);
  if (f === "front") for (let y = 2; y < t.h; y += 4) rect(t, 2, y, t.w - 4, 1, STONE_DARK);
}

function maskModel() {
  return buildPixelModel([
    { size: [2.4, 1.9, 0.7], paint: jaguarFace }, // 0 head
    { size: [3.4, 0.55, 1.3], paint: jaw(true) }, // 1 upper jaw
    { size: [3.4, 0.45, 1.3], paint: jaw(false) }, // 2 lower jaw
    { size: [1.7, 1.7, 0.45], paint: venus }, // 3 Venus sign
    { size: [0.7, 0.65, 0.5], paint: topknot }, // 4 topknot
  ]);
}

/** [part, x (along the stair), y (up), z (out toward the court), rotX] in carving space. */
const LAYOUT: [number, number, number, number, number][] = [
  [2, 0, 0.225, 0.2, 0],
  [0, 0, 0.45 + 0.95, 0, 0],
  [1, 0, 0.45 + 1.9 + 0.275, 0.2, 0],
  [4, 0, 2.9 + 0.3, -0.15, -0.35],
  [3, -2.9, 0.85, 0, 0],
  [3, 2.9, 0.85, 0, 0],
];

export function JaguarStairMask() {
  const model = useMemo(maskModel, []);
  const ys = useGroundYs([AT], ACROPOLIS_TOP + 10);
  if (!ys) return null;
  const y = ys[0];
  return (
    <>
      <group position={[AT[0], y, AT[1]]} rotation={[0, YAW, 0]}>
        {LAYOUT.map(([p, x, py, z, rx], i) => (
          <mesh
            key={i}
            geometry={model.geometries[p]}
            material={model.material}
            position={[x, py, z]}
            rotation={[rx, 0, 0]}
            layers-mask={1 | (1 << LAYER_WORLD)}
            castShadow
            receiveShadow
          />
        ))}
      </group>
      <RigidBody type="fixed" colliders={false}>
        {/* Head and jaws, and the two Venus signs (carving space x → world z). */}
        <CuboidCollider args={[0.65, 1.6, 1.7]} position={[AT[0] + 0.2, y + 1.6, AT[1]]} />
        <CuboidCollider args={[0.25, 0.85, 0.85]} position={[AT[0], y + 0.85, AT[1] - 2.9]} />
        <CuboidCollider args={[0.25, 0.85, 0.85]} position={[AT[0], y + 0.85, AT[1] + 2.9]} />
      </RigidBody>
    </>
  );
}
