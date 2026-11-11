// Ladder segments (one per terrace, plus the temple wall), shared by the voxel builder
// (visuals) and the player controller (climb zones).
import { MOUNDS, type Face } from "./siteData";
import { LADDERS } from "./villageData";
import { BLOCK } from "../voxel/blocks";

export interface LadderSegment {
  /** Point on the wall at the bottom of the ladder, center of its width [x, y, z]. */
  base: [number, number, number];
  /** Unit vector pointing out of the wall [x, z]. */
  out: [number, number];
  /** Unit vector along the wall [x, z]. */
  along: [number, number];
  height: number;
  /** Ladder width (m). */
  width: number;
}

const DIR: Record<Face, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

/**
 * Where a box edge ends up once rasterized to 0.5 m blocks (block centers sit at k·0.5 + 0.25,
 * and a block is filled when its center is inside the box). Setbacks like 3.3 m don't fall on
 * the grid, so without this a ladder could sit up to 0.25 m inside or in front of its wall.
 */
function snapEdge(edge: number, dir: number) {
  const eps = 1e-6;
  return dir > 0
    ? Math.floor((edge - 0.25) / BLOCK + eps) * BLOCK + 0.25 + BLOCK / 2
    : Math.ceil((edge - 0.25) / BLOCK - eps) * BLOCK + 0.25 - BLOCK / 2;
}

export function ladderSegments(): LadderSegment[] {
  const out: LadderSegment[] = [];
  for (const l of LADDERS) {
    const m = MOUNDS.find((q) => q.id === l.mound);
    if (!m) continue;
    const [ux, uz] = DIR[l.face];
    const along: [number, number] = [-uz, ux];
    const alongX = l.face === "n" || l.face === "s";
    const baseY = m.baseY ?? 0;
    const half = (alongX ? m.size[1] : m.size[0]) / 2;
    const wall = (dist: number, y: number, h: number) =>
      out.push({
        base: [
          ux ? snapEdge(m.center[0] + ux * dist, ux) : m.center[0] + along[0] * l.offset,
          y,
          uz ? snapEdge(m.center[1] + uz * dist, uz) : m.center[1] + along[1] * l.offset,
        ],
        out: [ux, uz],
        along,
        height: h,
        width: 1,
      });
    if (!l.templeOnly) for (let i = 0; i < m.tiers; i++) wall(half - i * m.setback, baseY + i * m.tierHeight, m.tierHeight);
    if (m.temple) {
      const th = m.temple[alongX ? 2 : 0] / 2;
      wall(th, baseY + m.tiers * m.tierHeight, m.temple[1]);
    }
  }
  return out;
}

/** Top surface of a mound (temple roof if it has one). */
export function moundTop(id: string): number {
  const m = MOUNDS.find((q) => q.id === id);
  if (!m) return 0;
  return (m.baseY ?? 0) + m.tiers * m.tierHeight + (m.temple ? m.temple[1] : 0);
}
