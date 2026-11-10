// Failures React's error boundary never sees, which used to leave a bare dark-green page
// (the page background) with or without the HUD on top:
//  - the browser takes the WebGL context away (memory pressure, tab in the background, GPU
//    reset): the canvas goes blank. three.js redraws by itself if the context comes back; if it
//    doesn't come back soon, the reload card is shown (and hidden again if it returns later);
//  - an error thrown every frame (useFrame, physics): the scene stops drawing;
//  - a code chunk that can't be loaded and the one-per-minute reload already used;
//  - the voxel worker dying while the world builds.
// ErrorBoundary.tsx installs this and draws the card over the game.
import { reloadForNewVersion } from "./staleReload";

export type Crash = "gpu" | "error";

let current: Crash | null = null;
const listeners = new Set<() => void>();

function set(next: Crash | null) {
  if (current === next) return;
  current = next;
  for (const l of listeners) l();
}

export const crashStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  get: () => current,
};

/** Something outside React's render broke for good: show the reload card. */
export function reportFatal(what: string, error?: unknown) {
  console.error(`CopánQuest: ${what}`, error ?? "");
  set("error");
}

const CHUNK = /dynamically imported module|Importing a module script failed|error loading dynamically/i;
/** How long a lost WebGL context may stay lost (with the page visible) before the card shows. */
const GPU_WAIT_MS = 1500;
/** This many uncaught errors within the window means one is thrown every frame. */
const ERROR_BURST = 20;
const ERROR_WINDOW_MS = 3000;

let installed = false;

export function installCrashGuard() {
  if (installed) return;
  installed = true;

  // --- WebGL context lost / restored. The events don't bubble, but they can be captured. ---
  const lost = new Set<HTMLCanvasElement>();
  let timer = 0;
  const check = () => {
    timer = 0;
    // Canvases removed from the page lose their context on purpose (cleanup).
    for (const c of lost) if (!c.isConnected) lost.delete(c);
    if (!lost.size) {
      if (current === "gpu") set(null);
      return;
    }
    // In the background the browser may keep the context until the tab is back: wait there.
    if (document.hidden) return;
    console.error("CopánQuest: the WebGL context was lost and not restored.");
    if (!current) set("gpu");
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = window.setTimeout(check, GPU_WAIT_MS);
  };
  document.addEventListener(
    "webglcontextlost",
    (e) => {
      const canvas = e.target;
      if (!(canvas instanceof HTMLCanvasElement) || !canvas.isConnected) return;
      console.warn("CopánQuest: WebGL context lost.");
      lost.add(canvas);
      schedule();
    },
    true,
  );
  document.addEventListener(
    "webglcontextrestored",
    (e) => {
      lost.delete(e.target as HTMLCanvasElement);
      console.warn("CopánQuest: WebGL context restored.");
      if (!lost.size) {
        clearTimeout(timer);
        if (current === "gpu") set(null);
      }
    },
    true,
  );
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && lost.size) schedule();
  });

  // --- Uncaught errors. One is logged and survived; a burst means the frame loop is broken. ---
  let burstStart = 0;
  let burst = 0;
  window.addEventListener("error", (e) => {
    // Resource load errors (img, audio) have no message and don't stop the game.
    if (!e.message) return;
    if (CHUNK.test(e.message)) {
      if (!reloadForNewVersion()) reportFatal("a code chunk could not be loaded", e.error);
      return;
    }
    const now = performance.now();
    if (now - burstStart > ERROR_WINDOW_MS) {
      burstStart = now;
      burst = 0;
    }
    if (++burst === ERROR_BURST) reportFatal("the same error keeps repeating", e.error ?? e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const message = String((e.reason as Error | undefined)?.message ?? e.reason);
    console.error("CopánQuest: unhandled rejection:", e.reason);
    if (CHUNK.test(message) && !reloadForNewVersion()) reportFatal("a code chunk could not be loaded", e.reason);
  });
}
