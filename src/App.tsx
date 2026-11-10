import { lazy, Suspense, useEffect } from "react";
import { useGame } from "./state/useGame";
import { LoadingScreen } from "./ui/LoadingScreen";
import { importFresh } from "./staleReload";

// The 3D engine (three, Rapier WASM, the voxel world) is a separate chunk: it is fetched when
// the player turns on the bedroom computer, and the Copán world builds when they press Jugar.
// importFresh: if the chunk is from a previous deploy and gone, reload once (staleReload.ts).
const loadGame = importFresh(() => import("./Game"));
const Game = lazy(loadGame);
// The landing page: a late-90s bedroom (PSX style) whose computer shows the menu.
const Landing = lazy(importFresh(() => import("./room/Landing")));


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
