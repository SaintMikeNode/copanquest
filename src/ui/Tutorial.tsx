// First-play tutorial: a coach card that walks through moving, looking around, the explorer's
// camera, the journal, the pause menu and talking to people. Each step completes when the player
// actually does it (watched from the game state). Remembered in localStorage once finished or
// skipped; the pause menu can start it again. The matching HUD button pulses during its step
// (elements marked data-tut="…", styled by body[data-tut]).
import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { useGame } from "../state/useGame";
import { useCamera } from "../game/camera";
import { playerState } from "../player/playerState";
import { useT, type Key } from "../i18n";
import { IS_TOUCH } from "../config";
import { play } from "../audio/sound";

const KEY = "cq-tutorial-v1";
const STEPS = ["move", "look", "camera", "journal", "pause", "talk", "done"] as const;
type StepId = (typeof STEPS)[number];

const seen = () => {
  try {
    return localStorage.getItem(KEY) === "done";
  } catch {
    return false;
  }
};
const remember = () => {
  try {
    localStorage.setItem(KEY, "done");
  } catch {
    /* private mode */
  }
};

export const useTutorial = create<{ step: number | null; start: () => void; finish: () => void; next: () => void }>((set, get) => ({
  step: null,
  start: () => set({ step: 0 }),
  finish: () => {
    remember();
    set({ step: null });
  },
  next: () => {
    const s = get().step;
    if (s === null) return;
    play("place");
    set({ step: s + 1 < STEPS.length ? s + 1 : null });
    if (s + 1 >= STEPS.length) remember();
  },
}));

/** The HUD element each step points at. */
const HIGHLIGHT: Partial<Record<StepId, string>> = { camera: "camera", journal: "journal", pause: "menu", talk: "talk" };

export function Tutorial() {
  const t = useT();
  const step = useTutorial((s) => s.step);
  const overlay = useGame((s) => s.overlay);
  const dialogue = useGame((s) => s.dialogue);
  const camOn = useCamera((s) => s.active);
  const id = step === null ? null : STEPS[step];
  const [flash, setFlash] = useState(false);

  // First play: start once the game is on screen.
  useEffect(() => {
    if (!seen()) {
      const t0 = setTimeout(() => useTutorial.getState().start(), 1200);
      return () => clearTimeout(t0);
    }
  }, []);

  // Point at the right HUD button.
  useEffect(() => {
    const h = id ? HIGHLIGHT[id] : undefined;
    if (h) document.body.dataset.tut = h;
    else delete document.body.dataset.tut;
    return () => void delete document.body.dataset.tut;
  }, [id]);

  // Watch the game for each step's action.
  const opened = useRef(false);
  useEffect(() => {
    opened.current = false;
    if (!id) return;
    const start = playerState.position.clone();
    let lastYaw = playerState.viewYaw;
    let turned = 0;
    const done = () => {
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
      useTutorial.getState().next();
    };
    const iv = setInterval(() => {
      const g = useGame.getState();
      if (id === "move") {
        if (Math.hypot(playerState.position.x - start.x, playerState.position.z - start.z) > 4) done();
      } else if (id === "look") {
        let d = playerState.viewYaw - lastYaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        turned += Math.abs(d);
        lastYaw = playerState.viewYaw;
        if (turned > 1.2) done();
      } else if (id === "camera" || id === "journal" || id === "pause") {
        // Open it, then close it again.
        const isOpen = id === "camera" ? useCamera.getState().active : g.overlay === id;
        if (isOpen) opened.current = true;
        else if (opened.current) done();
      } else if (id === "talk") {
        if (g.dialogue) opened.current = true;
        else if (opened.current) done();
      }
    }, 150);
    return () => clearInterval(iv);
  }, [id]);

  // The final card goes away by itself.
  useEffect(() => {
    if (id !== "done") return;
    const t0 = setTimeout(() => useTutorial.getState().finish(), 7000);
    return () => clearTimeout(t0);
  }, [id]);

  if (!id || step === null) return null;
  // Out of the way while a window or a conversation covers the screen (the card already says
  // how to close it); the camera step keeps it visible over the viewfinder.
  if (overlay || dialogue || (camOn && id !== "camera")) return null;
  const n = STEPS.length - 1;
  const body: Key = `tut.${id}.${IS_TOUCH ? "touch" : "keys"}` as Key;
  return (
    <div className={flash ? "tutorial tutorial-flash" : "tutorial"} role="status" aria-live="polite">
      <div className="tutorial-head">
        <strong>{t(`tut.${id}.title` as Key)}</strong>
        {id !== "done" && (
          <span className="tutorial-count">
            {step + 1}/{n}
          </span>
        )}
      </div>
      <p>{t(body)}</p>
      <div className="tutorial-foot">
        {id !== "done" && (
          <div className="dots" aria-hidden="true">
            {Array.from({ length: n }, (_, i) => (
              <i key={i} className={i < step ? "on" : i === step ? "now" : ""} />
            ))}
          </div>
        )}
        <button className="px-btn" onClick={() => useTutorial.getState().finish()}>
          {t(id === "done" ? "tut.close" : "tut.skip")}
        </button>
      </div>
    </div>
  );
}
