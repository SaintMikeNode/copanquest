// Makes the world feel alive: dirt trails, big tropical trees, and plant sprites
// (grass, ferns, flowers, heliconias). Runs in the worker after the site is rasterized.
import { B, BLOCK, PL } from "./blocks";
import { CS, NX, NZ, REGION, VoxelWorld, hash2, valueNoise } from "./voxelWorld";
import { BOUNDS, FIXED_TREES, OPEN_AREAS, PATHS } from "../world/siteData";
import { VILLAGE_RECT, WORKSHOP } from "../world/villageData";
import { ladderSegments } from "../world/ladders";

/** Ladder feet must stay clear of bushes and rubble. */
const LADDER_FEET = ladderSegments().map((s) => [s.base[0] + s.out[0] * 0.6, s.base[2] + s.out[1] * 0.6] as [number, number]);
const nearLadder = (x: number, z: number) => LADDER_FEET.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < 2.8);

const toIx = (x: number) => Math.floor((x - REGION.minX) / BLOCK);
const toIz = (z: number) => Math.floor((z - REGION.minZ) / BLOCK);
const toX = (ix: number) => REGION.minX + (ix + 0.5) * BLOCK;
const toZ = (iz: number) => REGION.minZ + (iz + 0.5) * BLOCK;

const inRect = (x: number, z: number, r: [number, number, number, number], pad = 0) =>
  x >= r[0] - pad && x <= r[2] + pad && z >= r[1] - pad && z <= r[3] + pad;
const inOpen = (x: number, z: number, pad = 0) => OPEN_AREAS.some((r) => inRect(x, z, r, pad));
const inBounds = (x: number, z: number) => x >= BOUNDS.minX && x <= BOUNDS.maxX && z >= BOUNDS.minZ && z <= BOUNDS.maxZ;

/** Paint dirt trails onto whatever grass surface is near each path's height. */
export function paintPaths(w: VoxelWorld) {
  for (const p of PATHS) {
    const yi = Math.round((p.y - REGION.minY) / BLOCK);
    for (let k = 0; k < p.points.length - 1; k++) {
      const [ax, az] = p.points[k];
      const [bx, bz] = p.points[k + 1];
      const r = p.width / 2 + 0.6;
      const dx = bx - ax;
      const dz = bz - az;
      const len2 = dx * dx + dz * dz;
      for (let iz = toIz(Math.min(az, bz) - r); iz <= toIz(Math.max(az, bz) + r); iz++)
        for (let ix = toIx(Math.min(ax, bx) - r); ix <= toIx(Math.max(ax, bx) + r); ix++) {
          if (ix < 0 || iz < 0 || ix >= NX || iz >= NZ) continue;
          const x = toX(ix);
          const z = toZ(iz);
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
          const d = Math.hypot(x - (ax + t * dx), z - (az + t * dz));
          // Ragged edges.
          if (d > p.width / 2 + (hash2(ix, iz) - 0.5) * 0.9) continue;
          const s = w.surface(ix, iz);
          if (Math.abs(s.y - yi) > 8) continue;
          if (s.id === B.Grass || s.id === B.GrassStone) w.setBlock(ix, s.y - 1, iz, B.Path);
        }
    }
  }
}

type TreeKind = "ceiba" | "fig" | "tree";

/**
 * One canopy layer: a rounded rectangle (bevelled corners) — blocky like a block game, and
 * cheap: straight edges merge into a handful of quads.
 */
function disc(w: VoxelWorld, cx: number, cy: number, cz: number, r: number, h: number, leaf: B, seed: number) {
  const rx = Math.round(r * (0.85 + hash2(seed, 1) * 0.3));
  const rz = Math.round(r * (0.85 + hash2(seed, 2) * 0.3));
  const cut = Math.min(3, Math.max(1, Math.round(r * 0.3)));
  for (let dz = -rz; dz <= rz; dz++)
    for (let dx = -rx; dx <= rx; dx++) {
      const inset = rx - Math.abs(dx) + (rz - Math.abs(dz));
      if (inset < cut) continue;
      // Outermost ring is one block thinner, so the canopy looks rounded from the side.
      const rim = Math.abs(dx) === rx || Math.abs(dz) === rz || inset === cut ? 1 : 0;
      for (let y = rim; y < h - rim; y++) w.setIfAir(cx + dx, cy + y, cz + dz, leaf);
    }
}

