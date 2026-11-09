// Layout of Copán's Principal Group.
//
// Coordinates are local meters: origin = Stela C in the Great Plaza (OpenStreetMap node
// 3889488600, 14.8400755 N, 89.1420256 W), x = east, z = SOUTH (north is −z), y = up,
// 0 = Great Plaza floor.
//
// POSITIONS come from OpenStreetMap (© OpenStreetMap contributors, ODbL), converted with
//   x = (lon − lon0) × 107 696.6,  z = −(lat − lat0) × 110 574.
// Published figures used: Hieroglyphic Stairway ≈ 10 m wide, ≈ 21 m high, 62 steps, faces
// west (Penn Museum, Wikipedia); Temple 16 ≈ 20 m above the West Court; ball-court alley
// ≈ 28.4 × 7 m, oriented north–south.
// Everything marked "est." (most heights, platform sizes) is an ESTIMATE that should be
// checked against the UNAH 2016 survey. Change numbers here only.
//
// ART DIRECTION: Copán as it looks TODAY — restored grey-beige tuff masonry with moss and
// grass on top, temple tops in ruins, green lawns, big shade trees and the river cut at
// El Corte — interpreted as a game world, not a photo replica.
import type { L10n } from "../i18n";

export type Face = "n" | "s" | "e" | "w";

/** Voxel block materials (see src/voxel/blocks.ts). */
export type Material =
  | "stone" // restored tuff masonry
  | "grassStone" // masonry capped with grass
  | "stair"
  | "glyph" // carved hieroglyphic risers
  | "rubble" // collapsed temple tops
  | "grass"
  | "path"
  | "gravel"
  | "sand"
  | "wood"
  | "adobe"
  | "thatch"
  | "ladder"
  | "cloth"
  | "pottery"
  | "earth"
  | "maize";

export interface Stair {
  face: Face;
  width: number;
  /** Offset along the face from its center (m). */
  offset?: number;
  /** Horizontal length. Defaults to (tiers + 1) × setback, which clears the tier corners. */
  run?: number;
  /** Number of steps in the real monument (visual steps follow the 0.5 m block grid). */
  steps?: number;
  /** Carved hieroglyphic steps (Hieroglyphic Stairway). */
  glyphs?: boolean;
}

/** A stepped platform or pyramid: `tiers` boxes, each `setback` smaller per side. */
export interface Mound {
  id: string;
  name?: L10n;
  /** Footprint center [x, z]. */
  center: [number, number];
  /** Elevation of the base (m). */
  baseY?: number;
  /** Footprint [width (x), depth (z)]. */
  size: [number, number];
  tiers: number;
  tierHeight: number;
  setback: number;
  stairs?: Stair[];
  /** Superstructure (temple) on top: [width, height, depth]. */
  temple?: [number, number, number];
  /** Temple superstructure is ruined (eroded top), as it is today. Default true. */
  ruin?: boolean;
  material?: Material;
}

/** Free-form box (benches, sloped ball-court walls, floors). Center-positioned. */
export interface Block {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  /** Rotation in radians [x, y, z]. */
  rotation?: [number, number, number];
  material?: Material;
  collider?: boolean;
}

/** Dirt paths (present-day visitor trails, laid out for the game). y = approximate surface. */
export interface PathLine {
  points: [number, number][];
  width: number;
  y: number;
}

export interface Monument {
  id: string;
  kind: "stela" | "altar";
  position: [number, number];
  baseY?: number;
  height: number;
  width: number;
  /** Facing (radians around y). 0 = faces south (+z), +π/2 = faces east. */
  rotY?: number;
}

/** Walkable area (outside it there are invisible walls). */
export const BOUNDS = { minX: -150, maxX: 200, minZ: -70, maxZ: 390 };

/** Terrain is flattened to y = 0 inside this rectangle (smooth falloff outside). */
export const FLAT_CORE = { minX: -165, maxX: 210, minZ: -85, maxZ: 400, falloff: 120 };

/** Hand-sculpted terrain: rectangles forced to a height (applied after flattening). */
export const TERRAIN_SCULPT = [
  // Copán River channel below El Corte, the eroded east face of the Acropolis
  { minX: 150, maxX: 240, minZ: 215, maxZ: 420, y: -9, falloff: 25 },
];

/** Extra invisible walls [centerX, centerZ, width(x), depth(z)]: the El Corte cliff edge. */
export const EXTRA_WALLS: [number, number, number, number][] = [[143.5, 299, 1, 164]];

/** Height of the Acropolis courts above the Great Plaza (est.). */
export const ACROPOLIS_TOP = 12;

/** Start at the visitor entrance (west), next to the guide, looking east toward the city. */
export const PLAYER_SPAWN: [number, number, number] = [-144, 2, 80];
/** Camera yaw at spawn (FollowCamera convention: 0 = looking north, −π/2 = looking east). */
export const SPAWN_YAW = -Math.PI / 2;

