// Shared state of the archaeologist's buggy. `buggy` is mutated every frame (like playerState);
// `useBuggy` is the small React-facing part (prompts, HUD).
import * as THREE from "three";
import { create } from "zustand";
import type { RapierRigidBody } from "@react-three/rapier";
import { useProgress } from "../state/progress";

/** The buggy runs once Tomás has his toolbox back (quest "toolbox", saved with the progress). */
const fixed = () => useProgress.getState().quests.toolbox === "done";

export const useBuggy = create<{
  /** Tomás has fixed it and lent it (quest "toolbox" done). */
  unlocked: boolean;
  /** The player is in the driver's seat. */
  driving: boolean;
  /** Close enough to get in. */
  near: boolean;
  setDriving: (driving: boolean) => void;
  setNear: (near: boolean) => void;
}>((set, get) => ({
  unlocked: fixed(),
  driving: false,
  near: false,
  setDriving: (driving) => {
    if (get().driving !== driving) set({ driving });
  },
  setNear: (near) => {
    if (get().near !== near) set({ near });
  },
}));

useProgress.subscribe(() => {
  if (useBuggy.getState().unlocked !== fixed()) useBuggy.setState({ unlocked: fixed() });
});

/** Per-frame data (never React state). */
export const buggy = {
  body: null as RapierRigidBody | null,
  position: new THREE.Vector3(),
  /** Heading (radians, same convention as the models: 0 = front toward +z). */
  yaw: 0,
  /** Forward speed (m/s, negative when reversing). */
  speed: 0,
  /** The drawn buggy (interpolated between physics steps): what the camera follows. */
  visual: null as THREE.Object3D | null,
};

/** Touch pedals (BuggyPedals.tsx), held down or not. `hop`: the hop / drift button. */
export const pedals = { gas: false, brake: false, hop: false };

/** What to say when the buggy can't be used yet: before or during Tomás's quest. */
export function lockedKey(): "buggy.locked" | "buggy.broken" {
  return useProgress.getState().quests.toolbox ? "buggy.broken" : "buggy.locked";
}

/** Ask the buggy to let the driver out (pause menu "go home", respawn…). */
export function leaveBuggy() {
  window.dispatchEvent(new Event("cq-buggy-exit"));
}
