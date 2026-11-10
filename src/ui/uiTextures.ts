// Pixel-art textures for the UI, drawn at startup with the same palettes and pixel style as the
// world's blocks (style references: "garden"/"nature" Minecraft UI packs; no art is copied).
// Each one is a data URL exposed as a CSS variable on :root and drawn with
// image-rendering: pixelated, scaled ×3 or ×4.
//   --ui-wood       oak planks (panel fill)              --ui-wood-dark  dark planks (headers)
//   --ui-paper      parchment (reading areas)            --ui-jade       Maya jade (main buttons)
//   --ui-slot       dark inset (chips, slots)            --ui-leaves     moss + flowers strip (top trim)
//   --ui-clay       red-ochre plaster (main buttons)      --ui-wood-btn   calm, darker planks (buttons: text stays readable)
//   --ui-frame      9-slice frame: outline, bevel, notched corners (border-image, slice 4)
//   --ui-frame-in   9-slice inset frame (slots, chips)
// Self-contained (no three.js import): this runs before the 3D engine chunk loads.
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
/** Seeded PRNG (mulberry32), same as the block textures. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Px = (x: number, y: number) => RGB | null;

function draw(w: number, h: number, px: Px): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const col = px(x, y);
      if (!col) continue;
      const i = (y * w + x) * 4;
      img.data.set([col[0], col[1], col[2], 255], i);
    }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

const pal = (...h: string[]) => h.map(hex);
const pick = (p: RGB[], v: number) => p[Math.max(0, Math.min(p.length - 1, Math.round(v)))];

/** Horizontal planks: 4 planks of 4 px, seams, grain streaks, a nail here and there. */
function planks(p: RGB[], seed: number): string {
  const r = rng(seed);
  const tone = [0, 1, 2, 3].map(() => (r() - 0.5) * 0.8);
  const offset = [0, 1, 2, 3].map(() => Math.floor(r() * 16));
  const streak = new Map<string, number>();
  for (let k = 0; k < 10; k++) streak.set(`${Math.floor(r() * 16)},${Math.floor(r() * 16)}`, r() < 0.5 ? -1 : 1);
  return draw(16, 16, (x, y) => {
    const plank = Math.floor(y / 4);
    if (y % 4 === 3) return p[0]; // seam
    // Butt joint: each plank has one vertical seam at its own offset.
    if (x === offset[plank] && y % 4 !== 0) return p[1];
    let v = 2.4 + tone[plank] + (r() - 0.5) * 0.7;
    if (y % 4 === 0) v += 0.7; // lit top edge of each plank
    const s = streak.get(`${x},${y}`) ?? streak.get(`${x - 1},${y}`);
    if (s) v += s * 0.9;
    return pick(p, v);
  });
}

const WOOD = pal("#5a3418", "#7a4a26", "#9a6234", "#b57841", "#c98c4f", "#dba465");
const WOOD_DARK = pal("#2c190c", "#3d2412", "#55331a", "#6b4224", "#80522e");
const PAPER = pal("#cdb487", "#dcc59a", "#e8d6ae", "#f1e3c2", "#f8eed6");
const JADE = pal("#11553a", "#1b7a4a", "#25965c", "#33ad6c", "#5cc98a", "#9be3b5");
const CLAY = pal("#6e2416", "#842c1a", "#97361f", "#a84126", "#b84d2d", "#c95f3a");
const WOOD_BTN = pal("#4a2a14", "#5a3418", "#653b1c", "#6f4220", "#7a4a26");
const SLOT = pal("#1c120b", "#26180e", "#2f1f13", "#3a2717");
const LEAVES = pal("#1d4a1c", "#28622a", "#347a33", "#479a3e", "#5cb14a", "#7dc75a");
const OUTLINE = hex("#1f1209");

function paper(seed: number) {
  const r = rng(seed);
  return draw(16, 16, () => pick(PAPER, 2.6 + (r() - 0.5) * 1.4));
}

