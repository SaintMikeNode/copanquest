import { useMemo } from "react";
import { ConvexHullCollider, CuboidCollider, RigidBody } from "@react-three/rapier";
import { buildGreybox } from "./buildGreybox";

/** Invisible colliders for the site: boxes for platforms and monuments, wedges for stairs. */
export function SiteColliders() {
  const g = useMemo(buildGreybox, []);
  return (
    <RigidBody type="fixed" colliders={false}>
      {g.cuboids.map((c, i) => (
        <CuboidCollider key={`c${i}`} args={c.halfExtents} position={c.position} rotation={c.rotation} />
      ))}
      {g.ramps.map((pts, i) => (
        <ConvexHullCollider key={`r${i}`} args={[pts]} />
      ))}
    </RigidBody>
  );
}
