// Painted textures for the landing room (designed at 32–128 px, stored at 2×), all drawn here.
// Posters and boxes are original designs with Honduran and Copán themes (no real brands):
// the scarlet macaw (Honduras' national bird), a Tzolk'in day-sign calendar (glyphs from
// public/glyphs, Wikimedia Commons, CC BY-SA 4.0 / CC BY 2.5), a Copán travel poster, the
// Honduran flag, pines (the national tree) outside the window, fictional game boxes.
import { LinearFilter } from "three";
import { psxTexture } from "./psx";

type G = CanvasRenderingContext2D;

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

/** Textures are painted in "design pixels" and stored at 2× for PS2-era detail. */
const SCALE = 2;
function canvas(w: number, h: number, paint: (g: G, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w * SCALE;
  c.height = h * SCALE;
  const g = c.getContext("2d")!;
  g.scale(SCALE, SCALE);
  paint(g, w, h);
  return c;
}
const tex = (w: number, h: number, paint: (g: G, w: number, h: number) => void, repeat = true) =>
  psxTexture(canvas(w, h, paint), repeat);

/** Speckle noise over the whole canvas (k = strength). */
function grain(g: G, _w: number, _h: number, seed: number, k = 18) {
  const r = rng(seed);
  const img = g.getImageData(0, 0, g.canvas.width, g.canvas.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const d = (r() - 0.5) * k;
    img.data[i] += d;
    img.data[i + 1] += d;
    img.data[i + 2] += d;
  }
  g.putImageData(img, 0, 0);
}

const FONT = '"Pixelify Sans", system-ui, sans-serif';
function text(g: G, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center", weight = 700) {
  g.font = `${weight} ${size}px ${FONT}`;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillStyle = color;
  g.fillText(s, x, y);
}

// ---------------------------------------------------------------- surfaces

export const wallTex = () =>
  tex(64, 64, (g, w, h) => {
    g.fillStyle = "#b9875a";
    g.fillRect(0, 0, w, h);
    // Faint vertical wallpaper stripes with a tiny diamond motif.
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = "#c39466";
      g.fillRect(x, 0, 6, h);
      for (let y = 4; y < h; y += 16) {
        g.fillStyle = "#a7774c";
        g.fillRect(x + 11, y, 2, 2);
      }
    }
    grain(g, w, h, 1, 10);
  });

export const floorTex = () =>
  tex(64, 64, (g, w, h) => {
    const r = rng(2);
    for (let y = 0; y < h; y += 8) {
      const tone = 70 + r() * 25;
      g.fillStyle = `rgb(${tone + 40},${tone + 8},${tone - 25})`;
      g.fillRect(0, y, w, 8);
      g.fillStyle = "#3b2414";
      g.fillRect(0, y + 7, w, 1);
      g.fillRect(Math.floor(r() * w), y, 1, 7);
      for (let k = 0; k < 6; k++) {
        g.fillStyle = "rgba(60,30,10,0.35)";
        g.fillRect(Math.floor(r() * w), y + 1 + Math.floor(r() * 5), 6 + Math.floor(r() * 10), 1);
      }
    }
    grain(g, w, h, 3, 12);
  });

/** Rug with a Maya step-fret border (greca) on a red-orange field. */
export const rugTex = () =>
  tex(
    128,
    96,
    (g, w, h) => {
      g.fillStyle = "#8c2f1e";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#e0a243";
      g.fillRect(6, 6, w - 12, h - 12);
      g.fillStyle = "#a63b24";
      g.fillRect(14, 14, w - 28, h - 28);
      // Step-fret band.
      const fret = (x: number, y: number) => {
        g.fillStyle = "#3a1a10";
        g.fillRect(x, y, 6, 2);
        g.fillRect(x + 4, y, 2, 6);
        g.fillRect(x + 2, y + 4, 4, 2);
        g.fillRect(x + 6, y + 6, 4, 2);
      };
      for (let x = 8; x < w - 10; x += 10) {
        fret(x, 7);
        fret(x, h - 15);
      }
      // Central diamond.
      g.fillStyle = "#e0a243";
      g.beginPath();
      g.moveTo(w / 2, 26);
      g.lineTo(w / 2 + 24, h / 2);
      g.lineTo(w / 2, h - 26);
      g.lineTo(w / 2 - 24, h / 2);
      g.fill();
      g.fillStyle = "#2f6b4f";
      g.fillRect(w / 2 - 6, h / 2 - 6, 12, 12);
      grain(g, w, h, 4, 16);
    },
    false,
  );

export const deskTex = () =>
  tex(64, 32, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = "#8a5a33";
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 40; k++) {
      g.fillStyle = r() < 0.5 ? "rgba(70,38,16,0.45)" : "rgba(170,115,70,0.35)";
      g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 8 + Math.floor(r() * 20), 1);
    }
    grain(g, w, h, 6, 10);
  });

export const beigeTex = () =>
  tex(16, 16, (g, w, h) => {
    g.fillStyle = "#d8ceb2";
    g.fillRect(0, 0, w, h);
    grain(g, w, h, 7, 9);
  });

export const fabricTex = (base: string, seed: number) =>
  tex(32, 32, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = "rgba(0,0,0,0.12)";
      g.fillRect(0, y, w, 1);
    }
    grain(g, w, h, seed, 14);
  });

