// Turns site data into voxel shapes (for the block renderer) and collider descriptions.
// Visuals and colliders are separate: steps are decoration only, and every staircase
// gets one invisible convex wedge (ramp) the character walks on.
import { BLOCKS, MONUMENTS, MOUNDS, ROSALILA, type Face, type Material, type Mound, type Stair } from "./siteData";
import { BLOCK, MATERIAL_COLOR } from "../voxel/blocks";
import { rosalilaColliders } from "./rosalilaShape";
import { ruinCollider, type RuinCollider } from "./ruinCollider";

/** A box to rasterize into voxels. Later shapes overwrite earlier ones. */
export interface Shape {
  position: [number, number, number];
  /** size[1] = 0 means "paint": recolor the block layer just below position.y. */
  size: [number, number, number];
  rotation?: [number, number, number];
  material: Material;
  /** Rotated boxes: also fill everything below them down to `fillTo` (e.g. sloped walls). */
  fillTo?: number;
  /** Ruin erosion: remove up to this many blocks from the top of each column (seeded). */
  erode?: number;
  /** Remove blocks instead of adding them (tunnels, chambers). */
  carve?: boolean;
  /**
   * Foundation: wherever the terrain is lower than the box bottom, fill down to it with
   * layered fill (earth, plaster floors, rubble), as in El Corte, so nothing floats.
   */
  skirt?: boolean;
}

type Box = [number, number, number, number, number, number]; // minX, minY, minZ, maxX, maxY, maxZ

/** Axis-aligned box minus a hole → up to 6 boxes. */
function subtract(b: Box, h: Box): Box[] {
  if (h[0] >= b[3] || h[3] <= b[0] || h[1] >= b[4] || h[4] <= b[1] || h[2] >= b[5] || h[5] <= b[2]) return [b];
  const out: Box[] = [];
  const [x0, y0, z0, x1, y1, z1] = b;
  const hx0 = Math.max(h[0], x0), hy0 = Math.max(h[1], y0), hz0 = Math.max(h[2], z0);
  const hx1 = Math.min(h[3], x1), hy1 = Math.min(h[4], y1), hz1 = Math.min(h[5], z1);
  if (x0 < hx0) out.push([x0, y0, z0, hx0, y1, z1]);
  if (hx1 < x1) out.push([hx1, y0, z0, x1, y1, z1]);
  if (z0 < hz0) out.push([hx0, y0, z0, hx1, y1, hz0]);
  if (hz1 < z1) out.push([hx0, y0, hz1, hx1, y1, z1]);
  if (y0 < hy0) out.push([hx0, y0, hz0, hx1, hy0, hz1]);
  if (hy1 < y1) out.push([hx0, hy1, hz0, hx1, y1, hz1]);
  return out;
}

/** Rosalila's chamber and access tunnel (as boxes). */
export function rosalilaHoles(): Box[] {
  const R = ROSALILA;
  const C = R.chamber;
  const T = R.tunnel;
  return [
    [C.x0, R.baseY, C.z0, C.x1, R.baseY + C.height, C.z1],
    [T.toX, R.baseY, T.z - T.width / 2, T.fromX, R.baseY + T.height, T.z + T.width / 2],
  ];
}

/** Where to draw each carved monument (pixel-art mesh, not voxels). */
export interface MonumentPlacement {
  id: string;
  kind: "stela" | "altar";
  /** Center of the bottom face. */
  position: [number, number, number];
  size: [number, number, number];
  rotY: number;
}

export interface CuboidDesc {
  position: [number, number, number];
  halfExtents: [number, number, number];
  rotation?: [number, number, number];
}

export interface Greybox {
  shapes: Shape[];
  cuboids: CuboidDesc[];
  /** Triangle meshes over ruins with eroded tops (ruinCollider.ts). */
  ruins: RuinCollider[];
  /** Flat [x,y,z,...] point lists for ConvexHullColliders. */
  ramps: Float32Array[];
  monuments: MonumentPlacement[];
  /** Footprints for the minimap. */
  footprints: { rect: [number, number, number, number]; color: string; height: number }[];
}

const FACE_DIR: Record<Face, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

function stairMaterial(_m: Mound, s: Stair): Material {
  return s.glyphs ? "glyph" : "stair";
}

