#!/usr/bin/env node
// Crops the Copernicus GLO-30 DEM around Copán's Principal Group and writes a heightmap
// in the game's local metric coordinates.
//
// Source: Copernicus DEM GLO-30, AWS open data bucket `copernicus-dem-30m` (no key needed).
// The tiles are Cloud-Optimized GeoTIFFs, so only the cropped window is downloaded
// (HTTP range requests), not the whole 1°×1° tile.
//
// Usage:
//   npm run heightmap                       # defaults below
//   node scripts/dem-to-heightmap.mjs --size 3000 --spacing 30 --lat 14.8400755 --lon -89.1420256
//
// Outputs (in public/terrain/):
//   copan-heightmap.png   16-bit grayscale PNG (for Blender's Displace modifier / inspection)
//   copan-heightmap.bin   same samples as raw little-endian Uint16 (what the game loads;
//                         browsers decode 16-bit PNGs to 8 bits, which loses precision)
//   copan-heightmap.json  metadata: grid size, spacing, elevation range, datum, scale
//
// Scale: elevation_m = minElevation + (value / 65535) * (maxElevation - minElevation)
// Local game coordinates: origin = Stela C in the Great Plaza (OpenStreetMap node 3889488600),
// x = east (m),
// z = south (m), y = elevation_m - datumElevation. Row 0 of the image is the NORTH edge,
// column 0 is the WEST edge. Each pixel is `spacing` meters.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fromUrl } from "geotiff";
import { encodePNG } from "./lib/png.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

// Stela C, OSM node 3889488600 (the handoff's 14.8376, -89.1418 is actually Temple 11).
const LAT = Number(args.lat ?? 14.8400755);
const LON = Number(args.lon ?? -89.1420256);
const SIZE = Number(args.size ?? 3000); // meters, square
const SPACING = Number(args.spacing ?? 30); // meters per sample
const N = Math.round(SIZE / SPACING) + 1;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "terrain");

function tileName(lat, lon) {
  const latBand = Math.floor(lat);
  const lonBand = Math.floor(lon);
  const ns = latBand >= 0 ? "N" : "S";
  const ew = lonBand >= 0 ? "E" : "W";
  const la = String(Math.abs(latBand)).padStart(2, "0");
  const lo = String(Math.abs(lonBand)).padStart(3, "0");
  return `Copernicus_DSM_COG_10_${ns}${la}_00_${ew}${lo}_00_DEM`;
}

// Meters per degree (WGS84, good to ~0.1% over a 3 km crop).
const latRad = (LAT * Math.PI) / 180;
const M_PER_DEG_LAT = 111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
const M_PER_DEG_LON = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);

const half = SIZE / 2;
const north = LAT + half / M_PER_DEG_LAT;
const south = LAT - half / M_PER_DEG_LAT;
const west = LON - half / M_PER_DEG_LON;
const east = LON + half / M_PER_DEG_LON;

if (Math.floor(north) !== Math.floor(south) || Math.floor(east) !== Math.floor(west)) {
  throw new Error("The crop crosses a 1° tile boundary; this script only handles one tile.");
}

const name = tileName(LAT, LON);
const url = `https://copernicus-dem-30m.s3.amazonaws.com/${name}/${name}.tif`;
console.log(`Reading ${url}`);

const tiff = await fromUrl(url);
const image = await tiff.getImage();
const [ox, oy] = image.getOrigin();
const [rx, ry] = image.getResolution(); // ry is negative (north-up)
const W = image.getWidth();
const H = image.getHeight();

// Pixel window with a 2-pixel margin for bilinear sampling.
const px0 = Math.max(0, Math.floor((west - ox) / rx) - 2);
const px1 = Math.min(W, Math.ceil((east - ox) / rx) + 2);
const py0 = Math.max(0, Math.floor((north - oy) / ry) - 2);
const py1 = Math.min(H, Math.ceil((south - oy) / ry) + 2);
const [raster] = await image.readRasters({ window: [px0, py0, px1, py1], samples: [0] });
const ww = px1 - px0;
const wh = py1 - py0;
console.log(`Window ${ww}×${wh} px (tile ${W}×${H}, ${(rx * 3600).toFixed(2)}″ × ${(-ry * 3600).toFixed(2)}″)`);

// GeoTIFF pixel-is-area: pixel (i, j) center is at origin + (i + 0.5) * res.
function sample(lon, lat) {
  const fx = (lon - ox) / rx - 0.5 - px0;
  const fy = (lat - oy) / ry - 0.5 - py0;
  const x0 = Math.max(0, Math.min(ww - 2, Math.floor(fx)));
  const y0 = Math.max(0, Math.min(wh - 2, Math.floor(fy)));
  const tx = fx - x0;
  const ty = fy - y0;
  const v = (x, y) => raster[y * ww + x];
  return (
    v(x0, y0) * (1 - tx) * (1 - ty) +
    v(x0 + 1, y0) * tx * (1 - ty) +
    v(x0, y0 + 1) * (1 - tx) * ty +
    v(x0 + 1, y0 + 1) * tx * ty
  );
}

// Resample onto a regular metric grid (local tangent plane around the origin).
const elev = new Float64Array(N * N);
let min = Infinity;
let max = -Infinity;
for (let row = 0; row < N; row++) {
  const zLocal = -half + row * SPACING; // row 0 = north (z negative)
  const lat = LAT - zLocal / M_PER_DEG_LAT;
  for (let col = 0; col < N; col++) {
    const xLocal = -half + col * SPACING;
    const lon = LON + xLocal / M_PER_DEG_LON;
    const e = sample(lon, lat);
    elev[row * N + col] = e;
    if (e < min) min = e;
    if (e > max) max = e;
  }
}
const datum = sample(LON, LAT);

const u16 = new Uint16Array(N * N);
const range = max - min || 1;
for (let i = 0; i < u16.length; i++) u16[i] = Math.round(((elev[i] - min) / range) * 65535);

await mkdir(outDir, { recursive: true });
await writeFile(
  path.join(outDir, "copan-heightmap.png"),
  encodePNG({ width: N, height: N, bitDepth: 16, colorType: 0, data: u16 }),
);
const bin = Buffer.alloc(u16.length * 2);
u16.forEach((v, i) => bin.writeUInt16LE(v, i * 2));
await writeFile(path.join(outDir, "copan-heightmap.bin"), bin);

const meta = {
  source: "Copernicus DEM GLO-30 (copernicus-dem-30m, AWS Open Data)",
  tile: name,
  attribution:
    "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved",
  origin: { lat: LAT, lon: LON, note: "Stela C, Great Plaza (OSM node 3889488600); game origin (0,0,0)" },
  bounds: { north, south, west, east },
  size: N,
  spacingMeters: SPACING,
  extentMeters: (N - 1) * SPACING,
  minElevation: Number(min.toFixed(2)),
  maxElevation: Number(max.toFixed(2)),
  datumElevation: Number(datum.toFixed(2)),
  encoding: "uint16; elevation_m = minElevation + value/65535 * (maxElevation - minElevation)",
  axes: "row 0 = north, col 0 = west; game x = east, z = south, y = elevation - datumElevation",
};
await writeFile(path.join(outDir, "copan-heightmap.json"), JSON.stringify(meta, null, 2) + "\n");

console.log(
  `Wrote ${N}×${N} heightmap, ${SPACING} m/px, elevation ${min.toFixed(1)}–${max.toFixed(1)} m, datum ${datum.toFixed(1)} m`,
);