/** Curtains: warm ochre with a woven ikat-like zigzag. */
export const curtainTex = () =>
  tex(32, 64, (g, w, h) => {
    g.fillStyle = "#c46a2a";
    g.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 16)
      for (let x = 0; x < w; x += 4) {
        g.fillStyle = "#f0c062";
        g.fillRect(x, y + ((x / 4) % 2) * 2, 2, 2);
      }
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.fillRect(x, 0, 2, h);
    }
    grain(g, w, h, 8, 10);
  });

// ---------------------------------------------------------------- computer

export const keyboardTex = () =>
  tex(
    96,
    32,
    (g, w, h) => {
      g.fillStyle = "#c9bfa2";
      g.fillRect(0, 0, w, h);
      const rows = [14, 14, 13, 12];
      rows.forEach((n, row) => {
        const kw = 5;
        for (let i = 0; i < n; i++) {
          g.fillStyle = "#ece4cc";
          g.fillRect(3 + i * 6 + row * 1, 3 + row * 6, kw, 5);
          g.fillStyle = "#a99e80";
          g.fillRect(3 + i * 6 + row * 1, 7 + row * 6, kw, 1);
        }
      });
      g.fillStyle = "#ece4cc";
      g.fillRect(22, 27, 40, 4); // space bar
      // Numpad block.
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 3; x++) {
          g.fillStyle = "#e2d9bf";
          g.fillRect(74 + x * 6, 3 + y * 6, 5, 5);
        }
      grain(g, w, h, 9, 8);
    },
    false,
  );

export const pcFrontTex = () =>
  tex(
    64,
    20,
    (g, w, h) => {
      g.fillStyle = "#d8ceb2";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#3a352c";
      g.fillRect(6, 5, 22, 2); // floppy slot
      g.fillRect(6, 11, 22, 4); // CD tray
      g.fillStyle = "#b9ae90";
      g.fillRect(40, 6, 6, 6); // power button
      g.fillStyle = "#4cd964";
      g.fillRect(52, 7, 2, 2); // power LED
      g.fillStyle = "#ffb300";
      g.fillRect(56, 7, 2, 2); // HDD LED
      text(g, "TURBO", 55, 15, 4, "#6d6450");
      grain(g, w, h, 10, 8);
    },
    false,
  );

export const grilleTex = () =>
  tex(16, 32, (g, w, h) => {
    g.fillStyle = "#d3c9ad";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#2c2924";
    g.fillRect(2, 4, w - 4, h - 12);
    for (let y = 5; y < h - 8; y += 2) {
      g.fillStyle = "#4a453c";
      g.fillRect(3, y, w - 6, 1);
    }
  });

/** Mousepad: jade with a glyph-like cartouche. */
export const mousepadTex = () =>
  tex(
    48,
    40,
    (g, w, h) => {
      g.fillStyle = "#1f5e46";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#e3c27a";
      g.fillRect(4, 4, w - 8, h - 8);
      g.fillStyle = "#1f5e46";
      g.fillRect(6, 6, w - 12, h - 12);
      g.strokeStyle = "#e3c27a";
      g.lineWidth = 2;
      g.strokeRect(14, 11, 20, 18);
      g.fillStyle = "#e3c27a";
      g.fillRect(19, 16, 3, 3);
      g.fillRect(26, 16, 3, 3);
      g.fillRect(19, 23, 10, 2);
      grain(g, w, h, 11, 10);
    },
    false,
  );

// ---------------------------------------------------------------- posters

/** Scarlet macaw on a branch: "GUARA ROJA · Ave nacional de Honduras". */
export const macawPosterTex = () =>
  tex(
    96,
    128,
    (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#1e5b3a");
      sky.addColorStop(1, "#0d2f22");
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      // Leaves.
      const r = rng(12);
      for (let k = 0; k < 30; k++) {
        g.fillStyle = r() < 0.5 ? "#2f7d45" : "#3f9a50";
        g.beginPath();
        g.ellipse(r() * w, 18 + r() * 90, 6, 2.5, r() * 3, 0, 7);
        g.fill();
      }
      // Branch.
      g.fillStyle = "#5a3418";
      g.fillRect(8, 92, 80, 5);
      // Tail.
      g.fillStyle = "#c21f1f";
      g.beginPath();
      g.moveTo(44, 74);
      g.lineTo(40, 122);
      g.lineTo(50, 122);
      g.lineTo(52, 74);
      g.fill();
      g.fillStyle = "#2a63c9";
      g.fillRect(40, 108, 4, 14);
      g.fillRect(47, 110, 3, 12);
      // Body.
      g.fillStyle = "#d42121";
      g.beginPath();
      g.ellipse(50, 66, 13, 22, 0.12, 0, 7);
      g.fill();
      // Wing: red, yellow band, blue tips.
      g.fillStyle = "#e8c21c";
      g.beginPath();
      g.ellipse(55, 66, 9, 16, 0.25, 0, 7);
      g.fill();
      g.fillStyle = "#2a63c9";
      g.beginPath();
      g.ellipse(58, 76, 7, 12, 0.3, 0, 7);
      g.fill();
      g.fillStyle = "#3c8a3c";
      g.fillRect(54, 64, 6, 2);
      // Head.
      g.fillStyle = "#d42121";
      g.beginPath();
      g.arc(46, 40, 10, 0, 7);
      g.fill();
      g.fillStyle = "#f4eee0";
      g.beginPath();
      g.ellipse(41, 41, 5, 6, 0, 0, 7);
      g.fill();
      g.fillStyle = "#111";
      g.fillRect(41, 39, 2, 2);
      // Beak.
      g.fillStyle = "#efe6cf";
      g.beginPath();
      g.moveTo(36, 38);
      g.quadraticCurveTo(26, 40, 31, 50);
      g.lineTo(37, 46);
      g.fill();
      g.fillStyle = "#1a1a1a";
      g.fillRect(31, 46, 5, 3);
      // Feet.
      g.fillStyle = "#555";
      g.fillRect(46, 88, 3, 5);
      g.fillRect(52, 88, 3, 5);
      // Title.
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(0, 0, w, 16);
      text(g, "GUARA ROJA", w / 2, 8, 9, "#ffe066");
      text(g, "Ave nacional de Honduras", w / 2, h - 5, 6, "#f4eee0", "center", 400);
      grain(g, w, h, 13, 10);
    },
    false,
  );

