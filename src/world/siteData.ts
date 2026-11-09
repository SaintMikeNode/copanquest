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
  | "rosaRed"
  | "rosaGreen"
  | "rosaYellow"
  | "rosaMask"
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
  /** Ruined top: remove up to this many blocks per column (axis-aligned boxes only). */
  erode?: number;
}

/**
 * Ruined two-room building on top of a ball-court structure: thick walls, a doorway into each
 * room on the alley side. x0..x1, z0..z1 = outer footprint; y = floor; alleyX = the side the
 * doors face. Walls 1 m thick, 2.5 m tall before erosion (est.).
 */
function ballcourtRooms(id: string, x0: number, x1: number, z0: number, z1: number, y: number, doorsEast: boolean): Block[] {
  const h = 2.5;
  const t = 1;
  const cy = y + h / 2;
  const zm = (z0 + z1) / 2;
  const wall = (k: string, ax: number, bx: number, az: number, bz: number): Block => ({
    id: `${id}-${k}`,
    position: [(ax + bx) / 2, cy, (az + bz) / 2],
    size: [bx - ax, h, bz - az],
    material: "stone",
    collider: true,
    erode: 2,
  });
  const back = doorsEast ? [x0, x0 + t] : [x1 - t, x1];
  const front = doorsEast ? [x1 - t, x1] : [x0, x0 + t];
  const door = 1.5;
  const d1 = (z0 + zm) / 2;
  const d2 = (zm + z1) / 2;
  return [
    wall("back", back[0], back[1], z0, z1),
    wall("end-n", x0, x1, z0, z0 + t),
    wall("end-s", x0, x1, z1 - t, z1),
    wall("mid", x0, x1, zm - t / 2, zm + t / 2),
    wall("front-a", front[0], front[1], z0 + t, d1 - door / 2),
    wall("front-b", front[0], front[1], d1 + door / 2, zm - t / 2),
    wall("front-c", front[0], front[1], zm + t / 2, d2 - door / 2),
    wall("front-d", front[0], front[1], d2 + door / 2, z1 - t),
  ];
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
    // Stairs up the south end from the Court of the Hieroglyphic Stairway (seen in photos from
    // Temple 11). The ruined room building on top sits on the north part (BLOCKS below).
    // Plus outer stairs up to the rooms on the north part (west side; Stela 1 stands south of them).
    stairs: [{ face: "s", width: 6, run: 3 }, { face: "w", width: 10, offset: 8, run: 3 }],
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
    // Stairs up the south end from the Court of the Hieroglyphic Stairway (seen in photos from
    // Temple 11). The ruined room building on top sits on the north part (BLOCKS below).
    // Plus outer stairs up to the rooms on the north part (east side).
    stairs: [{ face: "s", width: 6, run: 3 }, { face: "e", width: 10, offset: -8, run: 3 }],
    material: "stone",
  },

  // Stepped platform at the north end of the ball court, crowned by Stela 2 with Altar L
  // (Mesoweb Copán tour; FLAAR). Footprint from the OSM outlines (ways 384158423 and 384552931:
  // x 24–50, z 121–139, upper level x 27–50, z 124–136). It lies east of the alley's axis; from
  // Temple 11 (the classic photo viewpoint) it appears right behind the court. Height est.
  {
    id: "ballcourt-north",
    name: { es: "Plataforma norte del Juego de Pelota", en: "Ball Court north platform" },
    center: [37, 130],
    size: [26, 18],
    tiers: 2,
    tierHeight: 1.25,
    setback: 2.5,
    stairs: [{ face: "s", width: 18, run: 3 }],
    material: "stone",
  },
  // Raised terrace east of the ball court that runs south to the base of Temple 26: the stepped
  // terrace beside Structure 10 in photos from the south. Footprint from OSM way 384158423
  // (x 50–66, z 121–154 and x 44.5–67, z 154–183.5). Heights est.
  {
    id: "ballcourt-ne",
    center: [58, 137.5],
    size: [16, 33],
    tiers: 2,
    tierHeight: 1.5,
    setback: 1.5,
    material: "stone",
  },
  {
    id: "ballcourt-east",
    center: [55.75, 168.75],
    size: [22.5, 29.5],
    tiers: 1,
    tierHeight: 3,
    setback: 1,
    stairs: [{ face: "w", width: 18, run: 3 }],
    material: "stone",
  },

  // ---------- Other ruins mapped in OpenStreetMap (wall outlines; heights est.) ----------
  // Western complex: a large platform with a stepped mound at each end (ways 384324704,
  // 384324739, 384324726…; also on the park's scale model).
  { id: "west-platform", center: [-117.3, 30.45], size: [43.2, 60.5], tiers: 1, tierHeight: 1.5, setback: 1, material: "stone" },
  { id: "west-mound-n", center: [-117.4, -14.2], size: [20.6, 22.5], tiers: 3, tierHeight: 1.5, setback: 2.5, stairs: [{ face: "s", width: 6, run: 3 }], material: "stone" },
  { id: "west-mound-s", center: [-116.4, 58.4], size: [18.7, 26], tiers: 3, tierHeight: 1.5, setback: 2.5, stairs: [{ face: "n", width: 6, run: 3 }], material: "stone" },
  // Long platform west of the middle plaza (way 384552932).
  { id: "west-long-platform", center: [-59.25, 133.45], size: [13.5, 56.7], tiers: 2, tierHeight: 1, setback: 2, material: "stone" },
  // Patio group by the entrance: house platforms around a patio (ways 384552846, 384552882,
  // 384552885, 384552867, 384552850). The village's houses stand on them (villageData.ts).
  { id: "patio-w1", center: [-126.4, 144.8], size: [7.2, 11.8], tiers: 1, tierHeight: 0.5, setback: 1, material: "stone" },
  { id: "patio-w2", center: [-114, 144.35], size: [13.2, 25.1], tiers: 2, tierHeight: 0.5, setback: 2, material: "stone" },
  { id: "patio-n", center: [-94.7, 129.25], size: [18.8, 7.9], tiers: 1, tierHeight: 0.5, setback: 1, material: "stone" },
  { id: "patio-s", center: [-96.3, 156.4], size: [27, 17.4], tiers: 1, tierHeight: 0.5, setback: 1, material: "stone" },
  { id: "patio-e", center: [-77.25, 140.3], size: [12.1, 18.2], tiers: 1, tierHeight: 0.5, setback: 1, material: "stone" },
  // Small mound west of the Court of the Hieroglyphic Stairway (way 384552875).
  { id: "west-small-mound", center: [-96.65, 209.3], size: [12.7, 15], tiers: 2, tierHeight: 1, setback: 2, material: "stone" },
  // Mound 7 with Altar O, and Mound 8 (OSM names; ways 384552920/384552924, 384324740…).
  { id: "mound7", center: [-44.55, 212.6], size: [13.7, 21.6], tiers: 2, tierHeight: 0.75, setback: 2.5, stairs: [{ face: "e", width: 9, run: 6 }], material: "stone" },
  { id: "mound8", center: [-51.45, 261.55], size: [19.1, 23.3], tiers: 2, tierHeight: 1.25, setback: 3, material: "stone" },
  // Platforms west of the Acropolis (ways 384552922/384552903, 384552916/384552852).
  { id: "west-acropolis-a", center: [-73.25, 291.85], size: [23.9, 31.3], tiers: 2, tierHeight: 1, setback: 5, material: "stone" },
  { id: "west-acropolis-b", center: [-57.85, 313.8], size: [12.5, 12.6], tiers: 2, tierHeight: 1, setback: 2.5, material: "stone" },
  // Northeast of the Great Plaza: a long gallery platform and Mound 3 by Stela J
  // (ways 384324723, 386256673, 384324761; 384324735, 389063808…).
  { id: "ne-gallery", center: [90.8, -5.35], size: [69.6, 25.7], tiers: 1, tierHeight: 1.5, setback: 1, material: "stone" },
  { id: "ne-gallery-s1", center: [87, 9.5], size: [23.8, 10.4], tiers: 1, tierHeight: 1, setback: 1, material: "stone" },
  { id: "ne-gallery-s2", center: [114.6, 7.4], size: [29.2, 14], tiers: 1, tierHeight: 1, setback: 1, material: "stone" },
  { id: "mound3", center: [134.2, 35.1], size: [20.6, 27], tiers: 3, tierHeight: 1.5, setback: 2.5, material: "stone" },
  // Small house platforms near the east edge (ways 389063820, 389063835, 389063830, 389063834).
  { id: "east-house-a", center: [180.85, 131.65], size: [12.1, 19.1], tiers: 1, tierHeight: 0.75, setback: 1, material: "stone" },
  { id: "east-house-b", center: [178.75, 150.1], size: [14.7, 12.8], tiers: 1, tierHeight: 0.75, setback: 1, material: "stone" },
  { id: "east-house-c", center: [192, 116.1], size: [8, 4.8], tiers: 1, tierHeight: 0.5, setback: 1, material: "stone" },
  { id: "east-house-d", center: [182.1, 106.9], size: [5.8, 21.4], tiers: 1, tierHeight: 0.5, setback: 1, material: "stone" },

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
  // Ball court: ruined room buildings on the north part of Structures 9 and 10 (photos from the
  // south show them there; the south part of each top is open).
  ...ballcourtRooms("str9-rooms", 8, 14, 155, 167, 3, true),
  ...ballcourtRooms("str10-rooms", 30, 36, 155, 167, 3, false),
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

  // Sacbe (causeway) toward Las Sepulturas, ~800 m east (OSM) — leads off the playable area
  { id: "sacbe", position: [176, 0, 15], size: [50, 0, 8], rotation: [0, 0.187, 0], material: "gravel" },
];

