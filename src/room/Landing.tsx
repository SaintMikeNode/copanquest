// Main page: a late-90s Honduran kid's bedroom in a PS2-era style. Space, a click/tap on
// the computer, or the hint button zooms the camera into the CRT; then the game menu appears
// "on the screen" (Menu in CRT mode). Esc / Volver zooms back out. The Copán world itself only
// loads when the player presses Jugar (the game chunk is fetched once they zoom in).
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoomScene, SCREEN } from "./RoomScene";
import { psxLights } from "./psx";
import { Menu } from "../ui/Menu";
import { useT } from "../i18n";
import { useGame } from "../state/useGame";
import { IS_TOUCH } from "../config";
import { play } from "../audio/sound";

/** room → in (camera moves) → screen (menu shown) → leaving (menu fades) → out (camera moves back) → room */
type Phase = "room" | "in" | "screen" | "leaving" | "out";
/** Menu crossfade over the CRT, both ways (matches .crt / .crt-leave in styles.css). */
const FADE_MS = 380;

/** Render height in pixels: PS2-era detail, scaled up smoothly (also keeps phones fast). */
const RENDER_HEIGHT = 720;
const ZOOM_SECONDS = 1.25;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Camera poses: the view from in front of the desk, and right in front of the screen. */
function poses(aspect: number, fov: number) {
  const half = THREE.MathUtils.degToRad(fov / 2);
  // Back off until about this much of the desk wall fits across the view (less on phones).
  const portrait = aspect < 0.9;
  const want = portrait ? 1.9 : 2.6;
  const d = THREE.MathUtils.clamp(want / 2 / (Math.tan(half) * aspect), 1.45, 3.0);
  // Phones: shift right so the window behind the desk stays in the frame.
  const cx = portrait ? 0.42 : 0.1;
  const room = {
    pos: new THREE.Vector3(cx, 1.42, -1.25 + d),
    look: new THREE.Vector3(cx - 0.1, 1.17, -1.25),
  };
  const dh = SCREEN.size[1] / 2 / Math.tan(half) / 0.94;
  const dw = SCREEN.size[0] / 2 / (Math.tan(half) * aspect) / 0.96;
  const screen = {
    pos: SCREEN.center.clone().add(new THREE.Vector3(0, 0, Math.max(dh, dw) + 0.015)),
    look: SCREEN.center.clone(),
  };
  return { room, screen };
}

const SCREEN_GLOW = psxLights.uScreenColor.value.clone();

function CameraRig({ phase, on, onArrive, power, boost }: { phase: Phase; on: boolean; onArrive: (p: Phase) => void; power: { current: number }; boost: { current: number } }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const t = useRef(phase === "screen" ? 1 : 0);
  const look = useMemo(() => new THREE.Vector3(), []);
  const sway = useRef(0);
  useEffect(() => {
    // Nothing moves while the menu covers the screen: stop rendering.
    setFrameloop(phase === "screen" ? "never" : "always");
  }, [phase, setFrameloop]);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    // The screen powers up once when the page appears.
    power.current = on ? Math.min(1, power.current + d * 1.1) : 0;
    psxLights.uScreenColor.value.copy(SCREEN_GLOW).multiplyScalar(power.current);
    const target = phase === "in" || phase === "screen" || phase === "leaving" ? 1 : 0;
    const before = t.current;
    t.current = THREE.MathUtils.clamp(t.current + (target ? d : -d) / ZOOM_SECONDS, 0, 1);
    if (phase === "in" && before < 1 && t.current >= 1) onArrive("screen");
    if (phase === "out" && before > 0 && t.current <= 0) onArrive("room");
    const k = ease(t.current);
    boost.current = k;
    const { room, screen } = poses(size.width / size.height, camera.fov);
    // A gentle idle sway in the room view.
    sway.current += d;
    const s = (1 - k) * 0.025;
    camera.position.lerpVectors(room.pos, screen.pos, k);
    camera.position.x += Math.sin(sway.current * 0.4) * s;
    camera.position.y += Math.sin(sway.current * 0.6) * s * 0.5;
    look.lerpVectors(room.look, screen.look, k);
    camera.lookAt(look);
  });
  return null;
}