/** Copán travel poster: a stela under a golden sky. */
export const copanPosterTex = () =>
  tex(
    96,
    128,
    (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#f2a541");
      sky.addColorStop(0.6, "#e0633a");
      sky.addColorStop(1, "#5b2a3a");
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffe08a";
      g.beginPath();
      g.arc(70, 40, 12, 0, 7);
      g.fill();
      // Pyramid silhouette.
      g.fillStyle = "#3e2a2a";
      for (let i = 0; i < 5; i++) g.fillRect(8 + i * 6, 96 - i * 9, 60 - i * 12, 9);
      // Stela.
      g.fillStyle = "#9b8f7a";
      g.fillRect(58, 48, 18, 58);
      g.fillStyle = "#6f6555";
      for (let y = 52; y < 102; y += 7) g.fillRect(61, y, 12, 3);
      g.fillRect(62, 52, 10, 10);
      g.fillStyle = "#2c3a22";
      g.fillRect(0, 104, w, h - 104);
      text(g, "COPÁN", w / 2, 13, 14, "#fff4d8");
      text(g, "RUINAS · HONDURAS", w / 2, 26, 6, "#fff4d8", "center", 400);
      text(g, "Patrimonio de la Humanidad", w / 2, h - 10, 6, "#e9dcb6", "center", 400);
      grain(g, w, h, 14, 12);
    },
    false,
  );

/** Tzolk'in calendar poster: the 20 day signs in a ring around a sun face. Async (images). */
export function calendarPosterTex() {
  const c = canvas(96, 128, (g, w, h) => {
    g.fillStyle = "#e7d7ae";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#7a4a26";
    g.lineWidth = 2;
    g.strokeRect(3, 3, w - 6, h - 6);
    text(g, "TZOLK'IN", w / 2, 12, 9, "#7a2a18");
    text(g, "Calendario maya", w / 2, h - 9, 6, "#5a3a22", "center", 400);
    g.fillStyle = "#c98a3a";
    g.beginPath();
    g.arc(w / 2, 66, 13, 0, 7);
    g.fill();
    g.fillStyle = "#5a3a22";
    g.fillRect(w / 2 - 6, 62, 3, 3);
    g.fillRect(w / 2 + 3, 62, 3, 3);
    g.fillRect(w / 2 - 4, 70, 8, 2);
  });
  const t = psxTexture(c, false);
  const names = ["imix", "ik", "akbal", "kan", "chikchan", "kimi", "manik", "lamat", "muluk", "ok", "chuwen", "eb", "ben", "ix", "men", "kib", "kaban", "etznab", "kawak", "ajaw"];
  const g = c.getContext("2d")!;
  let left = names.length;
  names.forEach((n, i) => {
    const im = new Image();
    im.onload = () => {
      const a = (i / 20) * Math.PI * 2 - Math.PI / 2;
      g.drawImage(im, 48 + Math.cos(a) * 34 - 6, 66 + Math.sin(a) * 34 - 5.5, 12, 11);
      if (--left === 0) t.needsUpdate = true;
    };
    im.onerror = () => void (--left === 0 && (t.needsUpdate = true));
    im.src = `/glyphs/d${String(i + 1).padStart(2, "0")}-${n}.svg`;
  });
  return t;
}

/** Honduran flag: blue–white–blue with five blue stars (pennant cut in geometry). */
export const flagTex = () =>
  tex(
    64,
    40,
    (g, w, h) => {
      g.fillStyle = "#18c3df";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffffff";
      g.fillRect(0, h / 3, w, h / 3);
      g.fillStyle = "#18c3df";
      const star = (x: number, y: number) => {
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 ? 1.2 : 2.8;
          const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
          g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.fill();
      };
      const cy = h / 2;
      star(20, cy);
      star(13, cy - 4);
      star(27, cy - 4);
      star(13, cy + 4);
      star(27, cy + 4);
      grain(g, w, h, 15, 8);
    },
    false,
  );

// ---------------------------------------------------------------- window