export const MOUNDS: Mound[] = [
  // ---------- Great Plaza (north) ----------
  {
    id: "str2-north",
    name: { es: "Estructura 2", en: "Structure 2" },
    center: [-5, -33],
    size: [100, 10],
    tiers: 3,
    tierHeight: 1.5,
    setback: 1,
    stairs: [{ face: "s", width: 60 }],
    material: "stone",
  },
  {
    id: "str1-west",
    name: { es: "Graderías del oeste", en: "West stands" },
    center: [-70, 18],
    size: [32, 90],
    tiers: 4,
    tierHeight: 1.2,
    setback: 2,
    stairs: [{ face: "e", width: 70 }],
    material: "stone",
  },
  {
    id: "str3-east",
    name: { es: "Graderías del este", en: "East stands" },
    center: [49, 15],
    size: [8, 80],
    tiers: 3,
    tierHeight: 1,
    setback: 1,
    stairs: [{ face: "w", width: 60 }],
    material: "stone",
  },
  {
    id: "str4",
    name: { es: "Estructura 4", en: "Structure 4" },
    center: [-5, 65.5],
    size: [22, 23],
    tiers: 4,
    tierHeight: 1.5,
    setback: 2,
    stairs: [
      { face: "n", width: 6 },
      { face: "s", width: 6 },
      { face: "e", width: 6 },
      { face: "w", width: 6 },
    ],
    material: "stone",
  },

  // ---------- Ball Court A-III (alley 28.4 × 7 m, north–south, centered x = 22) ----------
  {
    id: "str9",
    name: { es: "Estructura 9 (Juego de Pelota)", en: "Structure 9 (Ball Court)" },
    center: [11, 169],
    size: [8, 30],
    tiers: 1,
    tierHeight: 3,
    setback: 1,
    temple: [5, 4, 24],
    material: "stone",
  },
  {
    id: "str10",
    name: { es: "Estructura 10 (Juego de Pelota)", en: "Structure 10 (Ball Court)" },
    center: [33, 169],
    size: [8, 30],
    tiers: 1,
    tierHeight: 3,
    setback: 1,
    temple: [5, 4, 24],
    material: "stone",
  },

  // ---------- Temple 26 and the Hieroglyphic Stairway (west face, x 59 → 82) ----------
  {
    id: "temple26",
    name: { es: "Templo 26", en: "Temple 26" },
    center: [90, 204],
    size: [49, 44],
    tiers: 6,
    tierHeight: 3.5,
    setback: 3.3,
    stairs: [{ face: "w", width: 10, steps: 62, glyphs: true }],
    temple: [12, 5, 10],
    material: "stone",
  },

  // ---------- Acropolis (south) ----------
  {
    id: "acropolis",
    name: { es: "Acrópolis", en: "Acropolis" },
    center: [53, 308],
    size: [178, 140],
    tiers: 2,
    tierHeight: ACROPOLIS_TOP / 2,
    setback: 3,
    material: "stone",
    stairs: [
      // Steep stair up from the Court of the Hieroglyphic Stairway toward Temple 11 (est.)
      { face: "n", width: 30, offset: -53, run: 9 },
      // West access (est.)
      { face: "w", width: 16, offset: 20, run: 16 },
    ],
  },
  {
    id: "acropolis-ne",
    center: [98.5, 228],
    size: [87, 22],
    tiers: 2,
    tierHeight: ACROPOLIS_TOP / 2,
    setback: 3,
    material: "stone",
  },
  {
    id: "temple11",
    name: { es: "Templo 11", en: "Temple 11" },
    center: [-2, 262],
    baseY: ACROPOLIS_TOP,
    size: [60, 34],
    tiers: 2,
    tierHeight: 3,
    setback: 2,
    stairs: [
      { face: "n", width: 20 },
      { face: "s", width: 20 },
    ],
    temple: [30, 6, 12],
    material: "stone",
  },
  {
    id: "platform13",
    name: { es: "Plataforma 13", en: "Platform 13" },
    center: [-6, 331.5],
    baseY: ACROPOLIS_TOP,
    size: [30, 21],
    tiers: 1,
    tierHeight: 1.5,
    setback: 1.5,
    stairs: [{ face: "e", width: 12 }],
    material: "stone",
  },
  {
    id: "temple16",
    name: { es: "Templo 16", en: "Temple 16" },
    center: [72, 330],
    baseY: ACROPOLIS_TOP,
    size: [38, 56],
    tiers: 5,
    tierHeight: 4,
    setback: 2.5,
    stairs: [{ face: "w", width: 8 }],
    temple: [12, 5, 12],
    material: "stone",
  },
  {
    id: "platform25",
    name: { es: "Plataforma 25", en: "Platform 25" },
    center: [69.5, 274.5],
    baseY: ACROPOLIS_TOP,
    size: [11, 37],
    tiers: 1,
    tierHeight: 2,
    setback: 1,
    material: "stone",
  },
  {
    id: "temple22a",
    name: { es: "Templo 22A", en: "Temple 22A" },
    center: [82, 222],
    baseY: ACROPOLIS_TOP,
    size: [16, 10],
    tiers: 2,
    tierHeight: 2,
    setback: 1,
    temple: [8, 4, 6],
    material: "stone",
  },
  {
    id: "temple22",
    name: { es: "Templo 22", en: "Temple 22" },
    center: [106, 232],
    baseY: ACROPOLIS_TOP,
    size: [36, 22],
    tiers: 3,
    tierHeight: 3,
    setback: 1.5,
    stairs: [{ face: "s", width: 10 }],
    temple: [20, 5, 8],
    material: "stone",
  },
  {
    id: "jaguar-stairs",
    name: { es: "Escalinata de los Jaguares", en: "Jaguar Stairway" },
    center: [86, 285],
    baseY: ACROPOLIS_TOP,
    size: [6, 24],
    tiers: 2,
    tierHeight: 0.9,
    setback: 1.2,
    stairs: [{ face: "e", width: 14 }],
    material: "stone",
  },
  {
    id: "temple18",
    name: { es: "Templo 18", en: "Temple 18" },
    center: [118, 362],
    baseY: ACROPOLIS_TOP,
    size: [20, 16],
    tiers: 2,
    tierHeight: 3,
    setback: 1.5,
    stairs: [{ face: "n", width: 6 }],
    temple: [10, 4, 8],
    material: "stone",
  },
];