function jade(seed: number) {
  const r = rng(seed);
  // Polished stone with soft veins.
  return draw(16, 16, (x, y) => {
    const vein = Math.sin((x + y * 0.6) * 0.9 + Math.sin(y * 0.7) * 1.5);
    return pick(JADE, 2.6 + vein * 0.7 + (r() - 0.5) * 0.6);
  });
}

/** Red ochre plaster, like the painted stucco of Rosalila: soft mottling, a few darker pits. */
function clay(seed: number) {
  const r = rng(seed);
  return draw(16, 16, (x, y) => {
    const mottle = Math.sin(x * 0.7 + Math.sin(y * 0.9) * 1.2) * 0.35 + Math.sin(y * 0.55 + x * 0.2) * 0.3;
    const pit = r() < 0.04 ? -1.4 : 0;
    return pick(CLAY, 2.9 + mottle + pit + (r() - 0.5) * 0.5);
  });
}

/** Button planks: same layout as planks() but low contrast, so pixel text on top stays legible. */
function buttonPlanks(seed: number) {
  const r = rng(seed);
  const tone = [0, 1, 2, 3].map(() => (r() - 0.5) * 0.5);
  return draw(16, 16, (_x, y) => {
    const plank = Math.floor(y / 4);
    if (y % 4 === 3) return WOOD_BTN[0];
    let v = 2.6 + tone[plank] + (r() - 0.5) * 0.45;
    if (y % 4 === 0) v += 0.5;
    return pick(WOOD_BTN, v);
  });
}

function slot(seed: number) {
  const r = rng(seed);
  return draw(16, 16, () => pick(SLOT, 1.6 + (r() - 0.5) * 1.6));
}

/** 48 × 12 moss strip: dense on top, ragged drips below, a few tiny flowers. Transparent elsewhere. */
function leaves(seed: number) {
  const r = rng(seed);
  const W = 48;
  const depth = Array.from({ length: W }, (_, x) => 5 + Math.round(Math.sin(x * 0.55) * 1.5 + Math.sin(x * 1.7) * 1 + r() * 2));
  // Hanging vines.
  for (const x of [5, 17, 29, 40]) depth[x] = 11;
  const flowers = new Map<string, RGB>();
  for (const [x, y, c] of [[8, 2, "#f6a6c8"], [22, 1, "#ffe066"], [34, 3, "#ffffff"], [44, 2, "#f6a6c8"]] as const)
    flowers.set(`${x},${y}`, hex(c));
  return draw(W, 12, (x, y) => {
    const f = flowers.get(`${x},${y}`);
    if (f) return f;
    if (flowers.has(`${x},${y - 1}`) || flowers.has(`${x - 1},${y}`) || flowers.has(`${x + 1},${y}`)) return hex("#f3d36b");
    if (y > depth[x]) return null;
    if (y === depth[x]) return LEAVES[0];
    return pick(LEAVES, 3.2 - y * 0.25 + (r() - 0.5) * 2.2);
  });
}

/**
 * 12 × 12 nine-slice frame (slice 4): 1 px dark outline with notched corners, then a 1 px
 * bevel (light top-left, dark bottom-right), then transparent. inset = slot style (reversed).
 */
function frame(inset: boolean) {
  const light = hex(inset ? "#120b06" : "#e8b877");
  const dark = hex(inset ? "#6b4a2e" : "#4a2a12");
  return draw(12, 12, (x, y) => {
    const edge = x === 0 || y === 0 || x === 11 || y === 11;
    const corner = (x === 0 || x === 11) && (y === 0 || y === 11);
    if (corner) return null;
    if (edge) return OUTLINE;
    if ((x === 1 || x === 10) && (y === 1 || y === 10)) return OUTLINE; // rounded pixel corner
    if (x === 1 || y === 1) return light;
    if (x === 10 || y === 10) return dark;
    return null;
  });
}

