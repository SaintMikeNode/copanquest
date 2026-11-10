// Last line of defense: if anything throws while rendering, show a small card with a reload
// button instead of an empty screen (without it, React unmounts everything and only the page's
// dark green background is left).
// The same card is drawn over the game for failures outside React's render (src/crash.ts):
// a WebGL context that doesn't come back, an error thrown every frame, a chunk that won't load.
import { Component, useSyncExternalStore, type ReactNode } from "react";
import { reloadForNewVersion } from "../staleReload";
import { crashStore, installCrashGuard } from "../crash";

function CrashCard() {
  return (
    // Above every HUD layer and overlay (styles.css z-index tops out at 50).
    <main className="menu crash" style={{ zIndex: 100 }} role="alert">
      <div className="menu-card">
        <h1>¡Ups!</h1>
        <p>
          Algo salió mal. Recarga la página para seguir explorando; tu progreso está guardado.
          <br />
          <em>Something went wrong. Reload the page to keep exploring; your progress is saved.</em>
        </p>
        <button className="primary" onClick={() => location.reload()}>
          Recargar · Reload
        </button>
      </div>
    </main>
  );
}

/** The card over the still-mounted game: a lost context that returns later removes it again. */
function CrashOverlay() {
  const crash = useSyncExternalStore(crashStore.subscribe, crashStore.get);
  return crash ? <CrashCard /> : null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("CopánQuest crashed:", error);
    // A chunk from an older deploy that no longer exists: reloading fixes it.
    if (/dynamically imported module|Importing a module script failed|error loading dynamically/i.test(String(error?.message))) reloadForNewVersion();
  }

  componentDidMount() {
    installCrashGuard();
  }

  render() {
    if (this.state.error) return <CrashCard />;
    return (
      <>
        {this.props.children}
        <CrashOverlay />
      </>
    );
  }
}
