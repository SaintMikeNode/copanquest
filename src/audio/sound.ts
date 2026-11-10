// Music and sound effects (Web Audio). Self-contained: loads before the 3D engine chunk.
//
// Music: Tiki Party, 5 s of silence, Field Day, 5 s, and around again (Ovani Sound, Casual Music
// Pack Vol. 1, "Main" versions). Streamed with an <audio> element through a gain node, because
// iOS ignores HTMLMediaElement.volume.
// Effects: short MP3s from Ovani Sound's Cozy Casual Sound FX Pack Vol. 2 (public/audio/sfx),
// decoded on first use. Names with variants (pickup-1…6) pick one at random.
// All files are 128 kbps MP3 (converted from the packs' WAVs with LAME).
//
// Bedroom (main page): the record on the desk, "La muerte del bardo" by Manuel de Adalid y Gamero
// (Victor, 1914, Trío Veneciano; public domain, from the Library of Congress National Jukebox),
// public/music/. It loops with a short pause between plays and can be paused from the record box.
//
// Browsers only allow sound after a tap or key press: the first one unlocks the context.
// Exactly one of the two plays: the game playlist while playing (useGame.playing; it starts from
// Tiki Party on Jugar), the record everywhere else. Going back to the bedroom always stops and
// rewinds the game playlist and starts the record from the beginning.
// Music and effects can be switched off separately (saved in localStorage).
import { create } from "zustand";
import { useGame } from "../state/useGame";

const PLAYLIST = ["/audio/music/tiki-party.mp3", "/audio/music/field-day.mp3"];
const GAP_MS = 5000;
const MUSIC_VOLUME = 0.35;
const RECORD = "/music/la-muerte-del-bardo.mp3";
const RECORD_GAP_MS = 3000;
const RECORD_VOLUME = 0.6;

/** Effect name → [number of variants, volume]. Files: /audio/sfx/<name>(-<n>).mp3 */
export const SFX = {
  click: [1, 0.45],
  open: [1, 0.6],
  close: [1, 0.55],
  page: [1, 0.5],
  pickup: [6, 0.7],
  jade: [3, 0.7],
  dig: [6, 0.55],
  found: [1, 0.7],
  quest: [1, 0.6],
  rankup: [1, 0.6],
  shutter: [1, 0.8],
  photo: [1, 0.55],
  "camera-on": [1, 0.6],
  "camera-off": [1, 0.55],
  lens: [1, 0.6],
  respawn: [1, 0.6],
  jump: [1, 0.22],
  step: [4, 0.06],
  "step-stone": [3, 0.07],
  ladder: [1, 0.1],
  ball: [1, 0.8],
  score: [1, 0.7],
  catch: [1, 0.7],
  talk: [1, 0.5],
  line: [1, 0.35],
  discover: [1, 0.55],
  error: [1, 0.55],
  place: [1, 0.6],
} as const satisfies Record<string, readonly [number, number]>;
export type SfxName = keyof typeof SFX;

const KEY = "cq-sound";
function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { music: p.music !== false, sfx: p.sfx !== false };
  } catch {
    return { music: true, sfx: true };
  }
}

export const useSound = create<{ music: boolean; sfx: boolean; setMusic: (on: boolean) => void; setSfx: (on: boolean) => void }>(
  (set, get) => {
    const save = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify({ music: get().music, sfx: get().sfx }));
      } catch {
        /* private mode */
      }
    };
    return {
      ...loadPrefs(),
      setMusic: (music) => {
        set({ music });
        save();
        applyMusic();
      },
      setSfx: (sfx) => {
        set({ sfx });
        save();
      },
    };
  },
);

/** The bedroom record: `wanted` = the player hasn't paused it; `spinning` = it is playing now. */
export const useRecord = create<{ wanted: boolean; spinning: boolean; toggle: () => void; setOn: (on: boolean) => void }>((set, get) => ({
  wanted: true,
  spinning: false,
  toggle: () => get().setOn(!get().wanted),
  setOn: (on) => {
    set({ wanted: on });
    // Turning it on also turns the music back on if it was switched off.
    if (on && !useSound.getState().music) useSound.getState().setMusic(true);
    else applyMusic();
  },
}));

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicEl: HTMLAudioElement | null = null;
let track = 0;
let gapTimer = 0;
let recordEl: HTMLAudioElement | null = null;
let recordGap = 0;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function context() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  return ctx;
}

function load(url: string) {
  let p = buffers.get(url);
  if (!p) {
    const c = context();
    p = c
      ? fetch(url)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
          .then((b) => c.decodeAudioData(b))
          .catch(() => null)
      : Promise.resolve(null);
    buffers.set(url, p);
  }
  return p;
}

const urlOf = (name: SfxName, variant: number) => `/audio/sfx/${name}${SFX[name][0] > 1 ? `-${variant}` : ""}.mp3`;

/** Fetch and decode every effect (after the first tap, so it never delays the page). */
function preload() {
  for (const name of Object.keys(SFX) as SfxName[]) for (let v = 1; v <= SFX[name][0]; v++) load(urlOf(name, v));
}

/** Play an effect. `rate` changes pitch a little for variety (1 = as recorded). */
export function play(name: SfxName, { volume = 1, rate = 1 } = {}) {
  if (!useSound.getState().sfx || !unlocked) return;
  const c = context();
  if (!c || !master) return;
  const [variants, base] = SFX[name];
  const url = urlOf(name, 1 + Math.floor(Math.random() * variants));
  load(url).then((buf) => {
    if (!buf || !master) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = base * volume;
    src.connect(g).connect(master);
    src.start();
  });
}