function logLine(w: VoxelWorld, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, t: number) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  for (let i = 0; i <= n; i++) {
    const f = n ? i / n : 0;
    const x = Math.round(x0 + (x1 - x0) * f);
    const y = Math.round(y0 + (y1 - y0) * f);
    const z = Math.round(z0 + (z1 - z0) * f);
    for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) w.setIfAir(x + a, y, z + b, B.Log);
  }
}

/** Voxel tree rooted at block (ix, iy, iz) — iy is the first air block above the ground. */
export function growTree(w: VoxelWorld, ix: number, iy: number, iz: number, kind: TreeKind, seed: number) {
  const r = (k: number) => hash2(seed * 7 + k, seed * 13 - k);
  if (kind === "ceiba") {
    // Ceiba: straight trunk, buttress roots, horizontal branches, wide flat crown.
    const t = 4;
    const H = 34 + Math.floor(r(1) * 10);
    for (let y = -2; y < H; y++) for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) w.setIfAir(ix + a, iy + y, iz + b, B.Log);
    w.addCollider(ix, iy - 2, iz, ix + t - 1, iy + H - 1, iz + t - 1);
    w.addCollider(ix - 3, iy - 1, iz - 3, ix + t + 2, iy + 3, iz + t + 2); // buttress roots
    const fins: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [fx, fz] of fins)
      for (let k = 1; k <= 4; k++) {
        const hgt = 9 - k * 2;
        for (let y = -1; y < hgt; y++) w.setIfAir(ix + 1 + fx * (k + 1) + (fx ? 0 : 0), iy + y, iz + 1 + fz * (k + 1), B.Log);
      }
    const cy = iy + H;
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 + r(2) * 3;
      const L = 9 + Math.floor(r(3 + k) * 6);
      logLine(w, ix + 1, cy - 6 + k, iz + 1, ix + 1 + Math.round(Math.cos(ang) * L), cy + 1, iz + 1 + Math.round(Math.sin(ang) * L), 2);
    }
    disc(w, ix + 2, cy, iz + 2, 15 + r(4) * 4, 3, B.Fig, seed);
    disc(w, ix + 2, cy + 3, iz + 2, 10 + r(5) * 3, 3, B.Leaves, seed + 1);
    disc(w, ix + 2 + Math.round((r(6) - 0.5) * 8), cy + 5, iz + 2 + Math.round((r(7) - 0.5) * 8), 5, 2, B.Leaves, seed + 2);
  } else if (kind === "fig") {
    const t = 3;
    const H = 18 + Math.floor(r(1) * 8);
    for (let y = -2; y < H; y++) for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) w.setIfAir(ix + a, iy + y, iz + b, B.Log);
    w.addCollider(ix, iy - 2, iz, ix + t - 1, iy + H - 1, iz + t - 1);
    w.addCollider(ix - 2, iy - 1, iz - 2, ix + t + 1, iy + 2, iz + t + 1);
    for (const [fx, fz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const)
      for (let k = 1; k <= 3; k++) for (let y = -1; y < 5 - k; y++) w.setIfAir(ix + 1 + fx * (k + 1), iy + y, iz + 1 + fz * (k + 1), B.Log);
    const cy = iy + H - 4;
    disc(w, ix + 1, cy, iz + 1, 9 + r(2) * 2, 3, B.Fig, seed);
    disc(w, ix + 1, cy + 3, iz + 1, 12 + r(3) * 2, 3, B.Fig, seed + 1);
    disc(w, ix + 1, cy + 6, iz + 1, 9, 3, B.Leaves, seed + 2);
    disc(w, ix + 1, cy + 9, iz + 1, 5, 2, B.Leaves, seed + 3);
  } else {
    const t = 2;
    const H = 12 + Math.floor(r(1) * 8);
    for (let y = -2; y < H; y++) for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) w.setIfAir(ix + a, iy + y, iz + b, B.Log);
    w.addCollider(ix, iy - 2, iz, ix + t - 1, iy + H - 1, iz + t - 1);
    const cy = iy + H - 3;
    const big = 5 + r(2) * 3;
    // Some trees are in bloom: pink macuelizo and yellow guayacán (native to Honduras).
    const roll = r(4);
    const leaf = roll < 0.16 ? B.Blossom : roll < 0.26 ? B.BlossomYellow : roll < 0.5 ? B.Fig : B.Leaves;
    disc(w, ix + 1, cy, iz + 1, big, 3, leaf, seed);
    disc(w, ix + 1, cy + 3, iz + 1, big + 1.5, 3, leaf, seed + 1);
    disc(w, ix + 1, cy + 6, iz + 1, big - 1.5, 2, leaf, seed + 2);
  }
}

