import { use, useMemo } from "react";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import { loadTerrain } from "./terrainData";

export const terrainPromise = loadTerrain();

/**
 * Smooth terrain collider (invisible). The visible ground is the voxel mesh; walking on the
 * smooth surface keeps movement fluid over 0.5 m block steps.
 */
export function TerrainCollider() {
  const grid = use(terrainPromise);
  const { vertices, indices } = useMemo(() => {
    const { size, spacing, heights } = grid;
    const half = ((size - 1) * spacing) / 2;
    const v = new Float32Array(size * size * 3);
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        const i = r * size + c;
        v[i * 3] = -half + c * spacing;
        v[i * 3 + 1] = heights[i];
        v[i * 3 + 2] = -half + r * spacing;
      }
    const idx = new Uint32Array((size - 1) * (size - 1) * 6);
    let k = 0;
    for (let r = 0; r < size - 1; r++)
      for (let c = 0; c < size - 1; c++) {
        const a = r * size + c;
        const b = a + 1;
        const d = a + size;
        const e = d + 1;
        idx.set([a, d, b, b, d, e], k);
        k += 6;
      }
    return { vertices: v, indices: idx };
  }, [grid]);

  return (
    <RigidBody type="fixed" colliders={false}>
      <TrimeshCollider args={[vertices, indices]} />
    </RigidBody>
  );
}