/** Game trails (dirt) connecting the main areas. */
export const PATHS: PathLine[] = [
  // From the visitor entrance (west) into the Great Plaza and up to Stela D
  { y: 0, width: 3, points: [[-150, 82], [-100, 80], [-62, 74], [-32, 66], [-22, 50], [-20, 30], [-8, 10], [-4, -12], [-2, -20]] },
  // Plaza loop past Stelae F and H
  { y: 0, width: 2.5, points: [[-8, 10], [14, 12], [26, 30], [24, 44], [14, 56]] },
  // 2: From the entrance trail down the west side of the middle plaza, west of the ball court
  // (the court itself stays off the trails), on to the Acropolis west stair.
  // Passes between Mound 7, the big ceiba and the Acropolis' northwest corner, then between
  // Mound 8 and the Acropolis, ending at the foot of the Acropolis' west stair (z 280–296).
  { y: 0, width: 3, points: [[-32, 66], [-42, 84], [-39, 101], [-30, 118], [-24, 136], [-20, 158], [-22, 182], [-22, 206], [-24, 221], [-34, 224.5], [-38, 236], [-39, 248], [-39, 276], [-54, 277], [-55, 288]] },
  // 3: South past Structure 4, then across the middle plaza to join trail 2
  { y: 0, width: 3, points: [[14, 56], [13, 90], [12, 102], [-4, 118], [-24, 136]] },
  // 4: Spur east across the Court of the Hieroglyphic Stairway, south of the ball court
  { y: 0, width: 2.5, points: [[-22, 206], [-4, 210], [20, 208], [38, 205], [50, 204]] },
  // Across the West Court to Altar Q, then around Temple 16 to the East Court
  { y: 12, width: 2.5, points: [[-30, 328], [0, 324], [30, 326], [43, 330]] },
  { y: 12, width: 2.5, points: [[30, 326], [44, 300], [62, 293], [80, 292], [100, 288], [112, 270], [106, 250]] },
  // 7: East ward: from the Great Plaza around the south end of the east stands to the sacbe,
  // passing between the northeast gallery and Mound 3
  { y: 0, width: 2.5, points: [[24, 44], [36, 62], [56, 62], [80, 52], [100, 40], [114, 19], [146, 17], [151, 20]] },
  // 8: East ward, south lane between the houses
  { y: 0, width: 2, points: [[100, 40], [104, 70], [100, 100], [90, 118]] },
  // 9: West ward lane, off trail 2 (between Mound 7 and Mound 8, west of the real platforms)
  { y: 0, width: 2, points: [[-38, 236], [-60, 231], [-82, 231], [-102, 236], [-108, 262], [-110, 290], [-106, 312]] },
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
  { position: [-48, 176], kind: "fig" },
  { position: [72, 152], kind: "fig" },
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
  { id: "stela-2", kind: "stela", position: [36.8, 130.6], baseY: 2.5, height: 3, width: 1 },
  { id: "altar-l", kind: "altar", position: [36.8, 127.5], baseY: 2.5, height: 1, width: 1.5 },
  { id: "stela-1", kind: "stela", position: [4.1, 170.3], height: 3, width: 1 },

  // Court of the Hieroglyphic Stairway
  { id: "stela-m", kind: "stela", position: [55.1, 204.9], height: 3.5, width: 1, rotY: -Math.PI / 2 },
  { id: "altar-m", kind: "altar", position: [52.3, 204.9], height: 1, width: 1.5 },
  { id: "stela-n", kind: "stela", position: [15.4, 229.6], height: 3.5, width: 1, rotY: Math.PI },
  { id: "altar-o", kind: "altar", position: [-41.7, 212.4], baseY: 1.5, height: 1, width: 1.5 },

  // Acropolis
  { id: "stela-p", kind: "stela", position: [42.6, 307.2], baseY: ACROPOLIS_TOP, height: 3, width: 1 },
  // Altar Q: in front of Temple 16's west stair (position est.). ≈ 1.2 × 1.2 × 0.76 m.
  { id: "altar-q", kind: "altar", position: [45, 330], baseY: ACROPOLIS_TOP, height: 1, width: 1.5 },
];

