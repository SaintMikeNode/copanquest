import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { TERRAIN_SCULPT } from "./siteData";
import { shared, createWaterMaterial } from "../voxel/material";
import { createWaterTexture } from "../voxel/textures";
import { playerState } from "../player/playerState";
import { useQualityLevel } from "../state/useGame";
import { LAYER_CHARACTERS, LAYER_WORLD } from "../game/layers";

export const SKY = "#c3d6f0";

function River() {
  const r = TERRAIN_SCULPT[0];
  const material = useMemo(() => createWaterMaterial(createWaterTexture()), []);
  return (
    <mesh
      position={[(r.minX + r.maxX) / 2, r.y + 0.6, (r.minZ + r.maxZ) / 2]}
      rotation-x={-Math.PI / 2}
      material={material}
    >
      <planeGeometry args={[r.maxX - r.minX + 60, r.maxZ - r.minZ + 60]} />
    </mesh>
  );
}

/**
 * Two shadow-casting suns (same direction, no light of their own — the block shaders light
 * everything from `shared`):
 *  - World sun: casts only layer WORLD. The sun no longer moves, so this map is effectively
 *    baked: it is only redrawn when the player has walked ~10 m from where it was last drawn.
 *  - Character sun: casts only layer CHARACTERS in a tight box around the player and is
 *    redrawn every frame — cheap, because only a handful of small meshes are in it.
 */
function Sun() {
  const level = useQualityLevel();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const world = useRef<THREE.DirectionalLight>(null);
  const chars = useRef<THREE.DirectionalLight>(null);
  const last = useRef({ x: Infinity, z: Infinity, frames: 0 });

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFShadowMap;
    gl.shadowMap.autoUpdate = true; // per-light control below
    camera.layers.enable(LAYER_CHARACTERS);
    camera.layers.enable(LAYER_WORLD);
  }, [gl, camera]);

  useEffect(() => {
    const setup = (l: THREE.DirectionalLight | null, half: number, layer: number, far: number) => {
      if (!l) return;
      scene.add(l.target);
      const cam = l.shadow.camera;
      cam.left = -half;
      cam.right = half;
      cam.top = half;
      cam.bottom = -half;
      cam.near = 1;
      cam.far = far;
      cam.updateProjectionMatrix();
      cam.layers.set(layer);
      l.shadow.bias = -0.0004;
      l.shadow.normalBias = 0.04;
    };
    setup(world.current, 60, LAYER_WORLD, 280);
    setup(chars.current, 16, LAYER_CHARACTERS, 120);
    if (world.current) world.current.shadow.autoUpdate = false;
    return () => {
      if (world.current) scene.remove(world.current.target);
      if (chars.current) scene.remove(chars.current.target);
    };
  }, [scene]);

  useEffect(() => {
    const resize = (l: THREE.DirectionalLight | null, size: number) => {
      if (!l || l.shadow.mapSize.x === size) return;
      l.shadow.mapSize.set(size, size);
      l.shadow.map?.dispose();
      l.shadow.map = null as unknown as THREE.WebGLRenderTarget;
      l.shadow.needsUpdate = true;
    };
    resize(world.current, level === "low" ? 1024 : 2048);
    resize(chars.current, level === "low" ? 512 : 1024);
  }, [level]);

  useFrame(() => {
    const p = playerState.position;
    const d = shared.sunDirection.value;
    const place = (l: THREE.DirectionalLight, mapUnits: number, dist: number) => {
      const snap = mapUnits / l.shadow.mapSize.x;
      const tx = Math.round(p.x / snap) * snap;
      const tz = Math.round(p.z / snap) * snap;
      l.target.position.set(tx, p.y, tz);
      l.target.updateMatrixWorld();
      l.position.set(tx + d.x * dist, p.y + d.y * dist, tz + d.z * dist);
      l.updateMatrixWorld();
    };
    const c = chars.current;
    if (c) place(c, 32, 60);
    const w = world.current;
    if (!w) return;
    const L = last.current;
    L.frames++;
    // Redraw the world map when the player has moved away, or while the world streams in.
    const moved = Math.hypot(p.x - L.x, p.z - L.z) > 10;
    const warming = L.frames < 900 && L.frames % 45 === 0;
    if (!moved && !warming) return;
    L.x = p.x;
    L.z = p.z;
    place(w, 120, 130);
    w.shadow.needsUpdate = true;
  });

  return (
    <>
      <directionalLight ref={world} castShadow intensity={0} />
      <directionalLight ref={chars} castShadow intensity={0} />
    </>
  );
}

/** Sun (shadows) and water. Sky, mountains and clouds are in Background.tsx. */
export function Environment() {
  return (
    <>
      <Sun />
      <River />
      <hemisphereLight args={["#e8f2ff", "#6b5a3a", 1.4]} />
      <directionalLight position={[-120, 200, 100]} intensity={1.6} color="#fff1d6" />
    </>
  );
}