/** True if a trunk can stand here: flat grass, no buildings nearby. */
function goodSpot(w: VoxelWorld, ix: number, iz: number, clear: number): number {
  if (ix < clear || iz < clear || ix >= NX - clear || iz >= NZ - clear) return -1;
  const s = w.surface(ix, iz);
  if (s.id !== B.Grass && s.id !== B.GrassStone) return -1;
  for (let dz = -clear; dz <= clear; dz += 2)
    for (let dx = -clear; dx <= clear; dx += 2) {
      const n = w.surface(ix + dx, iz + dz);
      if (Math.abs(n.y - s.y) > 1) return -1;
      if (n.id === B.Path || n.id === B.Stone || n.id === B.Stair || n.id === B.Glyph) return -1;
    }
  return s.y;
}

/**
 * Fallen facade sculpture and rubble at the foot of the ruins (Copán's buildings were covered
 * in carved stone mosaics; thousands of fragments lie around the site today).
 */
export function scatterFragments(w: VoxelWorld) {
  for (let iz = 4; iz < NZ - 4; iz += 5)
    for (let ix = 4; ix < NX - 4; ix += 5) {
      if (hash2(ix * 5, iz * 3) > 0.12) continue;
      const s = w.surface(ix, iz);
      if (s.id !== B.Grass && s.id !== B.GrassStone) continue;
      if (nearLadder(toX(ix), toZ(iz))) continue;
      let wall = false;
      for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4]] as const) {
        const n = w.surface(ix + dx, iz + dz);
        if (n.y >= s.y + 4 && (n.id === B.Stone || n.id === B.GrassStone || n.id === B.Rubble || n.id === B.Stair)) wall = true;
      }
      if (!wall) continue;
      const k = hash2(iz, ix * 7);
      w.setIfAir(ix, s.y, iz, k < 0.4 ? B.Glyph : B.Rubble);
      if (k < 0.2) w.setIfAir(ix + 1, s.y, iz, B.Stone);
      if (k > 0.75) w.setIfAir(ix, s.y + 1, iz, B.Rubble);
      w.addCollider(ix, s.y, iz, ix + (k < 0.2 ? 1 : 0), s.y + (k > 0.75 ? 1 : 0), iz);
    }
}

/** Stone benches beside the trails. */
export function placeBenches(w: VoxelWorld) {
  for (const p of PATHS) {
    for (let k = 0; k < p.points.length - 1; k++) {
      const [ax, az] = p.points[k];
      const [bx, bz] = p.points[k + 1];
      const len = Math.hypot(bx - ax, bz - az);
      for (let d = 12; d < len - 6; d += 38) {
        const t = d / len;
        const nx = -(bz - az) / len;
        const nz = (bx - ax) / len;
        const x = ax + (bx - ax) * t + nx * (p.width / 2 + 1.2);
        const z = az + (bz - az) * t + nz * (p.width / 2 + 1.2);
        const cx = toIx(x);
        const cz = toIz(z);
        const s = w.surface(cx, cz);
        if (s.id !== B.Grass) continue;
        const alongX = Math.abs(bx - ax) > Math.abs(bz - az);
        for (let q = -2; q <= 2; q++) w.setIfAir(cx + (alongX ? q : 0), s.y, cz + (alongX ? 0 : q), B.Stone);
        w.addCollider(cx - (alongX ? 2 : 0), s.y, cz - (alongX ? 0 : 2), cx + (alongX ? 2 : 0), s.y, cz + (alongX ? 0 : 2));
      }
    }
  }
}

