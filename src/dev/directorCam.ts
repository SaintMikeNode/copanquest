// Camera override used by the dev-only director (src/dev/Director.tsx). FollowCamera checks it
// every frame: while `active`, the camera sits at `pos`, looks at `look` and uses `fov`.
import * as THREE from "three";

export const directorCam = {
  active: false,
  pos: new THREE.Vector3(),
  look: new THREE.Vector3(),
  fov: 55,
  /** Plant (grass, flowers) draw distance override in meters; 0 = the game's own (45 / 75 m). */
  plants: 0,
};
