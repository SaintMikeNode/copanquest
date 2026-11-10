// Last line of defense: if anything throws while rendering, show a small card with a reload
// button instead of an empty screen (without it, React unmounts everything and only the page's
// dark green background is left).
import { Component, type ReactNode } from "react";
import { reloadForNewVersion } from "../staleReload";

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

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="menu crash">
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
}