export const BLOCKS: Block[] = [
  // Ball court: sloped playing walls on both sides of the alley (x 18.5–25.5)
  {
    id: "ballcourt-slope-w",
    position: [16.9, 1.3, 169],
    size: [4.4, 0.6, 28],
    rotation: [0, 0, -0.6],
    material: "stone",
    collider: true,
  },
  {
    id: "ballcourt-slope-e",
    position: [27.1, 1.3, 169],
    size: [4.4, 0.6, 28],
    rotation: [0, 0, 0.6],
    material: "stone",
    collider: true,
  },
  { id: "ballcourt-alley", position: [22, 0, 169], size: [7, 0, 28.4], material: "sand" },
  { id: "ballcourt-marker-n", position: [22, 0, 159], size: [1.5, 0, 1.5], material: "stone" },
  { id: "ballcourt-marker-c", position: [22, 0, 169], size: [1.5, 0, 1.5], material: "stone" },
  { id: "ballcourt-marker-s", position: [22, 0, 179], size: [1.5, 0, 1.5], material: "stone" },

  // Sacbe (causeway) toward Las Sepulturas, ~800 m east (OSM) — future zone, stub only
  { id: "sacbe", position: [176, 0, 15], size: [50, 0, 8], rotation: [0, 0.187, 0], material: "gravel" },
];

/** Game trails (dirt) connecting the main areas. */
export const PATHS: PathLine[] = [
  // From the visitor entrance (west) into the Great Plaza and up to Stela D
  { y: 0, width: 3, points: [[-150, 82], [-100, 80], [-62, 74], [-32, 66], [-22, 50], [-20, 30], [-8, 10], [-4, -12], [-2, -20]] },
  // Plaza loop past Stelae F and H
  { y: 0, width: 2.5, points: [[-8, 10], [14, 12], [26, 30], [24, 44], [14, 56]] },
  // South past Structure 4 to the ball court and the Hieroglyphic Stairway
  { y: 0, width: 3, points: [[14, 56], [13, 90], [14, 130], [22, 150], [22, 186], [32, 200], [50, 204]] },
  // To the Acropolis west stair
  { y: 0, width: 3, points: [[22, 190], [-8, 200], [-30, 215], [-44, 240], [-56, 290], [-58, 328], [-52, 328]] },
  // Across the West Court to Altar Q, then around Temple 16 to the East Court
  { y: 12, width: 2.5, points: [[-30, 328], [0, 324], [30, 326], [43, 330]] },
  { y: 12, width: 2.5, points: [[30, 326], [44, 300], [62, 293], [80, 292], [100, 288], [112, 270], [106, 250]] },
];

/** Lawns kept open (no trees, short grass only). [minX, minZ, maxX, maxZ] */
export const OPEN_AREAS: [number, number, number, number][] = [
  [-50, -24, 44, 62], // Great Plaza
  [-40, 78, 44, 148], // Middle plaza
  [4, 150, 40, 190], // Ball court
  [-28, 186, 58, 232], // Court of the Hieroglyphic Stairway
  [-24, 286, 50, 350], // West Court
  [90, 250, 140, 320], // East Court
];

