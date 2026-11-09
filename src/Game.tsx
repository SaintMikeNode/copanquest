import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, PerformanceMonitor } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { keyboardMap } from "./player/controls";
import { Player } from "./player/Player";
import { TerrainCollider } from "./world/Terrain";
import { SiteColliders } from "./world/Greybox";
import { VoxelTerrain } from "./voxel/VoxelTerrain";
import { Monuments } from "./world/Monuments";
import { Macaws } from "./world/Macaws";
import { Boundary } from "./world/Boundary";
import { Environment } from "./world/Environment";
import { PerfProbe } from "./world/PerfProbe";
import { PoiTracker } from "./poi/PoiTracker";
import { PoiMarkers } from "./poi/PoiMarkers";
import { useGame, useQualityLevel } from "./state/useGame";
import { Hud } from "./ui/Hud";

export default function Game() {
  const mountedAt = useMemo(() => performance.now(), []);
  const level = useQualityLevel();
  const physicsDebug = useGame((s) => s.physicsDebug);
  const setAutoLevel = useGame((s) => s.setAutoLevel);

  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas
        className="game-canvas"
        flat
        shadows
        dpr={level === "low" ? [0.75, 1] : [1, 1.5]}
        gl={{ antialias: level !== "low", powerPreference: "high-performance" }}
        camera={{ fov: 60, near: 0.2, far: level === "low" ? 1000 : 1800, position: [0, 6, 30] }}
      >
        <PerformanceMonitor
          // Ignore the first seconds (shader compile + level load hitch).
          ms={500}
          iterations={6}
          flipflops={4}
          bounds={(refresh) => [Math.min(40, refresh * 0.7), Math.min(57, refresh * 0.95)]}
          onDecline={() => performance.now() - mountedAt > 4000 && setAutoLevel("low")}
          onIncline={() => setAutoLevel("high")}
          onFallback={() => setAutoLevel("low")}
        />
        <Environment />
        <Suspense fallback={null}>
          <Physics debug={physicsDebug} timeStep={1 / 60} interpolate>
            <TerrainCollider />
            <SiteColliders />
            <Boundary />
            <Player />
          </Physics>
          <VoxelTerrain />
          <Monuments />
          <Macaws />
          <PoiMarkers />
          <PoiTracker />
        </Suspense>
        <PerfProbe />
      </Canvas>
      <Hud />
    </KeyboardControls>
  );
}
