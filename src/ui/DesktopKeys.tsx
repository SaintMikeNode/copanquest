// Computer controls that open things or change the game state (movement keys live in
// player/controls.ts). Right click to interact is in FollowCamera (it fires "cq-interact").
//   E / J  journal (inventory)       C  explorer's camera        R  back to the entrance
//   M      map
//   Esc    closes what is open; otherwise pauses (and frees the mouse)
// Pressing Esc while the mouse is captured makes the browser release it without sending
// the key to the page, so losing the capture unexpectedly also opens the pause menu.
import { useEffect, useRef } from "react";
import { ReportBug } from "./ReportBug";
import { ProjectCredit } from "./ProjectCredit";
import { useGame } from "../state/useGame";
import { useT } from "../i18n";
import { useCamera } from "../game/camera";
import { useAction } from "../game/WorldGame";
import { respawn } from "../player/respawn";
import { Overlay } from "./Overlay";
import { Help } from "./Help";
import { QuickSettings } from "./QuickSettings";
import { exitToHome } from "./exitToHome";
import { useTutorial } from "./Tutorial";
import { IS_TOUCH } from "../config";

const typing = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

/** Is anything open that needs the cursor (a window, a dialogue, a find)? */
const busy = () => {
  const g = useGame.getState();
  return !!g.overlay || !!g.dialogue || !!useAction.getState().found;
};

/** When the browser last released the mouse (an Esc right after it belongs to that release). */
let unlockedAt = 0;

export function DesktopKeys() {
  const t = useT();
  const tRef = useRef(t);
  tRef.current = t;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = useGame.getState();
      if (!g.playing || typing(e)) return;
      if (e.code === "Escape") {
        // The browser handles Esc while the mouse is captured (see pointerlockchange below).
        if (document.pointerLockElement || performance.now() - unlockedAt < 400) return;
        if (useCamera.getState().active) useCamera.getState().toggle(false);
        else if (g.overlay) g.setOverlay(g.overlay === "pause" ? null : g.overlay === "help" || g.overlay === "credits" ? "pause" : null);
        else if (g.dialogue) g.closeDialogue();
        else if (useAction.getState().found) useAction.getState().setFound(null);
        else g.setOverlay("pause");
        return;
      }
      if (e.repeat) return;
      if (e.code === "KeyE" || e.code === "KeyJ") {
        if (g.overlay === "journal") g.setOverlay(null);
        else if (!busy()) g.setOverlay("journal");
        return;
      }
      if (e.code === "KeyM") {
        if (g.overlay === "map") g.setOverlay(null);
        else if (!busy()) g.setOverlay("map");
        return;
      }
      if (busy()) return;
      if (e.code === "KeyC") useCamera.getState().toggle();
      else if (e.code === "KeyR") {
        useCamera.getState().toggle(false);
        respawn();
        g.showToast(tRef.current("respawned"));
      }
    };
    const onLock = () => {
      if (document.pointerLockElement) return;
      unlockedAt = performance.now();
      if (useGame.getState().playing && !busy()) useGame.getState().setOverlay("pause");
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerlockchange", onLock);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerlockchange", onLock);
    };
  }, []);
  return null;
}

/** Grab the mouse again (a button click counts as the user gesture browsers require). */
function relock() {
  if (IS_TOUCH) return; // phones and tablets have no mouse to capture
  const el = document.querySelector<HTMLCanvasElement>(".game-canvas canvas");
  const req = el?.requestPointerLock?.() as Promise<void> | undefined;
  req?.catch?.(() => {}); // Right after Esc, Chrome refuses for a moment; a click on the game works.
}

/** Esc menu. The world is frozen while it is open (see PauseLoop in Game.tsx). */
export function PauseMenu() {
  const t = useT();
  const setOverlay = useGame((s) => s.setOverlay);
  const resume = () => {
    setOverlay(null);
    relock();
  };
  return (
    <Overlay title={t("pause")} onClose={resume}>
      <ProjectCredit />
      <div className="pause-menu">
        <button className="primary" onClick={resume} autoFocus>
          ▶ {t("resume")}
        </button>
        <button
          onClick={() => {
            respawn();
            useGame.getState().showToast(t("respawned"));
            resume();
          }}
        >
          ⌂ {t("respawn")}
        </button>
        <button
          onClick={() => {
            useTutorial.getState().start();
            resume();
          }}
        >
          🎓 {t("tut.again")}
        </button>
        <button onClick={exitToHome}>🏠 {t("home")}</button>
        <ReportBug className="px-btn pause-report" />
      </div>
      <QuickSettings />
      <h3>{t("help")}</h3>
      <Help />
    </Overlay>
  );
}
