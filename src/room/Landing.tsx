// Main page: a late-90s Honduran kid's bedroom in a PS2-era style. Space, a click/tap on
// the computer, or the hint button zooms the camera into the CRT; then the game menu appears
// "on the screen" (Menu in CRT mode). Esc / Volver zooms back out. The Copán world itself only
// loads when the player presses Jugar (the game chunk is fetched once they zoom in).
// The book on the desk works the same way (C, a click on it or the Créditos button): the
// camera flies down to it while its cover opens, then the credits book appears over it.
// The CD next to the monitor (A, a click on it or the Acerca de button) goes into the computer's
// CD tray, then the camera zooms into the screen and the "how it was made" video plays there
// (AboutVideo.tsx; nothing is downloaded before that click). ES / EN switch: top right.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoomScene, SCREEN } from "./RoomScene";
import { BOOK_FOCUS } from "./CreditsBookModel";
import { psxLights } from "./psx";
import { Menu } from "../ui/Menu";
import { useT } from "../i18n";
import { useGame } from "../state/useGame";
import { IS_TOUCH } from "../config";
import { play, useRecord, useSound } from "../audio/sound";
import { RecordBox } from "./RecordBox";
import { CreditsBook } from "./CreditsBook";
import { Presence } from "../ui/presence";
import { setResume, takeResume } from "../staleReload";
import { AboutVideo, prepareVideo } from "./AboutVideo";
import { LangToggle } from "../ui/LangToggle";

/**
 * room → in (camera moves) → screen (menu shown) → leaving (menu fades) → out (camera moves back) → room.
 * For the video, "insert" (the CD goes into the computer, camera still) comes before "in".
 */
type Phase = "room" | "insert" | "in" | "screen" | "leaving" | "out";
/** What the camera zooms to: the computer's screen (menu or video) or the book on the desk. */
type Focus = "screen" | "book" | "video";
/** How long the CD takes to go into the computer (and back out). */
const CD_SECONDS = 1.5;
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
  // Phones: centered on the computer, wide enough to show the book (left) and the record
  // player (right) too (a wider lens in portrait, see PORTRAIT_FOV).
  const cx = portrait ? -0.05 : 0.1;
  // Very wide screens (phones held sideways): aim a little lower so the desk sits higher in the
  // frame, above the buttons at the bottom.
  const wide = aspect > 1.75 ? 1 : 0;
  const room = {
    pos: new THREE.Vector3(cx, 1.42 - wide * 0.04, -1.25 + d),
    look: new THREE.Vector3(portrait ? cx : cx - 0.1, 1.17 - wide * 0.16, -1.25),
  };
  const dh = SCREEN.size[1] / 2 / Math.tan(half) / 0.94;
  const dw = SCREEN.size[0] / 2 / (Math.tan(half) * aspect) / 0.96;
  const screen = {
    pos: SCREEN.center.clone().add(new THREE.Vector3(0, 0, Math.max(dh, dw) + 0.015)),
    look: SCREEN.center.clone(),
  };
  // Above the open book, looking down at the spine from the front, the two pages filling the view.
  const bw = (portrait ? 0.42 : 0.6) / 2 / (Math.tan(half) * aspect);
  const bh = 0.36 / 2 / Math.tan(half);
  const bd = Math.max(bw, bh, 0.3);
  const book = {
    pos: BOOK_FOCUS.clone().add(new THREE.Vector3(0, 0.82, 0.57).multiplyScalar(bd)),
    look: BOOK_FOCUS.clone(),
  };
  return { room, screen, book };
}

const SCREEN_GLOW = psxLights.uScreenColor.value.clone();
/** Lens: a little wider in portrait (phones), so the whole desk fits across. */
const FOV = 55;
const PORTRAIT_FOV = 64;

