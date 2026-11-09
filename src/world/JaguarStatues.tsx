// The two stone jaguars of the Jaguar Stairway (west side of the East Court, "Patio de los
// Jaguares"). Life-size, rearing on their hind legs with one forepaw raised; their spots are
// round holes that may once have held obsidian disks (mayaruins.com, Jaguar Stairway; see the
// "jaguars" point of interest). Blocky pixel-art models, an interpretation of the sculptures at
// game scale, with one box collider each.
import { useEffect, useMemo, useState } from "react";
import { CuboidCollider, RigidBody, useRapier } from "@react-three/rapier";
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";
import { LAYER_WORLD } from "../game/layers";
import { ACROPOLIS_TOP } from "./siteData";

/** Where they stand: the court floor at the foot of the stairway, flanking its center, facing east. */
const STATUES: { at: [number, number]; mirror: boolean }[] = [
  { at: [92.9, 280.6], mirror: false },
  { at: [92.9, 289.4], mirror: true },
];
const YAW = Math.PI / 2; // model front (+z) → east

const STONE = hex("#9a958a");
const STONE_DARK = hex("#7d786d");
const HOLE = hex("#2b2722");
const HOLE_RIM = hex("#5f5a50");

/** Weathered stone with round spot holes (each a dark pit with a darker rim on top). */
function spotted(seed: number, density = 1) {
  return (t: Tile, f: FaceName) => {
    solid(t, STONE, 0.08, seed);
    let s = seed * 97 + (f.length * 13);
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    // Lichen-dark lower edge.
    for (let x = 0; x < t.w; x++) if (rnd() < 0.5) t.set(x, t.h - 1, STONE_DARK);
    if (f === "bottom") return;
    const step = 8;
    let row = 0;
    for (let y = 3; y < t.h - 2; y += step, row++)
      for (let x = 3 + (row % 2) * 4; x < t.w - 2; x += step) {
        if (rnd() > 0.85 * density) continue;
        const cx = x + Math.floor(rnd() * 3) - 1;
        const cy = y + Math.floor(rnd() * 3) - 1;
        for (let dy = -3; dy <= 3; dy++)
          for (let dx = -3; dx <= 3; dx++) {
            const d = dx * dx + dy * dy;
            if (d > 8) continue;
            const px = cx + dx;
            const py = cy + dy;
            if (px < 0 || py < 0 || px >= t.w || py >= t.h) continue;
            t.set(px, py, d <= 4 ? HOLE : dy < 0 ? HOLE_RIM : STONE_DARK);
          }
      }
  };
}

function face(t: Tile, f: FaceName) {
  spotted(71, 0.5)(t, f);
  if (f !== "front") return;
  // Eyes, brow and a snarl.
  const e = Math.round(t.h * 0.3);
  for (const ex of [Math.round(t.w * 0.25), Math.round(t.w * 0.7)]) {
    for (let y = e; y < e + 3; y++) for (let x = ex - 1; x < ex + 3; x++) t.set(x, y, HOLE);
    for (let x = ex - 2; x < ex + 4; x++) t.set(x, e - 2, STONE_DARK);
  }
}
function muzzle(t: Tile, f: FaceName) {
  solid(t, STONE, 0.06, 72);
  if (f === "front") {
    for (let x = 2; x < t.w - 2; x++) t.set(x, t.h - 3, HOLE); // open jaws
    for (let x = Math.round(t.w / 2) - 2; x < Math.round(t.w / 2) + 2; x++) t.set(x, 1, HOLE_RIM); // nose
  }
}
const plinth = (t: Tile) => solid(t, STONE_DARK, 0.1, 73);

function statueModel() {
  return buildPixelModel([
    { size: [1.0, 0.3, 1.0], paint: plinth }, // 0 plinth
    { size: [0.24, 0.55, 0.42], paint: spotted(61) }, // 1 hind leg
    { size: [0.5, 0.8, 0.42], paint: spotted(62) }, // 2 torso (upright)
    { size: [0.44, 0.38, 0.42], paint: face }, // 3 head
    { size: [0.26, 0.18, 0.2], paint: muzzle }, // 4 muzzle
    { size: [0.1, 0.1, 0.06], paint: spotted(64, 0) }, // 5 ear
    { size: [0.14, 0.5, 0.14], paint: spotted(65, 0.6) }, // 6 foreleg
    { size: [0.1, 0.1, 0.75], paint: spotted(66, 0.6) }, // 7 tail
  ]);
}

/** [part, x, y, z, rotX, rotZ] in statue space (x across, y up, z toward the front). */
function layout(mirror: boolean): [number, number, number, number, number, number][] {
  const m = mirror ? -1 : 1;
  return [
    [0, 0, 0.15, 0, 0, 0],
    [1, -0.17, 0.58, -0.05, 0.25, 0],
    [1, 0.17, 0.58, -0.05, 0.25, 0],
    [2, 0, 1.12, 0.02, -0.3, 0],
    [3, 0, 1.62, 0.2, 0.1, 0],
    [4, 0, 1.56, 0.47, 0.1, 0],
    [5, -0.15, 1.85, 0.14, 0, 0],
    [5, 0.15, 1.85, 0.14, 0, 0],
    // One forepaw raised high, the other held at the chest (the raised side alternates).
    [6, 0.22 * m, 1.48, 0.4, -2.2, 0],
    [6, -0.2 * m, 1.12, 0.32, -0.9, 0],
    [7, 0, 0.42, -0.55, -0.35, 0],
  ];
}

export function JaguarStatues() {
  const model = useMemo(statueModel, []);
  const { world, rapier } = useRapier();
  // Ground under each statue (court floor or the last step), found once the colliders exist.
  const [ys, setYs] = useState<number[] | null>(null);
  useEffect(() => {
    let raf = 0;
    const ray = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
    const find = () => {
      const out: number[] = [];
      for (const s of STATUES) {
        ray.origin = { x: s.at[0], y: ACROPOLIS_TOP + 10, z: s.at[1] };
        const hit = world.castRay(ray, 30, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_KINEMATIC | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
        if (!hit) {
          raf = requestAnimationFrame(find);
          return;
        }
        out.push(ACROPOLIS_TOP + 10 - hit.timeOfImpact);
      }
      setYs(out);
    };
    raf = requestAnimationFrame(find);
    return () => cancelAnimationFrame(raf);
  }, [world, rapier]);
  if (!ys) return null;
  return (
    <>
      {STATUES.map((s, k) => (
        <group key={k} position={[s.at[0], ys[k], s.at[1]]} rotation={[0, YAW, 0]}>
          {layout(s.mirror).map(([p, x, y, z, rx, rz], i) => (
            <mesh
              key={i}
              geometry={model.geometries[p]}
              material={model.material}
              position={[x, y, z]}
              rotation={[rx, 0, rz]}
              layers-mask={1 | (1 << LAYER_WORLD)}
              castShadow
              receiveShadow
            />
          ))}
        </group>
      ))}
      <RigidBody type="fixed" colliders={false}>
        {STATUES.map((s, k) => (
          <CuboidCollider key={k} args={[0.5, 1.0, 0.5]} position={[s.at[0], ys[k] + 1.0, s.at[1]]} />
        ))}
      </RigidBody>
    </>
  );
}
