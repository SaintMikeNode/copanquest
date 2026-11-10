// After a deploy, a tab (or the offline cache) can still be running the previous version, whose
// code chunks no longer exist on the server: loading one fails ("Failed to fetch dynamically
// imported module"). Reload the page once to pick up the new version. At most one automatic
// reload per minute, so a real outage can't loop.
const KEY = "cq-stale-reload";

export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
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
}
