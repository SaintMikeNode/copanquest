// Put the player back at the entrance (R key / pause menu), e.g. when stuck in a corner.
import { PLAYER_SPAWN } from "../world/siteData";
import { playerState } from "./playerState";

export function respawn() {
  const b = playerState.body;
  if (!b) return;
  b.setTranslation({ x: PLAYER_SPAWN[0], y: PLAYER_SPAWN[1], z: PLAYER_SPAWN[2] }, true);
  b.setLinvel({ x: 0, y: 0, z: 0 }, true);
  b.setAngvel({ x: 0, y: 0, z: 0 }, true);
  b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
  // FollowCamera turns back to the spawn view.
  window.dispatchEvent(new Event("cq-respawn"));
}
