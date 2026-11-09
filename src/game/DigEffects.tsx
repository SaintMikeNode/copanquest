import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { DIG_SITES, ARTIFACTS } from "./gameData";
import { useAction } from "./WorldGame";
import { useProgress } from "../state/progress";
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";
import { playerState } from "../player/playerState";

const SITE = new Map(DIG_SITES.map((d) => [d.id, d.at]));

/** Pixel models: dirt clod, earth rim, pit floor, spoil, sparkle, and one per artifact. */
function models() {
  const dirt = (seed: number) => (t: Tile) => {
    solid(t, hex("#7a4a2c"), 0.25, seed);
    for (let i = 0; i < 4; i++) t.set((i * 5) % t.w, (i * 3) % t.h, hex("#5a3420"));
  };
  const artifact = (id: string): ((t: Tile, f: FaceName) => void) => {
    const a = ARTIFACTS.find((x) => x.id === id)!;
    return (t, f) => {
      solid(t, hex(a.color), 0.08, 90);
      if (id === "copador" && (f === "top" || f === "bottom"))
        for (let x = 0; x < t.w; x++) {
          t.set(x, 1, hex("#b02a1c"));
          t.set(x, 3, hex("#2a1a12"));
        }
      if (id === "whorl" && f === "top") t.set(Math.floor(t.w / 2), Math.floor(t.h / 2), hex("#2a1a12"));
      if (id === "obsidian") t.set(1, 1, hex("#8a8aa8"));
    };
  };
  return buildPixelModel([
    { size: [0.16, 0.16, 0.16], paint: dirt(91) }, // 0 clod
    { size: [3.2, 0.18, 0.3], paint: dirt(92) }, // 1 rim (x)
    { size: [3.4, 0.02, 3.4], paint: (t) => solid(t, hex("#3a2416"), 0.2, 93) }, // 2 pit floor
    { size: [0.8, 0.4, 0.8], paint: dirt(94) }, // 3 spoil
    { size: [0.08, 0.08, 0.08], paint: (t) => solid(t, hex("#ffe36a"), 0.05, 95) }, // 4 sparkle
    { size: [0.32, 0.05, 0.26], paint: artifact("copador") }, // 5
    { size: [0.07, 0.04, 0.34], paint: artifact("obsidian") }, // 6
    { size: [0.14, 0.14, 0.14], paint: artifact("shell") }, // 7
    { size: [0.2, 0.07, 0.2], paint: artifact("whorl") }, // 8
    { size: [0.14, 0.07, 0.28], paint: artifact("celt") }, // 9
  ]);
}
const ART_INDEX: Record<string, number> = { copador: 5, obsidian: 6, shell: 7, whorl: 8, celt: 9 };

const CLODS = 26;
const SPARKS = 30;

