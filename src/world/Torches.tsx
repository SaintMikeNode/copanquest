import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CENSERS, TORCHES } from "../game/torches";
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
  const { stick, bowl, foot, mClay, flame, core, mStick, mFlame, mCore } = useMemo(
    () => ({
      stick: new THREE.BoxGeometry(0.07, 0.45, 0.07),
      // Clay censer: a wide bowl on a pedestal.
      bowl: new THREE.BoxGeometry(0.62, 0.3, 0.62),
      foot: new THREE.BoxGeometry(0.34, 0.6, 0.34),
      mClay: new THREE.MeshBasicMaterial({ color: "#5a3622" }), // unlit: the chamber is dark
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
      const b = CENSERS.has(i) ? 2.4 : 1;
      const k = (0.85 + Math.sin(t * 13 + i * 2.1) * 0.15) * b;
      f.scale.set(k, (0.9 + Math.sin(t * 9 + i) * 0.2) * b, k);
      f.rotation.y = t * 2 + i;
    });
  });
  return (
    <>
      {TORCHES.map((p, i) => (
        <group key={i} position={p}>
          {CENSERS.has(i) ? (
            <>
              <mesh geometry={foot} material={mClay} position={[0, -0.75, 0]} />
              <mesh geometry={bowl} material={mClay} position={[0, -0.3, 0]} />
            </>
          ) : (
            <mesh geometry={stick} material={mStick} position={[0, -0.35, 0]} />
          )}
          <group ref={(g) => void (flames.current[i] = g)}>
            <mesh geometry={flame} material={mFlame} />
            <mesh geometry={core} material={mCore} position={[0, 0.02, 0]} />
          </group>
        </group>
      ))}
    </>
  );
}