// ---------------------------------------------------------------- HUD icons (16 × 16)
// Drawn big and bright (cream, gold, sky) with a dark outline, so they read on the wood buttons.
const ICON_COLORS: Record<string, string> = {
  O: "#1f1209", // outline
  W: "#f6ead0", // cream
  G: "#b8ab90", // grey metal
  D: "#4a3a2c", // dark leather
  L: "#4fa3d9", // lens glass
  H: "#ffffff", // highlight
  R: "#c8452c", // red
  Y: "#f2c14e", // gold
  B: "#8a5a32", // brown cover
  P: "#e9d9b4", // page shade
  g: "#5fae4a", // map green
};
const ICONS: Record<string, string[]> = {
  camera: [
    "................",
    "................",
    "...OOOOO...OOO..",
    "...OGGGO...ORO..",
    ".OOOOOOOOOOOOOO.",
    "OWWWWWOOOOOWWWWO",
    "OWWWWOLLLLLOWYYO",
    "ODDDOLHHLLLLODDO",
    "ODDDOLHLLLLLODDO",
    "ODDDOLLLLLLLODDO",
    "ODDDOLLLLLLLODDO",
    "OWWWWOLLLLLOWWWO",
    "OWWWWWOOOOOWWWWO",
    ".OOOOOOOOOOOOOO.",
    "................",
    "................",
  ],
  book: [
    "................",
    "................",
    ".OOOOOO..OOOOOO.",
    "OWWWWWWOOWWWWWWO",
    "OWDDDDWOOWDDDDWO",
    "OWWWWWWOOWWWWWWO",
    "OWDDDDWOOWDDDWWO",
    "OWWWWWWOOWWWWWWO",
    "OWDDDWWOOWDDDDWO",
    "OWWWWWWOOWWWWWWO",
    "OPPPPPPOOPPPPPPO",
    "OBBBBBBBBBBRBBBO",
    ".OOOOOOOOOOROOO.",
    "...........R....",
    "................",
    "................",
  ],
  // Folded paper map: three panels, woods, a lake, a dotted trail and the red X.
  map: [
    "................",
    "................",
    ".OOOOOOOOOOOOOO.",
    ".OggWWPWWWWPLLO.",
    ".OgggWPWRWRPWLO.",
    ".OggWWPWWRWPWWO.",
    ".OWWWWPWRWRPWWO.",
    ".OWYWWPWWWWPWgO.",
    ".OWWYWPWWWYPggO.",
    ".OWWWYPYYYWPggO.",
    ".OWWWWPWWWWPWgO.",
    ".OWWWWPWWWWPWWO.",
    ".OOOOOOOOOOOOOO.",
    "................",
    "................",
    "................",
  ],
  lens: [
    "................",
    "...OOOOOOOOOO...",
    "...OBBBBBBBBO...",
    "...OOOOOOOOOO...",
    "....OLYYYYLO....",
    "....OLYYYYLO....",
    ".....OLYYLO.....",
    "......OYYO......",
    "......OLLO......",
    ".....OLLYLO.....",
    "....OLLYYYLO....",
    "....OYYYYYYO....",
    "...OOOOOOOOOO...",
    "...OBBBBBBBBO...",
    "...OOOOOOOOOO...",
    "................",
  ],
};
function icon(rows: string[]) {
  return draw(16, 16, (x, y) => {
    const ch = rows[y][x];
    return ch === "." ? null : hex(ICON_COLORS[ch]);
  });
}

export function installUiTextures() {
  const s = document.documentElement.style;
  const set = (k: string, url: string) => s.setProperty(k, `url("${url}")`);
  set("--ui-wood", planks(WOOD, 11));
  set("--ui-wood-dark", planks(WOOD_DARK, 12));
  set("--ui-paper", paper(13));
  set("--ui-jade", jade(14));
  set("--ui-slot", slot(15));
  set("--ui-clay", clay(17));
  set("--ui-wood-btn", buttonPlanks(18));
  for (const [name, rows] of Object.entries(ICONS)) set(`--icon-${name}`, icon(rows));
  set("--ui-leaves", leaves(16));
  set("--ui-frame", frame(false));
  set("--ui-frame-in", frame(true));
}
