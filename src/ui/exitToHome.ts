// Leave the game and go back to the main page (the bedroom). Progress is already saved in
// localStorage as it happens, so nothing is lost; the Copán world is unmounted and rebuilt
// from the cache next time the player presses Jugar.
import { useGame } from "../state/useGame";
import { useCamera } from "../game/camera";

export function exitToHome() {
  const g = useGame.getState();
  useCamera.getState().toggle(false);
  g.closeDialogue();
  g.setOverlay(null);
  if (document.pointerLockElement) document.exitPointerLock();
  g.setPlaying(false);
}