/** Late-afternoon view: golden sky, green hills, pines (national tree) and a ceiba. */
export const windowViewTex = () =>
  tex(
    96,
    96,
    (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#f7b955");
      sky.addColorStop(0.55, "#f6d58a");
      sky.addColorStop(1, "#c9d98a");
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff1b8";
      g.beginPath();
      g.arc(70, 42, 8, 0, 7);
      g.fill();
      // Hills.
      g.fillStyle = "#6f9a5a";
      g.beginPath();
      g.moveTo(0, 62);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, 58 + Math.sin(x * 0.09) * 6);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
      g.fillStyle = "#4f7a40";
      g.fillRect(0, 74, w, h - 74);
      // Pines.
      const pine = (x: number, y: number, s: number) => {
        g.fillStyle = "#4a2e1a";
        g.fillRect(x - 1, y - 2 * s, 2, 3 * s);
        g.fillStyle = "#1f4a2a";
        for (let k = 0; k < 4; k++) {
          const ww = (4 - k) * s * 1.4;
          g.fillRect(x - ww / 2, y - 3 * s - k * s * 1.3, ww, s * 1.4);
        }
      };
      [[10, 86, 4], [26, 90, 5], [84, 88, 4.5], [92, 92, 3.5], [56, 84, 2.5], [40, 82, 2]].forEach(([x, y, s]) => pine(x, y, s));
      // Ceiba (wide flat crown).
      g.fillStyle = "#5a3a22";
      g.fillRect(66, 64, 3, 22);
      g.fillStyle = "#2f6a33";
      g.fillRect(52, 56, 32, 6);
      g.fillRect(56, 52, 24, 5);
      grain(g, w, h, 16, 8);
    },
    false,
  );

// ---------------------------------------------------------------- small props

/** Spines for fictional games / books: [label, background, text color]. */
export const SPINES: [string, string, string][] = [
  ["COPÁNQUEST", "#1f5e46", "#ffe066"],
  ["SELVA KART", "#c43c2a", "#ffffff"],
  ["JADE RAIDERS", "#2a3f8f", "#9be3b5"],
  ["GUARA RACER", "#e0a243", "#3a1a10"],
  ["LEMPIRA", "#5a2a7a", "#f2c14e"],
];
export const spineTex = (label: string, bg: string, fg: string) =>
  tex(
    96,
    16,
    (g, w, h) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(0, 0, 10, h);
      g.fillStyle = fg;
      g.fillRect(2, 4, 6, 8);
      text(g, label, 54, h / 2 + 1, 9, fg);
      grain(g, w, h, label.length * 7, 10);
    },
    false,
  );

export const mugTex = () =>
  tex(
    48,
    24,
    (g, w, h) => {
      g.fillStyle = "#f1ead8";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#18c3df";
      g.fillRect(0, 3, w, 3);
      g.fillRect(0, h - 6, w, 3);
      text(g, "CAFÉ", w / 2, 11, 6, "#5a3418");
      text(g, "HONDURAS", w / 2, 16, 5, "#5a3418");
    },
    false,
  );

export const floppyTex = (label: string, body: string) =>
  tex(
    24,
    24,
    (g, w, h) => {
      g.fillStyle = body;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#b5b5b5";
      g.fillRect(6, 0, 12, 7);
      g.fillStyle = "#555";
      g.fillRect(13, 1, 3, 5);
      g.fillStyle = "#f4eee0";
      g.fillRect(3, 11, 18, 11);
      text(g, label, w / 2, 16.5, 4, "#2a3f8f");
    },
    false,
  );

export const stelaTex = () =>
  tex(16, 48, (g, w, h) => {
    g.fillStyle = "#a59c86";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#6f6656";
    g.fillRect(4, 3, 8, 8); // headdress
    g.fillRect(5, 12, 6, 6); // face
    g.fillRect(3, 19, 10, 3); // ceremonial bar
    for (let y = 24; y < h - 3; y += 4) g.fillRect(4, y, 8, 2);
    grain(g, w, h, 17, 12);
  });

export const jadeTex = () =>
  tex(16, 16, (g, w, h) => {
    g.fillStyle = "#2e8a5c";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#4fb07c";
    g.fillRect(2, 3, 4, 2);
    g.fillRect(10, 3, 4, 2);
    g.fillStyle = "#1c5c3c";
    g.fillRect(4, 10, 8, 2);
    grain(g, w, h, 18, 14);
  });

/** Soft dark blob for fake contact shadows (PS1 games used these instead of shadow maps). */
export const blobTex = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const rg = g.createRadialGradient(16, 16, 2, 16, 16, 16);
  rg.addColorStop(0, "rgba(0,0,0,0.55)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 32, 32);
  return psxTexture(c, false);
};

/** Light shaft: vertical fade for the window beams (additive). */
export const beamTex = () => {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 64;
  const g = c.getContext("2d")!;
  // Canvas bottom = v 0 = the window end (bright); fades toward the far end.
  const lg = g.createLinearGradient(0, 64, 0, 0);
  lg.addColorStop(0, "rgba(255,190,110,0.16)");
  lg.addColorStop(1, "rgba(255,190,110,0)");
  g.fillStyle = lg;
  g.fillRect(0, 0, 8, 64);
  const t = psxTexture(c, false);
  t.magFilter = LinearFilter; // soft beams
  t.minFilter = LinearFilter;
  return t;
};

