// After a deploy, a tab (or the offline cache) can still be running the previous version, whose
// code chunks no longer exist on the server: loading one fails ("Failed to fetch dynamically
// imported module"). Reload the page once to pick up the new version. At most one automatic
// reload per minute, so a real outage can't loop.
//
// The usual way to meet this: the first visit after a deploy. The service worker shows the
// previous version from its cache, the new worker takes over in the background and deletes the
// old files, and the click on the bedroom computer (which downloads the game) finds nothing.
// So (1) when a new worker takes over before the game has started, reload right away, and
// (2) a reload from the computer's menu comes back to the menu, not to the bedroom
// (`setResume` / `takeResume`), so nobody has to click twice.
import { useGame } from "./state/useGame";

const KEY = "cq-stale-reload";
const RESUME = "cq-resume";

let resume = false;
/** Landing: the player is at the computer's menu (true) or back in the bedroom (false). */
export function setResume(atComputer: boolean) {
  resume = atComputer;
}
/** Landing, once at startup: was the page reloaded from the computer's menu? */
export function takeResume(): boolean {
  try {
    const at = Number(sessionStorage.getItem(RESUME) || 0);
    sessionStorage.removeItem(RESUME);
    return Date.now() - at < 15_000;
  } catch {
    return false;
  }
}

export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
    if (resume && !useGame.getState().playing) sessionStorage.setItem(RESUME, String(Date.now()));
  } catch {
    /* private mode: still reload */
  }
  location.reload();
  return true;
}

/** Wrap a lazy import: if its chunk can't be loaded, reload once instead of failing. */
export function importFresh<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch((err) => {
      // The reload replaces the page; keep the import pending until it happens.
      if (reloadForNewVersion()) return new Promise<T>(() => {});
      throw err;
    });
}

/** Vite's preload helper reports missing CSS / JS dependencies with this event. */
export function installStaleReload() {
  window.addEventListener("vite:preloadError", (e) => {
    if (reloadForNewVersion()) e.preventDefault();
  });
  // A new service worker took over a page that an older one was serving: its files are gone.
  // In the middle of a game everything needed is already loaded, so leave that alone.
  const sw = navigator.serviceWorker;
  if (sw?.controller) {
    sw.addEventListener("controllerchange", () => {
      if (!useGame.getState().playing) reloadForNewVersion();
    });
  }
}
