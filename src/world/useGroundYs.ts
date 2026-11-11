// Height of the fixed colliders' top surface under a few points, found once the colliders exist
// (court floors, steps and platforms aren't flat numbers once rasterized to blocks). Used to
// stand sculptures and props on whatever is really there.
import { useEffect, useState } from "react";
import { useRapier } from "@react-three/rapier";

/** Ground height under each [x, z], cast down from `fromY`; null until every ray hits. */
export function useGroundYs(points: [number, number][], fromY: number): number[] | null {
  const { world, rapier } = useRapier();
  const [ys, setYs] = useState<number[] | null>(null);
  useEffect(() => {
    let raf = 0;
    const ray = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
    const flags = rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_KINEMATIC | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC;
    const find = () => {
      const out: number[] = [];
      for (const [x, z] of points) {
        ray.origin = { x, y: fromY, z };
        const hit = world.castRay(ray, 40, true, flags);
        if (!hit) {
          raf = requestAnimationFrame(find);
          return;
        }
        out.push(fromY - hit.timeOfImpact);
      }
      setYs(out);
    };
    raf = requestAnimationFrame(find);
    return () => cancelAnimationFrame(raf);
    // The points are module constants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, rapier]);
  return ys;
}
