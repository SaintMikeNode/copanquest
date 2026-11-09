import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import { LoadingScreen } from "./ui/LoadingScreen";
import { loadStore } from "./voxel/voxelStream";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, PerformanceMonitor } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { keyboardMap } from "./player/controls";
import { Player } from "./player/Player";
import { TerrainCollider } from "./world/Terrain";
import { SiteColliders } from "./world/Greybox";
import { VoxelTerrain } from "./voxel/VoxelTerrain";
import { Rosalila } from "./world/Rosalila";
import { Fence } from "./world/Fence";
import { Monuments } from "./world/Monuments";
import { Macaws } from "./world/Macaws";
import { Background } from "./world/Background";
import { Ambient } from "./world/Ambient";
import { Torches } from "./world/Torches";
import { Smoke } from "./world/Smoke";
import { Ladders } from "./world/LadderMeshes";
import { tickDay } from "./game/time";
import { tickLens, useLens } from "./game/lens";
import { dayClock } from "./game/time";
import { DEV_TOOLS } from "./config";
import { CameraAim } from "./game/CameraAim";
import { Animals, BallGame, DigTracker, Pickups } from "./game/WorldGame";
import { DigEffects } from "./game/DigEffects";
import { People } from "./npc/People";
import { Jades } from "./poi/Jades";
import { Boundary } from "./world/Boundary";
import { Environment } from "./world/Environment";
import { PerfProbe } from "./world/PerfProbe";
import { PoiTracker } from "./poi/PoiTracker";
import { PoiMarkers } from "./poi/PoiMarkers";
import { useGame, useQualityLevel } from "./state/useGame";
import { Hud } from "./ui/Hud";

function DayTicker() {
  useEffect(() => {
    if (!DEV_TOOLS) return;
    // Dev helpers: cqTime(0..1) sets the time of day, cqLens(true) toggles the time lens.
    const w = window as unknown as { cqTime?: (t: number) => void; cqLens?: (on: boolean) => void };
    w.cqTime = (t) => void (dayClock.t = t);
    w.cqLens = (on) => useLens.setState({ on });
  }, []);
  useFrame((_, dt) => {
    tickDay(Math.min(dt, 0.1));
    tickLens(Math.min(dt, 0.1));
  });
  return null;
}

/** Calls onVisible after the world has rendered a few frames (shaders compiled, regions uploaded). */
function FirstFrames({ ready, onVisible }: { ready: boolean; onVisible: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    if (!ready || frames.current < 0) return;
    if (++frames.current > 4) {
      frames.current = -1;
      onVisible();
    }
  });
  return null;
}

export default function Game() {
  const progress = useSyncExternalStore(loadStore.subscribe, loadStore.getProgress);
  const ready = useSyncExternalStore(loadStore.subscribe, loadStore.getReady);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ready) setVisible(false);
  }, [ready]);
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
        <DayTicker />
        <Environment />
        <Suspense fallback={null}>
          <Background />
        </Suspense>
        <Suspense fallback={null}>
          <Physics debug={physicsDebug} timeStep={1 / 60} interpolate>
            <TerrainCollider />
            <SiteColliders />
            <Boundary />
            <Player />
            <People />
            <CameraAim />
            <Pickups />
            <Animals />
            <DigTracker />
            <DigEffects />
            <BallGame />
          </Physics>
          <VoxelTerrain />
          <Monuments />
          <Rosalila />
          <Fence />
          <Macaws />
          <Jades />
          <Ambient />
          <Torches />
          <Smoke />
          <Ladders />
          <PoiMarkers />
          <PoiTracker />
        </Suspense>
        <PerfProbe />
        <Suspense fallback={null}>
          <FirstFrames ready={ready} onVisible={() => setVisible(true)} />
        </Suspense>
      </Canvas>
      <LoadingScreen progress={visible ? 1 : progress} done={visible} />
      <Hud />
    </KeyboardControls>
  );
}
