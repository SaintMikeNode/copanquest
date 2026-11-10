// The explorer kid's pixel-art parts (walking in Player.tsx, seated in vehicle/Buggy.tsx).
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";


const C = {
  skin: hex("#8d5a3b"),
  skinDark: hex("#74482e"),
  hair: hex("#1d1410"),
  shirt: hex("#18b4d8"), // Honduran flag turquoise
  shirtDark: hex("#1294b4"),
  white: hex("#f4f1e8"),
  shorts: hex("#a8925f"),
  shortsDark: hex("#8c784c"),
  shoe: hex("#f2f2ee"),
  shoeRed: hex("#d23a2e"),
  hat: hex("#c9b07a"),
  hatBand: hex("#5a3e22"),
  pack: hex("#e2762a"),
  packDark: hex("#b85c1c"),
  eye: hex("#1a1210"),
  mouth: hex("#5a2e22"),
};

export function kidModel() {
  const sleeve = (t: Tile, f: FaceName) => {
    solid(t, C.skin, 0.05, 3);
    if (f === "bottom") return;
    // The top of the arm (the shoulder) is all shirt; the sides get a sleeve over the top third
    // (rows counted on the side faces' own height, so the 4-px-deep top face isn't half skin).
    if (f === "top") return solid(t, C.shirt, 0.05, 3);
    const k = Math.ceil(t.h * 0.34);
    for (let y = 0; y < k; y++) for (let x = 0; x < t.w; x++) t.set(x, y, y === k - 1 ? C.shirtDark : C.shirt);
  };
  const leg = (t: Tile, f: FaceName) => {
    solid(t, C.skin, 0.05, 5);
    if (f === "bottom") return;
    const k = f === "top" ? t.h : Math.ceil(t.h * 0.45);
    for (let y = 0; y < k; y++) for (let x = 0; x < t.w; x++) t.set(x, y, y === k - 1 && f !== "top" ? C.shortsDark : C.shorts);
  };
  const shoe = (t: Tile, f: FaceName) => {
    solid(t, C.shoe, 0.04, 7);
    if (f === "front" || f === "back" || f === "left" || f === "right") for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, C.shoeRed);
    if (f === "top") for (let y = 0; y < t.h; y += 3) t.set(Math.floor(t.w / 2), y, C.shoeRed);
  };
  const body = (t: Tile, f: FaceName) => {
    solid(t, C.shirt, 0.05, 9);
    if (f === "front" || f === "back" || f === "left" || f === "right") {
      // White band with five stars, like the flag.
      const y0 = Math.floor(t.h * 0.36);
      for (let y = y0; y < y0 + 4; y++) for (let x = 0; x < t.w; x++) t.set(x, y, C.white);
      if (f === "front") for (let i = 0; i < 5; i++) t.set(Math.round(t.w * (0.2 + i * 0.15)), y0 + 1 + (i % 2), C.shirt);
      for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, C.shirtDark);
    }
  };
  const head = (t: Tile, f: FaceName) => {
    solid(t, C.skin, 0.04, 11);
    if (f === "top") return solid(t, C.hair, 0.1, 12);
    if (f === "bottom") return;
    const hairRows = f === "back" ? Math.floor(t.h * 0.7) : 3;
    for (let y = 0; y < hairRows; y++) for (let x = 0; x < t.w; x++) t.set(x, y, C.hair);
    if (f === "front") {
      // Face: brows, eyes with a highlight, nose shade, smile.
      const ey = 5;
      for (const ex of [2, t.w - 4]) {
        t.set(ex, ey - 1, C.hair);
        t.set(ex + 1, ey - 1, C.hair);
        t.set(ex, ey, C.white);
        t.set(ex + 1, ey, C.eye);
        t.set(ex + 1, ey + 1, C.eye);
        t.set(ex, ey + 1, C.eye);
      }
      t.set(Math.floor(t.w / 2), ey + 2, C.skinDark);
      for (let x = Math.floor(t.w / 2) - 1; x <= Math.floor(t.w / 2) + 1; x++) t.set(x, ey + 4, C.mouth);
    }
    if (f === "left" || f === "right") {
      for (let y = 3; y < 6; y++) t.set(f === "left" ? t.w - 1 : 0, y, C.hair);
      t.set(Math.floor(t.w / 2), 6, C.skinDark); // ear
    }
  };
  const hatCrown = (t: Tile, f: FaceName) => {
    solid(t, C.hat, 0.07, 13);
    if (f !== "top" && f !== "bottom") for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, C.hatBand);
  };
  const hatBrim = (t: Tile) => solid(t, C.hat, 0.08, 14);
  const pack = (t: Tile, f: FaceName) => {
    solid(t, C.pack, 0.06, 15);
    if (f === "back") {
      for (let y = Math.floor(t.h * 0.5); y < t.h - 1; y++) for (let x = 1; x < t.w - 1; x++) t.set(x, y, C.packDark);
      for (let x = 1; x < t.w - 1; x++) t.set(x, Math.floor(t.h * 0.5), C.pack);
    }
  };
  return buildPixelModel([
    { size: [0.15, 0.36, 0.17], paint: leg }, // 0 leg
    { size: [0.17, 0.07, 0.22], paint: shoe }, // 1 shoe
    { size: [0.36, 0.42, 0.22], paint: body }, // 2 body
    { size: [0.11, 0.38, 0.13], paint: sleeve }, // 3 arm
    { size: [0.34, 0.34, 0.34], paint: head }, // 4 head
    { size: [0.3, 0.12, 0.3], paint: hatCrown }, // 5 hat crown
    { size: [0.48, 0.04, 0.48], paint: hatBrim }, // 6 hat brim
    { size: [0.28, 0.32, 0.12], paint: pack }, // 7 backpack
  ]);
}
