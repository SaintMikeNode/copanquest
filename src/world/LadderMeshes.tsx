import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ladderSegments } from "./ladders";
import { buildPixelModel, hex, solid } from "../voxel/pixelModel";

/**
 * Wooden ladders on the stepped walls: one pair of rails 1 m apart with rungs every ~0.33 m,
 * mounted just off the wall and rising a little above each ledge (on ruined temple walls, above the
 * crumbled top: `ladderSegments`). All merged into one mesh.
 * (Climbing zones are handled by the player controller from the same segments.)
 */
/** How far the rails rise above the top of the wall (m). */
const RAIL_OVER = 0.4;

export function Ladders() {
  const { geometry, material } = useMemo(() => {
    const WOOD = hex("#8a5a32");
    const WOOD_DARK = hex("#5e3b20");
    const { geometries: G, material } = buildPixelModel([
      {
        // Rail piece, stacked to any height.
        size: [0.09, 0.5, 0.09],
        paint: (t) => {
          solid(t, WOOD, 0.1, 81);
          for (let y = 0; y < t.h; y += 5) t.set(0, y, WOOD_DARK);
        },
      },
      {
        // Rung.
        size: [0.86, 0.07, 0.07],
        paint: (t) => {
          solid(t, WOOD, 0.08, 82);
          for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, WOOD_DARK);
        },
      },
    ]);
    const parts: THREE.BufferGeometry[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    for (const seg of ladderSegments()) {
      const [bx, by, bz] = seg.base;
      // Rotate so local +x runs along the wall.
      q.setFromAxisAngle(up, Math.atan2(-seg.along[1], seg.along[0]));
      const ox = bx + seg.out[0] * 0.12;
      const oz = bz + seg.out[1] * 0.12;
      // Rails stop RAIL_OVER above the ledge (a handhold, like a real ladder over a wall top).
      // Stacked 0.5 m pieces; the last one is shortened to fit.
      const top = seg.height + RAIL_OVER;
      for (const side of [-0.42, 0.42]) {
        for (let y = 0; y < top - 0.01; y += 0.5) {
          const len = Math.min(0.5, top - y);
          const g = G[0].clone();
          m.compose(new THREE.Vector3(ox + seg.along[0] * side, by + y + len / 2, oz + seg.along[1] * side), q, new THREE.Vector3(1, len / 0.5, 1));
          parts.push(g.applyMatrix4(m));
        }
      }
      for (let y = 0.3; y < seg.height + 0.05; y += 0.33) {
        const g = G[1].clone();
        m.compose(new THREE.Vector3(ox, by + y, oz), q, new THREE.Vector3(1, 1, 1));
        parts.push(g.applyMatrix4(m));
      }
    }
    return { geometry: mergeGeometries(parts)!, material };
  }, []);
  return <mesh geometry={geometry} material={material} />;
}
