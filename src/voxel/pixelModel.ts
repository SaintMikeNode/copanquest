// Blocky models (character, animals) whose faces are painted pixel art at the world's
// density (32 px per meter). All parts of a model share one texture atlas and material.
import * as THREE from "three";
import { Tile, hex, type RGB } from "./textures";
import { createMonumentMaterial } from "./material";
import { PX_PER_M } from "./monumentArt";

export type FaceName = "right" | "left" | "top" | "bottom" | "front" | "back";
/** Paints one face; (0,0) is the top-left pixel as seen from outside the box. */
export type FacePainter = (t: Tile, face: FaceName) => void;

export interface PartSpec {
  size: [number, number, number];
  paint: FacePainter;
}

const ORDER: FaceName[] = ["right", "left", "top", "bottom", "front", "back"];

/** Flat-fill helper with a little noise, for cloth/skin. */
export function solid(t: Tile, c: RGB, noise = 0.06, seed = 1) {
  let s = seed;
  for (let y = 0; y < t.h; y++)
    for (let x = 0; x < t.w; x++) {
      s = (s * 16807) % 2147483647;
      const k = 1 + ((s / 2147483647) - 0.5) * 2 * noise;
      t.set(x, y, [c[0] * k, c[1] * k, c[2] * k]);
    }
}

export function buildPixelModel(parts: PartSpec[]) {
  // Lay every face out on shelves in one atlas.
  const faces: { tile: Tile; part: number; face: FaceName; x: number; y: number }[] = [];
  for (let p = 0; p < parts.length; p++) {
    const [w, h, d] = parts[p].size;
    const px = (m: number) => Math.max(1, Math.round(m * PX_PER_M));
    const dims: Record<FaceName, [number, number]> = {
      right: [px(d), px(h)],
      left: [px(d), px(h)],
      top: [px(w), px(d)],
      bottom: [px(w), px(d)],
      front: [px(w), px(h)],
      back: [px(w), px(h)],
    };
    for (const f of ORDER) {
      const t = new Tile(dims[f][0], dims[f][1]);
      parts[p].paint(t, f);
      faces.push({ tile: t, part: p, face: f, x: 0, y: 0 });
    }
  }
  const W = 128;
  let x = 0;
  let y = 0;
  let row = 0;
  for (const f of faces) {
    if (x + f.tile.w > W) {
      x = 0;
      y += row + 1;
      row = 0;
    }
    f.x = x;
    f.y = y;
    x += f.tile.w + 1;
    row = Math.max(row, f.tile.h);
  }
  const H = Math.pow(2, Math.ceil(Math.log2(y + row + 1)));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  for (const f of faces) ctx.putImageData(new ImageData(new Uint8ClampedArray(f.tile.px), f.tile.w, f.tile.h), f.x, f.y);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  const geometries = parts.map((part, p) => {
    const [w, h, d] = part.size;
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    ORDER.forEach((name, fi) => {
      const f = faces.find((q) => q.part === p && q.face === name)!;
      for (let k = 0; k < 4; k++) {
        const i = fi * 4 + k;
        const u = uv.getX(i);
        const v = uv.getY(i);
        uv.setXY(i, (f.x + u * f.tile.w) / W, 1 - (f.y + (1 - v) * f.tile.h) / H);
      }
    });
    return g;
  });
  return { geometries, material: createMonumentMaterial(texture) };
}

export { hex };
