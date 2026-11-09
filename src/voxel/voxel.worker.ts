// Builds and meshes the voxel world off the main thread.
import { buildGreybox } from "../world/buildGreybox";
import type { TerrainGrid } from "../world/terrainData";
import { VoxelWorld } from "./voxelWorld";
import { meshFarTerrain, meshVoxelWorld, type MeshData } from "./mesher";
import { paintPaths, plantBushes, plantTrees, scatterPlants } from "./decorate";

export interface VoxelRequest {
  grid: TerrainGrid;
  farExtent: number;
}
export interface PlantGroup {
  data: Float32Array;
  center: [number, number];
}
export interface VoxelResponse {
  near: MeshData[];
  far: MeshData[];
  plants: PlantGroup[];
  stats: { ms: number; triangles: number; nearTriangles: number; shapes: number };
}

self.onmessage = (e: MessageEvent<VoxelRequest>) => {
  const t0 = performance.now();
  const { grid, farExtent } = e.data;
  const world = new VoxelWorld(grid);
  const t1 = performance.now();
  const { shapes } = buildGreybox();
  for (const s of shapes) world.addShape(s);
  paintPaths(world);
  plantTrees(world);
  plantBushes(world);
  const plants = scatterPlants(world);
  const t2 = performance.now();
  const near = meshVoxelWorld(world);
  const t3 = performance.now();
  const far = meshFarTerrain(grid, world, farExtent);
  const t4 = performance.now();
  console.log(
    `[voxels] ground ${Math.round(t1 - t0)} ms, shapes+trees+plants ${Math.round(t2 - t1)} ms (${plants.reduce((n, p) => n + p.data.length / 4, 0)} plants), near mesh ${Math.round(t3 - t2)} ms, far mesh ${Math.round(t4 - t3)} ms`,
  );
  const all = [...near, ...far];
  const triangles = all.reduce((n, m) => n + m.index.length / 3, 0);
  const transfer = [
    ...all.flatMap((m) => [m.position.buffer, m.normal.buffer, m.uv.buffer, m.vdata.buffer, m.index.buffer]),
    ...plants.map((p) => p.data.buffer),
  ];
  const nearTriangles = near.reduce((n, m) => n + m.index.length / 3, 0);
  const res: VoxelResponse = {
    near,
    far,
    plants,
    stats: { ms: Math.round(performance.now() - t0), triangles, nearTriangles, shapes: shapes.length },
  };
  (self as unknown as Worker).postMessage(res, transfer);
};
