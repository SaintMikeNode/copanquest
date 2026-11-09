import { use, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createBlockTextures, createPlantTextures } from "./textures";
import { createBlockMaterial, createPlantMaterial, shared } from "./material";
import { VARIANTS } from "./blocks";
import type { MeshData } from "./mesher";
import type { PlantGroup, VoxelRequest, VoxelResponse } from "./voxel.worker";
import { terrainPromise } from "../world/Terrain";
import { useQualityLevel } from "../state/useGame";
import { IS_TOUCH } from "../config";

/** Stats from the last build (shown in the debug panel). */
export const voxelStats = { ms: 0, triangles: 0, nearTriangles: 0, plants: 0 };

const voxelPromise: Promise<VoxelResponse> = terrainPromise.then(
  (grid) =>
    new Promise((resolve, reject) => {
      const worker = new Worker(new URL("./voxel.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (e: MessageEvent<VoxelResponse>) => {
        resolve(e.data);
        worker.terminate();
      };
      worker.onerror = (e) => reject(e);
      const req: VoxelRequest = {
        grid: { size: grid.size, spacing: grid.spacing, heights: grid.heights.slice() },
        // Phones get a smaller distant ring (fog hides the edge).
        farExtent: IS_TOUCH ? 800 : 1000,
      };
      worker.postMessage(req);
    }),
);

function toGeometry(m: MeshData) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(m.position, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(m.normal, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(m.uv, 2));
  g.setAttribute("vdata", new THREE.BufferAttribute(m.vdata, 2));
  g.setIndex(new THREE.BufferAttribute(m.index, 1));
  const [x0, y0, z0, x1, y1, z1] = m.bounds;
  g.boundingBox = new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
  g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
  return g;
}

/** Two crossed 0.5 × 1 m quads, base at y = 0. */
function plantGeometry(group: PlantGroup) {
  const p = [-0.25, 0, 0, 0.25, 0, 0, 0.25, 1, 0, -0.25, 1, 0, 0, 0, -0.25, 0, 0, 0.25, 0, 1, 0.25, 0, 1, -0.25];
  const uv = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  g.setAttribute("inst", new THREE.InstancedBufferAttribute(group.data, 4));
  g.instanceCount = group.data.length / 4;
  const [cx, cz] = group.center;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 6, cz), 48);
  return g;
}

function Plants({ groups }: { groups: PlantGroup[] }) {
  const level = useQualityLevel();
  const material = useMemo(() => createPlantMaterial(createPlantTextures()), []);
  const geos = useMemo(() => groups.map(plantGeometry), [groups]);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const drawDistance = level === "low" ? 45 : 75;
  useFrame(({ camera }) => {
    material.uniforms.viewerPos.value.copy(camera.position);
    material.uniforms.drawDistance.value = drawDistance;
    // Skip whole groups that are out of range.
    geos.forEach((g, i) => {
      const m = meshes.current[i];
      if (!m) return;
      const c = g.boundingSphere!.center;
      m.visible = Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < drawDistance + 46;
    });
  });
  return (
    <>
      {geos.map((g, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={g}
          material={material}
          receiveShadow
        />
      ))}
    </>
  );
}

/** Block-built site (0.5 m voxels), trees, plants and blocky distant hills, built in a Web Worker. */
export function VoxelTerrain() {
  const data = use(voxelPromise);
  const level = useQualityLevel();
  const material = useMemo(() => createBlockMaterial(createBlockTextures(), VARIANTS), []);
  const near = useMemo(() => data.near.map(toGeometry), [data]);
  const far = useMemo(() => data.far.map(toGeometry), [data]);

  useEffect(() => {
    voxelStats.ms = data.stats.ms;
    voxelStats.triangles = data.stats.triangles;
    voxelStats.nearTriangles = data.stats.nearTriangles;
    voxelStats.plants = data.plants.reduce((n, p) => n + p.data.length / 4, 0);
  }, [data]);

  useEffect(() => {
    shared.fogNear.value = level === "low" ? 160 : 220;
    shared.fogFar.value = level === "low" ? 620 : 1000;
  }, [level]);

  useFrame((_, dt) => {
    shared.time.value += dt;
  });

  return (
    <group>
      {near.map((g, i) => (
        <mesh key={`n${i}`} geometry={g} material={material} castShadow receiveShadow />
      ))}
      {far.map((g, i) => (
        <mesh key={`f${i}`} geometry={g} material={material} receiveShadow />
      ))}
      <Plants groups={data.plants} />
    </group>
  );
}
