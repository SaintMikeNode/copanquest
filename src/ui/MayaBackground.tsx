// Background of the menu and the loading screen: a dark jade "stone wall" carved with the 20
// Maya day signs (tzolk'in) as pixel-art cartouches, a jade pixel shimmer on top (PixelBlast,
// React Bits) and step-fret bands (xicalcoliuhqui, "greca escalonada") along the top and bottom.
// The day signs are vectors from Wikimedia Commons (public/glyphs/LICENSE.txt), rasterized here
// at startup into one small tile that repeats and drifts slowly (a CSS transform, so it is cheap).
// Without WebGL2, PixelBlast draws nothing and the carved wall still shows.
import { useEffect, useState } from "react";
import PixelBlast from "../components/PixelBlast/PixelBlast";

const SIGNS = ["imix", "ik", "akbal", "kan", "chikchan", "kimi", "manik", "lamat", "muluk", "ok", "chuwen", "eb", "ben", "ix", "men", "kib", "kaban", "etznab", "kawak", "ajaw"];

// Tile: 5 × 4 cartouches (one of each sign), odd rows shifted half a cell like a brick bond.
const CELL_W = 32;
const CELL_H = 36;
const COLS = 5;
const ROWS = 4;
const TILE_W = CELL_W * COLS;
const TILE_H = CELL_H * ROWS;
const GLYPH_W = 22;
const GLYPH_H = 21; // the SVGs are 255 × 239

type RGBA = [number, number, number, number];
const LIGHT: RGBA = [236, 222, 184, 255]; // lit stone
const SHADE: RGBA = [6, 22, 16, 255]; // carved shadow

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

/** Ink mask of one sign at GLYPH_W × GLYPH_H (dark, opaque pixels; D10 also has white fills). */
function mask(im: HTMLImageElement): Uint8Array {
  const c = document.createElement("canvas");
  c.width = GLYPH_W;
  c.height = GLYPH_H;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(im, 0, 0, GLYPH_W, GLYPH_H);
  const d = g.getImageData(0, 0, GLYPH_W, GLYPH_H).data;
  const m = new Uint8Array(GLYPH_W * GLYPH_H);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 105 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 384 ? 1 : 0;
  return m;
}

let tilePromise: Promise<string> | null = null;

/** The carved wall tile as a data URL (built once, shared by the menu and the loader). */
function glyphTile(): Promise<string> {
  tilePromise ??= (async () => {
    const masks = await Promise.all(
      SIGNS.map((s, i) => loadImage(`/glyphs/d${String(i + 1).padStart(2, "0")}-${s}.svg`).then(mask)),
    );
    const c = document.createElement("canvas");
    c.width = TILE_W;
    c.height = TILE_H;
    const g = c.getContext("2d")!;
    const img = g.createImageData(TILE_W, TILE_H);
    const ink = new Uint8Array(TILE_W * TILE_H); // 1 = raised (lit) pixel
    const put = (x: number, y: number) => {
      ink[(((y % TILE_H) + TILE_H) % TILE_H) * TILE_W + (((x % TILE_W) + TILE_W) % TILE_W)] = 1;
    };
    masks.forEach((m, k) => {
      const row = Math.floor(k / COLS);
      const x0 = (k % COLS) * CELL_W + (row % 2 ? CELL_W / 2 : 0);
      const y0 = row * CELL_H;
      // Cartouche: rounded frame around the sign, on a small three-lobed pedestal.
      const fx = x0 + 3;
      const fy = y0 + 2;
      const fw = 26;
      const fh = 25;
      for (let x = fx + 2; x < fx + fw - 2; x++) {
        put(x, fy);
        put(x, fy + fh - 1);
      }
      for (let y = fy + 2; y < fy + fh - 2; y++) {
        put(fx, y);
        put(fx + fw - 1, y);
      }
      for (const [cx, cy] of [[fx + 1, fy + 1], [fx + fw - 2, fy + 1], [fx + 1, fy + fh - 2], [fx + fw - 2, fy + fh - 2]]) put(cx, cy);
      for (const px of [fx + 6, fx + 12, fx + 18]) for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 3; dy++) if (dx !== 1 || dy !== 2) put(px + dx, fy + fh + 1 + dy);
      for (let y = 0; y < GLYPH_H; y++) for (let x = 0; x < GLYPH_W; x++) if (m[y * GLYPH_W + x]) put(fx + 2 + x, fy + 2 + y);
    });
    // Relief: raised pixels are lit, the pixel below-right of each is in shadow.
    for (let y = 0; y < TILE_H; y++)
      for (let x = 0; x < TILE_W; x++) {
        const i = y * TILE_W + x;
        const up = ((y + TILE_H - 1) % TILE_H) * TILE_W + ((x + TILE_W - 1) % TILE_W);
        const col = ink[i] ? LIGHT : ink[up] ? SHADE : null;
        if (col) img.data.set(col, i * 4);
      }
    g.putImageData(img, 0, 0);
    return c.toDataURL();
  })();
  return tilePromise;
}