// ---------------------------------------------------------------- outside (layers)

/** Far layer: sky with clouds and blue-green hills. */
export const skyTex = () =>
  tex(
    128,
    96,
    (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#f2a64c");
      sky.addColorStop(0.5, "#f7d48c");
      sky.addColorStop(1, "#d8dc9a");
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff1b8";
      g.beginPath();
      g.arc(92, 34, 7, 0, 7);
      g.fill();
      // Clouds.
      const r = rng(31);
      for (let k = 0; k < 7; k++) {
        const x = r() * w;
        const y = 8 + r() * 30;
        g.fillStyle = "rgba(255,240,220,0.75)";
        for (let j = 0; j < 4; j++) {
          g.beginPath();
          g.ellipse(x + j * 5 - 8, y + (j % 2) * 2, 7, 3.5, 0, 0, 7);
          g.fill();
        }
      }
      // Two ranges of hills.
      g.fillStyle = "#8aa36a";
      g.beginPath();
      g.moveTo(0, 60);
      for (let x = 0; x <= w; x += 6) g.lineTo(x, 54 + Math.sin(x * 0.07) * 6 + Math.sin(x * 0.19) * 2);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
      g.fillStyle = "#5f8a4a";
      g.beginPath();
      g.moveTo(0, 70);
      for (let x = 0; x <= w; x += 6) g.lineTo(x, 66 + Math.sin(x * 0.11 + 1) * 5);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
      grain(g, w, h, 32, 6);
    },
    false,
  );

/** Middle layer (transparent above): Copán Ruinas town, white walls and red clay-tile roofs, a bell tower, pines. */
export const townTex = () =>
  tex(
    128,
    64,
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const r = rng(33);
      // Pines behind the roofs (the national tree).
      const pine = (x: number, y: number, s: number) => {
        g.fillStyle = "#4a2e1a";
        g.fillRect(x - 1, y - 2 * s, 2, 3 * s);
        g.fillStyle = "#24502e";
        for (let k = 0; k < 4; k++) {
          const ww = (4 - k) * s * 1.5;
          g.beginPath();
          g.moveTo(x - ww / 2, y - 2 * s - k * s * 1.4);
          g.lineTo(x + ww / 2, y - 2 * s - k * s * 1.4);
          g.lineTo(x, y - 2 * s - (k + 1.6) * s * 1.4);
          g.fill();
        }
      };
      [[8, 40, 4], [118, 38, 4.5], [70, 34, 3]].forEach(([x, y, s]) => pine(x, y, s));
      // Bell tower of the church.
      g.fillStyle = "#f2ead8";
      g.fillRect(84, 14, 12, 40);
      g.fillStyle = "#c9bfa6";
      g.fillRect(84, 14, 3, 40);
      g.fillStyle = "#3a2a20";
      g.fillRect(88, 20, 4, 6);
      g.fillStyle = "#b4552c";
      g.beginPath();
      g.moveTo(82, 15);
      g.lineTo(90, 6);
      g.lineTo(98, 15);
      g.fill();
      g.fillStyle = "#e8c21c";
      g.fillRect(89, 2, 2, 5);
      g.fillRect(87, 3, 6, 1);
      // Houses: white or pastel walls, tile roofs, dark doors and windows.
      let x = -4;
      const walls = ["#f4eee0", "#f2d9a6", "#cfe3e0", "#f4eee0", "#f0c9b8"];
      while (x < w) {
        const hw = 18 + Math.floor(r() * 14);
        const wallH = 12 + Math.floor(r() * 6);
        const y0 = h - wallH;
        g.fillStyle = walls[Math.floor(r() * walls.length)];
        g.fillRect(x, y0, hw, wallH);
        g.fillStyle = "#3a2a20";
        g.fillRect(x + 3, y0 + 4, 4, 5);
        g.fillRect(x + hw - 8, y0 + 5, 3, wallH - 5);
        // Tile roof with rows.
        g.fillStyle = "#b4552c";
        g.beginPath();
        g.moveTo(x - 2, y0);
        g.lineTo(x + hw / 2, y0 - 8);
        g.lineTo(x + hw + 2, y0);
        g.fill();
        g.fillStyle = "#8c3f1e";
        for (let k = 1; k < 4; k++) g.fillRect(x + k * 2, y0 - k * 2, hw - k * 4, 1);
        x += hw + 1;
      }
      grain(g, w, h, 34, 6);
    },
    false,
  );

/** Near layer: banana leaves at the bottom corners (transparent elsewhere). */
export const bananaTex = () =>
  tex(
    64,
    64,
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const leaf = (x: number, y: number, a: number, len: number) => {
        g.save();
        g.translate(x, y);
        g.rotate(a);
        g.fillStyle = "#3f8a3c";
        g.beginPath();
        g.ellipse(len / 2, 0, len / 2, len / 7, 0, 0, 7);
        g.fill();
        g.fillStyle = "#2e6a2c";
        g.fillRect(0, -0.5, len, 1);
        // Torn edges.
        g.fillStyle = "rgba(0,0,0,0)";
        g.globalCompositeOperation = "destination-out";
        for (let k = 6; k < len - 4; k += 5) g.fillRect(k, len / 9, 1.5, 4);
        g.globalCompositeOperation = "source-over";
        g.restore();
      };
      leaf(2, 62, -0.9, 34);
      leaf(6, 64, -0.45, 40);
      leaf(0, 50, -1.3, 26);
    },
    false,
  );

