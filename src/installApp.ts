// Installing the game as an app (PWA). Chrome / Edge on Android fire `beforeinstallprompt` early,
// often before any React code runs, so it is caught here at startup and kept for the
// "Instalar app" button (ui/InstallApp.tsx). iOS has no such event: the button shows the
// Share → Add to Home Screen steps instead.
import { create } from "zustand";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Running as an installed app (home-screen icon), not in a browser tab. */
const standalone = () =>
  (typeof matchMedia === "function" &&
    (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches)) ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const useInstall = create<{ prompt: InstallPromptEvent | null; installed: boolean }>(() => ({
  prompt: null,
  installed: false,
}));

export function initInstall() {
  useInstall.setState({ installed: standalone() });
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep it for our button instead of the browser's own banner
    useInstall.setState({ prompt: e as InstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => useInstall.setState({ installed: true, prompt: null }));
}

/** Opens the browser's install dialog when it offered one. Returns false when it didn't. */
export async function promptInstall(): Promise<boolean> {
  const p = useInstall.getState().prompt;
  if (!p) return false;
  await p.prompt();
  const { outcome } = await p.userChoice;
  // The event can only be used once.
  useInstall.setState({ prompt: null, installed: outcome === "accepted" });
  return true;
}
