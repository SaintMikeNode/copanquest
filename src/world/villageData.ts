// The living side of Copán: a residential ward west of the Great Plaza (toward the El Bosque
// ward), modeled on how Classic Maya families lived. Main reference: Joya de Cerén
// (El Salvador, buried by ash c. AD 600) — clusters of small earthen buildings with thatched
// roofs (sleeping house, storehouse, kitchen) around a patio on low platforms, a domed sweat
// bath (temazcal), maize and agave fields right next to the houses, pottery everywhere.
// Placement is a game layout, not an excavated plan.
//
// Two more wards fill the open ground east and southwest of the Main Group: around AD 750–800
// about 20,000 people lived in the Copán valley, most of them in patio groups like these
// (Webster & Freter 1990, "Settlement history and the Classic collapse at Copán").
import type { Face } from "./siteData";

export type HouseKind = "house" | "store" | "kitchen";

export interface House {
  /** Center [x, z]. */
  at: [number, number];
  /** Footprint of the walls [w (x), d (z)] in meters (multiples of 0.5). */
  size: [number, number];
  door: Face;
  kind: HouseKind;
}

export interface Household {
  name: string;
  /** Patio center and size (packed earth, slightly raised). */
  patio: [number, number, number, number]; // x, z, w, d
  houses: House[];
}

export const HOUSEHOLDS: Household[] = [
  {
    name: "weaver",
    patio: [-118, 116, 16, 16],
    houses: [
      { at: [-118, 103.5], size: [7, 4.5], door: "s", kind: "house" },
      { at: [-129.5, 116], size: [4, 6], door: "e", kind: "store" },
      { at: [-106.5, 116], size: [4.5, 5.5], door: "w", kind: "kitchen" },
      { at: [-118, 128.5], size: [6, 4], door: "n", kind: "house" },
    ],
  },
  // A real patio group (house platforms mapped in OSM; siteData "patio-*"): the houses of this
  // household stand on its platforms around the patio, as Maya houses did.
  {
    name: "kitchen-temazcal",
    patio: [-95, 140, 18, 12],
    houses: [
      { at: [-94.5, 129], size: [9, 4.5], door: "s", kind: "house" },
      { at: [-112, 144], size: [4.5, 6], door: "e", kind: "kitchen" },
      { at: [-77, 140], size: [4.5, 6], door: "w", kind: "store" },
      { at: [-100, 155.5], size: [8, 4.5], door: "n", kind: "house" },
    ],
  },
  {
    name: "farmers",
    patio: [-121, 180, 14, 12],
    houses: [
      { at: [-121, 170.5], size: [6, 4], door: "s", kind: "house" },
      { at: [-131, 181], size: [4, 4.5], door: "e", kind: "store" },
      { at: [-111, 181], size: [4, 4.5], door: "w", kind: "kitchen" },
    ],
  },
  // East ward, along the road to Las Sepulturas.
  {
    name: "east-potters",
    patio: [82, 30, 16, 14],
    houses: [
      { at: [82, 20.5], size: [7, 4.5], door: "s", kind: "house" },
      { at: [72.5, 30], size: [4, 5], door: "e", kind: "store" },
      { at: [91.5, 30], size: [4.5, 5], door: "w", kind: "kitchen" },
      { at: [82, 39], size: [6, 4], door: "n", kind: "house" },
    ],
  },
  {
    name: "east-lane",
    patio: [118, 64, 16, 14],
    houses: [
      { at: [118, 55], size: [6.5, 4.5], door: "s", kind: "house" },
      { at: [107.5, 64], size: [4.5, 5], door: "e", kind: "kitchen" },
      { at: [128.5, 64], size: [4, 5], door: "w", kind: "store" },
      { at: [118, 73], size: [6, 4], door: "n", kind: "house" },
    ],
  },
  {
    name: "east-south",
    patio: [80, 100, 16, 14],
    houses: [
      { at: [80, 91], size: [6.5, 4.5], door: "s", kind: "house" },
      { at: [69.5, 100], size: [4, 5], door: "e", kind: "store" },
      { at: [90.5, 100], size: [4.5, 5], door: "w", kind: "kitchen" },
      { at: [80, 109], size: [6, 4], door: "n", kind: "house" },
    ],
  },
  // West ward, toward the El Bosque ward.
  {
    name: "west-north",
    patio: [-84, 248, 16, 14],
    houses: [
      { at: [-84, 239.5], size: [6.5, 4.5], door: "s", kind: "house" },
      { at: [-94.5, 248], size: [4, 5], door: "e", kind: "store" },
      { at: [-73.5, 248], size: [4.5, 5], door: "w", kind: "kitchen" },
      { at: [-84, 257], size: [6, 4], door: "n", kind: "house" },
    ],
  },
  {
    name: "west-knappers",
    patio: [-128, 296, 14, 16],
    houses: [
      { at: [-128, 286], size: [6, 4], door: "s", kind: "house" },
      { at: [-137.5, 296], size: [4, 4.5], door: "e", kind: "store" },
      { at: [-118.5, 296], size: [4.5, 5], door: "w", kind: "kitchen" },
      { at: [-128, 306], size: [6, 4], door: "n", kind: "house" },
    ],
  },
  {
    name: "west-south",
    patio: [-104, 330, 16, 14],
    houses: [
      { at: [-104, 321], size: [6.5, 4.5], door: "s", kind: "house" },
      { at: [-114.5, 330], size: [4.5, 5], door: "e", kind: "kitchen" },
      { at: [-93.5, 330], size: [4, 5], door: "w", kind: "store" },
      { at: [-104, 339], size: [6, 4], door: "n", kind: "house" },
    ],
  },
];

