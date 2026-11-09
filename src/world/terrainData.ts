// Loads the DEM heightmap produced by scripts/dem-to-heightmap.mjs, converts it to local
// meters, flattens the site core and applies hand-sculpted areas. Falls back to a simple
// procedural valley if the files are missing.
import { FLAT_CORE, TERRAIN_SCULPT } from "./siteData";

export interface TerrainGrid {
  /** Samples per side. */
  size: number;
  spacing: number;
  /** Row-major heights in local meters; row 0 = north (−z), col 0 = west (−x). */
  heights: Float32Array;
}

interface HeightmapMeta {
  size: number;
  spacingMeters: number;
  minElevation: number;
  maxElevation: number;
  datumElevation: number;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Distance from (x, z) to a rectangle (0 inside). */
function rectDistance(x: number, z: number, r: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  const dx = Math.max(r.minX - x, 0, x - r.maxX);
  const dz = Math.max(r.minZ - z, 0, z - r.maxZ);
  return Math.hypot(dx, dz);
}

export function shape(grid: TerrainGrid) {
  const { size, spacing, heights } = grid;
  const half = ((size - 1) * spacing) / 2;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const x = -half + col * spacing;
      const z = -half + row * spacing;
      const i = row * size + col;
      let h = heights[i];
      // Flatten the core to the plaza floor (y = 0); slightly below so floors never z-fight.
      const d = rectDistance(x, z, FLAT_CORE);
      h = -0.05 + (h + 0.05) * smoothstep(0, FLAT_CORE.falloff, d);
      for (const s of TERRAIN_SCULPT) {
        const k = 1 - smoothstep(0, s.falloff, rectDistance(x, z, s));
        h = h + (s.y - h) * k;
      }
      heights[i] = h;
    }
  }
  return grid;
}

function procedural(): TerrainGrid {
  const size = 101;
  const spacing = 30;
  const heights = new Float32Array(size * size);
  const half = ((size - 1) * spacing) / 2;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const x = -half + col * spacing;
      const z = -half + row * spacing;
      // A valley running roughly east–west with hills to the north and south.
      const valley = Math.pow(Math.abs(z + 200) / 1500, 1.6) * 220;
      const bumps = Math.sin(x * 0.004) * 12 + Math.cos(z * 0.006 + x * 0.002) * 10;
      heights[row * size + col] = valley + bumps;
    }
  }
  return { size, spacing, heights };
}

export async function loadTerrain(): Promise<TerrainGrid> {
  try {
    const base = import.meta.env.BASE_URL + "terrain/copan-heightmap";
    const [metaRes, binRes] = await Promise.all([fetch(base + ".json"), fetch(base + ".bin")]);
    if (!metaRes.ok || !binRes.ok) throw new Error("heightmap missing");
    const meta = (await metaRes.json()) as HeightmapMeta;
    const raw = new Uint16Array(await binRes.arrayBuffer());
    if (raw.length !== meta.size * meta.size) throw new Error("heightmap size mismatch");
    const range = meta.maxElevation - meta.minElevation;
    const heights = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      heights[i] = meta.minElevation + (raw[i] / 65535) * range - meta.datumElevation;
    }
    return shape({ size: meta.size, spacing: meta.spacingMeters, heights });
  } catch (err) {
    console.warn("[terrain] using procedural fallback:", err);
    return shape(procedural());
  }
}

/** Bilinear terrain height (local meters) at world (x, z); clamps at the grid edge. */
export function sampleHeight(grid: TerrainGrid, x: number, z: number): number {
  const { size, spacing, heights } = grid;
  const half = ((size - 1) * spacing) / 2;
  const fx = Math.min(size - 1.001, Math.max(0, (x + half) / spacing));
  const fz = Math.min(size - 1.001, Math.max(0, (z + half) / spacing));
  const c = Math.floor(fx);
  const r = Math.floor(fz);
  const tx = fx - c;
  const tz = fz - r;
  const i = r * size + c;
  return (
    heights[i] * (1 - tx) * (1 - tz) +
    heights[i + 1] * tx * (1 - tz) +
    heights[i + size] * (1 - tx) * tz +
    heights[i + size + 1] * tx * tz
  );
}
