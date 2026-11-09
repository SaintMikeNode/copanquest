import { lazy, Suspense, useEffect } from "react";
import { useGame } from "./state/useGame";
import { LoadingScreen } from "./ui/LoadingScreen";
import { Menu } from "./ui/Menu";

// The 3D engine (three, Rapier WASM) is a separate chunk so the menu shows instantly.
const loadGame = () => import("./Game");
const Game = lazy(loadGame);


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
    <Suspense fallback={<LoadingScreen progress={0.02} />}>
      <Game />
    </Suspense>
  );
}