/** Domed sweat baths. */
export const TEMAZCALS: [number, number][] = [[-87, 158], [92, 78], [-98, 268]];

/** Fields: rectangles planted in rows. */
export const FIELDS: { rect: [number, number, number, number]; crop: "maize" | "agave" }[] = [
  { rect: [-146, 128, -134, 192], crop: "maize" }, // milpa (maize with beans and squash)
  { rect: [-104, 172, -70, 192], crop: "maize" },
  { rect: [-80, 98, -66, 118], crop: "agave" }, // agave (maguey) for fiber, as at Joya de Cerén
  // East ward
  { rect: [108, 84, 134, 122], crop: "maize" },
  { rect: [70, 124, 96, 146], crop: "maize" },
  // West ward
  { rect: [-140, 232, -112, 268], crop: "maize" },
  { rect: [-140, 318, -120, 346], crop: "agave" },
  { rect: [-100, 340, -66, 352], crop: "maize" },
];

/** Market stalls along the entrance trail. */
export const STALLS: { at: [number, number]; goods: "pottery" | "maize" | "cloth" }[] = [
  { at: [-132, 89], goods: "pottery" },
  { at: [-124, 89], goods: "maize" },
  { at: [-116, 89], goods: "cloth" },
  { at: [-108, 88], goods: "pottery" },
];

/** Fruit / cacao trees around the houses. */
export const ORCHARD: [number, number][] = [
  [-70, 124],
  [-69, 156],
  [-68.5, 146],
  [-140, 104],
  [-100, 104],
  // East ward
  [70, 40],
  [64, 50],
  [98, 22],
  [104, 26],
  [134, 58],
  [66, 80],
  // West ward
  [-70, 236],
  [-92, 296],
  [-100, 290],
  [-118, 276],
  [-140, 314],
];

/** Hearths (cooking fires) — smoke rises from these. Filled in from kitchens + temazcals. */
export function hearths(): [number, number][] {
  const out: [number, number][] = [];
  for (const h of HOUSEHOLDS) for (const house of h.houses) if (house.kind === "kitchen") out.push(house.at);
  for (const t of TEMAZCALS) out.push(t);
  return out;
}

/** Half-carved stela in a sculptor's workshop, east of Structure 4. */
export const WORKSHOP: [number, number] = [38, 72];

/** Village areas: no random trees, short grass. [minX, minZ, maxX, maxZ] */
export const VILLAGE_RECTS: [number, number, number, number][] = [
  [-148, 94, -62, 194], // by the entrance
  [62, 0, 136, 148], // east ward
  [-142, 230, -64, 354], // west ward
];

// ---------------------------------------------------------------- ladders

/** Wooden ladders up stepped walls: one segment per terrace (plus the temple wall). */
export const LADDERS: { mound: string; face: Face; offset: number }[] = [
  { mound: "acropolis", face: "n", offset: -73 }, // Acropolis north wall, west of Temple 11's stair
  { mound: "temple16", face: "n", offset: 0 },
  { mound: "temple22", face: "n", offset: 0 },
  { mound: "temple26", face: "e", offset: 0 },
  { mound: "str10", face: "e", offset: 6 },
];

// ---------------------------------------------------------------- jade beads (collectibles)

/** Jade beads to find. `mound` = place on that mound's top; otherwise ground at `at`. */
export const JADES: { id: string; at: [number, number]; mound?: string }[] = [
  { id: "j-temple22", at: [106, 232], mound: "temple22" },
  { id: "j-temple16", at: [72, 330], mound: "temple16" },
  { id: "j-temple26", at: [90, 204], mound: "temple26" },
  { id: "j-str10", at: [33, 169], mound: "str10" },
  { id: "j-temple11", at: [-2, 262], mound: "temple11" },
  { id: "j-str4", at: [-5, 65.5], mound: "str4" },
  { id: "j-west-stands", at: [-72, 0], mound: "str1-west" },
  { id: "j-ceiba", at: [-35, 222] },
  { id: "j-temazcal", at: [-82, 158] },
  { id: "j-milpa", at: [-140, 172] },
];
