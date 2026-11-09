import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";
import { trackSubject } from "../game/subjects";

// Scarlet macaws (guaras rojas) fly freely around the ruins of Copán today.
const RED = hex("#d8262a");
const RED_DARK = hex("#a81c20");
const YELLOW = hex("#f4c21c");
const BLUE = hex("#1f62d0");
const WHITE = hex("#f2efe6");
const IVORY = hex("#e8dcc0");
const BLACK = hex("#1a1a1a");

function macawModel() {
  const body = (t: Tile) => solid(t, RED, 0.08, 21);
  const head = (t: Tile, f: FaceName) => {
    solid(t, RED, 0.06, 22);
    if (f === "left" || f === "right") {
      for (let y = 1; y < t.h - 1; y++) for (let x = 0; x < Math.ceil(t.w / 2); x++) t.set(f === "left" ? t.w - 1 - x : x, y, WHITE);
      t.set(Math.floor(t.w / 2), 1, BLACK);
    }
  };
  const beak = (t: Tile, f: FaceName) => solid(t, f === "bottom" ? BLACK : IVORY, 0.05, 23);
  const wing = (t: Tile, f: FaceName) => {
    // Along the span (x on top/bottom faces): red at the body, yellow band, blue tips.
    solid(t, RED, 0.06, 24);
    if (f !== "top" && f !== "bottom") return;
    for (let x = 0; x < t.w; x++) {
      const k = x / t.w;
      const c = k < 0.35 ? RED : k < 0.55 ? YELLOW : BLUE;
      for (let y = 0; y < t.h; y++) t.set(x, y, y === t.h - 1 && k > 0.55 ? RED_DARK : c);
    }
  };
  const tail = (t: Tile, f: FaceName) => {
    solid(t, RED, 0.06, 25);
    if (f === "top" || f === "bottom") for (let y = Math.floor(t.h * 0.7); y < t.h; y++) for (let x = 0; x < t.w; x++) t.set(x, y, BLUE);
  };
  return buildPixelModel([
    { size: [0.15, 0.15, 0.38], paint: body },
    { size: [0.13, 0.13, 0.13], paint: head },
    { size: [0.05, 0.07, 0.07], paint: beak },
    { size: [0.42, 0.025, 0.2], paint: wing },
    { size: [0.08, 0.02, 0.5], paint: tail },
  ]);
}

interface Bird {
  cx: number;
  cz: number;
  r: number;
  h: number;
  speed: number;
  phase: number;
}

const FLOCKS: Bird[] = [
  // Over the Great Plaza
  ...[0, 1, 2].map((i) => ({ cx: -5, cz: 20, r: 55 + i * 3, h: 22 + i * 1.5, speed: 0.14, phase: i * 0.06 })),
  // Over the Acropolis
  ...[0, 1, 2, 3].map((i) => ({ cx: 55, cz: 300, r: 65 - i * 2, h: 30 + i, speed: -0.12, phase: 2 + i * 0.05 })),
];

function Macaw({ bird, model }: { bird: Bird; model: ReturnType<typeof macawModel> }) {
  const root = useRef<THREE.Group>(null);
  const wl = useRef<THREE.Group>(null);
  const wr = useRef<THREE.Group>(null);
  const G = model.geometries;
  const m = model.material;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const a = bird.phase + t * bird.speed;
    const x = bird.cx + Math.cos(a) * bird.r;
    const z = bird.cz + Math.sin(a) * bird.r * 0.7;
    const y = bird.h + Math.sin(a * 3 + bird.phase * 9) * 2.5;
    const g = root.current;
    trackSubject(`macaw:${bird.phase}`, "macaw", x, y, z);
    if (g) {
      g.position.set(x, y, z);
      // Face along the path tangent and bank into the turn.
      const dx = -Math.sin(a) * bird.r * Math.sign(bird.speed);
      const dz = Math.cos(a) * bird.r * 0.7 * Math.sign(bird.speed);
      g.rotation.set(0, Math.atan2(dx, dz), 0);
      g.rotateZ(-0.35 * Math.sign(bird.speed));
    }
    const flap = Math.sin(t * 9 + bird.phase * 20) * 0.75;
    if (wl.current) wl.current.rotation.z = flap;
    if (wr.current) wr.current.rotation.z = -flap;
  });
  return (
    <group ref={root} scale={1.6}>
      <mesh geometry={G[0]} material={m} castShadow />
      <mesh geometry={G[1]} material={m} position={[0, 0.06, 0.22]} />
      <mesh geometry={G[2]} material={m} position={[0, 0.04, 0.31]} />
      <mesh geometry={G[4]} material={m} position={[0, -0.02, -0.42]} rotation-x={0.12} />
      <group ref={wl} position={[-0.07, 0.04, 0.02]}>
        <mesh geometry={G[3]} material={m} position={[-0.21, 0, 0]} castShadow />
      </group>
      <group ref={wr} position={[0.07, 0.04, 0.02]} scale-x={-1}>
        <mesh geometry={G[3]} material={m} position={[-0.21, 0, 0]} castShadow />
      </group>
    </group>
  );
}

/** Small flocks of scarlet macaws circling the site. */
export function Macaws() {
  const model = useMemo(macawModel, []);
  return (
    <>
      {FLOCKS.map((b, i) => (
        <Macaw key={i} bird={b} model={model} />
      ))}
    </>
  );
}
