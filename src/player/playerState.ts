import * as THREE from "three";

/**
 * Per-frame player data shared with non-React code (minimap, POI tracker).
 * Mutated in useFrame — never put this in React state.
 */
export const playerState = {
  position: new THREE.Vector3(),
  /** Camera yaw (radians); 0 = camera looks north. Used by the minimap. */
  viewYaw: 0,
  /** Player body yaw (radians). */
  facingYaw: 0,
  grounded: false,
};