/** Trees placed by hand. kind: "ceiba" (huge, flat crown) | "fig" | "tree". */
export const FIXED_TREES: { position: [number, number]; kind: "ceiba" | "fig" | "tree"; note?: string }[] = [
  { position: [-28.2, 228.5], kind: "ceiba", note: "OSM node 3878873479 'Guanacaste tree'" },
  { position: [-62, -40], kind: "ceiba" },
  { position: [60, 70], kind: "ceiba" },
  { position: [-55, 150], kind: "fig" },
  { position: [48, 160], kind: "fig" },
  { position: [128, 330], kind: "ceiba" },
];

export const MONUMENTS: Monument[] = [
  // Great Plaza (OSM positions). Heights and widths are est.
  { id: "stela-d", kind: "stela", position: [-0.9, -25.1], height: 4, width: 1 },
  { id: "altar-d", kind: "altar", position: [-0.9, -21.8], height: 1, width: 2 },
  { id: "stela-c", kind: "stela", position: [0, 0], height: 3.5, width: 1 },
  { id: "altar-c", kind: "altar", position: [0, 3.5], height: 1, width: 2 },
  { id: "stela-b", kind: "stela", position: [-9.4, 16.4], height: 3.5, width: 1 },
  { id: "stela-f", kind: "stela", position: [24, 18.4], height: 3.5, width: 1 },
  { id: "altar-g", kind: "altar", position: [24.5, 28.1], height: 1, width: 2 },
  { id: "stela-4", kind: "stela", position: [-16.5, 32.2], height: 3.5, width: 1, rotY: Math.PI / 2 },
  { id: "altar-4", kind: "altar", position: [-13.4, 32.2], height: 1, width: 1.5 },
  { id: "stela-h", kind: "stela", position: [29.7, 45.7], height: 3.5, width: 1, rotY: -Math.PI / 2 },
  { id: "stela-a", kind: "stela", position: [-16.6, 48.4], height: 3.5, width: 1, rotY: Math.PI / 2 },
  { id: "stela-i", kind: "stela", position: [50.2, 53.4], height: 3, width: 1 },
  { id: "stela-e", kind: "stela", position: [-68.6, 22.4], baseY: 4.8, height: 3, width: 1, rotY: Math.PI / 2 },
  { id: "stela-j", kind: "stela", position: [153.9, 56.9], height: 3, width: 1 },
  { id: "stela-3", kind: "stela", position: [-0.5, 94.5], height: 3, width: 1 },
  { id: "altar-k", kind: "altar", position: [-47.6, 116], height: 1, width: 1.5 },
  { id: "stela-2", kind: "stela", position: [36.8, 130.6], height: 3, width: 1 },
  { id: "altar-l", kind: "altar", position: [36.8, 127.5], height: 1, width: 1.5 },
  { id: "stela-1", kind: "stela", position: [4.1, 170.3], height: 3, width: 1 },

  // Court of the Hieroglyphic Stairway
  { id: "stela-m", kind: "stela", position: [55.1, 204.9], height: 3.5, width: 1, rotY: -Math.PI / 2 },
  { id: "altar-m", kind: "altar", position: [52.3, 204.9], height: 1, width: 1.5 },
  { id: "stela-n", kind: "stela", position: [15.4, 229.6], height: 3.5, width: 1, rotY: Math.PI },
  { id: "altar-o", kind: "altar", position: [-41.7, 212.4], height: 1, width: 1.5 },

  // Acropolis
  { id: "stela-p", kind: "stela", position: [42.6, 307.2], baseY: ACROPOLIS_TOP, height: 3, width: 1 },
  // Altar Q: in front of Temple 16's west stair (position est.). ≈ 1.2 × 1.2 × 0.76 m.
  { id: "altar-q", kind: "altar", position: [45, 330], baseY: ACROPOLIS_TOP, height: 1, width: 1.5 },
];

/** Labels for the minimap. */
export const MAP_LABELS: { position: [number, number]; text: L10n }[] = [
  { position: [-5, 5], text: { es: "Gran Plaza", en: "Great Plaza" } },
  { position: [-140, 74], text: { es: "Entrada", en: "Entrance" } },
  { position: [22, 145], text: { es: "Juego de Pelota", en: "Ball Court" } },
  { position: [12, 196], text: { es: "Escalinata", en: "Stairway" } },
  { position: [13, 305], text: { es: "Patio Occ.", en: "West Court" } },
  { position: [116, 300], text: { es: "Patio Or.", en: "East Court" } },
  { position: [170, -5], text: { es: "→ Las Sepulturas", en: "→ Las Sepulturas" } },
];
