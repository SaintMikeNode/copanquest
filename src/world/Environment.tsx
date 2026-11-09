import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { TERRAIN_SCULPT } from "./siteData";
import { shared, createWaterMaterial } from "../voxel/material";
import { createWaterTexture } from "../voxel/textures";
import { playerState } from "../player/playerState";
import { useQualityLevel } from "../state/useGame";

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
 * Sun shadows, "baked" on demand: the world is static, so the shadow map is only redrawn when
 * the player has moved a few meters or the sun has crept on (every ~2 s), not every frame.
 * Characters and animals don't cast into it; they use blob shadows. This is cheap enough for
 * phones, so shadows stay on at every quality level (Low just uses a smaller map).
 */
function Sun() {
  const level = useQualityLevel();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const light = useRef<THREE.DirectionalLight>(null);
  const last = useRef({ x: Infinity, z: Infinity, t: -Infinity, frames: 0 });

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFShadowMap;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl]);

  useEffect(() => {
    const l = light.current;
    if (!l) return;
    scene.add(l.target);
    const cam = l.shadow.camera;
    cam.left = -60;
    cam.right = 60;
    cam.top = 60;
    cam.bottom = -60;
    cam.near = 1;
    cam.far = 280;
    cam.updateProjectionMatrix();
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.04;
    return () => {
      scene.remove(l.target);
    };
  }, [scene]);

  useEffect(() => {
    const l = light.current;
    if (!l) return;
    const size = level === "low" ? 1024 : 2048;
    if (l.shadow.mapSize.x !== size) {
      l.shadow.mapSize.set(size, size);
      l.shadow.map?.dispose();
      l.shadow.map = null as unknown as THREE.WebGLRenderTarget;
      gl.shadowMap.needsUpdate = true;
    }
  }, [level, gl]);

  useFrame(({ clock }) => {
    const l = light.current;
    if (!l) return;
    const p = playerState.position;
    const L = last.current;
    L.frames++;
    const moved = Math.hypot(p.x - L.x, p.z - L.z) > 8;
    const stale = clock.elapsedTime - L.t > 2;
    // While the world is still streaming in, refresh more often.
    const warming = L.frames < 600 && L.frames % 30 === 0;
    if (!moved && !stale && !warming) return;
    L.x = p.x;
    L.z = p.z;
    L.t = clock.elapsedTime;
    const snap = 120 / l.shadow.mapSize.x;
    const tx = Math.round(p.x / snap) * snap;
    const tz = Math.round(p.z / snap) * snap;
    const d = shared.sunDirection.value;
    l.target.position.set(tx, p.y, tz);
    l.target.updateMatrixWorld();
    l.position.set(tx + d.x * 130, p.y + d.y * 130, tz + d.z * 130);
    l.updateMatrixWorld();
    gl.shadowMap.needsUpdate = true;
  });

  return <directionalLight ref={light} castShadow intensity={0} />;
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
