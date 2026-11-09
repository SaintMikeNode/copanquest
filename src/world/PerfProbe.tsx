import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/** Shared, mutable render stats (read by the DOM debug overlay). */
export const perfStats = { fps: 0, calls: 0, triangles: 0, dpr: 1 };

export function PerfProbe() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const elapsed = useRef(0);
  useFrame((_, dt) => {
    frames.current++;
    elapsed.current += dt;
    // gl.info is reset every render, so this reads the previous frame's numbers.
    perfStats.calls = gl.info.render.calls;
    perfStats.triangles = gl.info.render.triangles;
    if (elapsed.current >= 0.5) {
      perfStats.fps = Math.round(frames.current / elapsed.current);
      perfStats.dpr = gl.getPixelRatio();
      frames.current = 0;
      elapsed.current = 0;
    }
  });
  return null;
}
