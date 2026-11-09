// Builds the voxel world off the main thread and streams it back:
//   1. "base": colliders, plant sprites and the distant hills (fast)
//   2. "region" × N: near-field meshes, nearest to the player first
//   3. "done": stats
import { buildGreybox } from "../world/buildGreybox";
import type { TerrainGrid } from "../world/terrainData";
import { VoxelWorld } from "./voxelWorld";
import { meshFarTerrain, meshVoxelWorld, type MeshData } from "./mesher";
import { paintPaths, placeBenches, plantBushes, plantTrees, scatterFragments, scatterPlants } from "./decorate";
import { buildVillage } from "./village";

export interface VoxelRequest {
  grid: TerrainGrid;
  farExtent: number;
  origin: [number, number];
}
export interface PlantGroup {
  data: Float32Array;
  center: [number, number];
}
export interface VoxelBase {
  far: MeshData[];
  plants: PlantGroup[];
  /** Decoration colliders [x, y, z, hx, hy, hz]… (trees, bushes, village). */
  colliders: Float32Array;
}
export type VoxelMessage =
  | { type: "base"; base: VoxelBase }
  | { type: "region"; mesh: MeshData }
  | { type: "progress"; done: number; total: number }
  /** Everything within READY_RADIUS of the player is meshed: safe to show the world. */
  | { type: "ready" }
  | { type: "done"; stats: { ms: number; triangles: number; nearTriangles: number; shapes: number } };

const READY_RADIUS = 150;

const buffers = (m: MeshData) => [m.position.buffer, m.normal.buffer, m.uv.buffer, m.vdata.buffer, m.index.buffer];
const post = (msg: VoxelMessage, transfer: ArrayBufferLike[]) =>
  (self as unknown as Worker).postMessage(msg, transfer as Transferable[]);

self.onmessage = (e: MessageEvent<VoxelRequest>) => {
  const t0 = performance.now();
  const { grid, farExtent, origin } = e.data;
  const world = new VoxelWorld(grid);
  const { shapes } = buildGreybox();
  for (const s of shapes) world.addShape(s);
  paintPaths(world);
  const crops: [number, number, number, number][] = [];
  buildVillage(world, (x, y, z, p) => crops.push([x, y, z, p]));
  plantTrees(world);
  plantBushes(world);
  scatterFragments(world);
  placeBenches(world);
  const plants = scatterPlants(world, crops);
  const far = meshFarTerrain(grid, world, farExtent);
  const colliders = new Float32Array(world.colliders);
  let triangles = far.reduce((n, m) => n + m.index.length / 3, 0);
  post({ type: "base", base: { far, plants, colliders } }, [
    ...far.flatMap(buffers),
    ...plants.map((p) => p.data.buffer),
    colliders.buffer,
  ]);
  let nearTriangles = 0;
  let ready = false;
  meshVoxelWorld(
    world,
    (mesh) => {
      nearTriangles += mesh.index.length / 3;
      post({ type: "region", mesh }, buffers(mesh));
    },
    origin,
    4,
    (done, total, distance) => {
      if (!ready && distance > READY_RADIUS) {
        ready = true;
        post({ type: "ready" }, []);
      }
      post({ type: "progress", done, total }, []);
    },
  );
  if (!ready) post({ type: "ready" }, []);
  triangles += nearTriangles;
  post({ type: "done", stats: { ms: Math.round(performance.now() - t0), triangles, nearTriangles, shapes: shapes.length } }, []);
};