/**
 * Step-fret band tile (16 × 11): a square spiral hook with a stepped side, in red on gold,
 * between dark rules. Drawn top-down for the bottom band; the top band is the same image flipped.
 */
const FRET = [
  "################",
  "oooooooooooooooo",
  "rrrrrrr.........",
  "r.....r.........",
  "r.rrr.r.........",
  "r.r...rrr.......",
  "r.rrrrrrrrr.....",
  "r.rrrrrrrrrrr...",
  "rrrrrrrrrrrrrrrr",
  "oooooooooooooooo",
  "################",
];
const FRET_COLORS: Record<string, string> = { "#": "#2a170b", o: "#f0cf7a", r: "#a8452c", ".": "#d9a74a" };
let fretUrl: string | null = null;
function fretTile() {
  if (fretUrl) return fretUrl;
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = FRET.length;
  const g = c.getContext("2d")!;
  FRET.forEach((row, y) => [...row].forEach((ch, x) => {
    g.fillStyle = FRET_COLORS[ch];
    g.fillRect(x, y, 1, 1);
  }));
  fretUrl = c.toDataURL();
  return fretUrl;
}

const phone = () => typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

export function MayaBackground() {
  const [tile, setTile] = useState<string | null>(null);
  const [touch] = useState(phone);
  useEffect(() => {
    let alive = true;
    glyphTile().then((u) => alive && setTile(u), () => {});
    return () => {
      alive = false;
    };
  }, []);
  const scale = touch ? 2 : 3;
  return (
    <div className="maya-bg" aria-hidden="true">
      <PixelBlast
        className="maya-bg-blast"
        variant="square"
        pixelSize={touch ? 6 : 5}
        color="#2f9a66"
        accentColor="#e0b04a"
        patternScale={3}
        patternDensity={1.05}
        speed={0.35}
        edgeFade={0.15}
        glow={0.25}
        twinkle={0.3}
        drift={0.12}
        hoverEffect={touch ? "none" : "reveal"}
        hoverRadius={160}
        dpr={1}
      />
      {tile && (
        <div
          className="maya-bg-glyphs"
          style={{
            backgroundImage: `url("${tile}")`,
            backgroundSize: `${TILE_W * scale}px ${TILE_H * scale}px`,
            ["--tw" as string]: `${TILE_W * scale}px`,
            ["--th" as string]: `${TILE_H * scale}px`,
          }}
        />
      )}
      <div className="maya-bg-vignette" />
      <div className="maya-bg-fret maya-bg-fret-top" style={{ backgroundImage: `url("${fretTile()}")` }} />
      <div className="maya-bg-fret maya-bg-fret-bottom" style={{ backgroundImage: `url("${fretTile()}")` }} />
    </div>
  );
}