/** Leafy bushes hugging the bases of walls and platforms. */
export function plantBushes(w: VoxelWorld) {
  for (let iz = 4; iz < NZ - 4; iz += 3)
    for (let ix = 4; ix < NX - 4; ix += 3) {
      if (hash2(ix * 11, iz * 7) > 0.18) continue;
      const s = w.surface(ix, iz);
      // Natural ground only: no bushes on pyramid terraces or platform tops (grass there is fine).
      if (s.id !== B.Grass) continue;
      if (nearLadder(toX(ix), toZ(iz))) continue;
      // Next to a wall at least 1.5 m taller?
      let wall = false;
      for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]] as const) {
        const n = w.surface(ix + dx, iz + dz);
        if (n.y >= s.y + 3 && (n.id === B.Stone || n.id === B.GrassStone || n.id === B.Rubble)) wall = true;
      }
      if (!wall) continue;
      const leaf = hash2(ix, iz) < 0.5 ? B.Leaves : B.Fig;
      const r = 1 + Math.floor(hash2(iz, ix) * 2);
      w.addCollider(ix - r, s.y, iz - r, ix + r, s.y + 2, iz + r);
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) + Math.abs(dz) > r + 1) continue;
          const hgt = Math.abs(dx) + Math.abs(dz) <= r - 1 ? 3 : 2;
          for (let y = 0; y < hgt; y++) w.setIfAir(ix + dx, s.y + y, iz + dz, leaf);
        }
    }
}

export function plantTrees(w: VoxelWorld) {
  let seed = 1;
  for (const t of FIXED_TREES) {
    const ix = toIx(t.position[0]);
    const iz = toIz(t.position[1]);
    const s = w.surface(ix, iz);
    growTree(w, ix, s.y, iz, t.kind, seed++);
  }
  // Candidate grid: shade trees around the lawns, forest outside the walkable area.
  const step = 30; // blocks (15 m)
  for (let gz = 0; gz < NZ; gz += step)
    for (let gx = 0; gx < NX; gx += step) {
      const ix = gx + Math.floor(hash2(gx, gz) * (step - 4));
      const iz = gz + Math.floor(hash2(gz, gx + 9) * (step - 4));
      const x = toX(ix);
      const z = toZ(iz);
      if (inOpen(x, z, 2) || inRect(x, z, VILLAGE_RECT, 4)) continue;
      if (Math.hypot(x - WORKSHOP[0], z - WORKSHOP[1]) < 10) continue;
      const forest = !inBounds(x, z);
      const ring = inOpen(x, z, 14);
      const p = forest ? 0.4 : ring ? 0.4 : 0.1;
      if (hash2(ix + 5, iz + 5) > p) continue;
      const kindRoll = hash2(ix, iz + 77);
      const kind: TreeKind = kindRoll < 0.12 ? "ceiba" : kindRoll < 0.35 ? "fig" : "tree";
      const y = goodSpot(w, ix, iz, kind === "tree" ? 4 : 7);
      if (y < 0) continue;
      growTree(w, ix, y, iz, kind, seed++);
    }
}

/**
 * Plant sprites, grouped by 64 m region. Each instance = [x, y, z, plant + 16 × rotation].
 * Runs after the trees (surfaces see through leaves, so plants grow in the shade too).
 */
