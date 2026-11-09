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
  Canvas, // unused
  Wood,
  Adobe, // earthen (wattle-and-daub) house walls, like Joya de Cerén
  Thatch, // palm-thatch roofs
  Ladder, // wooden ladders on tall walls (climbable zones are in siteData)
  Cloth, // striped market awnings
  Pottery,
  Earth, // packed-earth house patios
  Maize, // baskets / piles of maize cobs
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
  "adobe",
  "thatch",
  "ladder",
  "cloth",
  "pottery",
  "earth",
  "maize",
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
FACE_LAYERS[B.Adobe] = [L("earth"), L("adobe"), L("adobe")];
FACE_LAYERS[B.Thatch] = [L("thatch"), L("thatch"), L("thatch")];
FACE_LAYERS[B.Ladder] = [L("wood"), L("ladder"), L("wood")];
FACE_LAYERS[B.Cloth] = [L("cloth"), L("cloth"), L("cloth")];
FACE_LAYERS[B.Pottery] = [L("pottery"), L("pottery"), L("pottery")];
FACE_LAYERS[B.Earth] = [L("earth"), L("dirt"), L("dirt")];
FACE_LAYERS[B.Maize] = [L("maize"), L("maize"), L("maize")];

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
  adobe: B.Adobe,
  thatch: B.Thatch,
  ladder: B.Ladder,
  cloth: B.Cloth,
  pottery: B.Pottery,
  earth: B.Earth,
  maize: B.Maize,
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
  adobe: "#d2b48a",
  thatch: "#c9a45a",
  ladder: "#916236",
  cloth: "#d23a2e",
  pottery: "#c46a3a",
  earth: "#b89466",
  maize: "#f2c42c",
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
  "maizeLow",
  "maizeTop",
  "agave",
  "squash",
] as const;
export type PlantName = (typeof PLANTS)[number];
export const PL = (name: PlantName) => PLANTS.indexOf(name);
