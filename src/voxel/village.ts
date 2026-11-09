// Voxel builder for the residential ward, ladders and the sculptor's workshop.
import { B, BLOCK, PL } from "./blocks";
import { NX, NZ, REGION, VoxelWorld, hash2 } from "./voxelWorld";
import { growTree } from "./decorate";
import { FIELDS, HOUSEHOLDS, ORCHARD, STALLS, TEMAZCALS, WORKSHOP, type House } from "../world/villageData";
import { ladderSegments } from "../world/ladders";
import { DIG_SITES } from "../game/gameData";

const ix = (x: number) => Math.floor((x - REGION.minX) / BLOCK);
const iz = (z: number) => Math.floor((z - REGION.minZ) / BLOCK);

/** Plant sprites placed by hand (crops): [ix, iy, iz, plant]. */
export type PlantSink = (ix: number, iy: number, iz: number, plant: number) => void;

function fill(w: VoxelWorld, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, b: B) {
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) w.setBlock(x, y, z, b);
}

function groundY(w: VoxelWorld, x: number, z: number) {
  return w.surface(ix(x), iz(z)).y;
}

/** Hipped thatch roof rising one block per block inset (45°), with a 1-block overhang. */
function roof(w: VoxelWorld, x0: number, z0: number, x1: number, z1: number, y: number) {
  let k = 0;
  for (;;) {
    const a0 = x0 - 1 + k;
    const a1 = x1 + 1 - k;
    const b0 = z0 - 1 + k;
    const b1 = z1 + 1 - k;
    if (a0 > a1 || b0 > b1) break;
    for (let z = b0; z <= b1; z++)
      for (let x = a0; x <= a1; x++) if (x === a0 || x === a1 || z === b0 || z === b1 || a1 - a0 < 2 || b1 - b0 < 2) w.setBlock(x, y + k, z, B.Thatch);
    k++;
  }
  return k;
}

function house(w: VoxelWorld, h: House, plants: PlantSink) {
  const [cx, cz] = h.at;
  const [sw, sd] = h.size;
  const x0 = ix(cx - sw / 2);
  const x1 = ix(cx + sw / 2) - 1;
  const z0 = iz(cz - sd / 2);
  const z1 = iz(cz + sd / 2) - 1;
  const g = groundY(w, cx, cz);
  // Low platform: stone footing with a packed-earth top, 1 block (0.5 m) high, 1 block wider.
  fill(w, x0 - 1, g, z0 - 1, x1 + 1, g, z1 + 1, B.Earth);
  for (let x = x0 - 1; x <= x1 + 1; x++)
    for (const z of [z0 - 1, z1 + 1]) w.setBlock(x, g, z, B.Stone);
  for (let z = z0 - 1; z <= z1 + 1; z++)
    for (const x of [x0 - 1, x1 + 1]) w.setBlock(x, g, z, B.Stone);
  w.addCollider(x0 - 1, g, z0 - 1, x1 + 1, g, z1 + 1);
  const floor = g + 1;
  const wallH = h.kind === "kitchen" ? 0 : 5; // kitchens are open-sided, roof on posts
  const top = floor + 5;
  // Door: 2 blocks wide, 4 tall, in the middle of the door face.
  const midX = Math.floor((x0 + x1) / 2);
  const midZ = Math.floor((z0 + z1) / 2);
  const isDoor = (x: number, y: number, z: number) => {
    if (y - floor >= 4) return false;
    if (h.door === "n") return z === z0 && x >= midX && x <= midX + 1;
    if (h.door === "s") return z === z1 && x >= midX && x <= midX + 1;
    if (h.door === "w") return x === x0 && z >= midZ && z <= midZ + 1;
    return x === x1 && z >= midZ && z <= midZ + 1;
  };
  if (wallH) {
    for (let y = floor; y < floor + wallH; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) {
          const edge = x === x0 || x === x1 || z === z0 || z === z1;
          if (edge && !isDoor(x, y, z)) w.setBlock(x, y, z, B.Adobe);
        }
    // Wall colliders (door gap left open).
    const add = (a0: number, b0: number, a1: number, b1: number) => w.addCollider(a0, floor, b0, a1, floor + wallH - 1, b1);
    const dn = h.door;
    if (dn === "n") {
      add(x0, z0, midX - 1, z0);
      add(midX + 2, z0, x1, z0);
    } else add(x0, z0, x1, z0);
    if (dn === "s") {
      add(x0, z1, midX - 1, z1);
      add(midX + 2, z1, x1, z1);
    } else add(x0, z1, x1, z1);
    if (dn === "w") {
      add(x0, z0, x0, midZ - 1);
      add(x0, midZ + 2, x0, z1);
    } else add(x0, z0, x0, z1);
    if (dn === "e") {
      add(x1, z0, x1, midZ - 1);
      add(x1, midZ + 2, x1, z1);
    } else add(x1, z0, x1, z1);
  } else {
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as const) {
      fill(w, px, floor, pz, px, top - 1, pz, B.Wood);
      w.addCollider(px, floor, pz, px, top - 1, pz);
    }
  }
  roof(w, x0, z0, x1, z1, top);
  // Interior.
  if (h.kind === "house") {
    // Sleeping bench along the back wall (as in Joya de Cerén houses).
    const back = h.door === "s" ? z0 + 1 : h.door === "n" ? z1 - 1 : -1;
    if (back > 0) {
      fill(w, x0 + 1, floor, back, x1 - 1, floor + 1, back, B.Adobe);
      w.addCollider(x0 + 1, floor, back, x1 - 1, floor + 1, back);
    }
    w.setBlock(x0 + 1, floor, z0 + 1, B.Pottery);
  } else if (h.kind === "store") {
    fill(w, x0 + 1, floor, z0 + 1, x0 + 2, floor + 1, z0 + 2, B.Maize);
    w.setBlock(x1 - 1, floor, z1 - 1, B.Pottery);
    w.setBlock(x1 - 1, floor + 1, z1 - 1, B.Pottery);
    w.setBlock(x1 - 1, floor, z1 - 2, B.Pottery);
  } else {
    // Three-stone hearth, a grinding stone (metate) and jars.
    for (const [dx, dz] of [[0, 0], [1, 1], [-1, 1]] as const) w.setBlock(midX + dx, floor, midZ + dz, B.Rock);
    w.setBlock(x0 + 1, floor, z1 - 1, B.Stone);
    w.setBlock(x1 - 1, floor, z0 + 1, B.Pottery);
    // Firewood.
    fill(w, x1 + 2, g + 1, z0, x1 + 2, g + 1, z0 + 3, B.Log);
  }
  // A couple of jars outside the door and a few plants around the platform.
  for (let k = 0; k < 6; k++) {
    const px = x0 - 2 + Math.floor(hash2(x0 + k, z0) * (x1 - x0 + 5));
    const pz = hash2(z0, k) < 0.5 ? z0 - 2 : z1 + 2;
    const s = w.surface(px, pz);
    if (s.id === B.Grass) plants(px, s.y, pz, k % 3 === 0 ? PL("flowerRed") : PL("tallGrass"));
  }
}