function buildStair(g: Greybox, m: Mound, s: Stair) {
  const baseY = m.baseY ?? 0;
  const H = m.tiers * m.tierHeight;
  const [ux, uz] = FACE_DIR[s.face]; // outward
  const [vx, vz] = [-uz, ux]; // along the face
  const alongX = s.face === "n" || s.face === "s";
  const halfOut = (alongX ? m.size[1] : m.size[0]) / 2;
  const topHalfOut = halfOut - (m.tiers - 1) * m.setback;
  // A ramp from the top edge that lands `tiers × setback` out would just touch every tier
  // corner; one extra setback clears them by tierHeight / (tiers + 1).
  const run = Math.max(s.run ?? 0, (m.tiers + 1) * m.setback);
  const offset = s.offset ?? 0;
  const [cx, cz] = m.center;

  // Point helper: x = outward distance from the top edge, l = lateral, y = height above base
  const P = (x: number, l: number, y: number): [number, number, number] => [
    cx + ux * (topHalfOut + x) + vx * (offset + l),
    baseY + y,
    cz + uz * (topHalfOut + x) + vz * (offset + l),
  ];

  // Visual steps follow the block grid: one slab per block of run, height rounded to blocks.
  const slabs = Math.max(1, Math.round(run / BLOCK));
  const depth = run / slabs;
  const material = stairMaterial(m, s);
  for (let j = 0; j < slabs; j++) {
    const xMid = (j + 0.5) * depth; // j = 0 is next to the top edge
    const top = Math.max(BLOCK, Math.round((H * (1 - xMid / run)) / BLOCK) * BLOCK);
    const [px, , pz] = P(xMid, 0, 0);
    g.shapes.push({
      position: [px, baseY + top / 2, pz],
      size: alongX ? [s.width, top, depth] : [depth, top, s.width],
      material,
    });
  }

  // Invisible ramp wedge. It is lifted half a block so it runs along the step tips (the
  // player walks ON the steps, not through them) and extended so its slope is unchanged.
  const w = s.width / 2;
  const lift = BLOCK * 0.6;
  const runOut = run * (1 + lift / H);
  const pts = [
    P(-0.6, -w, H + lift),
    P(-0.6, w, H + lift),
    P(-0.6, -w, 0),
    P(-0.6, w, 0),
    P(runOut, -w, 0),
    P(runOut, w, 0),
  ];
  g.ramps.push(new Float32Array(pts.flat()));
}

function pushSolid(g: Greybox, shape: Shape, id = "") {
  g.shapes.push(shape);
  if (shape.erode && !shape.rotation) {
    g.ruins.push(ruinCollider(id, shape.position, shape.size, shape.erode));
    return;
  }
  g.cuboids.push({
    position: shape.position,
    halfExtents: [shape.size[0] / 2, shape.size[1] / 2, shape.size[2] / 2],
    rotation: shape.rotation,
  });
}

function buildMound(g: Greybox, m: Mound) {
  const baseY = m.baseY ?? 0;
  const material = m.material ?? "stone";
  const [cx, cz] = m.center;
  for (let i = 0; i < m.tiers; i++) {
    const w = m.size[0] - 2 * i * m.setback;
    const d = m.size[1] - 2 * i * m.setback;
    const top = baseY + (i + 1) * m.tierHeight;
    pushSolid(g, { position: [cx, top - m.tierHeight / 2, cz], size: [w, m.tierHeight, d], material, skirt: i === 0 });
    if (i === 0) {
      // Foundation collider down to the bottom of the world, so the river's banks can never
      // leave a walkable hollow under a platform (the Acropolis east edge by El Corte).
      const bottom = -12;
      g.cuboids.push({ position: [cx, (bottom + baseY) / 2, cz], halfExtents: [w / 2, (baseY - bottom) / 2, d / 2] });
    }
    // Grass grows on top of every restored terrace today.
    g.shapes.push({ position: [cx, top, cz], size: [w, 0, d], material: "grassStone" });
  }
  const H = m.tiers * m.tierHeight;
  if (m.temple) {
    const [tw, th, td] = m.temple;
    const top = baseY + H;
    // The visible temple is a ruin with an eroded top; its collider follows the same blocks.
    pushSolid(g, {
      position: [cx, top + th / 2, cz],
      size: [tw, th, td],
      material: "stone",
      erode: m.ruin === false ? 0 : Math.round(th / BLOCK) - 2,
    }, m.id);
  }
  for (const s of m.stairs ?? []) buildStair(g, m, s);
  g.footprints.push({
    rect: [cx - m.size[0] / 2, cz - m.size[1] / 2, cx + m.size[0] / 2, cz + m.size[1] / 2],
    color: MATERIAL_COLOR[m.temple ? "stone" : "grassStone"],
    height: baseY + H,
  });
}