/** Keeps the PSX snap grid matched to the render resolution. */
function SnapGrid() {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  useEffect(() => {
    psxLights.uSnap.value.set((size.width * dpr) / 2, (size.height * dpr) / 2);
  }, [size, dpr]);
  return null;
}

const Scene = memo(function Scene({
  phase,
  on,
  onArrive,
  onMonitor,
  prompt,
  hover,
}: {
  phase: Phase;
  on: boolean;
  onArrive: (p: Phase) => void;
  onMonitor: () => void;
  prompt: string;
  hover: (on: boolean) => void;
}) {
  const power = useRef(0);
  const boost = useRef(0);
  return (
    <>
      <color attach="background" args={["#140c08"]} />
      <CameraRig phase={phase} on={on} onArrive={onArrive} power={power} boost={boost} />
      <SnapGrid />
      <RoomScene onMonitor={onMonitor} prompt={prompt} power={power} boost={boost} hover={hover} />
    </>
  );
});

export default function Landing({ onIntent }: { onIntent: () => void }) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("room");
  // The computer is on from the start (its screen powers up as the page appears).
  const on = true;
  const [webgl] = useState(hasWebGL);
  const [pointer, setPointer] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const dpr = useMemo(() => Math.min(1, Math.max(0.25, RENDER_HEIGHT / window.innerHeight)), []);

  const zoomIn = useCallback(() => {
    if (phaseRef.current !== "room" && phaseRef.current !== "out") return;
    onIntent(); // start downloading the game while the camera moves
    play("lens");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setPhase(reduce ? "screen" : "in");
  }, [onIntent]);
  const leaveTimer = useRef(0);
  const zoomOut = useCallback(() => {
    if (phaseRef.current !== "screen") return;
    play("close");
    // Fade the menu out over the 3D screen first, then pull the camera back.
    setPhase("leaving");
    leaveTimer.current = window.setTimeout(() => setPhase("out"), FADE_MS);
  }, []);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useGame.getState().overlay) return; // help/credits windows handle their own keys
      if (e.code === "Space" || e.code === "Enter") {
        if (phaseRef.current === "room") {
          e.preventDefault();
          zoomIn();
        }
      } else if (e.code === "Escape" || e.code === "Backspace") {
        if (phaseRef.current === "screen") zoomOut();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut]);

  // No WebGL: just the menu.
  if (!webgl) return <Menu />;

  const prompt = IS_TOUCH ? t("room.tap") : t("room.press");
  return (
    <div className={`landing landing-${phase}`} style={{ cursor: pointer && phase === "room" ? "pointer" : undefined }}>
      <Canvas
        className="landing-canvas"
        dpr={dpr}
        camera={{ fov: 55, near: 0.02, far: 30 }}
        gl={{ antialias: true, powerPreference: "low-power" }}
        onPointerMissed={() => {
          // On phones any tap that isn't on the monitor still opens the computer.
          if (IS_TOUCH) zoomIn();
        }}
      >
        <Scene phase={phase} on={on} onArrive={setPhase} onMonitor={zoomIn} prompt={prompt} hover={setPointer} />
      </Canvas>
      {(phase === "room" || phase === "out") && (
        <button className="landing-hint pill" onClick={zoomIn}>
          {IS_TOUCH ? "👆" : <kbd>{t("room.key")}</kbd>} {t("room.hint")}
        </button>
      )}
      {(phase === "screen" || phase === "leaving") && (
        <div className={phase === "leaving" ? "crt-wrap crt-leave" : "crt-wrap"}>
          <Menu crt onBack={zoomOut} />
        </div>
      )}
    </div>
  );
}
