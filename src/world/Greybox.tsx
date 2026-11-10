import { use, useMemo } from "react";
import { voxelPromise } from "../voxel/VoxelTerrain";
import { ConvexHullCollider, CuboidCollider, RigidBody } from "@react-three/rapier";
import { buildGreybox } from "./buildGreybox";
import { DECO_GROUPS } from "./groups";

/** Invisible colliders for the site: boxes for platforms and monuments, wedges for stairs. */
export function SiteColliders() {
  const g = useMemo(buildGreybox, []);
  const voxels = use(voxelPromise);
  const deco = useMemo(() => {
    const c = voxels.colliders;
    const out: { p: [number, number, number]; h: [number, number, number] }[] = [];
    for (let i = 0; i < c.length; i += 6) out.push({ p: [c[i], c[i + 1], c[i + 2]], h: [c[i + 3], c[i + 4], c[i + 5]] });
    return out;
  }, [voxels]);
  return (
    <RigidBody type="fixed" colliders={false}>
      {g.cuboids.map((c, i) => (
        <CuboidCollider key={`c${i}`} args={c.halfExtents} position={c.position} rotation={c.rotation} />
      ))}
      {deco.map((d, i) => (
        <CuboidCollider key={`d${i}`} args={d.h} position={d.p} collisionGroups={DECO_GROUPS} />
      ))}
      {g.ramps.map((pts, i) => (
        <ConvexHullCollider key={`r${i}`} args={[pts]} />
      ))}
    </RigidBody>
  );
}
