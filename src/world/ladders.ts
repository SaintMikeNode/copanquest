// Ladder segments (one per terrace, plus the temple wall), shared by the voxel builder
// (visuals) and the player controller (climb zones).
import { MOUNDS, type Face } from "./siteData";
import { LADDERS } from "./villageData";

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
        base: [m.center[0] + ux * dist + along[0] * l.offset, y, m.center[1] + uz * dist + along[1] * l.offset],
        out: [ux, uz],
        along,
        height: h,
        width: 1,
      });
    for (let i = 0; i < m.tiers; i++) wall(half - i * m.setback, baseY + i * m.tierHeight, m.tierHeight);
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