// ---------------------------------------------------------------- more posters

/** Rosalila temple banner (the buried temple inside Temple 16; its replica is in the Copán museum). */
export const rosalilaTex = () =>
  tex(
    128,
    48,
    (g, w, h) => {
      g.fillStyle = "#2a1a2e";
      g.fillRect(0, 0, w, h);
      // Stepped temple: red base, green bands, a big mask in the middle.
      g.fillStyle = "#b8352c";
      g.fillRect(40, 30, 48, 14);
      g.fillStyle = "#2f7d55";
      g.fillRect(44, 26, 40, 4);
      g.fillStyle = "#b8352c";
      g.fillRect(48, 14, 32, 12);
      g.fillStyle = "#e0a243";
      g.fillRect(58, 16, 12, 9);
      g.fillStyle = "#2a1a2e";
      g.fillRect(60, 18, 3, 3);
      g.fillRect(65, 18, 3, 3);
      g.fillRect(61, 22, 6, 1);
      g.fillStyle = "#2f7d55";
      g.fillRect(52, 10, 24, 4);
      g.fillStyle = "#b8352c";
      g.fillRect(56, 4, 16, 6);
      text(g, "ROSALILA", 20, 18, 9, "#f2c14e");
      text(g, "Copán", 20, 30, 7, "#f4eee0", "center", 400);
      text(g, "571 d. C.", 108, 24, 7, "#f4eee0", "center", 400);
      grain(g, w, h, 35, 10);
    },
    false,
  );

/** Map of Honduras with Copán Ruinas, Tegucigalpa and the Bay Islands. */
export const hondurasMapTex = () =>
  tex(
    96,
    72,
    (g, w, h) => {
      g.fillStyle = "#d9c9a0";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#7fb3c9";
      g.fillRect(0, 0, w, 22);
      // Outline from approximate lon/lat (−89.4…−83.1, 12.9…16.5).
      const pts = [[-88.2, 15.72], [-87.6, 15.85], [-86.9, 15.9], [-86, 15.95], [-85.2, 15.98], [-84.3, 15.8], [-83.4, 15.27], [-83.15, 15], [-83.6, 14.9], [-84.4, 14.7], [-84.9, 14.8], [-85.4, 14.35], [-85.9, 13.9], [-86.5, 13.75], [-86.75, 13.3], [-87.3, 12.98], [-87.5, 13.3], [-87.8, 13.4], [-88, 13.95], [-88.5, 13.85], [-89.05, 14], [-89.35, 14.42], [-89, 14.75], [-88.6, 15.1]];
      const px = (lon: number) => 6 + ((lon + 89.5) / 6.6) * (w - 12);
      const py = (lat: number) => 14 + ((16.6 - lat) / 3.8) * (h - 24);
      g.fillStyle = "#5f9a4a";
      g.beginPath();
      pts.forEach(([lo, la], i) => (i ? g.lineTo(px(lo), py(la)) : g.moveTo(px(lo), py(la))));
      g.closePath();
      g.fill();
      g.strokeStyle = "#2e5a2a";
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = "#5f9a4a";
      for (const [lo, la] of [[-86.5, 16.35], [-86.9, 16.3], [-85.9, 16.45]]) g.fillRect(px(lo) - 1.5, py(la) - 1, 3, 2);
      g.fillStyle = "#c21f1f";
      g.beginPath();
      g.arc(px(-89.14), py(14.84), 2.2, 0, 7);
      g.fill();
      text(g, "Copán", px(-89.14) + 9, py(14.84) - 5, 6, "#7a1d10", "center", 700);
      g.fillStyle = "#2a2a2a";
      g.fillRect(px(-87.2) - 1, py(14.1) - 1, 2, 2);
      text(g, "Tegucigalpa", px(-87.2) + 2, py(14.1) + 6, 5, "#2a2a2a", "center", 400);
      text(g, "HONDURAS", w / 2, 7, 9, "#1f3a5a");
      grain(g, w, h, 36, 8);
    },
    false,
  );

/** Lenca pottery (La Campa, western Honduras): black geometric bands on red clay, a white band. */
export const lencaTex = () =>
  tex(64, 32, (g, w, h) => {
    g.fillStyle = "#a6462a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#efe6d0";
    g.fillRect(0, 12, w, 8);
    g.fillStyle = "#1e1612";
    for (let x = 0; x < w; x += 8) {
      g.beginPath();
      g.moveTo(x, 20);
      g.lineTo(x + 4, 13);
      g.lineTo(x + 8, 20);
      g.fill();
    }
    g.fillRect(0, 5, w, 2);
    g.fillRect(0, 25, w, 2);
    for (let x = 2; x < w; x += 6) g.fillRect(x, 28, 2, 2);
    grain(g, w, h, 37, 10);
  });

// ---------------------------------------------------------------- fútbol (generic designs, no crests)

