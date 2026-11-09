// Greedy meshing with per-vertex ambient occlusion (the soft corner shading that makes
// block worlds read well), plus a coarse blocky mesher for the distant terrain.
import { B, BLOCK, FACE_LAYERS, LAYERS } from "./blocks";
import { CS, NCX, NCY, NCZ, REGION, VoxelWorld, quantFar } from "./voxelWorld";
import { sampleHeight, type TerrainGrid } from "../world/terrainData";
import { FLAT_CORE } from "../world/siteData";

/** Interleaved-free mesh buffers ready to become a BufferGeometry. */
export interface MeshData {
  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  /** [layer, ao 0..1] per vertex. */
  vdata: Float32Array;
  index: Uint32Array;
  /** AABB [minX, minY, minZ, maxX, maxY, maxZ]. */
  bounds: number[];
}

class MeshBuilder {
  pos: number[] = [];
  nrm: number[] = [];
  uv: number[] = [];
  data: number[] = [];
  idx: number[] = [];
  min = [Infinity, Infinity, Infinity];
  max = [-Infinity, -Infinity, -Infinity];

  get vertexCount() {
    return this.pos.length / 3;
  }

  /** Quad with corners in winding order (CCW seen from the normal). */
  quad(
    p: number[][],
    n: number[],
    uvs: number[][],
    layer: number,
    ao: number[] = [3, 3, 3, 3],
  ) {
    const base = this.vertexCount;
    for (let k = 0; k < 4; k++) {
      const [x, y, z] = p[k];
      this.pos.push(x, y, z);
      this.nrm.push(n[0], n[1], n[2]);
      this.uv.push(uvs[k][0], uvs[k][1]);
      this.data.push(layer, ao[k] / 3);
      if (x < this.min[0]) this.min[0] = x;
      if (y < this.min[1]) this.min[1] = y;
      if (z < this.min[2]) this.min[2] = z;
      if (x > this.max[0]) this.max[0] = x;
      if (y > this.max[1]) this.max[1] = y;
      if (z > this.max[2]) this.max[2] = z;
    }
    // Split along the diagonal with the brighter corners so AO interpolates evenly.
    if (ao[0] + ao[2] >= ao[1] + ao[3]) this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else this.idx.push(base, base + 1, base + 3, base + 1, base + 2, base + 3);
  }

