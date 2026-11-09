// Rosalila's massing (no DOM: shared by the collider builder in the worker and the renderer).
// Proportions measured from front photos of the full-size replica in the Copán Sculpture
// Museum (Wikimedia Commons: "CPN Rosalila 01.jpg", "Rosalila Temple.jpg"), scaled to the
// published size: 18.5 × 12.5 m base, ~12.9 m tall, three levels.
//
// Local frame: x along the main (west) façade, y up from the chamber floor, z out of the
// façade. The model is turned so local +z faces west (world −x).
import { ROSALILA } from "./siteData";

const W = ROSALILA.width;
const D = ROSALILA.depth;

/** A box in the local frame: center and size. */
export interface LBox {
  c: [number, number, number];
  s: [number, number, number];
}

const box = (y0: number, y1: number, w: number, d: number): LBox => ({ c: [0, (y0 + y1) / 2, 0], s: [w, y1 - y0, d] });

/** The stacked massing, bottom to top. */
export const MASS = {
  /** Low stucco plinth. */
  plinth: box(0, 0.4, W + 1.4, D + 1.4),
  /** First level: walls with doorways and the giant bird masks. */
  level1: box(0.4, 4.0, W, D),
  /** Lower molding, the projecting frieze (serpent scrolls, Sun God), upper molding. */
  mold1: box(4.0, 4.3, W + 1.1, D + 1.1),
  frieze: box(4.3, 7.5, W + 1.0, D + 1.0),
  mold2: box(7.5, 7.8, W + 1.3, D + 1.3),
  /** Second level: earth-monster (mountain) masks on the west and east sides. */
  level2: box(7.8, 10.2, 9.5, 7.0),
  /** Third level: two vents per side and the skeletal censer face. */
  level3: box(10.2, 12.9, 7.2, 5.5),
};

/** Rotation of the model around y: local +z → world −x. */
export const ROSALILA_ROT_Y = -Math.PI / 2;

/** Local → world for a point. */
export function rosalilaToWorld(x: number, y: number, z: number): [number, number, number] {
  return [ROSALILA.center[0] - z, ROSALILA.baseY + y, ROSALILA.center[1] + x];
}

/** Axis-aligned world collider boxes (center, half extents) for the massing. */
export function rosalilaColliders() {
  const { plinth, level1, frieze, level2, level3 } = MASS;
  // The moldings and frieze become one block.
  const upper: LBox = { c: [0, (4.0 + 7.8) / 2, 0], s: [frieze.s[0] + 0.3, 3.8, frieze.s[2] + 0.3] };
  return [plinth, level1, upper, level2, level3].map((b) => ({
    position: rosalilaToWorld(b.c[0], b.c[1], b.c[2]),
    // Swap x/z extents for the quarter turn.
    halfExtents: [b.s[2] / 2, b.s[1] / 2, b.s[0] / 2] as [number, number, number],
  }));
}
