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

/** Sun that follows the player so its shadow map always covers what you see. */
function Sun() {
  const level = useQualityLevel();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const light = useRef<THREE.DirectionalLight>(null);
  const shadows = level !== "low";

  useEffect(() => {
    gl.shadowMap.enabled = shadows;
    gl.shadowMap.type = THREE.PCFShadowMap;
    // Materials must recompile when shadows turn on/off.
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.needsUpdate = true;
    });
  }, [gl, scene, shadows]);

  useEffect(() => {
    const l = light.current;
    if (!l) return;
    scene.add(l.target);
    const cam = l.shadow.camera;
    cam.left = -55;
    cam.right = 55;
    cam.top = 55;
    cam.bottom = -55;
    cam.near = 1;
    cam.far = 260;
    cam.updateProjectionMatrix();
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.04;
    return () => {
      scene.remove(l.target);
    };
  }, [scene]);

  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const p = playerState.position;
    // Snap to shadow texels to avoid shimmering while walking.
    const snap = 110 / 2048;
    const tx = Math.round(p.x / snap) * snap;
    const tz = Math.round(p.z / snap) * snap;
    const d = shared.sunDirection.value;
    l.target.position.set(tx, p.y, tz);
    l.position.set(tx + d.x * 120, p.y + d.y * 120, tz + d.z * 120);
  });

  return <directionalLight ref={light} castShadow={shadows} intensity={0} />;
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
