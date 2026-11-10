// Collider for a ruin with an eroded top (temple superstructures, ruined walls).
// The voxel builder removes a different number of blocks from each column, so a plain box as
// tall as the intact building left the player walking in the air, up to 4 m above the blocks.
// This builds a triangle mesh over the same columns the voxel builder draws (same noise, same
// block grid): the surface passes through the tops of the highest blocks around each point,
// sloping between them instead of stepping, so the player walks over the rubble without
// having to jump every half meter. Sides go straight down to the base of the ruin.
import { BLOCK } from "../voxel/blocks";
import { REGION, boxBlocks, erodedTop } from "../voxel/voxelWorld";

export interface RuinCollider {
  /** Mound the ruin stands on (temples) or the block id (walls). */
  id: string;
  vertices: Float32Array;
  indices: Uint32Array;
  /** Height of the surface at (x, z), or null outside the ruin. */
  heightAt: (x: number, z: number) => number | null;
}

export function ruinCollider(id: string, position: [number, number, number], size: [number, number, number], erode: number): RuinCollider {
  const { x0, x1, y0, y1, z0, z1 } = boxBlocks(position, size);
  const nx = x1 - x0 + 1;
  const nz = z1 - z0 + 1;
  // Top face of each column (world y).
  const col = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) col[j * nx + i] = REGION.minY + (erodedTop(x0 + i, z0 + j, y0, y1, erode) + 1) * BLOCK;
  // Surface nodes sit on the block corners, at the height of the tallest column touching them.
  const wx = nx + 1;
  const wz = nz + 1;
  const node = new Float32Array(wx * wz);
  for (let j = 0; j < wz; j++)
    for (let i = 0; i < wx; i++) {
      let h = -Infinity;
      for (let dj = -1; dj <= 0; dj++)
        for (let di = -1; di <= 0; di++) {
          const ci = i + di;
          const cj = j + dj;
          if (ci >= 0 && ci < nx && cj >= 0 && cj < nz) h = Math.max(h, col[cj * nx + ci]);
        }
      node[j * wx + i] = h;
    }
  const minX = REGION.minX + x0 * BLOCK;
  const minZ = REGION.minZ + z0 * BLOCK;
  const bottom = position[1] - size[1] / 2;

  const vertices: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j < wz; j++) for (let i = 0; i < wx; i++) vertices.push(minX + i * BLOCK, node[j * wx + i], minZ + j * BLOCK);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * wx + i;
      indices.push(a, a + wx, a + 1, a + 1, a + wx, a + wx + 1);
    }
  // Sides: each edge of the outline, down to the base.
  const side = (a: number, b: number) => {
    const k = vertices.length / 3;
    vertices.push(vertices[a * 3], bottom, vertices[a * 3 + 2], vertices[b * 3], bottom, vertices[b * 3 + 2]);
    indices.push(a, k, b, b, k, k + 1);
  };
  for (let i = 0; i < nx; i++) {
    side(i, i + 1);
    side(nz * wx + i, nz * wx + i + 1);
  }
  for (let j = 0; j < nz; j++) {
    side(j * wx, (j + 1) * wx);
    side(j * wx + nx, (j + 1) * wx + nx);
  }

  return {
    id,
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
    heightAt(x, z) {
      const fi = (x - minX) / BLOCK;
      const fj = (z - minZ) / BLOCK;
      if (fi < 0 || fj < 0 || fi >= nx || fj >= nz) return null;
      const i = Math.floor(fi);
      const j = Math.floor(fj);
      return Math.max(node[j * wx + i], node[j * wx + i + 1], node[(j + 1) * wx + i], node[(j + 1) * wx + i + 1]);
    },
  };
}
