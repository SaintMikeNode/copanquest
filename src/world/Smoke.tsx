import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { hearths } from "./villageData";

/** The puffs' look, shared with the broken buggy's engine smoke (vehicle/Buggy.tsx). */
export const smokePuff = () => ({
  geo: new THREE.BoxGeometry(1, 1, 1),
  mat: new THREE.MeshBasicMaterial({ color: "#d8d4cc", transparent: true, opacity: 0.45, depthWrite: false }),
});

/** Blocky smoke puffs rising from the village hearths (one instanced draw). */
export function Smoke() {
  const sources = useMemo(hearths, []);
  const PER = 7;
  const count = sources.length * PER;
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geo, mat } = useMemo(smokePuff, []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    sources.forEach(([x, z], si) => {
      for (let k = 0; k < PER; k++) {
        const life = ((t * 0.18 + k / PER + si * 0.13) % 1);
        const size = 0.3 + life * 1.1;
        p.set(x + Math.sin(life * 4 + si) * 0.6 + life * 1.5, 3.2 + life * 9, z + Math.cos(life * 3 + k) * 0.4);
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, life * 2 + k);
        s.setScalar(size * (1 - life * 0.3));
        mesh.setMatrixAt(si * PER + k, m.compose(p, q, s));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />;
}
