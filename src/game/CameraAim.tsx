import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { subjectPositions } from "./subjects";
import { useCamera } from "./camera";
import { playerState } from "../player/playerState";

/** Finds the best photo subject in the viewfinder (5×/s). Must be inside <Physics>. */
export function CameraAim() {
  const { world, rapier } = useRapier();
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }), [rapier]);
  const v = useMemo(() => new THREE.Vector3(), []);
  const t = useRef(0);
  useFrame(({ camera }, dt) => {
    const cam = useCamera.getState();
    if (!cam.active) return;
    t.current += dt;
    if (t.current < 0.2) return;
    t.current = 0;
    const range = cam.zoom ? 90 : 45;
    let best: string | null = null;
    let bestScore = Infinity;
    for (const { id, pos } of subjectPositions.values()) {
      const d = camera.position.distanceTo(pos);
      if (d > range || d < 0.8) continue;
      v.copy(pos).project(camera);
      if (v.z > 1 || Math.abs(v.x) > 0.4 || Math.abs(v.y) > 0.45) continue;
      // Something in the way?
      const dir = v.copy(pos).sub(camera.position).normalize();
      ray.origin = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
      ray.dir = { x: dir.x, y: dir.y, z: dir.z };
      const hit = world.castRay(ray, d, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, playerState.body ?? undefined);
      if (hit && hit.timeOfImpact < d - 2.5) continue;
      const proj = v.copy(pos).project(camera);
      const score = Math.hypot(proj.x, proj.y) * 40 + d * 0.3;
      if (score < bestScore) {
        bestScore = score;
        best = id;
      }
    }
    cam.setAim(best);
  });
  return null;
}