/** Classic black-and-white ball, mapped on a sphere (equirectangular). */
export const ballTex = () =>
  tex(
    64,
    32,
    (g, w, h) => {
      g.fillStyle = "#f4f1e8";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#1a1a1a";
      const spot = (x: number, y: number, r: number) => {
        g.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
          g.lineTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r);
        }
        g.fill();
      };
      for (let row = 0; row < 3; row++)
        for (let k = 0; k < 5; k++) spot(((k + (row % 2) * 0.5) / 5) * w, 6 + row * 10, 3.2);
      g.fillRect(0, 0, w, 2);
      g.fillRect(0, h - 2, w, 2);
      g.strokeStyle = "rgba(0,0,0,0.25)";
      g.lineWidth = 0.5;
      for (let x = 0; x < w; x += 6.4) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + 3, h);
        g.stroke();
      }
    },
    false,
  );

/** Blue-and-white supporters' scarf. */
export const scarfTex = () =>
  tex(
    16,
    96,
    (g, w, h) => {
      g.fillStyle = "#1e6fd0";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffffff";
      for (let y = 0; y < h; y += 12) g.fillRect(0, y, w, 4);
      g.save();
      g.translate(w / 2, h / 2);
      g.rotate(-Math.PI / 2);
      text(g, "HONDURAS", 0, 0, 7, "#ffffff");
      g.restore();
      g.fillStyle = "#f4f1e8";
      for (let x = 1; x < w; x += 3) {
        g.fillRect(x, 0, 1, 3);
        g.fillRect(x, h - 3, 1, 3);
      }
    },
    false,
  );

/** "La H" at España 82, Honduras' first World Cup (generic poster: no logos). */
export const futbolPosterTex = () =>
  tex(
    72,
    96,
    (g, w, h) => {
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#1e6fd0");
      bg.addColorStop(1, "#0d3a7a");
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffffff";
      g.fillRect(0, h * 0.42, w, 10);
      text(g, "LA  H", w / 2, 14, 16, "#ffffff");
      // A player striking the ball (silhouette).
      g.fillStyle = "#f4f1e8";
      g.beginPath();
      g.arc(30, 33, 4, 0, 7);
      g.fill();
      g.fillRect(27, 37, 6, 13);
      g.save();
      g.translate(30, 50);
      g.rotate(0.6);
      g.fillRect(-1.5, 0, 3, 14);
      g.restore();
      g.save();
      g.translate(31, 50);
      g.rotate(-0.9);
      g.fillRect(-1.5, 0, 3, 14);
      g.restore();
      g.fillRect(22, 39, 14, 2.5);
      g.beginPath();
      g.arc(46, 64, 3.5, 0, 7);
      g.fill();
      text(g, "ESPAÑA 82", w / 2, h * 0.42 + 5, 7, "#0d3a7a");
      text(g, "¡Primer Mundial!", w / 2, h - 18, 6.5, "#f2c14e");
      text(g, "Honduras", w / 2, h - 8, 6, "#ffffff", "center", 400);
      grain(g, w, h, 41, 10);
    },
    false,
  );

/** White jersey with blue trim and a #10. */
export const jerseyTex = () =>
  tex(
    32,
    40,
    (g, w, h) => {
      g.fillStyle = "#f4f1e8";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#1e6fd0";
      g.fillRect(0, 0, w, 3);
      g.fillRect(0, 0, 4, h);
      g.fillRect(w - 4, 0, 4, h);
      g.fillRect(12, 0, 8, 4);
      text(g, "10", w / 2, 22, 14, "#1e6fd0");
      grain(g, w, h, 42, 8);
    },
    false,
  );

/**
 * Cork board: polaroids of Copán (a stela, a scarlet macaw, the ball court), a bus ticket
 * Copán Ruinas → Tegucigalpa, the school timetable and a sticky note, with colored pins.
 */
