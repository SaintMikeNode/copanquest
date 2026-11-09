import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { POIS } from "./poiData";

const geo = new THREE.OctahedronGeometry(0.35, 0);
const mat = new THREE.MeshBasicMaterial({ color: "#f2c14e" });
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3(1, 1.6, 1);
const p = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

/** Floating golden markers above each point of interest (one draw call). */
export function PoiMarkers() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const set = (t: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    POIS.forEach((poi, i) => {
      q.setFromAxisAngle(up, t + i);
      p.set(poi.position[0], (poi.y ?? 0) + poi.markerHeight + Math.sin(t * 2 + i) * 0.15, poi.position[1]);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => set(0), []);
  useFrame(({ clock }) => set(clock.elapsedTime));
  return <instancedMesh ref={ref} args={[geo, mat, POIS.length]} frustumCulled={false} />;
}
