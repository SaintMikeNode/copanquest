// Day/night cycle and the Maya calendar.
import * as THREE from "three";
import { shared } from "../voxel/material";

/** Length of a full in-game day in seconds. */
export const DAY_SECONDS = 20 * 60;

/** Time of day: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset. */
export const dayClock = { t: 0.34, night: 0, daylight: 1 };

const C = (h: string) => new THREE.Color(h);
const DAY = { top: C("#4f86e8"), horizon: C("#c3d6f0"), sky: C("#b4cff7"), ground: C("#8f8a6a"), sun: C("#ffe6bf") };
const DUSK = { top: C("#4b5fb0"), horizon: C("#ffb07a"), sky: C("#c9a8c4"), ground: C("#6a5248"), sun: C("#ffb070") };
const NIGHT = { top: C("#081028"), horizon: C("#1c2a52"), sky: C("#3a4d7e"), ground: C("#1b2030"), sun: C("#9fb4e6") };

export const skyTop = new THREE.Color().copy(DAY.top);
const sunDir = new THREE.Vector3();
const tmp = new THREE.Color();

function blend(a: typeof DAY, b: typeof DAY, k: number, key: keyof typeof DAY, out: THREE.Color) {
  return out.copy(a[key]).lerp(b[key], k);
}

/** Advance the clock and update every shared light/sky uniform. */
export function tickDay(dt: number) {
  dayClock.t = (dayClock.t + dt / DAY_SECONDS) % 1;
  const a = (dayClock.t - 0.25) * Math.PI * 2;
  // Sun rises in the east (+x), sets in the west (−x); Copán is at 15° N so it passes a little south.
  sunDir.set(Math.cos(a), Math.sin(a), 0.32).normalize();
  const elev = sunDir.y;
  const daylight = THREE.MathUtils.smoothstep(elev, -0.12, 0.3);
  const dusk = 1 - Math.min(1, Math.abs(elev) / 0.3); // 1 near the horizon
  dayClock.daylight = daylight;
  dayClock.night = 1 - THREE.MathUtils.smoothstep(elev, -0.25, 0.02);

  // Light comes from the sun by day and the moon (opposite side) by night.
  if (elev > -0.05) shared.sunDirection.value.copy(sunDir);
  else shared.sunDirection.value.copy(sunDir).multiplyScalar(-1).setY(Math.max(0.35, -sunDir.y));
  shared.sunDirection.value.normalize();

  const pick = (key: keyof typeof DAY, out: THREE.Color) => {
    blend(NIGHT, DAY, daylight, key, out);
    if (dusk > 0 && elev > -0.25) out.lerp(blend(DUSK, DUSK, 0, key, tmp), dusk * 0.85 * (elev > 0 ? 1 : 1 + elev * 4));
    return out;
  };
  pick("top", skyTop);
  pick("horizon", shared.fogColor.value);
  pick("sky", shared.skyColor.value);
  pick("ground", shared.groundColor.value);
  pick("sun", shared.sunColor.value);
  // Moonlight is dim; sunlight fades in at dawn.
  shared.sunColor.value.multiplyScalar(elev > -0.05 ? 0.25 + daylight * 0.75 : 0.32);
  shared.sunHaze.value.set("#ffdcae").lerp(DUSK.sun, dusk * 0.6).multiplyScalar(0.35 + daylight * 0.65);
}

export function sunDirection() {
  return sunDir;
}

// ---------------------------------------------------------------- Maya calendar

const TZOLKIN = ["Imix", "Ik'", "Ak'b'al", "K'an", "Chikchan", "Kimi", "Manik'", "Lamat", "Muluk", "Ok", "Chuwen", "Eb'", "B'en", "Ix", "Men", "K'ib'", "Kab'an", "Etz'nab'", "Kawak", "Ajaw"];
const HAAB = ["Pop", "Wo'", "Sip", "Sotz'", "Sek", "Xul", "Yaxk'in", "Mol", "Ch'en", "Yax", "Sak'", "Keh", "Mak", "K'ank'in", "Muwan", "Pax", "K'ayab", "Kumk'u", "Wayeb'"];

/** Julian Day Number of a Gregorian date. */
function jdn(y: number, m: number, d: number) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/**
 * Today's date in the Maya Long Count, Tzolk'in and Haab' (GMT correlation 584283).
 * Check: 21 Dec 2012 → 13.0.0.0.0 4 Ajaw 3 K'ank'in.
 */
export function mayaDate(date = new Date()) {
  const days = jdn(date.getFullYear(), date.getMonth() + 1, date.getDate()) - 584283;
  let r = days;
  const baktun = Math.floor(r / 144000);
  r -= baktun * 144000;
  const katun = Math.floor(r / 7200);
  r -= katun * 7200;
  const tun = Math.floor(r / 360);
  r -= tun * 360;
  const winal = Math.floor(r / 20);
  const kin = r - winal * 20;
  const tzNum = (((days + 3) % 13) + 13) % 13 + 1;
  const tzName = TZOLKIN[(((days + 19) % 20) + 20) % 20];
  const h = (((days + 348) % 365) + 365) % 365;
  return {
    longCount: `${baktun}.${katun}.${tun}.${winal}.${kin}`,
    tzolkin: `${tzNum} ${tzName}`,
    haab: `${h % 20} ${HAAB[Math.floor(h / 20)]}`,
  };
}
