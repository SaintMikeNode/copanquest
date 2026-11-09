// Explorer's camera state + one-shot frame capture (done right after the world renders).
import { create } from "zustand";

interface CameraState {
  active: boolean;
  zoom: boolean;
  /** Subject currently in the viewfinder (null = nothing). */
  aim: string | null;
  flash: number;
  toggle: (on?: boolean) => void;
  setZoom: (z: boolean) => void;
  setAim: (id: string | null) => void;
  doFlash: () => void;
}

export const useCamera = create<CameraState>((set, get) => ({
  active: false,
  zoom: false,
  aim: null,
  flash: 0,
  toggle: (on) => set({ active: on ?? !get().active, zoom: false, aim: null }),
  setZoom: (zoom) => set({ zoom }),
  setAim: (aim) => {
    if (get().aim !== aim) set({ aim });
  },
  doFlash: () => set({ flash: Date.now() }),
}));

let pendingCapture: ((dataUrl: string) => void) | null = null;

/** Ask the renderer for a thumbnail of the next frame. */
export function requestCapture(cb: (dataUrl: string) => void) {
  pendingCapture = cb;
}

/** Called by the render loop right after drawing the world. */
export function fulfilCapture(canvas: HTMLCanvasElement) {
  if (!pendingCapture) return;
  const cb = pendingCapture;
  pendingCapture = null;
  const thumb = document.createElement("canvas");
  thumb.width = 192;
  thumb.height = 108;
  const ctx = thumb.getContext("2d")!;
  // Center-crop to 16:9.
  const sw = canvas.width;
  const sh = canvas.height;
  const ch = Math.min(sh, (sw * 9) / 16);
  const cw = (ch * 16) / 9;
  ctx.drawImage(canvas, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, 192, 108);
  cb(thumb.toDataURL("image/jpeg", 0.72));
}
