// Director: a dev-only toolkit to film the game (trailers, social videos). Mounted in the game
// canvas when DEV_TOOLS is on (`npm run dev`, or `?debug`); never in the public build's normal
// flow. Everything is on `window.cqDirector` (alias `window.cq`), documented in DIRECTOR.md.
//
// Camera moves run on the render clock (real time), so a screen recorder captures them as they
// play. Calls return promises: `await cq.fly(...); await cq.orbit(...)` chains shots.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { directorCam } from "./directorCam";
import { playerState } from "../player/playerState";
import { useGame, type Quality } from "../state/useGame";
import { useCamera } from "../game/camera";
import { useLens } from "../game/lens";
import { dayClock } from "../game/time";
import { useTutorial } from "../ui/Tutorial";
import { ROSALILA } from "../world/siteData";
import { subjectPositions } from "../game/subjects";

type V3 = [number, number, number];
type Key = { pos: V3; look: V3 };
type Ease = "linear" | "in" | "out" | "inOut";

const EASES: Record<Ease, (t: number) => number> = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

/** Named spots (x = east, z = south, meters from Stela C; y = ground there, about). */
export const PLACES = {
  spawn: [-164, 3, 80.7] as V3,
  entranceGate: [-150, 1, 81] as V3,
  greatPlaza: [0, 0, 20] as V3,
  stelaC: [0, 0, 0] as V3,
  ballCourt: [36.8, 0, 166.4] as V3,
  hieroglyphicStairway: [70, 0, 204] as V3,
  temple26Top: [90, 21, 204] as V3,
  acropolis: [53, 12, 300] as V3,
  temple11Top: [-2, 18, 262] as V3,
  temple16Top: [72, 32, 330] as V3,
  westCourt: [15, 12, 320] as V3,
  eastCourt: [115, 12, 285] as V3,
  rosalilaFacade: [69.5, 12, 330] as V3,
  rosalilaTunnelMouth: [ROSALILA.tunnel.fromX + 3, 12.6, ROSALILA.tunnel.z] as V3,
};

interface Shot {
  t0: number;
  dur: number;
  ease: (t: number) => number;
  at: (k: number, pos: THREE.Vector3, look: THREE.Vector3) => void;
  done: () => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const w = window as unknown as Record<string, unknown> & {
  cqTeleport?: (x: number, y: number, z: number) => void;
  cqView?: (y: number, p: number, d: number) => void;
};

/** Camera yaw (FollowCamera convention) that makes "forward" point from the player toward (dx, dz). */
const yawToward = (dx: number, dz: number) => Math.atan2(-dx, -dz);

function key(type: "keydown" | "keyup", code: string) {
  const k = code === "ShiftLeft" ? "Shift" : code.replace(/^Key/, "").toLowerCase();
  window.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true }));
}