// ---------------------------------------------------------------- music

function startTrack() {
  if (!musicEl) return;
  musicEl.src = PLAYLIST[track];
  musicEl.play().catch(() => {});
}

/** Stop the playlist and rewind it to the first song (leaving the game). */
function stopMusic() {
  clearTimeout(gapTimer);
  gapTimer = 0;
  track = 0;
  if (musicEl) {
    musicEl.pause();
    musicEl.removeAttribute("src");
    musicEl.load();
  }
}

/** The bedroom record: plays whenever the game isn't (and music is on and it isn't paused). */
function applyRecord() {
  if (!unlocked || !ctx || !master) return;
  const on = useSound.getState().music && !useGame.getState().playing && useRecord.getState().wanted && !document.hidden;
  if (!recordEl) {
    if (!on) return;
    recordEl = new Audio(RECORD);
    recordEl.preload = "auto";
    recordEl.crossOrigin = "anonymous";
    const g = ctx.createGain();
    g.gain.value = RECORD_VOLUME;
    ctx.createMediaElementSource(recordEl).connect(g).connect(master);
    const spin = () => useRecord.setState({ spinning: !!recordEl && !recordEl.paused });
    recordEl.addEventListener("play", spin);
    recordEl.addEventListener("pause", spin);
    recordEl.addEventListener("ended", () => {
      spin();
      recordGap = window.setTimeout(() => {
        recordGap = 0;
        if (!recordEl) return;
        recordEl.currentTime = 0;
        applyRecord();
      }, RECORD_GAP_MS);
    });
  }
  if (on) {
    if (!recordGap && recordEl.paused) recordEl.play().catch(() => {});
  } else recordEl.pause();
}

function applyMusic() {
  applyRecord();
  if (!unlocked || !ctx || !master) return;
  const on = useSound.getState().music && useGame.getState().playing;
  if (!musicEl) {
    if (!on) return;
    musicEl = new Audio();
    musicEl.preload = "auto";
    musicEl.crossOrigin = "anonymous";
    musicGain = ctx.createGain();
    musicGain.gain.value = MUSIC_VOLUME;
    ctx.createMediaElementSource(musicEl).connect(musicGain).connect(master);
    musicEl.addEventListener("ended", () => {
      track = (track + 1) % PLAYLIST.length;
      gapTimer = window.setTimeout(() => {
        gapTimer = 0;
        if (!musicEl) return;
        musicEl.src = PLAYLIST[track];
        if (useSound.getState().music && useGame.getState().playing && !document.hidden) musicEl.play().catch(() => {});
      }, GAP_MS);
    });
    startTrack();
    return;
  }
  if (on) {
    // Resume where it was (or wait out the gap if it was switched off during one); after a
    // stop, start again from the first song.
    if (!musicEl.getAttribute("src")) startTrack();
    else if (!gapTimer && musicEl.paused) musicEl.play().catch(() => {});
  } else musicEl.pause();
}

// ---------------------------------------------------------------- unlock

let unlocked = false;
function unlock() {
  const c = context();
  if (!c) return;
  c.resume().catch(() => {});
  if (unlocked) return;
  unlocked = true;
  applyMusic();
  preload();
}

/** Call once at startup: unlock on the first gesture, pause while the tab is hidden. */
export function initSound() {
  const onGesture = () => {
    unlock();
    if (ctx?.state === "running") {
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
    }
  };
  window.addEventListener("pointerdown", onGesture, true);
  window.addEventListener("keydown", onGesture, true);
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) {
      ctx.suspend().catch(() => {});
      musicEl?.pause();
      recordEl?.pause();
    } else {
      ctx.resume().catch(() => {});
      if (useSound.getState().music && useGame.getState().playing && !gapTimer && musicEl?.getAttribute("src")) musicEl.play().catch(() => {});
      applyRecord();
    }
  });
  // Game music follows playing: starts on Jugar, stops (and rewinds) on the way out, where the
  // record starts again from the beginning.
  useGame.subscribe((s, p) => {
    if (s.playing === p.playing) return;
    if (!s.playing) {
      stopMusic();
      clearTimeout(recordGap);
      recordGap = 0;
      if (recordEl) recordEl.currentTime = 0;
      useRecord.setState({ wanted: true }); // always back on, even if it was paused before Jugar
    }
    applyMusic();
  });
  // Every button click gets a soft tick (buttons can opt out with data-silent).
  document.addEventListener(
    "click",
    (e) => {
      const b = (e.target as HTMLElement | null)?.closest?.("button");
      if (b && !b.disabled && !b.hasAttribute("data-silent")) play("click");
    },
    true,
  );
}

/** For checking from the console: `(await import("/src/audio/sound.ts")).soundDebug()` in dev.
 *  `soundDebug(80)` jumps the current song to 80 s (to hear the gap and the next song). */
export function soundDebug(seek?: number) {
  if (seek !== undefined && musicEl) musicEl.currentTime = seek;
  return {
    ctx: ctx?.state ?? null,
    unlocked,
    track,
    src: musicEl?.src ?? null,
    time: musicEl?.currentTime ?? null,
    paused: musicEl?.paused ?? null,
    gap: !!gapTimer,
    record: recordEl ? { time: recordEl.currentTime, paused: recordEl.paused, gap: !!recordGap } : null,
    decoded: buffers.size,
  };
}
