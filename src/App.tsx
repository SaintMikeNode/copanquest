import { lazy, Suspense, useEffect } from "react";
import { useGame } from "./state/useGame";
import { LoadingScreen } from "./ui/LoadingScreen";

// The 3D engine (three, Rapier WASM, the voxel world) is a separate chunk: it is fetched when
// the player turns on the bedroom computer, and the Copán world builds when they press Jugar.
const loadGame = () => import("./Game");
const Game = lazy(loadGame);
// The landing page: a late-90s bedroom (PSX style) whose computer shows the menu.
const Landing = lazy(() => import("./room/Landing"));


export default function App() {
  const playing = useGame((s) => s.playing);
  const lang = useGame((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  if (!playing)
    return (
      <Suspense fallback={<div className="landing-loading" />}>
        <Landing onIntent={() => void loadGame()} />
      </Suspense>
    );
  return (
    <Suspense fallback={<LoadingScreen progress={0.02} />}>
      <Game />
    </Suspense>
  );
}
