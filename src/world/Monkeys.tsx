// White-faced capuchins (mono cara blanca, Cebus imitator): small troops sit on the canopy
// ledges of trees around the park, look around, leap between nearby trees and scatter when
// the player comes close. One of the three wild monkeys of Honduras (with the spider and the
// howler monkey). Perches come from the voxel worker (treePerches in decorate.ts).
// Drawn as instanced body parts: 6 draw calls for every monkey together.
import { use, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";
import { voxelPromise } from "../voxel/voxelStream";
import { playerState } from "../player/playerState";
import { trackSubject } from "../game/subjects";
import { BOUNDS } from "./siteData";

const BLACK = hex("#1c1714");
const FUR = hex("#2a211b");
const CREAM = hex("#eee3c8");
const FACE = hex("#d9a58c");
const EYE = hex("#140d0a");

function capuchinModel() {
  const body = (t: Tile, f: FaceName) => {
    solid(t, FUR, 0.08, 31);
    // Cream chest and shoulders.
    if (f === "front") for (let y = 0; y < Math.ceil(t.h * 0.45); y++) for (let x = 1; x < t.w - 1; x++) t.set(x, y, CREAM);
    if (f === "top") for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) t.set(x, y, CREAM);
  };
  const head = (t: Tile, f: FaceName) => {
    solid(t, CREAM, 0.05, 32);
    if (f === "top" || f === "back") solid(t, BLACK, 0.05, 33); // black cap
    if (f === "front") {
      for (let y = 0; y < 2; y++) for (let x = 0; x < t.w; x++) t.set(x, y, BLACK); // cap edge
      for (let y = 2; y < t.h - 1; y++) for (let x = 1; x < t.w - 1; x++) t.set(x, y, FACE);
      t.set(1, 2, EYE);
      t.set(t.w - 2, 2, EYE);
    }
  };
  const limb = (t: Tile) => solid(t, BLACK, 0.06, 34);
  const muzzle = (t: Tile, f: FaceName) => {
    solid(t, FACE, 0.05, 35);
    if (f === "front") t.set(Math.floor(t.w / 2), Math.floor(t.h / 2), EYE); // nose
  };
  return buildPixelModel([
    { size: [0.2, 0.28, 0.17], paint: body },
    { size: [0.15, 0.14, 0.13], paint: head },
    { size: [0.06, 0.2, 0.06], paint: limb }, // arm
    { size: [0.07, 0.07, 0.18], paint: limb }, // thigh
    { size: [0.045, 0.045, 0.5], paint: limb }, // tail
    { size: [0.08, 0.06, 0.05], paint: muzzle },
  ]);
}

/** Where troops live: the nearest tree with canopy perches is picked for each spot. */
const TROOP_SPOTS: [number, number][] = [
  [-130, 100], // entrance and village
  [-62, -40], // ceiba west of the Great Plaza
  [60, 70], // ceiba east of Structure 4
  [-55, 150], // fig west of the ball court
  [48, 160], // fig east of the ball court
  [-28, 228], // ceiba by the Hieroglyphic Stairway
  [128, 330], // ceiba by the East Court
  [70, 45], // east ward
  [-80, 290], // west ward
];
const PER_TROOP = 3;

interface Perch {
  p: THREE.Vector3;
  tree: number;
}
interface Monkey {
  troop: number;
  perch: Perch;
  pos: THREE.Vector3;
  from: THREE.Vector3;
  leap: number; // 0..1 while leaping, −1 sitting
  dur: number;
  wait: number;
  yaw: number;
  head: number;
  headTo: number;
  phase: number;
}

const inside = (x: number, z: number) => x > BOUNDS.minX + 3 && x < BOUNDS.maxX - 3 && z > BOUNDS.minZ + 3 && z < BOUNDS.maxZ - 3;