function CameraRig({
  phase,
  focus,
  on,
  onArrive,
  power,
  boost,
  bookOpen,
  cd,
}: {
  phase: Phase;
  focus: Focus;
  on: boolean;
  onArrive: (p: Phase) => void;
  power: { current: number };
  boost: { current: number };
  bookOpen: { current: number };
  cd: { current: number };
}) {
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
    // The CD goes in first (the camera waits), and comes back out while the camera pulls back.
    const watching = focus === "video" && (phase === "insert" || phase === "in" || phase === "screen" || phase === "leaving");
    cd.current = THREE.MathUtils.clamp(cd.current + (watching ? d : -d) / CD_SECONDS, 0, 1);
    if (phase === "insert" && cd.current >= 1) onArrive("in");
    const target = phase === "in" || phase === "screen" || phase === "leaving" ? 1 : 0;
    const before = t.current;
    t.current = THREE.MathUtils.clamp(t.current + (target ? d : -d) / ZOOM_SECONDS, 0, 1);
    if (phase === "in" && before < 1 && t.current >= 1) onArrive("screen");
    if (phase === "out" && before > 0 && t.current <= 0) onArrive("room");
    const k = ease(t.current);
    // The CRT's zoom glow only for the screen; the book's cover opens over the second half.
    boost.current = focus === "book" ? 0 : k;
    bookOpen.current = focus === "book" ? THREE.MathUtils.smoothstep(t.current, 0.45, 0.95) : 0;
    const aspect = size.width / size.height;
    const fov = aspect < 0.9 ? PORTRAIT_FOV : FOV;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const p = poses(aspect, camera.fov);
    const { room } = p;
    const screen = focus === "book" ? p.book : p.screen;
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
  focus,
  on,
  onArrive,
  onMonitor,
  onRecord,
  onBook,
  onCd,
  prompt,
  hover,
}: {
  phase: Phase;
  focus: Focus;
  on: boolean;
  onArrive: (p: Phase) => void;
  onMonitor: () => void;
  onRecord: () => void;
  onBook: () => void;
  onCd: () => void;
  prompt: string;
  hover: (on: boolean) => void;
}) {
  const power = useRef(0);
  const boost = useRef(0);
  const bookOpen = useRef(0);
  const cd = useRef(0);
  return (
    <>
      <color attach="background" args={["#140c08"]} />
      <CameraRig phase={phase} focus={focus} on={on} onArrive={onArrive} power={power} boost={boost} bookOpen={bookOpen} cd={cd} />
      <SnapGrid />
      <RoomScene onMonitor={onMonitor} onRecord={onRecord} onBook={onBook} onCd={onCd} bookOpen={bookOpen} cdInsert={cd} prompt={prompt} power={power} boost={boost} hover={hover} />
    </>
  );
});

