// Turns site data into voxel shapes (for the block renderer) and collider descriptions.
// Visuals and colliders are separate: steps are decoration only, and every staircase
// gets one invisible convex wedge (ramp) the character walks on.
import { BLOCKS, MONUMENTS, MOUNDS, type Face, type Material, type Mound, type Stair } from "./siteData";
import { BLOCK, MATERIAL_COLOR } from "../voxel/blocks";

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

function pushSolid(g: Greybox, shape: Shape) {
  g.shapes.push(shape);
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
    pushSolid(g, { position: [cx, top - m.tierHeight / 2, cz], size: [w, m.tierHeight, d], material });
    // Grass grows on top of every restored terrace today.
    g.shapes.push({ position: [cx, top, cz], size: [w, 0, d], material: "grassStone" });
  }
  const H = m.tiers * m.tierHeight;
  if (m.temple) {
    const [tw, th, td] = m.temple;
    const top = baseY + H;
    // Collider keeps the full volume; the visible temple is a ruin with an eroded top.
    g.cuboids.push({ position: [cx, top + th / 2, cz], halfExtents: [tw / 2, th / 2, td / 2] });
    g.shapes.push({
      position: [cx, top + th / 2, cz],
      size: [tw, th, td],
      material: "stone",
      erode: m.ruin === false ? 0 : Math.round(th / BLOCK) - 2,
    });
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
  const g: Greybox = { shapes: [], cuboids: [], ramps: [], monuments: [], footprints: [] };
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
    };
    if (b.collider) pushSolid(g, shape);
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
  cached = g;
  return g;
}
