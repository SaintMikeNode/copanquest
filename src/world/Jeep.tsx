// The tour jeep the explorer arrived in, parked outside the entrance gate (see ARRIVAL in
// siteData.ts). A blocky pixel-art model (original design: a generic open safari 4×4, khaki
// with a green stripe and a canvas top) with one box collider so you can't walk through it.
import { use, useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";
import { terrainPromise } from "./Terrain";
import { sampleHeight } from "./terrainData";
import { REGION } from "../voxel/voxelWorld";
import { BLOCK } from "../voxel/blocks";
import { LAYER_WORLD } from "../game/layers";
import { JEEP } from "./siteData";

const KHAKI = hex("#c9b27a");
const KHAKI_DARK = hex("#a08a58");
const STRIPE = hex("#3f6b3a");
const TRIM = hex("#2b2620");
const TIRE = hex("#1e1c1a");
const HUB = hex("#9a9a94");
const GLASS = hex("#9fd0e8");
const LIGHT = hex("#fff3c4");
const CANVAS = hex("#6f6a4e");
const SEAT = hex("#5a3a24");

function rect(t: Tile, x0: number, y0: number, w: number, h: number, c: [number, number, number]) {
  for (let y = Math.max(0, y0); y < Math.min(t.h, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(t.w, x0 + w); x++) t.set(x, y, c);
}

function jeepModel() {
  /** Lower body: khaki, a green stripe along the sides, headlights and grille in front. */
  const body = (t: Tile, f: FaceName) => {
    solid(t, KHAKI, 0.05, 51);
    rect(t, 0, t.h - 3, t.w, 3, KHAKI_DARK); // dirt along the bottom
    if (f === "left" || f === "right") {
      rect(t, 0, 6, t.w, 4, STRIPE);
      // Door line and handle.
      const door = Math.round(t.w * 0.45);
      rect(t, door, 0, 1, t.h - 3, KHAKI_DARK);
      rect(t, door + 4, 12, 4, 1, TRIM);
    }
    if (f === "front") {
      rect(t, 3, 4, 8, 6, LIGHT);
      rect(t, t.w - 11, 4, 8, 6, LIGHT);
      for (let x = 16; x < t.w - 16; x += 3) rect(t, x, 3, 1, 9, TRIM); // grille
    }
    if (f === "back") {
      rect(t, 3, 4, 5, 4, hex("#c8452c"));
      rect(t, t.w - 8, 4, 5, 4, hex("#c8452c"));
    }
  };
  const hood = (t: Tile, f: FaceName) => {
    solid(t, KHAKI, 0.04, 52);
    if (f === "top") rect(t, Math.round(t.w / 2) - 2, 0, 4, t.h, KHAKI_DARK);
  };
  const windshield = (t: Tile, f: FaceName) => {
    solid(t, TRIM, 0.03, 53);
    if (f === "front" || f === "back") rect(t, 2, 2, t.w - 4, t.h - 4, GLASS);
  };
  const canvasTop = (t: Tile) => {
    solid(t, CANVAS, 0.08, 54);
  };
  const post = (t: Tile) => solid(t, TRIM, 0.03, 55);
  const seat = (t: Tile) => solid(t, SEAT, 0.08, 56);
  const wheel = (t: Tile, f: FaceName) => {
    solid(t, TIRE, 0.06, 57);
    if (f === "left" || f === "right") {
      const c = t.w / 2;
      for (let y = 0; y < t.h; y++)
        for (let x = 0; x < t.w; x++) {
          const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
          if (d < c * 0.45) t.set(x, y, HUB);
          if (d < c * 0.15) t.set(x, y, TRIM);
        }
    }
  };
  const tire = (t: Tile) => solid(t, TIRE, 0.06, 59);
  const bumper = (t: Tile) => solid(t, TRIM, 0.04, 58);
  return buildPixelModel([
    { size: [1.7, 0.7, 3.6], paint: body }, // 0
    { size: [1.6, 0.22, 1.15], paint: hood }, // 1
    { size: [1.6, 0.55, 0.08], paint: windshield }, // 2
    { size: [1.74, 0.08, 1.9], paint: canvasTop }, // 3
    { size: [0.08, 0.9, 0.08], paint: post }, // 4
    { size: [1.4, 0.4, 0.45], paint: seat }, // 5
    // Wheel: three overlapping boxes make a stepped round tire (a single box looked flat).
    { size: [0.32, 0.62, 0.62], paint: wheel }, // 6: middle, with the hub
    { size: [0.3, 0.78, 0.36], paint: tire }, // 7: tall
    { size: [0.3, 0.36, 0.78], paint: tire }, // 8: wide
    { size: [1.84, 0.18, 0.14], paint: bumper }, // 9
  ]);
}

/** Parts: [part, x, y, z] in jeep space (x across, y up, z toward the front). */
const WHEELS: [number, number, number, boolean][] = [
  [0.85, 0.39, 1.15, false],
  [-0.85, 0.39, 1.15, false],
  [0.85, 0.39, -1.15, false],
  [-0.85, 0.39, -1.15, false],
  [0, 1.0, -1.95, true], // spare wheel on the back, facing backward
];
/** Parts: [part, x, y, z, turned 90°] in jeep space (x across, y up, z toward the front). */
const LAYOUT: [number, number, number, number, boolean][] = [
  [0, 0, 0.75, 0, false],
  [1, 0, 1.21, 1.2, false],
  [2, 0, 1.6, 0.6, false],
  [3, 0, 2.06, -0.45, false],
  [4, -0.83, 1.56, -1.36, false],
  [4, 0.83, 1.56, -1.36, false],
  [4, -0.83, 1.56, 0.45, false],
  [4, 0.83, 1.56, 0.45, false],
  [5, 0, 1.3, -0.15, false],
  [5, 0, 1.3, -1.05, false],
  ...WHEELS.flatMap(([x, y, z, r]) => [6, 7, 8].map((p) => [p, x, y, z, r] as [number, number, number, number, boolean])),
  [9, 0, 0.5, 1.86, false],
  [9, 0, 0.5, -1.86, false],
];

export function Jeep() {
  const grid = use(terrainPromise);
  const model = useMemo(jeepModel, []);
  // Sit on the voxel ground (block tops are on the 0.5 m grid).
  const y = Math.round((sampleHeight(grid, JEEP.at[0], JEEP.at[1]) - REGION.minY) / BLOCK) * BLOCK + REGION.minY;
  return (
    <>
    <group position={[JEEP.at[0], y, JEEP.at[1]]} rotation={[0, JEEP.yaw, 0]}>
      {LAYOUT.map(([p, x, py, z, turned], i) => (
        <mesh
          key={i}
          geometry={model.geometries[p]}
          material={model.material}
          position={[x, py, z]}
          rotation={turned ? [0, Math.PI / 2, 0] : [0, 0, 0]}
          layers-mask={1 | (1 << LAYER_WORLD)}
          castShadow
          receiveShadow
        />
      ))}
    </group>
    <RigidBody type="fixed" colliders={false} position={[JEEP.at[0], y + 1.05, JEEP.at[1]]} rotation={[0, JEEP.yaw, 0]}>
      <CuboidCollider args={[0.95, 1.05, 1.95]} />
    </RigidBody>
    </>
  );
}