export default function Landing({ onIntent }: { onIntent: () => void }) {
  const t = useT();
  // After a reload for a new version from the computer's menu, start at the menu again.
  const [phase, setPhase] = useState<Phase>(() => (takeResume() ? "screen" : "room"));
  useEffect(() => {
    if (phase === "screen") onIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The computer is on from the start (its screen powers up as the page appears).
  const on = true;
  const [webgl] = useState(hasWebGL);
  const [pointer, setPointer] = useState(false);
  const spinning = useRecord((s) => s.spinning);
  const [record, setRecord] = useState(false);
  const [focus, setFocus] = useState<Focus>("screen");
  const focusRef = useRef(focus);
  focusRef.current = focus;
  // The record box over the room: Esc closes it, other keys are ignored.
  const modalRef = useRef(false);
  modalRef.current = record;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  // Tell staleReload.ts where to come back to.
  useEffect(() => {
    setResume(focus === "screen" && (phase === "in" || phase === "screen"));
    return () => setResume(false);
  }, [focus, phase]);
  const openRecord = useCallback(() => {
    if (phaseRef.current !== "room" && phaseRef.current !== "out") return;
    play("open");
    setRecord(true);
  }, []);
  const reduceMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // Fly down to the book on the desk; its cover opens on the way and the pages appear on arrival.
  const openBook = useCallback(() => {
    if (phaseRef.current !== "room") return;
    play("page");
    setRecord(false);
    setFocus("book");
    setPhase(reduceMotion() ? "screen" : "in");
  }, []);
  // The CD goes into the computer, then the camera zooms in and the video plays on the screen.
  // The record pauses for it (the video has sound; the first click of the page would otherwise
  // start the record under it) and comes back afterwards if it was on.
  const recordWas = useRef(false);
  const openVideo = useCallback(() => {
    if (phaseRef.current !== "room") return;
    setRecord(false);
    prepareVideo(useGame.getState().lang); // start buffering during the animation
    recordWas.current = useRecord.getState().wanted && useSound.getState().music; // (sound off: leave it)
    if (recordWas.current) useRecord.getState().setOn(false);
    play("open");
    setFocus("video");
    setPhase(reduceMotion() ? "screen" : "insert");
  }, []);
  const dpr = useMemo(() => Math.min(1, Math.max(0.25, RENDER_HEIGHT / window.innerHeight)), []);

  const zoomIn = useCallback(() => {
    if (phaseRef.current !== "room") return;
    setRecord(false);
    setFocus("screen");
    onIntent(); // start downloading the game while the camera moves
    play("lens");
    setPhase(reduceMotion() ? "screen" : "in");
  }, [onIntent]);
  const leaveTimer = useRef(0);
  const zoomOut = useCallback(() => {
    if (phaseRef.current !== "screen") return;
    play(focusRef.current === "book" ? "page" : "close");
    if (focusRef.current === "video" && recordWas.current) {
      recordWas.current = false;
      useRecord.getState().setOn(true);
    }
    // Fade the menu (or the book's pages) out first, then pull the camera back.
    setPhase("leaving");
    leaveTimer.current = window.setTimeout(() => setPhase("out"), FADE_MS);
  }, []);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useGame.getState().overlay) return; // help/credits windows handle their own keys
      // M: record player on/off; C: credits book open/closed (in the bedroom view only, and not
      // with Ctrl / Cmd / Alt, so copying text still works).
      const plain = !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat;
      const inRoom = phaseRef.current === "room" || phaseRef.current === "out";
      const reading = focusRef.current === "book" && phaseRef.current === "screen";
      const watching = focusRef.current === "video" && phaseRef.current === "screen";
      if (plain && (inRoom || reading) && e.code === "KeyM") {
        const r = useRecord.getState();
        r.setOn(!r.spinning);
        return;
      }
      if (plain && e.code === "KeyC") {
        if (reading) zoomOut();
        else if (phaseRef.current === "room") openBook();
        return;
      }
      if (plain && e.code === "KeyA") {
        if (watching) zoomOut();
        else if (phaseRef.current === "room") openVideo();
        return;
      }
      if (modalRef.current) {
        if (e.code === "Escape") setRecord(false);
        return;
      }
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
  }, [zoomIn, zoomOut, openBook, openVideo]);

  // No WebGL: just the menu.
  if (!webgl) return <Menu />;

  const prompt = IS_TOUCH ? t("room.tap") : t("room.press");
  return (
    <div className={`landing landing-${phase}`} style={{ cursor: pointer && phase === "room" ? "pointer" : undefined }}>
      <Canvas
        className="landing-canvas"
        dpr={dpr}
        camera={{ fov: FOV, near: 0.02, far: 30 }}
        gl={{ antialias: true, powerPreference: "low-power" }}
        onPointerMissed={() => {
          // On phones any tap that isn't on the monitor still opens the computer.
          if (IS_TOUCH) zoomIn();
        }}
      >
        <Scene phase={phase} focus={focus} on={on} onArrive={setPhase} onMonitor={zoomIn} onRecord={openRecord} onBook={openBook} onCd={openVideo} prompt={prompt} hover={setPointer} />
      </Canvas>
      {(phase === "room" || phase === "out") && (
        <footer className="landing-footer">
          {/* Two balanced lines on every screen: "…de código abierto" / "de Todos en la Web". */}
          <span>
            {t("footer.lead")}{" "}
            <a href="https://github.com/SaintMikeNode/copanquest" target="_blank" rel="noopener noreferrer">
              {t("footer.openSource")}
            </a>
          </span>{" "}
          <span>
            {t("footer.of")}{" "}
            <a href="https://todosenlaweb.com" target="_blank" rel="noopener noreferrer">
              Todos en la Web
            </a>
          </span>
        </footer>
      )}
      {(phase === "room" || phase === "out") && (
        <div className="landing-hints">
          <button className="landing-hint pill" onClick={zoomIn}>
            {IS_TOUCH ? "👆" : <kbd>{t("room.key")}</kbd>} {t("room.hint")}
          </button>
          {/* Turns the record player on or off (it reflects whether the record is really playing). */}
          <button className="landing-hint landing-record pill" onClick={() => useRecord.getState().setOn(!spinning)} aria-pressed={spinning}>
            {!IS_TOUCH && <kbd>M</kbd>}
            <span className={spinning ? "landing-note on" : "landing-note"}>♪</span> {t(spinning ? "room.recordOff" : "room.recordOn")}
          </button>
          <button className="landing-hint landing-record pill" onClick={openBook}>
            {!IS_TOUCH && <kbd>C</kbd>}
            <span className="landing-note">✦</span> {t("credits")}
          </button>
          <button className="landing-hint landing-record pill" onClick={openVideo}>
            {!IS_TOUCH && <kbd>A</kbd>}
            <span className="landing-note">◉</span> {t("about.button")}
          </button>
        </div>
      )}
      {(phase === "room" || phase === "out") && (
        <div className="landing-lang">
          <LangToggle />
        </div>
      )}
      <Presence show={record && (phase === "room" || phase === "out")}>
        <RecordBox onClose={() => setRecord(false)} />
      </Presence>
      <Presence show={focus === "book" && phase === "screen"}>
        <CreditsBook onClose={zoomOut} />
      </Presence>
      {focus === "video" && (phase === "screen" || phase === "leaving") && (
        <div className={phase === "leaving" ? "crt-wrap crt-leave" : "crt-wrap"}>
          <AboutVideo onBack={zoomOut} />
        </div>
      )}
      {focus === "screen" && (phase === "screen" || phase === "leaving") && (
        <div className={phase === "leaving" ? "crt-wrap crt-leave" : "crt-wrap"}>
          <Menu crt onBack={zoomOut} />
        </div>
      )}
    </div>
  );
}
