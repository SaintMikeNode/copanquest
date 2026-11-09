import { use, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createBlockTextures, createPlantTextures } from "./textures";
import { createBlockMaterial, createPlantMaterial, shared } from "./material";
import { VARIANTS } from "./blocks";
import type { MeshData } from "./mesher";
import type { PlantGroup } from "./voxel.worker";
import { regionStore, voxelPromise, voxelStats } from "./voxelStream";
import { useQualityLevel } from "../state/useGame";

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
  const far = useMemo(() => data.far.map(toGeometry), [data]);
  // Near-field regions stream in (nearest first); geometries are cached per region.
  const count = useSyncExternalStore(regionStore.subscribe, regionStore.getSnapshot);
  const nearCache = useRef<THREE.BufferGeometry[]>([]);
  const near = useMemo(() => {
    const all = regionStore.get();
    for (let i = nearCache.current.length; i < all.length; i++) nearCache.current.push(toGeometry(all[i]));
    return nearCache.current.slice(0, count);
  }, [count]);

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

export { voxelStats, voxelPromise };
