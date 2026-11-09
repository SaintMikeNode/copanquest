// Visible boundary: a rustic wooden post-and-rail fence along the edge of the playable area,
// right in front of the invisible boundary walls (Boundary.tsx), so the edge reads as a park
// fence instead of an invisible wall. It joins the entrance gate and skips the river channel.
// One merged mesh (one draw call), pixel-textured at the world's 32 px/m.
import { use, useMemo } from "react";
import * as THREE from "three";
import { BOUNDS } from "./siteData";
import { terrainPromise } from "./Terrain";
import { sampleHeight, type TerrainGrid } from "./terrainData";
import { createMonumentMaterial } from "../voxel/material";
import { P, TEX, Tile, pick, rng } from "../voxel/textures";
import { BLOCK } from "../voxel/blocks";
import { REGION } from "../voxel/voxelWorld";
import { LAYER_WORLD } from "../game/layers";

/** Fence centerline sits this far inside the bounds (the invisible wall is just outside). */
const INSET = 0.12;
const SPACING = 2.5;
const POST = 0.2;
const POST_H = 1.25;
const RAILS = [0.45, 0.95];
const RAIL_T = 0.08;
const RAIL_H = 0.12;
/** No fence below this ground height (the river channel). */
const MIN_GROUND = -1.5;
/** Entrance gate posts (see village.ts gate()): x and the two z lines the fence meets. */
const GATE = { x: -146.95, z0: 77.75, z1: 83.75 };

/** Height of the voxel ground under (x, z): block tops are on the 0.5 m grid. */
function groundAt(grid: TerrainGrid, x: number, z: number) {
  const h = sampleHeight(grid, x, z);
  return Math.round((h - REGION.minY) / BLOCK) * BLOCK + REGION.minY;
}

function woodTexture() {
  const t = new Tile();
  const r = rng(4242);
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      // Grain runs along v; dark seams every 5 px, a knot here and there.
      let v = 2 + (r() - 0.5) * 0.9;
      if (x % 5 === 4) v = 0.6;
      if ((x - 7) ** 2 + (y - 10) ** 2 < 3) v = 0.2;
      t.set(x, y, pick(P.wood, v));
    }
  const tex = new THREE.DataTexture(new Uint8Array(t.px.buffer.slice(0)), TEX, TEX);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Oriented box → positions, normals and world-scale UVs (one texture tile per 0.5 m). */
class BoxBuilder {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  idx: number[] = [];
  /** c: center; axes: unit vectors; half: half sizes along them. */
  add(c: THREE.Vector3, axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3], half: [number, number, number]) {
    const longest = half.indexOf(Math.max(...half));
    for (let a = 0; a < 3; a++)
      for (const s of [1, -1]) {
        const n = axes[a].clone().multiplyScalar(s);
        // The two in-plane axes; v follows the longest one so the grain runs along the piece.
        let [p, q] = [(a + 1) % 3, (a + 2) % 3];
        if (q !== longest && p === longest) [p, q] = [q, p];
        if (s < 0) [p, q] = [q, p];
        const base = this.pos.length / 3;
        for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const v = c.clone().addScaledVector(n, half[a]).addScaledVector(axes[p], i * half[p]).addScaledVector(axes[q], j * half[q]);
          this.pos.push(v.x, v.y, v.z);
          this.nor.push(n.x, n.y, n.z);
          this.uv.push(((i * half[p]) / BLOCK) , ((j * half[q]) / BLOCK));
        }
        this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

/** Fence runs (polylines), clockwise from the gate. */
function runs(): [number, number][][] {
  const { minX, maxX, minZ, maxZ } = BOUNDS;
  const x0 = minX + INSET;
  const x1 = maxX - INSET;
  const z0 = minZ + INSET;
  const z1 = maxZ - INSET;
  return [
    // From the north side of the gate, up the west side, around the north, east and south.
    [[GATE.x, GATE.z0], [x0, GATE.z0], [x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, GATE.z1], [GATE.x, GATE.z1]],
  ];
}

function buildFence(grid: TerrainGrid) {
  const b = new BoxBuilder();
  const up = new THREE.Vector3(0, 1, 0);
  for (const run of runs()) {
    // Posts at even spacing along each straight side (corners included).
    const posts: { x: number; z: number; y: number }[] = [];
    for (let k = 0; k < run.length - 1; k++) {
      const [ax, az] = run[k];
      const [bx, bz] = run[k + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / SPACING));
      for (let i = k === 0 ? 0 : 1; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n;
        const z = az + ((bz - az) * i) / n;
        posts.push({ x, z, y: groundAt(grid, x, z) });
      }
    }
    const ok = (p: { y: number }) => p.y > MIN_GROUND;
    for (const p of posts) {
      if (!ok(p)) continue;
      b.add(new THREE.Vector3(p.x, p.y + POST_H / 2 - 0.05, p.z), [new THREE.Vector3(1, 0, 0), up, new THREE.Vector3(0, 0, 1)], [POST / 2, POST_H / 2, POST / 2]);
    }
    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i];
      const c = posts[i + 1];
      if (!ok(a) || !ok(c)) continue;
      for (const h of RAILS) {
        const p0 = new THREE.Vector3(a.x, a.y + h, a.z);
        const p1 = new THREE.Vector3(c.x, c.y + h, c.z);
        const along = p1.clone().sub(p0);
        const len = along.length();
        along.normalize();
        const side = new THREE.Vector3().crossVectors(up, along).normalize();
        const vert = new THREE.Vector3().crossVectors(along, side).normalize();
        b.add(p0.clone().add(p1).multiplyScalar(0.5), [along, vert, side], [len / 2 + POST / 2, RAIL_H / 2, RAIL_T / 2]);
      }
    }
  }
  return b.geometry();
}

export function Fence() {
  const grid = use(terrainPromise);
  const { geometry, material } = useMemo(() => ({ geometry: buildFence(grid), material: createMonumentMaterial(woodTexture()) }), [grid]);
  return <mesh geometry={geometry} material={material} layers-mask={1 | (1 << LAYER_WORLD)} castShadow receiveShadow />;
}