function temazcal(w: VoxelWorld, x: number, z: number) {
  const cx = ix(x);
  const cz = iz(z);
  const g = groundY(w, x, z);
  const r = 5; // blocks (2.5 m)
  for (let dz = -r; dz <= r; dz++)
    for (let dx = -r; dx <= r; dx++)
      for (let dy = 0; dy <= r; dy++) {
        const d = Math.sqrt(dx * dx + dz * dz + dy * dy * 1.4);
        if (d <= r + 0.3 && d > r - 1.2) {
          // Small door on the south side.
          if (dz >= r - 1 && Math.abs(dx) <= 1 && dy < 3) continue;
          w.setBlock(cx + dx, g + dy, cz + dz, B.Adobe);
        }
      }
  w.addCollider(cx - r + 1, g, cz - r + 1, cx + r - 1, g + r - 1, cz + r - 2);
}

function stall(w: VoxelWorld, x: number, z: number, goods: "pottery" | "maize" | "cloth") {
  const cx = ix(x);
  const cz = iz(z);
  const g = groundY(w, x, z);
  const hw = 3; // 3 m wide, 2 m deep
  for (const [dx, dz] of [[-hw, -2], [hw, -2], [-hw, 2], [hw, 2]] as const) {
    fill(w, cx + dx, g, cz + dz, cx + dx, g + 4, cz + dz, B.Wood);
    w.addCollider(cx + dx, g, cz + dz, cx + dx, g + 4, cz + dz);
  }
  fill(w, cx - hw - 1, g + 5, cz - 3, cx + hw + 1, g + 5, cz + 3, B.Cloth);
  // Mat with goods.
  fill(w, cx - hw + 1, g, cz - 1, cx + hw - 1, g, cz, goods === "maize" ? B.Maize : goods === "cloth" ? B.Cloth : B.Pottery);
  w.addCollider(cx - hw + 1, g, cz - 1, cx + hw - 1, g, cz);
  if (goods === "pottery") for (let k = -2; k <= 2; k += 2) w.setBlock(cx + k, g + 1, cz, B.Pottery);
}

function fields(w: VoxelWorld, plants: PlantSink) {
  for (const f of FIELDS) {
    const [x0, z0, x1, z1] = f.rect;
    for (let z = iz(z0); z <= iz(z1); z++)
      for (let x = ix(x0); x <= ix(x1); x++) {
        const s = w.surface(x, z);
        if (s.id !== B.Grass && s.id !== B.Earth) continue;
        // Tilled earth between rows.
        w.setBlock(x, s.y - 1, z, B.Earth);
        const row = f.crop === "maize" ? x % 3 === 0 : x % 4 === 0 && z % 4 === 0;
        if (!row) {
          if (f.crop === "maize" && hash2(x, z) < 0.12) plants(x, s.y, z, PL("squash"));
          continue;
        }
        if (f.crop === "maize") {
          if (z % 2 === 0 && hash2(x, z) < 0.9) {
            plants(x, s.y, z, PL("maizeLow"));
            plants(x, s.y + 2, z, PL("maizeTop"));
          }
        } else plants(x, s.y, z, PL("agave"));
      }
  }
}