function setup(raw: Float32Array) {
  const trees = new Map<number, Perch[]>();
  for (let i = 0; i < raw.length; i += 4) {
    const t = raw[i + 3];
    if (!inside(raw[i], raw[i + 2])) continue;
    let list = trees.get(t);
    if (!list) trees.set(t, (list = []));
    list.push({ p: new THREE.Vector3(raw[i], raw[i + 1], raw[i + 2]), tree: t });
  }
  const center = new Map<number, THREE.Vector3>();
  for (const [t, list] of trees) center.set(t, list.reduce((a, b) => a.add(b.p), new THREE.Vector3()).divideScalar(list.length));
  const troops: { perches: Perch[] }[] = [];
  const used = new Set<number>();
  for (const [sx, sz] of TROOP_SPOTS) {
    let best = -1;
    let bestD = 30;
    for (const [t, c] of center) {
      const d = Math.hypot(c.x - sx, c.z - sz);
      if (d < bestD && !used.has(t) && trees.get(t)!.length >= PER_TROOP) {
        best = t;
        bestD = d;
      }
    }
    if (best < 0) continue;
    used.add(best);
    // The troop's range: its tree plus neighbors close enough to leap to.
    const home = center.get(best)!;
    const perches: Perch[] = [];
    for (const [t, c] of center) if (t === best || (Math.hypot(c.x - home.x, c.z - home.z) < 22 && !used.has(t))) perches.push(...trees.get(t)!);
    troops.push({ perches });
  }
  const monkeys: Monkey[] = [];
  troops.forEach((tr, ti) => {
    for (let k = 0; k < PER_TROOP; k++) {
      const perch = tr.perches[k % tr.perches.length];
      monkeys.push({
        troop: ti,
        perch,
        pos: perch.p.clone(),
        from: perch.p.clone(),
        leap: -1,
        dur: 1,
        wait: 1 + Math.random() * 6,
        yaw: Math.random() * Math.PI * 2,
        head: 0,
        headTo: 0,
        phase: Math.random() * 10,
      });
    }
  });
  return { troops, monkeys };
}

const m4 = new THREE.Matrix4();
const root = new THREE.Matrix4();
const part = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const one = new THREE.Vector3(1, 1, 1);
const zero = new THREE.Matrix4().makeScale(0, 0, 0);

/** part = root · T(pos) · R(rot) · T(offset) */
function compose(pos: [number, number, number], rot: [number, number, number], offset: [number, number, number] = [0, 0, 0]) {
  part.copy(root);
  part.multiply(m4.makeTranslation(pos[0], pos[1], pos[2]));
  part.multiply(m4.makeRotationFromQuaternion(q.setFromEuler(e.set(rot[0], rot[1], rot[2]))));
  return part.multiply(m4.makeTranslation(offset[0], offset[1], offset[2]));
}

