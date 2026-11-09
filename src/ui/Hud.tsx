import { useEffect, useState } from "react";
import { useGame } from "../state/useGame";
import { useT } from "../i18n";
import { IS_TOUCH } from "../config";
import { Minimap } from "./Minimap";
import { InfoCard } from "./InfoCard";
import { TouchControls } from "./TouchControls";
import { DebugOverlay } from "./DebugOverlay";
import { Overlay } from "./Overlay";
import { Credits } from "./Credits";
import { Help } from "./Help";
import { DialogueBox, Progress, TalkPrompt, Toast } from "./Dialogue";
import { ActionPrompt, CameraOverlay, GlyphPuzzle, HudButtons, Journal } from "./GameUI";
import { useCamera } from "../game/camera";
import { useAction } from "../game/WorldGame";
import { DesktopKeys, PauseMenu } from "./DesktopKeys";
import { AudioEvents } from "../audio/AudioEvents";

/** Desktop mouse-look: free the cursor when UI needs it, and remind how to grab it. */
function MouseLook({ needsCursor }: { needsCursor: boolean }) {
  const t = useT();
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const onChange = () => setLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);
  useEffect(() => {
    if (needsCursor && document.pointerLockElement) document.exitPointerLock();
  }, [needsCursor]);
  if (IS_TOUCH || locked || needsCursor) return null;
  return <div className="mouse-hint">🖱 {t("mouse.hint")}</div>;
}

export function Hud() {
  const t = useT();
  const overlay = useGame((s) => s.overlay);
  const dialogue = useGame((s) => s.dialogue);
  const camOn = useCamera((s) => s.active);
  const found = useAction((s) => s.found);
  const setOverlay = useGame((s) => s.setOverlay);
  const close = () => setOverlay(null);
  // Phones: the progress chips hide behind a button so they don't cover the game.
  const [stats, setStats] = useState(!IS_TOUCH);
  return (
    <div className="hud">
      {/* One row of same-height chips (wraps on narrow screens): menu, progress, FPS. On phones the
          progress chips and FPS open from a "Progreso" button. */}
      <div className="hud-left">
        <div className="hud-bar">
          <button className="pill menu-btn" onClick={() => setOverlay("pause")} aria-label={t("menu")}>
            {IS_TOUCH ? <span aria-hidden="true">☰</span> : <kbd>Esc</kbd>} {t("menu")}
          </button>
          {IS_TOUCH && (
            <button className="pill stats-btn" onClick={() => setStats(!stats)} aria-expanded={stats}>
              <span aria-hidden="true">{stats ? "▴" : "▾"}</span> {t("hud.progress")}
            </button>
          )}
          {stats && (
            <>
              <Progress />
              <DebugOverlay />
            </>
          )}
        </div>
      </div>
      <button className="hud-map" onClick={() => setOverlay("map")} aria-label={t("map")}>
        <Minimap />
        {!IS_TOUCH && <kbd>M</kbd>}
      </button>
      <HudButtons />
      <CameraOverlay />
      {!dialogue && !camOn && <InfoCard />}
      {!camOn && <TalkPrompt />}
      {!camOn && !dialogue && <ActionPrompt />}
      <DialogueBox />
      <Toast />
      <DesktopKeys />
      <AudioEvents />
      <MouseLook needsCursor={!!overlay || !!dialogue || !!found} />
      {IS_TOUCH && !overlay && !dialogue && !found && !camOn && <TouchControls />}
      {overlay === "map" && (
        <Overlay title={t("map")} onClose={close}>
          <Minimap large />
        </Overlay>
      )}
      {overlay === "credits" && (
        <Overlay title={t("credits")} onClose={close}>
          <Credits />
        </Overlay>
      )}
      {overlay === "journal" && <Journal />}
      {overlay === "glyphs" && <GlyphPuzzle />}
      {overlay === "pause" && <PauseMenu />}
      {overlay === "help" && (
        <Overlay title={t("help")} onClose={close}>
          <Help />
        </Overlay>
      )}
    </div>
  );
}
