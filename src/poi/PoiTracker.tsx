import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { POIS } from "./poiData";
import { playerState } from "../player/playerState";
import { useGame } from "../state/useGame";

/** Finds the nearest point of interest in range (5×/s) and stores it. */
export function PoiTracker() {
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (t.current < 0.2) return;
    t.current = 0;
    const p = playerState.position;
    let best: string | null = null;
    let bestD = Infinity;
    for (const poi of POIS) {
      const dx = p.x - poi.position[0];
      const dz = p.z - poi.position[1];
      const dy = p.y - (poi.y ?? 0);
      const d = Math.hypot(dx, dz);
      if (d < poi.radius && Math.abs(dy) < 8 && d < bestD) {
        best = poi.id;
        bestD = d;
      }
    }
    useGame.getState().setActivePoi(best);
  });
  return null;
}
