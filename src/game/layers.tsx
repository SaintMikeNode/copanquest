// Render layers that split shadow casting between two lights:
//   WORLD (2): static scenery → cached world shadow map (redrawn only when the player moves far)
//   CHARACTERS (1): player, people, animals, ball → small per-frame shadow map around the player
// The main camera renders 0, 1 and 2.
import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";

export const LAYER_CHARACTERS = 1;
export const LAYER_WORLD = 2;

/** Puts every mesh below it on the characters layer only (so it skips the world shadow pass). */
export function CharacterLayer({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.layers.set(LAYER_CHARACTERS);
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  });
  return <group ref={ref}>{children}</group>;
}