let cached: Greybox | null = null;

export function buildGreybox(): Greybox {
  if (cached) return cached;
  const g: Greybox = { shapes: [], cuboids: [], ruins: [], ramps: [], monuments: [], footprints: [] };
  // Big platforms first so temples and floors drawn later overwrite them.
  const ordered = [...MOUNDS].sort((a, b) => (a.id.startsWith("acropolis") ? -1 : b.id.startsWith("acropolis") ? 1 : 0));
  for (const m of ordered) buildMound(g, m);

  for (const b of BLOCKS) {
    const shape: Shape = {
      position: b.position,
      size: b.size,
      rotation: b.rotation,
      material: b.material ?? "stone",
      fillTo: b.collider && b.rotation ? 0 : undefined,
      erode: b.erode,
    };
    if (b.collider) pushSolid(g, shape, b.id);
    else g.shapes.push(shape);
  }

  for (const mon of MONUMENTS) {
    const baseY = mon.baseY ?? 0;
    const [x, z] = mon.position;
    const isStela = mon.kind === "stela";
    const rotY = mon.rotY ?? 0;
    // Stelae face ±z by default; a quarter turn swaps width and depth for the collider.
    const quarter = Math.round(rotY / (Math.PI / 2)) % 2 !== 0;
    const w = mon.width;
    const d = isStela ? mon.width * 0.75 : mon.width;
    let y = baseY;
    if (isStela) {
      // Low square stone base, as the stelae stand today.
      const bw = w + 1;
      const bd = d + 1;
      pushSolid(g, { position: [x, baseY + BLOCK / 2, z], size: quarter ? [bd, BLOCK, bw] : [bw, BLOCK, bd], material: "stone" });
      y += BLOCK;
    }
    g.monuments.push({ id: mon.id, kind: mon.kind, position: [x, y, z], size: [w, mon.height, d], rotY });
    g.cuboids.push({
      position: [x, y + mon.height / 2, z],
      halfExtents: quarter ? [d / 2, mon.height / 2, w / 2] : [w / 2, mon.height / 2, d / 2],
    });
  }
  // ---- Rosalila: carve the chamber and tunnel out of Temple 16, then build the temple inside.
  const holes = rosalilaHoles();
  for (const [x0, y0, z0, x1, y1, z1] of holes) {
    g.shapes.push({ position: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], size: [x1 - x0, y1 - y0, z1 - z0], material: "stone", carve: true });
    g.shapes.push({ position: [(x0 + x1) / 2, y0, (z0 + z1) / 2], size: [x1 - x0, 0, z1 - z0], material: "gravel" });
  }
  g.cuboids = g.cuboids.flatMap((c) => {
    if (c.rotation) return [c];
    let boxes: Box[] = [[
      c.position[0] - c.halfExtents[0], c.position[1] - c.halfExtents[1], c.position[2] - c.halfExtents[2],
      c.position[0] + c.halfExtents[0], c.position[1] + c.halfExtents[1], c.position[2] + c.halfExtents[2],
    ]];
    for (const h of holes) boxes = boxes.flatMap((b) => subtract(b, h));
    return boxes
      .filter((b) => b[3] - b[0] > 0.01 && b[4] - b[1] > 0.01 && b[5] - b[2] > 0.01)
      .map((b) => ({
        position: [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2] as [number, number, number],
        halfExtents: [(b[3] - b[0]) / 2, (b[4] - b[1]) / 2, (b[5] - b[2]) / 2] as [number, number, number],
      }));
  });
  // Rosalila itself is a painted relief model (Rosalila.tsx); here only its colliders.
  g.cuboids.push(...rosalilaColliders());
  cached = g;
  return g;
}

/** Height of the ruined temple top on a mound at (x, z); null if the mound has none there. */
export function ruinTopAt(mound: string, x: number, z: number): number | null {
  for (const r of buildGreybox().ruins) {
    if (r.id !== mound) continue;
    const h = r.heightAt(x, z);
    if (h !== null) return h;
  }
  return null;
}