function patio(w: VoxelWorld, x: number, z: number, sw: number, sd: number) {
  for (let pz = iz(z - sd / 2); pz <= iz(z + sd / 2); pz++)
    for (let px = ix(x - sw / 2); px <= ix(x + sw / 2); px++) {
      const s = w.surface(px, pz);
      if (s.id === B.Grass || s.id === B.Path) w.setBlock(px, s.y - 1, pz, B.Earth);
    }
}

/** (Unused) Old block ladders — ladders are now a separate mesh (world/Ladders.tsx). */
export function blockLadders(w: VoxelWorld) {
  for (const seg of ladderSegments()) {
    const [bx, by, bz] = seg.base;
    const n = Math.round(seg.height / BLOCK);
    for (let k = 0; k < n; k++)
      for (const l of [-0.25, 0.25]) {
        const x = bx + seg.out[0] * 0.25 + seg.along[0] * l;
        const z = bz + seg.out[1] * 0.25 + seg.along[1] * l;
        const y = Math.floor((by - REGION.minY) / BLOCK) + k;
        w.setBlock(ix(x), y, iz(z), B.Ladder);
      }
  }
}

function workshop(w: VoxelWorld) {
  const [x, z] = WORKSHOP;
  const cx = ix(x);
  const cz = iz(z);
  const g = groundY(w, x, z);
  // Rough tuff blocks waiting to be carved, chips on the ground.
  fill(w, cx + 3, g, cz - 2, cx + 6, g + 1, cz, B.Stone);
  w.addCollider(cx + 3, g, cz - 2, cx + 6, g + 1, cz);
  fill(w, cx - 6, g, cz + 2, cx - 4, g + 2, cz + 3, B.Stone);
  w.addCollider(cx - 6, g, cz + 2, cx - 4, g + 2, cz + 3);
  for (let k = 0; k < 14; k++) {
    const px = cx - 5 + Math.floor(hash2(k, 3) * 10);
    const pz = cz - 4 + Math.floor(hash2(3, k) * 8);
    const s = w.surface(px, pz);
    if (s.id === B.Grass) w.setBlock(px, s.y - 1, pz, B.Gravel);
  }
}

/** Archaeological squares: turned earth, corner stakes, string lines, a sieve and a bucket. */
function digSites(w: VoxelWorld) {
  for (const d of DIG_SITES) {
    const cx = ix(d.at[0]);
    const cz = iz(d.at[1]);
    const s = w.surface(cx, cz);
    const g = s.y;
    for (let z = cz - 3; z <= cz + 3; z++)
      for (let x = cx - 3; x <= cx + 3; x++) {
        const edge = Math.abs(x - cx) === 3 || Math.abs(z - cz) === 3;
        w.setBlock(x, g - 1, z, edge ? B.Dirt : B.Earth);
      }
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]] as const) {
      w.setBlock(cx + dx, g, cz + dz, B.Wood);
      w.setBlock(cx + dx, g + 1, cz + dz, B.Wood);
    }
    w.setBlock(cx + 5, g, cz + 1, B.Pottery); // bucket
    w.setBlock(cx + 5, g, cz - 1, B.Gravel); // spoil
    w.setBlock(cx + 6, g, cz - 1, B.Gravel);
  }
}

/** Entrance gate with a striped banner, where the visit begins. */
function gate(w: VoxelWorld) {
  const cx = ix(-147);
  const cz = iz(80.5);
  const s = w.surface(cx, cz);
  for (const dz of [-6, 6]) {
    for (let y = 0; y < 8; y++) w.setBlock(cx, s.y + y, cz + dz, B.Log);
    w.addCollider(cx, s.y, cz + dz, cx, s.y + 7, cz + dz);
  }
  for (let dz = -7; dz <= 7; dz++) {
    w.setBlock(cx, s.y + 8, cz + dz, B.Log);
    if (Math.abs(dz) <= 4) {
      w.setBlock(cx, s.y + 7, cz + dz, B.Cloth);
      w.setBlock(cx, s.y + 6, cz + dz, B.Cloth);
    }
  }
}

export function buildVillage(w: VoxelWorld, plants: PlantSink) {
  digSites(w);
  gate(w);
  for (const hh of HOUSEHOLDS) {
    patio(w, hh.patio[0], hh.patio[1], hh.patio[2], hh.patio[3]);
    for (const h of hh.houses) house(w, h, plants);
  }
  for (const [x, z] of TEMAZCALS) temazcal(w, x, z);
  for (const s of STALLS) stall(w, s.at[0], s.at[1], s.goods);
  fields(w, plants);
  for (const [x, z] of ORCHARD) {
    const s = w.surface(ix(x), iz(z));
    growTree(w, ix(x), s.y, iz(z), "tree", Math.round(x * 7 + z));
  }
  workshop(w);
  void NX;
  void NZ;
}
