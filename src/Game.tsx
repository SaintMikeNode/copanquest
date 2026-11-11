import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Director } from "./dev/Director";
import { useFrame, useThree } from "@react-three/fiber";
import { LoadingScreen } from "./ui/LoadingScreen";
import { loadStore } from "./voxel/voxelStream";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, PerformanceMonitor } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { keyboardMap } from "./player/controls";
import { Player } from "./player/Player";
import { Buggy } from "./vehicle/Buggy";
import { playerState } from "./player/playerState";
import { TerrainCollider } from "./world/Terrain";
import { SiteColliders } from "./world/Greybox";
import { VoxelTerrain } from "./voxel/VoxelTerrain";
import { Rosalila } from "./world/Rosalila";
import { Fence } from "./world/Fence";
import { Monuments } from "./world/Monuments";
import { Macaws, PerchedMacaws } from "./world/Macaws";
import { Monkeys } from "./world/Monkeys";
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
import { Jeep } from "./world/Jeep";
import { JaguarStatues } from "./world/JaguarStatues";
import { JaguarStairMask } from "./world/JaguarStairMask";
import { AltarQRite } from "./world/AltarQRite";
import { Environment } from "./world/Environment";
import { PerfProbe } from "./world/PerfProbe";
import { PoiTracker } from "./poi/PoiTracker";
import { PoiMarkers } from "./poi/PoiMarkers";
import { Glows } from "./game/Glow";
import { DigMarkers } from "./game/DigMarkers";
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

/** The pause menu freezes the whole world: no rendering, physics, people or clocks. */
function PauseLoop() {
  const paused = useGame((s) => s.overlay === "pause");
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    // setFrameloop restarts R3F's clock, so resuming doesn't produce one huge frame.
    setFrameloop(paused ? "never" : "always");
  }, [paused, setFrameloop]);
  return null;
}

/**
 * Calls onVisible (which fades the loading screen out) once the world is really on screen.
 * It sits last inside the world's Suspense boundary, so it only starts when the terrain, the
 * voxels and the physics engine have all arrived: counting frames from outside that boundary
 * released the loading screen over an empty canvas (only the page's green behind it).
 * Then: the player stands on the ground, every shader is compiled without blocking
 * (compileAsync), and a few frames have been drawn, so the slow first frames (shader and
 * geometry upload) stay hidden behind the loading screen.
 */
function WorldReady({ ready, onVisible }: { ready: boolean; onVisible: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  // 0 = waiting for the player to land, 1 = compiling shaders, 2 = drawing frames, 3 = shown.
  const stage = useRef(0);
  const frames = useRef(0);
  const since = useRef(0);
  useFrame(() => {
    if (!ready || stage.current === 1 || stage.current === 3) return;
    if (stage.current === 0) {
      const now = performance.now();
      since.current ||= now;
      // A few frames for React to mount the last region meshes; never wait for the landing
      // longer than 4 s.
      if (++frames.current < 3 || (!playerState.grounded && now - since.current < 4000)) return;
      stage.current = 1;
      frames.current = 0;
      const drawn = () => void (stage.current = 2);
      gl.compileAsync(scene, camera).then(drawn, drawn);
      return;
    }
    // useFrame runs before the frame is drawn: the 5th call means 4 frames are on screen.
    if (++frames.current > 4) {
      stage.current = 3;
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
        <PauseLoop />
        <Environment />
        <Suspense fallback={null}>
          <Background />
        </Suspense>
        <Suspense fallback={null}>
          <Physics debug={physicsDebug} timeStep={1 / 60} interpolate>
            <TerrainCollider />
            <SiteColliders />
            <Boundary />
            {/* Own boundary: Jeep waits for the terrain, and suspending the whole Physics tree breaks Rapier. */}
            <Suspense fallback={null}>
              <Jeep />
            </Suspense>
            <JaguarStatues />
            <JaguarStairMask />
            <AltarQRite />
            <Player />
            <Buggy />
            {/* Filming toolkit (window.cqDirector): dev server only, not in the public build. */}
            {import.meta.env.DEV && <Director />}
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
          <PerchedMacaws />
          <Monkeys />
          <Jades />
          <Ambient />
          <Torches />
          <Smoke />
          <Ladders />
          <PoiMarkers />
          <Glows />
          <DigMarkers />
          <PoiTracker />
          <WorldReady ready={ready} onVisible={() => setVisible(true)} />
        </Suspense>
        <PerfProbe />
      </Canvas>
      <LoadingScreen progress={visible ? 1 : progress} done={visible} />
      <Hud />
    </KeyboardControls>
  );
}
