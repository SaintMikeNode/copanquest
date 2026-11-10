import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource/pixelify-sans/latin-400.css";
import "@fontsource/pixelify-sans/latin-700.css";
import "./styles.css";
import { installUiTextures } from "./ui/uiTextures";
import { initSound, useSound } from "./audio/sound";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { installStaleReload } from "./staleReload";
import { initInstall } from "./installApp";
import { useGame } from "./state/useGame";

installStaleReload();
initInstall();
// Dev only: ?director starts in the world for filming (DIRECTOR.md).
if (import.meta.env.DEV && new URLSearchParams(location.search).has("director")) {
  try {
    localStorage.setItem("cq-tutorial-v1", "done");
  } catch {
    /* private mode */
  }
  useGame.setState({ playing: true, quality: "high" });
  // No music in captures (it's added in the edit); sound effects stay. Not saved as a preference.
  useSound.setState({ music: false });
  document.body.classList.add("cq-director");
}
installUiTextures();
initSound();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
