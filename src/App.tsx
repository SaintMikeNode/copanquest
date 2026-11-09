import { lazy, Suspense, useEffect } from "react";
import { useGame } from "./state/useGame";
import { useT } from "./i18n";
import { Menu } from "./ui/Menu";

// The 3D engine (three, Rapier WASM) is a separate chunk so the menu shows instantly.
const loadGame = () => import("./Game");
const Game = lazy(loadGame);

function Loading() {
  const t = useT();
  return (
    <div className="loading">
      <div className="spinner" />
      <p>{t("loading")}</p>
    </div>
  );
}

export default function App() {
  const playing = useGame((s) => s.playing);
  const lang = useGame((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  // Start downloading the engine while the player reads the menu.
  useEffect(() => {
    void loadGame();
  }, []);

  if (!playing) return <Menu />;
  return (
    <Suspense fallback={<Loading />}>
      <Game />
    </Suspense>
  );
}