export function scatterPlants(
  w: VoxelWorld,
  extra: [number, number, number, number][] = [],
  group = 4,
): { data: Float32Array; center: [number, number] }[] {
  const groups = new Map<number, number[]>();
  const add = (ix: number, iz: number, y: number, plant: number) => {
    const key = Math.floor(ix / CS / group) * 1000 + Math.floor(iz / CS / group);
    let g = groups.get(key);
    if (!g) groups.set(key, (g = []));
    const rot = Math.floor(hash2(ix * 3, iz * 5) * 4);
    g.push(toX(ix) + (hash2(ix, iz * 3) - 0.5) * 0.3, REGION.minY + y * BLOCK, toZ(iz) + (hash2(ix * 7, iz) - 0.5) * 0.3, plant + 16 * rot);
  };
  for (const [eix, eiy, eiz, plant] of extra) add(eix, eiz, eiy, plant);
  const flowers = [PL("flowerRed"), PL("flowerYellow"), PL("flowerPink"), PL("flowerWhite"), PL("flowerBlue")];
  for (let iz = 1; iz < NZ - 1; iz++)
    for (let ix = 1; ix < NX - 1; ix++) {
      const h = hash2(ix, iz);
      if (h > 0.25) continue; // fast reject: densities below are all ≤ 0.25
      const s = w.surface(ix, iz, true);
      if (s.id !== B.Grass && s.id !== B.GrassStone) continue;
      if (w.get(ix, s.y, iz) !== B.Air) continue;
      const x = toX(ix);
      const z = toZ(iz);
      if (inRect(x, z, VILLAGE_RECT) && h > 0.05) continue; // tidy around the houses
      const open = inOpen(x, z);
      // Near walls / trunks / path edges → lush.
      const n1 = w.surface(ix + 2, iz, true);
      const n2 = w.surface(ix - 2, iz, true);
      const n3 = w.surface(ix, iz + 2, true);
      const n4 = w.surface(ix, iz - 2, true);
      const edge =
        [n1, n2, n3, n4].some((n) => n.y > s.y + 1 || n.id === B.Log || n.id === B.Stone || n.id === B.Stair) ? 1 : 0;
      const nearPath = [n1, n2, n3, n4].some((n) => n.id === B.Path) ? 1 : 0;
      const patch = valueNoise(x * 0.12, z * 0.12, 3);
      const flowerPatch = patch > 0.72;
      if (open && !edge) {
        // Clumps: tufts gather in patches instead of an even sprinkle.
        const clump = valueNoise(x * 0.22, z * 0.22, 5);
        const dens = clump > 0.62 ? 0.14 : 0.012;
        if (h < dens) add(ix, iz, s.y, clump > 0.75 && h < 0.05 ? PL("tallGrass") : PL("grass"));
        else if (h < dens + 0.003) add(ix, iz, s.y, flowers[Math.floor(hash2(ix, iz + 1) * 2) + 3]);
        continue;
      }
      if (edge) {
        if (h < 0.22) add(ix, iz, s.y, h < 0.05 ? PL("fern") : h < 0.07 ? PL("heliconia") : PL("tallGrass"));
        continue;
      }
      if (nearPath) {
        if (h < 0.12) add(ix, iz, s.y, h < 0.03 ? flowers[Math.floor(patch * 50) % 5] : PL("grass"));
        continue;
      }
      if (flowerPatch) {
        if (h < 0.25) add(ix, iz, s.y, h < 0.16 ? flowers[Math.floor(valueNoise(x * 0.05, z * 0.05, 9) * 5)] : PL("tallGrass"));
        continue;
      }
      if (h < 0.07) add(ix, iz, s.y, h < 0.012 ? PL("fern") : h < 0.045 ? PL("tallGrass") : PL("grass"));
    }
  return [...groups.entries()].map(([key, arr]) => ({
    data: new Float32Array(arr),
    center: [REGION.minX + (Math.floor(key / 1000) + 0.5) * group * CS * BLOCK, REGION.minZ + ((key % 1000) + 0.5) * group * CS * BLOCK],
  }));
}
