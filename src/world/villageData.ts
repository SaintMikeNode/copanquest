// The living side of Copán: a residential ward west of the Great Plaza (toward the El Bosque
// ward), modeled on how Classic Maya families lived. Main reference: Joya de Cerén
// (El Salvador, buried by ash c. AD 600) — clusters of small earthen buildings with thatched
// roofs (sleeping house, storehouse, kitchen) around a patio on low platforms, a domed sweat
// bath (temazcal), maize and agave fields right next to the houses, pottery everywhere.
// Placement is a game layout, not an excavated plan.
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
  {
    name: "kitchen-temazcal",
    patio: [-88, 140, 16, 14],
    houses: [
      { at: [-88, 128.5], size: [6.5, 4.5], door: "s", kind: "house" },
      { at: [-99.5, 140], size: [4.5, 5], door: "e", kind: "kitchen" },
      { at: [-76.5, 142], size: [4, 5], door: "w", kind: "store" },
    ],
  },
  {
    name: "farmers",
    patio: [-120, 160, 14, 12],
    houses: [
      { at: [-120, 150.5], size: [6, 4], door: "s", kind: "house" },
      { at: [-130.5, 161], size: [4, 4.5], door: "e", kind: "store" },
      { at: [-109.5, 161], size: [4, 4.5], door: "w", kind: "kitchen" },
    ],
  },
];

/** Domed sweat baths. */
export const TEMAZCALS: [number, number][] = [[-86, 156]];

/** Fields: rectangles planted in rows. */
export const FIELDS: { rect: [number, number, number, number]; crop: "maize" | "agave" }[] = [
  { rect: [-146, 128, -134, 192], crop: "maize" }, // milpa (maize with beans and squash)
  { rect: [-104, 172, -70, 192], crop: "maize" },
  { rect: [-80, 98, -66, 118], crop: "agave" }, // agave (maguey) for fiber, as at Joya de Cerén
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
  [-66, 128],
  [-64, 136],
  [-70, 146],
  [-140, 104],
  [-100, 104],
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

/** Village area: no random trees, short grass. [minX, minZ, maxX, maxZ] */
export const VILLAGE_RECT: [number, number, number, number] = [-148, 94, -62, 194];

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