export function Monkeys() {
  const base = use(voxelPromise);
  const model = useMemo(capuchinModel, []);
  const { troops, monkeys } = useMemo(() => setup(base.perches ?? new Float32Array()), [base]);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const occupied = useRef(new Set<Perch>(monkeys.map((m) => m.perch)));
  const n = monkeys.length;

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    const p = playerState.position;
    const [body, head, arm, leg, tail, muzzle] = refs.current;
    if (!body || !head || !arm || !leg || !tail || !muzzle) return;
    monkeys.forEach((mk, i) => {
      const range = troops[mk.troop].perches;
      const near = Math.hypot(p.x - mk.pos.x, p.z - mk.pos.z) < 8 && Math.abs(p.y - mk.pos.y) < 14;
      if (mk.leap < 0) {
        mk.wait -= dt;
        mk.phase += dt;
        if (Math.random() < dt * 0.4) mk.headTo = (Math.random() - 0.5) * 1.8;
        mk.head += (mk.headTo - mk.head) * Math.min(1, dt * 5);
        if (near || mk.wait <= 0) {
          // Next perch: away from the player when startled, otherwise somewhere in the range.
          let next: Perch | null = null;
          let bestScore = -Infinity;
          for (let k = 0; k < 6; k++) {
            const c = range[Math.floor(Math.random() * range.length)];
            if (c === mk.perch || occupied.current.has(c)) continue;
            const d = c.p.distanceTo(mk.pos);
            if (d > 18) continue;
            const score = near ? Math.hypot(c.p.x - p.x, c.p.z - p.z) : -d + (c.tree === mk.perch.tree ? 4 : 0);
            if (score > bestScore) {
              bestScore = score;
              next = c;
            }
          }
          if (next) {
            occupied.current.delete(mk.perch);
            occupied.current.add(next);
            mk.from.copy(mk.pos);
            mk.perch = next;
            const d = next.p.distanceTo(mk.from);
            mk.dur = Math.max(0.45, d / 7);
            mk.leap = 0;
            mk.yaw = Math.atan2(next.p.x - mk.from.x, next.p.z - mk.from.z);
          }
          mk.wait = near ? 0.6 : 3 + Math.random() * 8;
        }
      } else {
        mk.leap = Math.min(1, mk.leap + dt / mk.dur);
        const d = mk.from.distanceTo(mk.perch.p);
        mk.pos.lerpVectors(mk.from, mk.perch.p, mk.leap);
        mk.pos.y += Math.sin(mk.leap * Math.PI) * (0.8 + d * 0.22);
        if (mk.leap >= 1) {
          mk.leap = -1;
          mk.pos.copy(mk.perch.p);
        }
      }
      trackSubject(`capuchin:${i}`, "capuchin", mk.pos.x, mk.pos.y + 0.35, mk.pos.z);

      // Pose. Far away (or behind the fog) they are hidden by a zero scale.
      if (camera.position.distanceTo(mk.pos) > 110) {
        for (const [mesh, k] of [[body, i], [head, i], [tail, i], [muzzle, i], [arm, i * 2], [arm, i * 2 + 1], [leg, i * 2], [leg, i * 2 + 1]] as const)
          mesh.setMatrixAt(k, zero);
        return;
      }
      const flying = mk.leap >= 0;
      root.compose(mk.pos, q.setFromEuler(e.set(flying ? 1.05 : 0, mk.yaw, 0, "YXZ")), v.copy(one).multiplyScalar(1.6));
      const sway = Math.sin(mk.phase * 1.7) * 0.25;
      body.setMatrixAt(i, compose([0, 0.2, 0], [-0.15, 0, 0]));
      head.setMatrixAt(i, compose([0, 0.41, 0.04], [0.1, mk.head, 0]));
      muzzle.setMatrixAt(i, compose([0, 0.41, 0.04], [0.1, mk.head, 0], [0, -0.03, 0.085]));
      // Sitting: the tail lies out behind and sways; leaping: straight back for balance.
      tail.setMatrixAt(i, compose([0, 0.08, -0.09], flying ? [-1.45, 0, 0] : [-0.3, sway, 0], [0, 0, -0.25]));
      for (const s of [-1, 1]) {
        const k = i * 2 + (s > 0 ? 1 : 0);
        arm.setMatrixAt(k, compose([s * 0.125, 0.3, 0.04], flying ? [-1.4, 0, 0] : [-0.5 + (s > 0 ? Math.sin(mk.phase * 0.7) * 0.15 : 0), 0, 0], [0, -0.09, 0]));
        leg.setMatrixAt(k, compose([s * 0.07, 0.06, 0.05], flying ? [0.9, 0, 0] : [0, s * 0.2, 0]));
      }
    });
    for (const mesh of [body, head, arm, leg, tail, muzzle]) mesh.instanceMatrix.needsUpdate = true;
  });

  if (n === 0) return null;
  const G = model.geometries;
  const parts: [THREE.BufferGeometry, number][] = [[G[0], n], [G[1], n], [G[2], n * 2], [G[3], n * 2], [G[4], n], [G[5], n]];
  return (
    <>
      {parts.map(([geo, count], k) => (
        <instancedMesh
          key={k}
          ref={(r) => void (refs.current[k] = r)}
          args={[geo, model.material, count]}
          frustumCulled={false}
        />
      ))}
    </>
  );
}
