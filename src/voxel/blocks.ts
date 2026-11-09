// Block types and which texture layer each face uses.
// Each layer has VARIANTS hand-generated versions; the shader picks one per block from a
// hash of its position, so large surfaces never look tiled (and greedy meshing still works).
import type { Material } from "../world/siteData";

/** Edge length of one voxel in meters (half of Minecraft's, so Maya steps keep their shape). */
export const BLOCK = 0.5;
export const VARIANTS = 3;

export enum B {
  Air = 0,
  Grass,
  Dirt,
  Rock,
  Stone, // cut tuff masonry
  GrassStone, // masonry capped with grass (tops of restored platforms)
  Stair,
  Glyph,
  Rubble, // collapsed temple tops
  Path,
  Gravel,
  Sand,
  Leaves,
  Fig, // dark fig / ceiba foliage
  Log,
  Canvas, // protective roof over the Hieroglyphic Stairway
  Wood,
}

/** Texture layer names (each has VARIANTS tiles), in texture-array order. */
export const LAYERS = [
  "grassTop",
  "grassSide",
  "dirt",
  "path",
  "stone",
  "stoneTop",
  "grassStone",
  "stair",
  "stairTop",
  "glyph",
  "rubble",
  "gravel",
  "sand",
  "leaves",
  "fig",
  "logSide",
  "logTop",
  "canvas",
  "wood",
  "rock",
] as const;
export type LayerName = (typeof LAYERS)[number];
export const L = (name: LayerName) => LAYERS.indexOf(name);

/** [top, side, bottom] texture layer per block id. */
export const FACE_LAYERS: [number, number, number][] = [];
FACE_LAYERS[B.Grass] = [L("grassTop"), L("grassSide"), L("dirt")];
FACE_LAYERS[B.Dirt] = [L("dirt"), L("dirt"), L("dirt")];
FACE_LAYERS[B.Rock] = [L("rock"), L("rock"), L("rock")];
FACE_LAYERS[B.Stone] = [L("stoneTop"), L("stone"), L("stone")];
FACE_LAYERS[B.GrassStone] = [L("grassTop"), L("grassStone"), L("stone")];
FACE_LAYERS[B.Stair] = [L("stairTop"), L("stair"), L("stone")];
FACE_LAYERS[B.Glyph] = [L("stairTop"), L("glyph"), L("stone")];
FACE_LAYERS[B.Rubble] = [L("rubble"), L("rubble"), L("stone")];
FACE_LAYERS[B.Path] = [L("path"), L("dirt"), L("dirt")];
FACE_LAYERS[B.Gravel] = [L("gravel"), L("gravel"), L("gravel")];
FACE_LAYERS[B.Sand] = [L("sand"), L("sand"), L("sand")];
FACE_LAYERS[B.Leaves] = [L("leaves"), L("leaves"), L("leaves")];
FACE_LAYERS[B.Fig] = [L("fig"), L("fig"), L("fig")];
FACE_LAYERS[B.Log] = [L("logTop"), L("logSide"), L("logTop")];
FACE_LAYERS[B.Canvas] = [L("canvas"), L("canvas"), L("canvas")];
FACE_LAYERS[B.Wood] = [L("wood"), L("wood"), L("wood")];

export const MATERIAL_BLOCK: Record<Material, B> = {
  stone: B.Stone,
  grassStone: B.GrassStone,
  stair: B.Stair,
  glyph: B.Glyph,
  rubble: B.Rubble,
  grass: B.Grass,
  path: B.Path,
  gravel: B.Gravel,
  sand: B.Sand,
  wood: B.Wood,
};

/** Minimap colors per material. */
export const MATERIAL_COLOR: Record<Material, string> = {
  stone: "#a5a090",
  grassStone: "#7fae55",
  stair: "#bfb9a6",
  glyph: "#b6aa94",
  rubble: "#8a8679",
  grass: "#66c044",
  path: "#cf7f50",
  gravel: "#cdc2aa",
  sand: "#e1c896",
  wood: "#916236",
};

/** Cutout plant sprites (16 × 32 px, 0.5 × 1 m). */
export const PLANTS = [
  "tallGrass",
  "grass",
  "fern",
  "flowerRed",
  "flowerYellow",
  "flowerPink",
  "flowerWhite",
  "flowerBlue",
  "heliconia",
] as const;
export type PlantName = (typeof PLANTS)[number];
export const PL = (name: PlantName) => PLANTS.indexOf(name);