  /** Axis-aligned box (skipping the bottom face), for trees on the far terrain. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, top: number, side: number, uvScale: number) {
    const U = (a: number) => a / uvScale;
    this.quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], [[U(x0), U(z1)], [U(x1), U(z1)], [U(x1), U(z0)], [U(x0), U(z0)]], top);
    this.quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], [[U(x0), U(y0)], [U(x1), U(y0)], [U(x1), U(y1)], [U(x0), U(y1)]], side);
    this.quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], [[U(x1), U(y0)], [U(x0), U(y0)], [U(x0), U(y1)], [U(x1), U(y1)]], side);
    this.quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], [[U(z1), U(y0)], [U(z0), U(y0)], [U(z0), U(y1)], [U(z1), U(y1)]], side);
    this.quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], [[U(z0), U(y0)], [U(z1), U(y0)], [U(z1), U(y1)], [U(z0), U(y1)]], side);
  }

  build(): MeshData {
    return {
      position: new Float32Array(this.pos),
      normal: new Float32Array(this.nrm),
      uv: new Float32Array(this.uv),
      vdata: new Float32Array(this.data),
      index: new Uint32Array(this.idx),
      bounds: [...this.min, ...this.max],
    };
  }
}

const P = CS + 2; // padded chunk size

/**
 * Meshes the voxel region. Chunks are grouped into regions of `group` × `group` chunk
 * columns, one mesh (one draw call) per region.
 */
export function meshVoxelWorld(
  world: VoxelWorld,
  onRegion: (m: MeshData) => void,
  origin: [number, number] = [0, 0],
  group = 4,
  onStep?: (done: number, total: number, distance: number) => void,
) {
  const pad = new Uint8Array(P * P * P);
  const mask = new Int32Array(CS * CS);
  const STRIDE = [1, P, P * P];
  // World partition: regions of group × group chunk columns, meshed nearest-first so the
  // area around the player appears immediately and the rest streams in.
  const regionSize = group * CS * BLOCK;
  const regions: [number, number][] = [];
  for (let rz = 0; rz * group < NCZ; rz++) for (let rx = 0; rx * group < NCX; rx++) regions.push([rx, rz]);
  const dist = ([rx, rz]: [number, number]) =>
    Math.hypot(REGION.minX + (rx + 0.5) * regionSize - origin[0], REGION.minZ + (rz + 0.5) * regionSize - origin[1]);
  regions.sort((a, b) => dist(a) - dist(b));

  let step = 0;
  for (const [rx, rz] of regions) {
  onStep?.(step++, regions.length, dist([rx, rz]));
  const mb = new MeshBuilder();
  for (let cz = rz * group; cz < Math.min(NCZ, (rz + 1) * group); cz++)
    for (let cx = rx * group; cx < Math.min(NCX, (rx + 1) * group); cx++) {
      // Vertical range of ground surfaces in this chunk column (with a 1-block border).
      let gMin = Infinity;
      let gMax = -Infinity;
      for (let z = -1; z <= CS; z++)
        for (let x = -1; x <= CS; x++) {
          const g = world.groundAt(cx * CS + x, cz * CS + z);
          if (g < gMin) gMin = g;
          if (g > gMax) gMax = g;
        }
      for (let cy = 0; cy < NCY; cy++) {
        const y0 = cy * CS;
        const hasStruct =
          world.hasChunk(cx, cy, cz) ||
          (cy > 0 && world.hasChunk(cx, cy - 1, cz)) ||
          (cy < NCY - 1 && world.hasChunk(cx, cy + 1, cz));
        const touchesGround = gMax >= y0 && gMin - 1 <= y0 + CS;
        if (!hasStruct && !touchesGround) continue;

        // Copy the chunk plus a one-block border (column-wise: few map lookups).
        const bx = cx * CS;
        const bz = cz * CS;
        const any = world.fillPadded(pad, bx, y0, bz);
        if (!any) continue;


        for (let d = 0; d < 3; d++) {
          const u = (d + 1) % 3;
          const v = (d + 2) % 3;
          for (const side of [1, -1]) {
            for (let i = 0; i < CS; i++) {
              // Build the face mask for this slice.
              let n = 0;
              const Sd = STRIDE[d] * side;
              const Su = STRIDE[u];
              const Sv = STRIDE[v];
              const sliceBase = 1 + P + P * P + i * STRIDE[d];
              for (let b = 0; b < CS; b++)
                for (let a = 0, ci = sliceBase + b * Sv; a < CS; a++, n++, ci += Su) {
                  const id = pad[ci];
                  mask[n] = 0;
                  if (!id) continue;
                  const fi = ci + Sd;
                  if (pad[fi]) continue;
                  const faces = FACE_LAYERS[id];
                  const layer = d === 1 ? (side > 0 ? faces[0] : faces[2]) : faces[1];
                  // Foliage skips AO so canopies merge into big quads (it barely shows on leaves).
                  if (id === B.Leaves || id === B.Fig) {
                    mask[n] = 1 + layer + 32 * 255;
                    continue;
                  }
                  // AO from the blocks around the front cell, in the face plane.
                  const um = pad[fi - Su] ? 1 : 0;
                  const up = pad[fi + Su] ? 1 : 0;
                  const vm = pad[fi - Sv] ? 1 : 0;
                  const vp = pad[fi + Sv] ? 1 : 0;
                  const mm = pad[fi - Su - Sv] ? 1 : 0;
                  const pm = pad[fi + Su - Sv] ? 1 : 0;
                  const pp = pad[fi + Su + Sv] ? 1 : 0;
                  const mp = pad[fi - Su + Sv] ? 1 : 0;
                  const a0 = um && vm ? 0 : 3 - (um + vm + mm);
                  const a1 = up && vm ? 0 : 3 - (up + vm + pm);
                  const a2 = up && vp ? 0 : 3 - (up + vp + pp);
                  const a3 = um && vp ? 0 : 3 - (um + vp + mp);
                  mask[n] = 1 + layer + 32 * (a0 | (a1 << 2) | (a2 << 4) | (a3 << 6));
                }

              // Greedy merge.
              n = 0;
              for (let b = 0; b < CS; b++)
                for (let a = 0; a < CS; ) {
                  const key = mask[n];
                  if (!key) {
                    a++;
                    n++;
                    continue;
                  }
                  let w = 1;
                  while (a + w < CS && mask[n + w] === key) w++;
                  let h = 1;
                  outer: for (; b + h < CS; h++)
                    for (let k = 0; k < w; k++) if (mask[n + k + h * CS] !== key) break outer;

                  const layer = (key - 1) & 31;
                  const aoBits = (key - 1) >> 5;
                  const ao = [aoBits & 3, (aoBits >> 2) & 3, (aoBits >> 4) & 3, (aoBits >> 6) & 3];
                  // Corners in (u, v), CCW seen from +d.
                  const uvCorners = [
                    [a, b],
                    [a + w, b],
                    [a + w, b + h],
                    [a, b + h],
                  ];
                  const plane = side > 0 ? i + 1 : i;
                  const pts: number[][] = [];
                  const tex: number[][] = [];
                  for (const [cu, cv] of uvCorners) {
                    const g = [0, 0, 0];
                    g[d] = plane;
                    g[u] = cu;
                    g[v] = cv;
                    const gx = bx + g[0];
                    const gy = y0 + g[1];
                    const gz = bz + g[2];
                    pts.push([REGION.minX + gx * BLOCK, REGION.minY + gy * BLOCK, REGION.minZ + gz * BLOCK]);
                    // Texture coords in blocks; side faces keep v pointing up.
                    tex.push(d === 1 ? [gx, gz] : d === 0 ? [gz, gy] : [gx, gy]);
                  }
                  const normal = [0, 0, 0];
                  normal[d] = side;
                  if (side > 0) mb.quad(pts, normal, tex, layer, ao);
                  else
                    mb.quad(
                      [pts[0], pts[3], pts[2], pts[1]],
                      normal,
                      [tex[0], tex[3], tex[2], tex[1]],
                      layer,
                      [ao[0], ao[3], ao[2], ao[1]],
                    );

                  for (let hh = 0; hh < h; hh++) for (let k = 0; k < w; k++) mask[n + k + hh * CS] = 0;
                  a += w;
                  n += w;
                }
            }
          }
        }
      }
    }
  if (mb.idx.length) onRegion(mb.build());
  }
}

const L = (name: (typeof LAYERS)[number]) => LAYERS.indexOf(name);

/** Deterministic hash → [0, 1). */
function hash(x: number, z: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Blocky distant terrain: columns of 10 m (inside ±440 m) and 20 m (outer ring) around the
 * voxel region, heights quantized to 1 m, with simple block trees. Split into 4 quadrants
 * so each can be frustum-culled.
 */
export function meshFarTerrain(grid: TerrainGrid, world: VoxelWorld, extent = 1000, inner = 440): MeshData[] {
  const half = ((grid.size - 1) * grid.spacing) / 2;
  extent = Math.min(extent, half);
  const quads = [new MeshBuilder(), new MeshBuilder(), new MeshBuilder(), new MeshBuilder()];
  const inRegion = (x: number, z: number) =>
    x >= REGION.minX && x < REGION.maxX && z >= REGION.minZ && z < REGION.maxZ;
  const cellSize = (x: number, z: number) => (Math.abs(x) < inner && Math.abs(z) < inner ? 10 : 20);
  /** Height of whatever column contains (x, z): voxel ground inside the region. */
  const colHeight = (x: number, z: number) => {
    if (inRegion(x, z)) {
      const ix = Math.floor((x - REGION.minX) / BLOCK);
      const iz = Math.floor((z - REGION.minZ) / BLOCK);
      return REGION.minY + world.groundAt(ix, iz) * BLOCK;
    }
    if (Math.abs(x) >= extent || Math.abs(z) >= extent) return -1000;
    const s = cellSize(x, z);
    const ccx = Math.floor(x / s) * s + s / 2;
    const ccz = Math.floor(z / s) * s + s / 2;
    return quantFar(sampleHeight(grid, ccx, ccz));
  };
  const UV = BLOCK; // same pixel density as the near blocks (mipmaps handle the distance)
  let run: { x0: number; x1: number; z0: number; z1: number; h: number; top: number; mb: MeshBuilder } | null = null;
  const flushRun = () => {
    if (!run) return;
    const { x0, x1, z0, z1, h, top, mb } = run;
    mb.quad(
      [[x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0]],
      [0, 1, 0],
      [[x0 / UV, z1 / UV], [x1 / UV, z1 / UV], [x1 / UV, z0 / UV], [x0 / UV, z0 / UV]],
      top,
    );
    run = null;
  };

  for (let z0 = -extent; z0 < extent; ) {
    const rowSize = cellSize(0, z0 + 0.1) === 10 && Math.abs(z0 + 5) < inner ? 10 : 20;
    for (let x0 = -extent; x0 < extent; ) {
      const s = cellSize(x0 + 0.1, z0 + 0.1);
      const sz = Math.min(s, rowSize);
      const x1 = x0 + s;
      const z1 = z0 + sz;
      if (inRegion(x0 + 0.1, z0 + 0.1)) {
        flushRun();
        x0 = x1;
        continue;
      }
      const cxm = (x0 + x1) / 2;
      const czm = (z0 + z1) / 2;
      const h = colHeight(cxm, czm);
      const mb = quads[(cxm >= 0 ? 1 : 0) + (czm >= 0 ? 2 : 0)];
      // Steepness from neighbors decides grass or rock.
      const nb = [colHeight(x1 + 1, czm), colHeight(x0 - 1, czm), colHeight(cxm, z1 + 1), colHeight(cxm, z0 - 1)];
      const steep = Math.max(...nb.map((v) => (v > -999 ? Math.abs(v - h) : 0))) > 7;
      const top = steep ? L("rock") : h < -4 ? L("gravel") : L("grassTop");
      const sideL = steep ? L("rock") : L("dirt");
      // Tops: merge runs of equal height/texture along the row into one quad.
      if (run && run.h === h && run.top === top && run.mb === mb && run.x1 === x0) run.x1 = x1;
      else {
        flushRun();
        run = { x0, x1, z0, z1, h, top, mb };
      }
      // Side walls down to each lower neighbor, in 10 m segments so ring sizes line up.
      const seg = 10;
      for (let t = 0; t < s; t += seg) {
        const a = x0 + t;
        const bnd = Math.min(x1, a + seg);
        const hS = colHeight((a + bnd) / 2, z1 + 0.5);
        if (hS < h) mb.quad([[a, hS, z1], [bnd, hS, z1], [bnd, h, z1], [a, h, z1]], [0, 0, 1], [[a / UV, hS / UV], [bnd / UV, hS / UV], [bnd / UV, h / UV], [a / UV, h / UV]], sideL);
        const hN = colHeight((a + bnd) / 2, z0 - 0.5);
        if (hN < h) mb.quad([[bnd, hN, z0], [a, hN, z0], [a, h, z0], [bnd, h, z0]], [0, 0, -1], [[bnd / UV, hN / UV], [a / UV, hN / UV], [a / UV, h / UV], [bnd / UV, h / UV]], sideL);
      }
      for (let t = 0; t < sz; t += seg) {
        const a = z0 + t;
        const bnd = Math.min(z1, a + seg);
        const hE = colHeight(x1 + 0.5, (a + bnd) / 2);
        if (hE < h) mb.quad([[x1, hE, bnd], [x1, hE, a], [x1, h, a], [x1, h, bnd]], [1, 0, 0], [[bnd / UV, hE / UV], [a / UV, hE / UV], [a / UV, h / UV], [bnd / UV, h / UV]], sideL);
        const hW = colHeight(x0 - 0.5, (a + bnd) / 2);
        if (hW < h) mb.quad([[x0, hW, a], [x0, hW, bnd], [x0, h, bnd], [x0, h, a]], [-1, 0, 0], [[a / UV, hW / UV], [bnd / UV, hW / UV], [bnd / UV, h / UV], [a / UV, h / UV]], sideL);
      }

      // Trees on gentle ground outside the city core (the core was cleared around 800 AD).
      const coreDist = Math.max(FLAT_CORE.minX - cxm, cxm - FLAT_CORE.maxX, FLAT_CORE.minZ - czm, czm - FLAT_CORE.maxZ);
      const chance = s === 10 ? 0.16 : 0.07;
      if (!steep && h > -3 && coreDist > 25 && hash(x0, z0) < chance) {
        const k = 0.8 + hash(z0, x0) * 0.6;
        const tx = cxm + (hash(x0 + 7, z0) - 0.5) * (s - 8);
        const tz = czm + (hash(x0, z0 + 7) - 0.5) * (sz - 8);
        const trunkH = 6 * k;
        const tw = 0.75 * k;
        mb.box(tx - tw, h, tz - tw, tx + tw, h + trunkH, tz + tw, L("logTop"), L("logSide"), 0.5);
        const cw = 3.5 * k;
        const leaf = hash(x0 + 3, z0 - 3) < 0.4 ? L("fig") : L("leaves");
        mb.box(tx - cw, h + trunkH - 1, tz - cw, tx + cw, h + trunkH + 2.5 * k, tz + cw, leaf, leaf, 0.5);
        const cw2 = 2 * k;
        mb.box(tx - cw2, h + trunkH + 2.5 * k, tz - cw2, tx + cw2, h + trunkH + 4 * k, tz + cw2, leaf, leaf, 0.5);
      }
      x0 = x1;
    }
    flushRun();
    z0 += rowSize;
  }
  return quads.filter((q) => q.idx.length).map((q) => q.build());
}