export function Director() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const shot = useRef<Shot | null>(null);
  const clock = useRef(0);

  useFrame((_, dt) => {
    clock.current += dt;
    const s = shot.current;
    if (!s) return;
    const k = Math.min(1, (clock.current - s.t0) / s.dur);
    s.at(s.ease(k), directorCam.pos, directorCam.look);
    if (k >= 1) {
      shot.current = null;
      s.done();
    }
  });

  useEffect(() => {
    const run = (dur: number, ease: Ease, at: Shot["at"]) =>
      new Promise<void>((done) => {
        shot.current?.done();
        directorCam.active = true;
        at(0, directorCam.pos, directorCam.look);
        shot.current = { t0: clock.current, dur: Math.max(0.05, dur), ease: EASES[ease], at, done };
      });

    const api = {
      places: PLACES,

      /** Fly through keyframes ({pos, look}) in `seconds`, smoothly (Catmull-Rom). */
      fly(keys: Key[], seconds: number, ease: Ease = "inOut") {
        const pts = keys.length > 1 ? keys : [keys[0], keys[0]];
        const p = new THREE.CatmullRomCurve3(pts.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
        const l = new THREE.CatmullRomCurve3(pts.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");
        return run(seconds, ease, (t, pos, look) => {
          p.getPointAt(t, pos);
          l.getPointAt(t, look);
        });
      },

      /** Circle around `center` (radius, height above it), `turns` times, looking at it. */
      orbit({
        center,
        radius = 30,
        height = 20,
        seconds = 8,
        from = 0,
        turns = 1,
        lookHeight = 0,
        ease = "inOut" as Ease,
      }: { center: V3; radius?: number; height?: number; seconds?: number; from?: number; turns?: number; lookHeight?: number; ease?: Ease }) {
        return run(seconds, ease, (t, pos, look) => {
          const a = from + t * turns * Math.PI * 2;
          pos.set(center[0] + Math.cos(a) * radius, center[1] + height, center[2] + Math.sin(a) * radius);
          look.set(center[0], center[1] + lookHeight, center[2]);
        });
      },

      /** 360 around the player wherever they stand (e.g. on top of a temple). */
      orbitPlayer({ radius = 6, height = 2.5, seconds = 8, from = 0, turns = 1, ease = "inOut" as Ease } = {}) {
        return run(seconds, ease, (t, pos, look) => {
          const c = playerState.position;
          const a = from + t * turns * Math.PI * 2;
          pos.set(c.x + Math.cos(a) * radius, c.y + height, c.z + Math.sin(a) * radius);
          look.set(c.x, c.y + 1, c.z);
        });
      },

      /** Hold the camera still at a spot. */
      hold(pos: V3, look: V3) {
        shot.current = null;
        directorCam.active = true;
        directorCam.pos.set(...pos);
        directorCam.look.set(...look);
      },

      /** Back to the normal third-person camera. */
      release() {
        shot.current?.done();
        shot.current = null;
        directorCam.active = false;
      },

      /** Lens width for director shots (the game camera uses 60). */
      fov(deg: number) {
        directorCam.fov = deg;
        camera.fov = deg;
        camera.updateProjectionMatrix();
      },

      /** Put the player at (x, y, z), facing toward (faceX, faceZ) if given. y can be a bit high: they fall. */
      place(x: number, y: number, z: number, face?: [number, number]) {
        w.cqTeleport?.(x, y, z);
        if (face) w.cqView?.(yawToward(face[0] - x, face[1] - z), 0.3, 6);
      },

      /** Third-person view: yaw, pitch (0.35 default), distance (7 default). */
      view(yaw: number, pitch = 0.35, dist = 7) {
        w.cqView?.(yaw, pitch, dist);
      },

      /** Walk (or run) the player to (x, z), turning the view to face that way. */
      async walkTo(x: number, z: number, { run = false, timeout = 20000, pitch = 0.3, dist = 6 } = {}) {
        const t0 = performance.now();
        if (run) key("keydown", "ShiftLeft");
        key("keydown", "KeyW");
        // Stop when there, at the timeout, or when blocked (no progress for 1.2 s).
        let best = Infinity;
        let lastGain = t0;
        try {
          while (performance.now() - t0 < timeout) {
            const p = playerState.position;
            const dx = x - p.x;
            const dz = z - p.z;
            const d = Math.hypot(dx, dz);
            if (d < 0.6) break;
            if (d < best - 0.05) {
              best = d;
              lastGain = performance.now();
            } else if (performance.now() - lastGain > 1200) break;
            w.cqView?.(yawToward(dx, dz), pitch, dist);
            await sleep(50);
          }
        } finally {
          key("keyup", "KeyW");
          if (run) key("keyup", "ShiftLeft");
        }
      },

      /**
       * Raise the explorer's camera, take a photo (flash + it goes to the album), lower it.
       * `subject`: a photo subject id (a place like "rosalila", an animal, a person): the view
       * turns to center it first, so the game recognizes the photo.
       */
      async photo({ hold = 900, subject }: { hold?: number; subject?: string } = {}) {
        let target: THREE.Vector3 | null = null;
        let yaw = 0;
        let pitch = 0;
        if (subject) {
          const p = playerState.position;
          for (const s of subjectPositions.values()) {
            if (s.id !== subject) continue;
            if (!target || s.pos.distanceTo(p) < target.distanceTo(p)) target = s.pos;
          }
          if (target) {
            const dx = target.x - p.x;
            const dz = target.z - p.z;
            // The photo camera sits ~1.5 m behind the player's eyes (~1.25 m up).
            yaw = yawToward(dx, dz);
            pitch = -Math.atan2(target.y - (p.y + 1.25), Math.hypot(dx, dz) + 1.5);
            w.cqView?.(yaw, pitch, 6);
          }
        }
        useCamera.getState().toggle(true);
        await sleep(450);
        // Steer the real (over-the-shoulder) camera until the subject sits in the middle of the
        // viewfinder: a narrow vertical frame leaves little room on the sides.
        if (target) {
          const v = new THREE.Vector3();
          for (let i = 0; i < 24; i++) {
            v.copy(target).project(camera);
            if (Math.abs(v.x) < 0.06 && Math.abs(v.y) < 0.08) break;
            const fovY = THREE.MathUtils.degToRad(camera.fov);
            yaw -= v.x * Math.atan(Math.tan(fovY / 2) * camera.aspect) * 0.8;
            pitch -= v.y * (fovY / 2) * 0.8;
            w.cqView?.(yaw, pitch, 6);
            await sleep(60);
          }
          await sleep(350);
        } else await sleep(250);
        window.dispatchEvent(new Event("cq-shutter"));
        await sleep(hold);
        useCamera.getState().toggle(false);
      },

      /** Show or hide the place-description cards (they cover much of a vertical frame). */
      cards(visible: boolean) {
        document.body.classList.toggle("cq-nocards", !visible);
      },
      /** Show or hide all the on-screen UI (HUD, buttons, joystick, cards, tutorial). */
      hud(visible: boolean) {
        document.body.classList.toggle("cq-clean", !visible);
      },

      /** Grass and flowers draw distance in meters (game: 75). `?director` starts at 260 for aerials. */
      plants(meters: number) {
        directorCam.plants = meters;
      },
      quality(q: Quality) {
        useGame.getState().setQuality(q);
      },
      /** Time of day 0..1 (0.35 is the game's bright morning). */
      time(t: number) {
        dayClock.t = t;
      },
      /** The time lens (the city as it was, painted). */
      lens(on: boolean) {
        useLens.setState({ on });
      },
      skipTutorial() {
        useTutorial.getState().finish();
      },
      wait: sleep,

      /** Ready-made shots for the demo video (see DIRECTOR.md, Storyboard). */
      shots: {} as Record<string, () => Promise<void>>,
    };

    api.shots = {
      /** Hook: drone rising over the Great Plaza's stelae, gliding south toward the ball court. */
      hookAerial: () =>
        api.fly(
          [
            { pos: [-22, 7, 2], look: [6, 3, 22] },
            { pos: [-8, 13, 28], look: [18, 3, 70] },
            { pos: [8, 20, 70], look: [36, 3, 150] },
          ],
          4.5,
          "inOut",
        ),
      /** Drone circling Stela C and the plaza at low height. */
      plazaDrone: () => api.orbit({ center: [2, 0, 12], radius: 20, height: 9, seconds: 5, from: Math.PI * 0.75, turns: 0.3, lookHeight: 2 }),
      /** Down the ball court alley, then up to the Hieroglyphic Stairway. */
      ballCourtToStairway: () =>
        api.fly(
          [
            { pos: [36.8, 6, 138], look: [36.8, 2, 176] },
            { pos: [38, 8, 178], look: [55, 6, 200] },
            { pos: [50, 12, 204], look: [78, 14, 204] },
          ],
          5,
          "inOut",
        ),
      /** Slow drone arc around Temple 16 and the courts of the Acropolis. */
      acropolisOrbit: () => api.orbit({ center: [62, 12, 305], radius: 55, height: 26, seconds: 7, from: Math.PI * 0.6, turns: 0.22, lookHeight: 6 }),
      /** The explorer's camera outdoors: the player photographs Stela C (viewfinder, flash, "new photo"). */
      photoStela: async () => {
        api.release();
        api.place(2.5, 2, 9, [0, 0]);
        await sleep(1500);
        await api.photo({ subject: "stela-c", hold: 1600 });
      },
      /** Player on top of Temple 11 (high over the Acropolis), camera circles them 360°. */
      templeTop360: async () => {
        api.place(-2, 24, 262, [-2, 300]);
        await sleep(1500);
        await api.orbitPlayer({ radius: 7, height: 3, seconds: 7, turns: 1, ease: "linear" });
      },
      /** Through Rosalila's tunnel into the chamber, then the photo of the façade. */
      rosalila: async () => {
        api.release();
        const T = ROSALILA.tunnel;
        api.place(T.fromX + 3, 13, T.z, [T.toX, T.z]);
        await sleep(1200);
        await api.walkTo(T.toX - 2, T.z);
        await api.walkTo(64.5, 322);
        await api.walkTo(64.3, ROSALILA.center[1]);
        api.view(yawToward(1, 0), 0.1, 5);
        await sleep(900);
        await api.photo({ subject: "rosalila", hold: 1400 });
      },
    };

    if (new URLSearchParams(location.search).has("director")) {
      directorCam.plants = 260;
      api.cards(false);
    }
    (window as unknown as { cqDirector?: typeof api; cq?: typeof api }).cqDirector = api;
    (window as unknown as { cq?: typeof api }).cq = api;
    return () => {
      delete (window as unknown as { cqDirector?: unknown }).cqDirector;
      delete (window as unknown as { cq?: unknown }).cq;
      directorCam.active = false;
      directorCam.plants = 0;
    };
  }, [camera]);

  return null;
}