/** Dirt flying while digging, the find rising out of the ground, and dug-out pits. */
export function DigEffects() {
  const { geometries: G, material } = useMemo(models, []);
  const dug = useProgress((s) => s.dug);
  const { world, rapier } = useRapier();
  const ground = useMemo(() => {
    const ray = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
    const cache = new Map<string, number>();
    return (id: string, x: number, z: number) => {
      if (cache.has(id)) return cache.get(id)!;
      ray.origin = { x, y: 40, z };
      const hit = world.castRay(ray, 80, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_KINEMATIC, undefined, undefined, playerState.body ?? undefined);
      const y = hit ? 40 - hit.timeOfImpact : 0;
      cache.set(id, y);
      return y;
    };
  }, [world, rapier]);

  const clods = useRef<THREE.InstancedMesh>(null);
  const sparks = useRef<THREE.InstancedMesh>(null);
  const relic = useRef<THREE.Mesh>(null);
  const particles = useMemo(() => Array.from({ length: CLODS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 })), []);
  const sparkData = useMemo(() => Array.from({ length: SPARKS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 })), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const lastReveal = useRef(0);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const { digging, reveal } = useAction.getState();
    // ---- dirt spray
    const mesh = clods.current;
    if (mesh) {
      const at = digging ? SITE.get(digging) : null;
      particles.forEach((c, i) => {
        if (c.life <= 0 && at) {
          const y = ground(digging!, at[0], at[1]);
          c.p.set(at[0] + (Math.random() - 0.5) * 1.2, y + 0.1, at[1] + (Math.random() - 0.5) * 1.2);
          c.v.set((Math.random() - 0.5) * 3, 2.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3);
          c.life = 0.5 + Math.random() * 0.7;
        }
        if (c.life > 0) {
          c.life -= dt;
          c.v.y -= 9.8 * dt;
          c.p.addScaledVector(c.v, dt);
        }
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, i + clock.elapsedTime * 4);
        s.setScalar(c.life > 0 ? 1 : 0);
        mesh.setMatrixAt(i, m.compose(c.p, q, s));
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    // ---- the find rising out of the ground, with sparkles
    const r = relic.current;
    const sp = sparks.current;
    if (r && sp) {
      const age = reveal ? (performance.now() - reveal.t) / 1000 : 99;
      const at = reveal ? SITE.get(reveal.site) : null;
      if (reveal && at && age < 4) {
        const y = ground(reveal.site, at[0], at[1]);
        const rise = Math.min(1, age / 0.9);
        r.visible = true;
        r.geometry = G[ART_INDEX[reveal.artifact] ?? 5];
        r.position.set(at[0], y - 0.2 + (1 - (1 - rise) ** 3) * 1.5 + Math.sin(age * 3) * 0.05, at[1]);
        r.rotation.set(0.4, age * 3, 0.2);
        const k = age > 3.4 ? (4 - age) / 0.6 : 1;
        r.scale.setScalar(1.6 * k);
        if (reveal.t !== lastReveal.current) {
          lastReveal.current = reveal.t;
          sparkData.forEach((p) => {
            p.p.set(at[0], y + 0.6, at[1]);
            const a = Math.random() * Math.PI * 2;
            p.v.set(Math.cos(a) * (1 + Math.random() * 2), 2 + Math.random() * 3, Math.sin(a) * (1 + Math.random() * 2));
            p.life = 1 + Math.random() * 0.8;
          });
        }
      } else r.visible = false;
      sparkData.forEach((p, i) => {
        if (p.life > 0) {
          p.life -= dt;
          p.v.y -= 4 * dt;
          p.p.addScaledVector(p.v, dt);
        }
        s.setScalar(p.life > 0 ? 1 : 0);
        sp.setMatrixAt(i, m.compose(p.p, q.identity(), s));
      });
      sp.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={clods} args={[G[0], material, CLODS]} frustumCulled={false} />
      <instancedMesh ref={sparks} args={[G[4], material, SPARKS]} frustumCulled={false} />
      <mesh ref={relic} material={material} visible={false} />
      {dug.map((id) => {
        const at = SITE.get(id);
        if (!at) return null;
        const y = ground(id, at[0], at[1]);
        return (
          <group key={id} position={[at[0], y, at[1]]}>
            {/* Open pit: dark floor, raised earth rim, spoil heap beside it. */}
            {/* The voxel ground sits ~5 cm above the smooth physics surface the ray hits. */}
            <mesh geometry={G[2]} material={material} position={[0, 0.08, 0]} />
            <mesh geometry={G[1]} material={material} position={[0, 0.15, -1.55]} />
            <mesh geometry={G[1]} material={material} position={[0, 0.15, 1.55]} />
            <mesh geometry={G[1]} material={material} position={[-1.55, 0.15, 0]} rotation-y={Math.PI / 2} />
            <mesh geometry={G[1]} material={material} position={[1.55, 0.15, 0]} rotation-y={Math.PI / 2} />
            <mesh geometry={G[3]} material={material} position={[2.6, 0.26, 0.6]} />
            <mesh geometry={G[3]} material={material} position={[2.9, 0.18, -0.3]} scale={[0.8, 0.6, 0.8]} />
          </group>
        );
      })}
    </>
  );
}
