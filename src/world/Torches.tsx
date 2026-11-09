import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { TORCHES } from "../game/torches";
import { rosalilaHoles } from "./buildGreybox";
import { shared } from "../voxel/material";

/** Torches (wooden stick + flickering flame) and the Rosalila interior lighting setup. */
export function Torches() {
  useEffect(() => {
    const [a, b] = rosalilaHoles();
    shared.interiorAMin.value.set(a[0], a[1], a[2]);
    shared.interiorAMax.value.set(a[3], a[4], a[5]);
    shared.interiorBMin.value.set(b[0], b[1], b[2]);
    shared.interiorBMax.value.set(b[3] - 2.2, b[4], b[5]); // daylight reaches a little way into the entrance
    TORCHES.forEach((t, i) => shared.torches.value[i].copy(t));
  }, []);
  const { stick, flame, core, mStick, mFlame, mCore } = useMemo(
    () => ({
      stick: new THREE.BoxGeometry(0.07, 0.45, 0.07),
      flame: new THREE.BoxGeometry(0.13, 0.18, 0.13),
      core: new THREE.BoxGeometry(0.06, 0.1, 0.06),
      mStick: new THREE.MeshBasicMaterial({ color: "#3a2614" }),
      mFlame: new THREE.MeshBasicMaterial({ color: "#ff8a2a" }),
      mCore: new THREE.MeshBasicMaterial({ color: "#ffe36a" }),
    }),
    [],
  );
  const flames = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flames.current.forEach((f, i) => {
      if (!f) return;
      const k = 0.85 + Math.sin(t * 13 + i * 2.1) * 0.15;
      f.scale.set(k, 0.9 + Math.sin(t * 9 + i) * 0.2, k);
      f.rotation.y = t * 2 + i;
    });
  });
  return (
    <>
      {TORCHES.map((p, i) => (
        <group key={i} position={p}>
          <mesh geometry={stick} material={mStick} position={[0, -0.35, 0]} />
          <group ref={(g) => void (flames.current[i] = g)}>
            <mesh geometry={flame} material={mFlame} />
            <mesh geometry={core} material={mCore} position={[0, 0.02, 0]} />
          </group>
        </group>
      ))}
    </>
  );
}
