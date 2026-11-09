import type { KeyboardControlsEntry } from "@react-three/drei";

export type Control = "forward" | "backward" | "leftward" | "rightward" | "jump" | "run";

export const keyboardMap: KeyboardControlsEntry<Control>[] = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
];

/** Touch joystick pushed past this fraction of its radius = run. */
export const JOYSTICK_RUN_THRESHOLD = 0.9;
