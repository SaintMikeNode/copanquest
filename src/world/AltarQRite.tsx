// A copal offering at Altar Q (West Court, at the foot of Temple 16's west stair): two clay
// censers in front of the altar, flanking the priest, with smoke rising, and the priest who tends them (npcData "priest").
// The Maya burned copal, a tree resin, as incense; clay censers were found inside Rosalila
// (README, Rosalila). The censers' spiked look is an interpretation at game scale.
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";
import { LAYER_WORLD } from "../game/layers";
import { ACROPOLIS_TOP } from "./siteData";
import { smokePuff } from "./Smoke";
import { useGroundYs } from "./useGroundYs";

/**
 * In front of the altar (west), where the priest stands (npcData "priest", [39, 332.6]): one
 * censer a step ahead of him on each side, on his line toward Altar Q, clear of the trail.
 */
export const CENSERS: [number, number][] = [
  [39.3, 330.8],
  [40.5, 333.6],
];
/** Height of the bowl's rim above the ground (m). */
const RIM = 1.05;

const CLAY = hex("#a65a3a");
const CLAY_DARK = hex("#7c3f27");
const CLAY_LIGHT = hex("#c47a52");
const SOOT = hex("#2a211c");

function clay(seed: number, bands = false) {
  return (t: Tile, f: FaceName) => {
    solid(t, CLAY, 0.08, seed);
    if (f === "top") {
      // The bowl, black with soot, embers in the middle.
      for (let y = 1; y < t.h - 1; y++) for (let x = 1; x < t.w - 1; x++) t.set(x, y, SOOT);
      return;
    }
    if (f === "bottom") return;
    for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, CLAY_DARK);
    if (bands) for (let x = 0; x < t.w; x++) t.set(x, 2, CLAY_LIGHT);
  };
}

function censerModel() {
  return buildPixelModel([
    { size: [0.55, 0.18, 0.55], paint: clay(91) }, // 0 foot
    { size: [0.32, 0.55, 0.32], paint: clay(92, true) }, // 1 stem
    { size: [0.62, 0.32, 0.62], paint: clay(93, true) }, // 2 bowl
    { size: [0.08, 0.08, 0.12], paint: (t) => solid(t, CLAY_DARK, 0.05, 94) }, // 3 spike
  ]);
}

/** [part, x, y, z] in censer space; spikes stud the stem and the bowl's sides. */
const PARTS: [number, number, number, number][] = [
  [0, 0, 0.09, 0],
  [1, 0, 0.18 + 0.275, 0],
  [2, 0, RIM - 0.16, 0],
  ...[0.36, 0.56].flatMap((y) =>
    [
      [0.2, 0],
      [-0.2, 0],
      [0, 0.2],
      [0, -0.2],
    ].map(([x, z]) => [3, x, y, z] as [number, number, number, number]),
  ),
];

export function AltarQRite() {
  const model = useMemo(censerModel, []);
  const ys = useGroundYs(CENSERS, ACROPOLIS_TOP + 10);
  if (!ys) return null;
  return (
    <>
      {CENSERS.map(([x, z], k) => (
        <group key={k} position={[x, ys[k], z]}>
          {PARTS.map(([p, px, py, pz], i) => (
            <mesh
              key={i}
              geometry={model.geometries[p]}
              material={model.material}
              position={[px, py, pz]}
              rotation={[0, p === 3 && px !== 0 ? Math.PI / 2 : 0, 0]}
              layers-mask={1 | (1 << LAYER_WORLD)}
              castShadow
              receiveShadow
            />
          ))}
          {/* Glowing embers in the bowl. */}
          <mesh position={[0, RIM + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, 0.3]} />
            <meshBasicMaterial color="#ff8a3d" />
          </mesh>
        </group>
      ))}
      <CopalSmoke ys={ys} />
      <RigidBody type="fixed" colliders={false}>
        {CENSERS.map(([x, z], k) => (
          <CuboidCollider key={k} args={[0.3, RIM / 2, 0.3]} position={[x, ys[k] + RIM / 2, z]} />
        ))}
      </RigidBody>
    </>
  );
}

/** Thin white copal smoke curling up from both censers (one instanced draw). */
function CopalSmoke({ ys }: { ys: number[] }) {
  const PER = 8;
  const count = CENSERS.length * PER;
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geo, mat } = useMemo(() => {
    const s = smokePuff();
    s.mat.color.set("#f1eee6");
    s.mat.opacity = 0.4;
    return s;
  }, []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    CENSERS.forEach(([x, z], ci) => {
      for (let k = 0; k < PER; k++) {
        const life = (t * 0.22 + k / PER + ci * 0.37) % 1;
        const size = 0.12 + life * 0.55;
        // Curling up and drifting a little with the breeze.
        const wob = Math.sin(t * 0.7 + k * 1.7 + ci) * 0.35;
        p.set(x + (Math.sin(life * 7 + k + ci) * 0.3 + wob + 0.5) * life, ys[ci] + RIM + 0.1 + life * 3.6, z + Math.cos(life * 6 + k * 2) * 0.35 * life);
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, life * 3 + k);
        s.setScalar(size * (1 - life * 0.4));
        mesh.setMatrixAt(ci * PER + k, m.compose(p, q, s));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />;
}