export const corkTex = () =>
  tex(
    128,
    80,
    (g, w, h) => {
      g.fillStyle = "#6a4426";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#b98a56";
      g.fillRect(3, 3, w - 6, h - 6);
      const r = rng(51);
      for (let k = 0; k < 500; k++) {
        g.fillStyle = r() < 0.5 ? "rgba(120,80,40,0.5)" : "rgba(220,180,120,0.4)";
        g.fillRect(3 + r() * (w - 6), 3 + r() * (h - 6), 1, 1);
      }
      const polaroid = (x: number, y: number, a: number, paint: () => void, label: string) => {
        g.save();
        g.translate(x, y);
        g.rotate(a);
        g.fillStyle = "#f6f2e6";
        g.fillRect(-12, -14, 24, 28);
        g.save();
        g.beginPath();
        g.rect(-10, -12, 20, 19);
        g.clip();
        g.translate(-10, -12);
        paint();
        g.restore();
        text(g, label, 0, 11, 4, "#3a2a20", "center", 400);
        g.restore();
      };
      // Stela.
      polaroid(18, 22, -0.08, () => {
        g.fillStyle = "#8fb5d8";
        g.fillRect(0, 0, 20, 19);
        g.fillStyle = "#5f8a4a";
        g.fillRect(0, 14, 20, 5);
        g.fillStyle = "#9b8f7a";
        g.fillRect(7, 3, 6, 14);
        g.fillStyle = "#6f6555";
        g.fillRect(8, 4, 4, 3);
        g.fillRect(8, 9, 4, 1);
        g.fillRect(8, 12, 4, 1);
      }, "Estela A");
      // Scarlet macaw.
      polaroid(46, 26, 0.07, () => {
        g.fillStyle = "#2f6b3a";
        g.fillRect(0, 0, 20, 19);
        g.fillStyle = "#d42121";
        g.fillRect(8, 4, 5, 9);
        g.fillRect(9, 13, 2, 6);
        g.fillStyle = "#e8c21c";
        g.fillRect(12, 7, 2, 4);
        g.fillStyle = "#2a63c9";
        g.fillRect(12, 11, 2, 2);
        g.fillStyle = "#f4eee0";
        g.fillRect(8, 5, 2, 2);
      }, "Guaras");
      // Ball court.
      polaroid(24, 58, 0.05, () => {
        g.fillStyle = "#9fc0de";
        g.fillRect(0, 0, 20, 19);
        g.fillStyle = "#6f8a4a";
        g.fillRect(0, 12, 20, 7);
        g.fillStyle = "#a59c86";
        g.beginPath();
        g.moveTo(0, 14);
        g.lineTo(7, 8);
        g.lineTo(7, 14);
        g.fill();
        g.beginPath();
        g.moveTo(20, 14);
        g.lineTo(13, 8);
        g.lineTo(13, 14);
        g.fill();
      }, "Juego de pelota");
      // Bus ticket.
      g.save();
      g.translate(70, 60);
      g.rotate(-0.12);
      g.fillStyle = "#f2d36b";
      g.fillRect(-14, -6, 28, 12);
      g.fillStyle = "#c98a3a";
      for (let x = -12; x < 13; x += 3) g.fillRect(x, 4, 1, 1);
      text(g, "COPÁN RUINAS", 0, -2, 3.6, "#5a2a10");
      text(g, "→ TEGUCIGALPA", 0, 2.5, 3.6, "#5a2a10");
      g.restore();
      // Timetable.
      g.save();
      g.translate(98, 30);
      g.rotate(0.03);
      g.fillStyle = "#f6f2e6";
      g.fillRect(-20, -18, 40, 36);
      text(g, "HORARIO", 0, -13, 5, "#2a3f8f");
      g.fillStyle = "#9fb3d8";
      for (let i = 0; i <= 5; i++) g.fillRect(-18 + i * 7, -9, 0.6, 25);
      for (let j = 0; j <= 5; j++) g.fillRect(-18, -9 + j * 5, 35, 0.6);
      const cols = ["#f2c14e", "#9be3b5", "#f6a6c8", "#9fc0de"];
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if (r() < 0.6) {
        g.fillStyle = cols[(i + j) % 4];
        g.fillRect(-17.4 + i * 7, -8.4 + j * 5, 6, 4);
      }
      g.restore();
      // Sticky note.
      g.save();
      g.translate(101, 64);
      g.rotate(0.15);
      g.fillStyle = "#f7e76a";
      g.fillRect(-11, -9, 22, 18);
      text(g, "¡Examen de", 0, -3, 3.6, "#3a2a20", "center", 400);
      text(g, "historia!", 0, 2, 3.6, "#3a2a20", "center", 400);
      g.restore();
      // Pins.
      for (const [x, y, c] of [[18, 9, "#c21f1f"], [46, 13, "#2a63c9"], [24, 45, "#1f8a4a"], [98, 13, "#c21f1f"], [70, 55, "#e8c21c"], [101, 56, "#2a63c9"]] as const) {
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.beginPath();
        g.arc(x + 1, y + 1, 1.6, 0, 7);
        g.fill();
        g.fillStyle = c;
        g.beginPath();
        g.arc(x, y, 1.6, 0, 7);
        g.fill();
      }
    },
    false,
  );

/** Jade mosaic: irregular green tiles with dark grout (for the Maya mask). */
export const jadeMosaicTex = () =>
  tex(48, 48, (g, w, h) => {
    g.fillStyle = "#16362a";
    g.fillRect(0, 0, w, h);
    const r = rng(61);
    const greens = ["#2e8a5c", "#3fa06c", "#257a4e", "#4fb07c", "#1f6b44"];
    for (let y = 0; y < h; y += 6)
      for (let x = -((y / 6) % 2) * 3; x < w; x += 6 + Math.floor(r() * 2)) {
        g.fillStyle = greens[Math.floor(r() * greens.length)];
        g.fillRect(x + 0.6, y + 0.6, 4.8 + r() * 1.2, 4.8);
      }
    grain(g, w, h, 62, 10);
  });

/** Field notebook cover: "DIARIO DE CAMPO". */
export const fieldbookTex = () =>
  tex(
    40,
    56,
    (g, w, h) => {
      g.fillStyle = "#6b4a2a";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#4a321c";
      g.fillRect(0, 0, 4, h);
      g.fillStyle = "#e9dcb6";
      g.fillRect(9, 14, 26, 18);
      text(g, "DIARIO", 22, 20, 5, "#4a321c");
      text(g, "DE CAMPO", 22, 27, 4.5, "#4a321c");
      g.fillStyle = "#c21f1f";
      g.fillRect(30, 0, 3, h); // elastic band
      grain(g, w, h, 63, 10);
    },
    false,
  );