/**
 * Rosalila (late 6th century, Asociación Copán), buried intact inside Temple 16. Three levels,
 * ~12.9 m tall, base 18.5 × 12.5 m, main façade to the west. The model follows the full-size
 * replica in the Copán Sculpture Museum (photos on Wikimedia Commons): see `rosalilaArt.ts`.
 * In the game it stands in a chamber inside Temple 16 (the real tunnels are much narrower),
 * with room in front of the west façade to see it whole, reached by a tunnel from the East
 * Court near the tunnel entrances mapped in OpenStreetMap. The chamber stays inside the 4th
 * terrace of the mound (x 60.5–83.5 at that height) so the outside isn't darkened.
 */
export const ROSALILA = {
  /** Center of the building's base [x, z]; the west façade faces −x. */
  center: [75.75, 330] as [number, number],
  baseY: ACROPOLIS_TOP,
  /** Chamber as [minX, maxX, minZ, maxZ] and its height. */
  chamber: { x0: 61.5, x1: 82.5, z0: 312, z1: 348, height: 15 },
  /** Tunnel along x at this z, from Temple 16's east face to the chamber. */
  tunnel: { z: 316, width: 2.5, height: 3.5, fromX: 92, toX: 82.5 },
  /** Façade width (north–south) and depth (east–west) of the first level. */
  width: 18.5,
  depth: 12.5,
};

/** Labels for the minimap. */
export const MAP_LABELS: { position: [number, number]; text: L10n }[] = [
  { position: [-5, 5], text: { es: "Gran Plaza", en: "Great Plaza" } },
  { position: [-140, 74], text: { es: "Entrada", en: "Entrance" } },
  { position: [22, 145], text: { es: "Juego de Pelota", en: "Ball Court" } },
  { position: [12, 196], text: { es: "Escalinata", en: "Stairway" } },
  { position: [13, 305], text: { es: "Patio Occ.", en: "West Court" } },
  { position: [116, 300], text: { es: "Patio Or.", en: "East Court" } },
  { position: [170, -5], text: { es: "→ Las Sepulturas", en: "→ Las Sepulturas" } },
  { position: [100, -6], text: { es: "Barrio este", en: "East ward" } },
  { position: [-100, 228], text: { es: "Barrio oeste", en: "West ward" } },
];
