// The time lens: blends the world toward Copán around AD 800 (painted plaster, open plazas,
// crowds). `shared.lens` (0..1) drives the shaders; actors read lensMix.
import { create } from "zustand";
import { shared } from "../voxel/material";

export const lensMix = { value: 0 };

export const useLens = create<{ on: boolean; toggle: () => void }>((set, get) => ({
  on: false,
  toggle: () => set({ on: !get().on }),
}));

export function tickLens(dt: number) {
  const target = useLens.getState().on ? 1 : 0;
  const k = Math.min(1, dt * 1.6);
  lensMix.value += (target - lensMix.value) * k;
  if (Math.abs(target - lensMix.value) < 0.002) lensMix.value = target;
  shared.lens.value = lensMix.value;
}
