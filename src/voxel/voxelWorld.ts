// The voxel world: terrain columns from the DEM plus sparse chunks of site blocks.
// Pure TypeScript (no DOM, no three.js) so it runs inside the meshing Web Worker.
import { B, BLOCK, MATERIAL_BLOCK } from "./blocks";
import type { Shape } from "../world/buildGreybox";
import { sampleHeight, type TerrainGrid } from "../world/terrainData";

/** Area built from 0.5 m blocks (meters). Outside it, the blocky far terrain takes over. */
// minY is chosen so the plaza floor (y = 0) falls mid-chunk: flat ground then touches only one
// chunk layer instead of two.
export const REGION = { minX: -180, maxX: 230, minZ: -100, maxZ: 420, minY: -12, maxY: 52 };
export const NX = Math.round((REGION.maxX - REGION.minX) / BLOCK);
export const NZ = Math.round((REGION.maxZ - REGION.minZ) / BLOCK);
export const NY = Math.round((REGION.maxY - REGION.minY) / BLOCK);
export const CS = 32; // chunk size in blocks
export const NCX = Math.ceil(NX / CS);
export const NCY = Math.ceil(NY / CS);
export const NCZ = Math.ceil(NZ / CS);

/** Deterministic hash of two ints → [0, 1). */
export function hash2(x: number, z: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1). */
export function valueNoise(x: number, z: number, seed = 0) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const tx = x - xi;
  const tz = z - zi;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const a = hash2(xi + seed * 131, zi);
  const b = hash2(xi + 1 + seed * 131, zi);
  const c = hash2(xi + seed * 131, zi + 1);
  const d = hash2(xi + 1 + seed * 131, zi + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

/** Far terrain quantizes heights to whole meters; the voxel region uses this outside itself. */
export const quantFar = (h: number) => Math.round(h);

export class VoxelWorld {
  /** Number of solid ground blocks per column (top block index + 1). */
  ground = new Int16Array(NX * NZ);
  /** Top block of each ground column. */
  topKind = new Uint8Array(NX * NZ);
  chunks = new Map<number, Uint8Array>();
  /** Solid boxes added by decoration (tree trunks, bushes, houses): [x, y, z, hx, hy, hz] in meters. */
  colliders: number[] = [];
  /** Add a collider for blocks [ix0..ix1] × [iy0..iy1] × [iz0..iz1] (inclusive). */
  addCollider(ix0: number, iy0: number, iz0: number, ix1: number, iy1: number, iz1: number) {
    const x0 = REGION.minX + ix0 * BLOCK;
    const y0 = REGION.minY + iy0 * BLOCK;
    const z0 = REGION.minZ + iz0 * BLOCK;
    const x1 = REGION.minX + (ix1 + 1) * BLOCK;
    const y1 = REGION.minY + (iy1 + 1) * BLOCK;
    const z1 = REGION.minZ + (iz1 + 1) * BLOCK;
    this.colliders.push((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2);
  }
  /** Highest struct block + 1 per column (upper bound for surface scans). */
  structTop = new Int16Array(NX * NZ);

  constructor(private grid: TerrainGrid) {
    for (let iz = 0; iz < NZ; iz++) {
      for (let ix = 0; ix < NX; ix++) {
        const x = REGION.minX + (ix + 0.5) * BLOCK;
        const z = REGION.minZ + (iz + 0.5) * BLOCK;
        const h = sampleHeight(grid, x, z);
        const i = iz * NX + ix;
        this.ground[i] = Math.max(1, Math.min(NY - 1, Math.round((h - REGION.minY) / BLOCK)));
        this.topKind[i] = h < -4 ? B.Gravel : h < -2.5 ? B.Sand : B.Grass;
      }
    }
  }

  /** Ground height (in blocks) of any column, including outside the region. */
  groundAt(ix: number, iz: number): number {
    if (ix >= 0 && iz >= 0 && ix < NX && iz < NZ) return this.ground[iz * NX + ix];
    const x = REGION.minX + (ix + 0.5) * BLOCK;
    const z = REGION.minZ + (iz + 0.5) * BLOCK;
    return Math.round((quantFar(sampleHeight(this.grid, x, z)) - REGION.minY) / BLOCK);
  }

  private key(cx: number, cy: number, cz: number) {
    return (cx * NCY + cy) * NCZ + cz;
  }

  setBlock(ix: number, iy: number, iz: number, b: B) {
    if (ix < 0 || iy < 0 || iz < 0 || ix >= NX || iy >= NY || iz >= NZ) return;
    const k = this.key(ix >> 5, iy >> 5, iz >> 5);
    let c = this.chunks.get(k);
    if (!c) {
      c = new Uint8Array(CS * CS * CS);
      this.chunks.set(k, c);
    }
    c[((iy & 31) * CS + (iz & 31)) * CS + (ix & 31)] = b;
    const ci = iz * NX + ix;
    if (b && iy + 1 > this.structTop[ci]) this.structTop[ci] = iy + 1;
  }

  /** Set only where the cell is currently air (trees never cut into buildings). */
  setIfAir(ix: number, iy: number, iz: number, b: B) {
    if (this.get(ix, iy, iz) === B.Air) this.setBlock(ix, iy, iz, b);
  }

  /** Remove a struct block (falls back to ground/air). */
  clearBlock(ix: number, iy: number, iz: number) {
    if (ix < 0 || iy < 0 || iz < 0 || ix >= NX || iy >= NY || iz >= NZ) return;
    const c = this.chunks.get(this.key(ix >> 5, iy >> 5, iz >> 5));
    if (c) c[((iy & 31) * CS + (iz & 31)) * CS + (ix & 31)] = 0;
  }

  /** Top solid block index + 1 of a column, and its block id (optionally seeing through leaves). */
  surface(ix: number, iz: number, skipFoliage = false): { y: number; id: number } {
    const i = iz * NX + ix;
    let y = Math.max(this.ground[i], this.structTop[i]) - 1;
    while (y >= 0) {
      const id = this.get(ix, y, iz);
      if (id && !(skipFoliage && (id === B.Leaves || id === B.Fig))) return { y: y + 1, id };
      y--;
    }
    return { y: 0, id: B.Rock };
  }

  hasChunk(cx: number, cy: number, cz: number) {
    return this.chunks.has(this.key(cx, cy, cz));
  }

  get(ix: number, iy: number, iz: number): number {
    if (iy < 0) return B.Rock;
    if (iy >= NY) return B.Air;
    if (ix >= 0 && iz >= 0 && ix < NX && iz < NZ) {
      const c = this.chunks.get(this.key(ix >> 5, iy >> 5, iz >> 5));
      if (c) {
        const v = c[((iy & 31) * CS + (iz & 31)) * CS + (ix & 31)];
        if (v) return v;
      }
      const i = iz * NX + ix;
      const g = this.ground[i];
      if (iy >= g) return B.Air;
      if (iy === g - 1) return this.topKind[i];
      return iy >= g - 4 ? B.Dirt : B.Rock;
    }
    return iy < this.groundAt(ix, iz) ? B.Dirt : B.Air;
  }

  /**
   * Copy blocks [bx-1, bx+CS] × [by-1, by+CS] × [bz-1, bz+CS] into `pad` (x fastest, then y,
   * then z). Returns false if everything is air.
   */
  fillPadded(pad: Uint8Array, bx: number, by: number, bz: number): boolean {
    const P = CS + 2;
    let any = false;
    for (let z = -1; z <= CS; z++) {
      const iz = bz + z;
      for (let x = -1; x <= CS; x++) {
        const ix = bx + x;
        const inside = ix >= 0 && iz >= 0 && ix < NX && iz < NZ;
        const g = this.groundAt(ix, iz);
        const top = inside ? this.topKind[iz * NX + ix] : B.Dirt;
        // Struct chunks overlapping this column's y range (at most 3).
        let c0: Uint8Array | undefined, c1: Uint8Array | undefined, c2: Uint8Array | undefined;
        const cyb = by >> 5;
        if (inside) {
          const kx = ix >> 5;
          const kz = iz >> 5;
          if (cyb > 0) c0 = this.chunks.get(this.key(kx, cyb - 1, kz));
          c1 = this.chunks.get(this.key(kx, cyb, kz));
          if (cyb + 1 < NCY) c2 = this.chunks.get(this.key(kx, cyb + 1, kz));
        }
        const colOff = ((iz & 31) * CS + (ix & 31));
        let o = x + 1 + P * P * (z + 1);
        for (let y = -1; y <= CS; y++, o += P) {
          const iy = by + y;
          let v = 0;
          if (iy < 0) v = B.Rock;
          else if (iy < NY) {
            const ch = iy < by ? c0 : iy >= by + CS ? c2 : c1;
            if (ch) v = ch[(iy & 31) * CS * CS + colOff];
            if (!v && iy < g) v = iy === g - 1 ? top : iy >= g - 4 ? B.Dirt : B.Rock;
          }
          pad[o] = v;
          if (v) any = true;
        }
      }
    }
    return any;
  }

  /** Rasterize a site shape (voxel centers inside the box become blocks). */
  addShape(s: Shape) {
    const b = MATERIAL_BLOCK[s.material];
    const [px, py, pz] = s.position;
    const [sx, sy, sz] = s.size;
    const toIx = (x: number) => (x - REGION.minX) / BLOCK - 0.5;
    const toIy = (y: number) => (y - REGION.minY) / BLOCK - 0.5;
    const toIz = (z: number) => (z - REGION.minZ) / BLOCK - 0.5;
    const cx = (ix: number) => REGION.minX + (ix + 0.5) * BLOCK;
    const cy = (iy: number) => REGION.minY + (iy + 0.5) * BLOCK;
    const cz = (iz: number) => REGION.minZ + (iz + 0.5) * BLOCK;
    const rot = s.rotation && (s.rotation[0] || s.rotation[1] || s.rotation[2]) ? s.rotation : null;

    if (sy === 0) {
      // Paint the block layer just below the surface at y.
      const iy = Math.round((py - REGION.minY) / BLOCK) - 1;
      const cosY = Math.cos(rot ? rot[1] : 0);
      const sinY = Math.sin(rot ? rot[1] : 0);
      const r = rot ? Math.hypot(sx, sz) / 2 : 0;
      const hx = rot ? r : sx / 2;
      const hz = rot ? r : sz / 2;
      for (let iz = Math.ceil(toIz(pz - hz)); iz <= Math.floor(toIz(pz + hz)); iz++)
        for (let ix = Math.ceil(toIx(px - hx)); ix <= Math.floor(toIx(px + hx)); ix++) {
          let dx = cx(ix) - px;
          let dz = cz(iz) - pz;
          if (rot) {
            // Inverse rotation around y.
            const lx = dx * cosY - dz * sinY;
            const lz = dx * sinY + dz * cosY;
            dx = lx;
            dz = lz;
          }
          if (dx >= -sx / 2 && dx < sx / 2 && dz >= -sz / 2 && dz < sz / 2) this.setBlock(ix, iy, iz, b);
        }
      return;
    }

    if (!rot) {
      const eps = 1e-6;
      const y0 = Math.ceil(toIy(py - sy / 2) - eps);
      const y1 = Math.floor(toIy(py + sy / 2) - eps);
      const z0 = Math.ceil(toIz(pz - sz / 2) - eps);
      const z1 = Math.floor(toIz(pz + sz / 2) - eps);
      const x0 = Math.ceil(toIx(px - sx / 2) - eps);
      const x1 = Math.floor(toIx(px + sx / 2) - eps);
      for (let iz = z0; iz <= z1; iz++)
        for (let ix = x0; ix <= x1; ix++) {
          let top = y1;
          if (s.erode) {
            // Ruins: walls survive in places, collapse in others; edges and corners keep more.
            const n = valueNoise(ix * 0.18, iz * 0.18, 11) * 0.7 + hash2(ix, iz) * 0.3;
            top = y1 - Math.floor(n * (s.erode + 1));
            if (top < y0) top = y0;
          }
          for (let iy = y0; iy <= top; iy++) this.setBlock(ix, iy, iz, b);
          if (s.erode && top < y1 && hash2(ix + 3, iz) < 0.6) this.setBlock(ix, top, iz, B.Rubble);
        }
      return;
    }

    // Oriented box: test each voxel center in the box's local frame (Euler XYZ, like three.js).
    const [ax, ay, az] = rot;
    const [c1, s1, c2, s2, c3, s3] = [Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay), Math.cos(az), Math.sin(az)];
    // Rotation matrix R = Rx * Ry * Rz (three.js 'XYZ' order); local = R^T * (p - c)
    const m = [
      c2 * c3, -c2 * s3, s2,
      c1 * s3 + s1 * s2 * c3, c1 * c3 - s1 * s2 * s3, -s1 * c2,
      s1 * s3 - c1 * s2 * c3, s1 * c3 + c1 * s2 * s3, c1 * c2,
    ];
    const R = Math.hypot(sx, sy, sz) / 2;
    const fillTo = s.fillTo !== undefined ? Math.round((s.fillTo - REGION.minY) / BLOCK) : null;
    for (let iz = Math.ceil(toIz(pz - R)); iz <= Math.floor(toIz(pz + R)); iz++)
      for (let ix = Math.ceil(toIx(px - R)); ix <= Math.floor(toIx(px + R)); ix++) {
        let topInside = -1;
        for (let iy = Math.floor(toIy(py + R)); iy >= Math.ceil(toIy(py - R)); iy--) {
          const dx = cx(ix) - px;
          const dy = cy(iy) - py;
          const dz = cz(iz) - pz;
          const lx = m[0] * dx + m[3] * dy + m[6] * dz;
          const ly = m[1] * dx + m[4] * dy + m[7] * dz;
          const lz = m[2] * dx + m[5] * dy + m[8] * dz;
          if (Math.abs(lx) <= sx / 2 && Math.abs(ly) <= sy / 2 && Math.abs(lz) <= sz / 2) {
            this.setBlock(ix, iy, iz, b);
            if (topInside < 0) topInside = iy;
          }
        }
        if (fillTo !== null && topInside >= 0) for (let iy = fillTo; iy < topInside; iy++) this.setBlock(ix, iy, iz, b);
      }
  }
}
