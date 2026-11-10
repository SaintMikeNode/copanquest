import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource/pixelify-sans/latin-400.css";
import "@fontsource/pixelify-sans/latin-700.css";
import "./styles.css";
import { installUiTextures } from "./ui/uiTextures";
import { initSound } from "./audio/sound";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { installStaleReload } from "./staleReload";
import { initInstall } from "./installApp";

installStaleReload();
initInstall();
installUiTextures();
initSound();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
