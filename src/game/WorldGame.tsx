// Interactive world pieces: pickups, agoutis, turkeys, dig sites and the ballgame.
// Must be inside <Physics>.
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { BallCollider, CuboidCollider, RigidBody, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { create } from "zustand";
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";
import { playerState } from "../player/playerState";
import { useGame } from "../state/useGame";
import { computeXp, rankIndex, useProgress } from "../state/progress";
import { ARTIFACTS, DIG_SITES, ITEM_NAMES, PICKUPS, type Item } from "./gameData";
import { checkRankUp } from "./questLogic";
import { trackSubject } from "./subjects";
import { getT } from "../i18n";
import { Blob } from "./blob";

// ---------------------------------------------------------------- shared helpers

/** Nearby action the player can take (dig / hit ball), shown by the ActionPrompt. */
export const useAction = create<{
  kind: "dig" | "ball" | null;
  id: string | null;
  found: string | null;
  /** Site currently being dug (for the dirt-spray effect). */
  digging: string | null;
  /** Last find, to play the "artifact rises from the ground" effect. */
  reveal: { site: string; artifact: string; t: number } | null;
  set: (kind: "dig" | "ball" | null, id?: string | null) => void;
  setFound: (id: string | null) => void;
}>((set, get) => ({
  kind: null,
  id: null,
  found: null,
  digging: null,
  reveal: null,
  set: (kind, id = null) => {
    if (get().kind !== kind || get().id !== id) set({ kind, id });
  },
  setFound: (found) => set({ found }),
}));

/** Ball-hit requests from the UI (consumed by the ballgame each frame). */
export const ballHit = { pending: false };

function useGround() {
  const { world, rapier } = useRapier();
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }), [rapier]);
  return (x: number, z: number, fromY = 60) => {
    ray.origin = { x, y: fromY, z };
    const hit = world.castRay(ray, 120, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_KINEMATIC, undefined, undefined, playerState.body ?? undefined);
    return hit ? fromY - hit.timeOfImpact : 0;
  };
}

const near = (x: number, y: number, z: number, r: number) => {
  const p = playerState.position;
  return Math.hypot(p.x - x, p.z - z) < r && Math.abs(p.y - y) < 2.2;
};

// ---------------------------------------------------------------- pickups

function itemModels() {
  const m = (size: [number, number, number], paint: (t: Tile, f: FaceName) => void) => ({ size, paint });
  const cacao = m([0.16, 0.26, 0.16], (t) => {
    solid(t, hex("#d98a2a"), 0.12, 51);
    for (let x = 0; x < t.w; x += 2) for (let y = 0; y < t.h; y++) t.set(x, y, hex("#b5651d"));
  });
  const anil = m([0.42, 0.36, 0.42], (t, f) => {
    solid(t, hex("#2e6a34"), 0.18, 52);
    for (let i = 0; i < 10; i++) t.set((i * 7) % t.w, (i * 5) % t.h, f === "top" ? hex("#6a4fc0") : hex("#4a7fd0"));
  });
  const maize = m([0.12, 0.3, 0.12], (t, f) => {
    solid(t, hex("#f0bd2e"), 0.1, 53);
    if (f !== "top") for (let y = Math.floor(t.h * 0.6); y < t.h; y++) for (let x = 0; x < t.w; x++) t.set(x, y, hex("#9cb45a"));
  });
  const flint = m([0.22, 0.14, 0.18], (t) => solid(t, hex("#6e655a"), 0.2, 54));
  const glyph = m([0.42, 0.32, 0.1], (t, f) => {
    solid(t, hex("#bfb9a6"), 0.08, 55);
    if (f === "front" || f === "back") {
      for (let x = 1; x < t.w - 1; x++) {
        t.set(x, 1, hex("#6f6a5e"));
        t.set(x, t.h - 2, hex("#6f6a5e"));
      }
      for (let y = 1; y < t.h - 1; y++) {
        t.set(1, y, hex("#6f6a5e"));
        t.set(t.w - 2, y, hex("#6f6a5e"));
      }
      for (let x = 4; x < t.w - 4; x += 3) t.set(x, Math.floor(t.h / 2), hex("#4a4438"));
    }
  });
  const sparkle = m([0.1, 0.1, 0.1], (t) => solid(t, hex("#ffe36a"), 0.05, 56));
  const { geometries, material } = buildPixelModel([cacao, anil, maize, flint, glyph, sparkle]);
  const index: Record<Item, number> = { cacao: 0, anil: 1, maize: 2, flint: 3, glyph: 4 };
  return { geometries, material, index };
}

export function Pickups() {
  const model = useMemo(itemModels, []);
  const picked = useProgress((s) => s.picked);
  const ground = useGround();
  const ys = useRef<Record<string, number>>({});
  const refs = useRef<Record<string, THREE.Group | null>>({});
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const p of PICKUPS) {
      const g = refs.current[p.id];
      if (!g) continue;
      if (ys.current[p.id] === undefined) {
        const y = ground(p.at[0], p.at[1]);
        if (y > -50) ys.current[p.id] = y;
      }
      const y = ys.current[p.id] ?? 0;
      g.position.set(p.at[0], y + 0.25 + Math.sin(t * 2 + p.at[0]) * 0.06, p.at[1]);
      g.rotation.y = t * 0.8 + p.at[1];
      if (near(p.at[0], y + 0.5, p.at[1], 1.3)) {
        const before = rankIndex(computeXp());
        useProgress.getState().addItem(p.item, 1, p.id);
        const lang = useGame.getState().lang;
        const n = useProgress.getState().items[p.item] ?? 0;
        useGame.getState().showToast(`${getT()("item.got")}: ${ITEM_NAMES[p.item][lang]} (${n})`);
        checkRankUp(before);
      }
    }
  });
  return (
    <>
      {PICKUPS.filter((p) => !picked.includes(p.id)).map((p) => (
        <group key={p.id} ref={(g) => void (refs.current[p.id] = g)}>
          <mesh geometry={model.geometries[model.index[p.item]]} material={model.material} />
          <mesh geometry={model.geometries[5]} material={model.material} position={[0, 0.55, 0]} />
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- animals

function agoutiModel() {
  const BROWN = hex("#8a5a2e");
  const DARK = hex("#5a3a1e");
  return buildPixelModel([
    {
      size: [0.2, 0.2, 0.42],
      paint: (t, f) => {
        solid(t, BROWN, 0.15, 61);
        if (f === "top") for (let y = 0; y < t.h; y++) t.set(Math.floor(t.w / 2), y, DARK);
      },
    },
    {
      size: [0.13, 0.13, 0.14],
      paint: (t, f) => {
        solid(t, BROWN, 0.1, 62);
        if (f === "left" || f === "right") t.set(2, 1, hex("#111111"));
      },
    },
    { size: [0.05, 0.12, 0.05], paint: (t) => solid(t, DARK, 0.1, 63) },
  ]);
}

function turkeyModel() {
  const BODY = hex("#3a3028");
  const SHINE = hex("#5e7a5a");
  return buildPixelModel([
    {
      size: [0.3, 0.28, 0.38],
      paint: (t) => {
        solid(t, BODY, 0.15, 64);
        for (let i = 0; i < 12; i++) t.set((i * 5) % t.w, (i * 3) % t.h, SHINE);
      },
    },
    {
      size: [0.1, 0.22, 0.1],
      paint: (t, f) => {
        solid(t, hex("#7a8fb0"), 0.08, 65);
        if (f === "front") for (let y = Math.floor(t.h * 0.5); y < t.h; y++) t.set(1, y, hex("#d42a2a"));
      },
    },
    {
      size: [0.4, 0.3, 0.04],
      paint: (t) => {
        solid(t, BODY, 0.1, 66);
        for (let x = 0; x < t.w; x++) t.set(x, 0, hex("#c9a45a"));
      },
    },
    { size: [0.04, 0.16, 0.04], paint: (t) => solid(t, hex("#c46a3a"), 0.05, 67) },
  ]);
}

interface Critter {
  x: number;
  z: number;
  y: number;
  tx: number;
  tz: number;
  yaw: number;
  wait: number;
  phase: number;
}

const AGOUTI_SPOTS: [number, number][] = [
  [-40, 100],
  [30, 120],
  [-50, 30],
  [60, 20],
  [-20, 185],
];
const TURKEY_SPOTS: [number, number][] = [
  [-150, 120],
  [-60, 186],
  [-100, 96],
  [-128, 196],
];
const TURKEY_PEN: [number, number] = [-92, 144];

function useCritters(spots: [number, number][]) {
  return useRef<Critter[]>(spots.map(([x, z]) => ({ x, z, y: NaN, tx: x, tz: z, yaw: 0, wait: Math.random() * 3, phase: Math.random() * 6 })));
}

export function Animals() {
  const ag = useMemo(agoutiModel, []);
  const tk = useMemo(turkeyModel, []);
  const agoutis = useCritters(AGOUTI_SPOTS);
  const turkeys = useCritters(TURKEY_SPOTS);
  const agRefs = useRef<(THREE.Group | null)[]>([]);
  const tkRefs = useRef<(THREE.Group | null)[]>([]);
  const ground = useGround();
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    const p = playerState.position;
    const returned = useProgress.getState().turkeys;
    const step = (c: Critter, speed: number, home: [number, number], radius: number, flee: boolean) => {
      const dp = Math.hypot(p.x - c.x, p.z - c.z);
      let moving = false;
      if (flee && dp < 5) {
        // Scurry away from the player.
        c.tx = c.x + ((c.x - p.x) / dp) * 6;
        c.tz = c.z + ((c.z - p.z) / dp) * 6;
        c.wait = 0;
        speed *= 3.2;
      }
      if (c.wait > 0) c.wait -= dt;
      else {
        const dx = c.tx - c.x;
        const dz = c.tz - c.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.2) {
          c.wait = 1 + Math.random() * 4;
          const a = Math.random() * Math.PI * 2;
          c.tx = home[0] + Math.cos(a) * Math.random() * radius;
          c.tz = home[1] + Math.sin(a) * Math.random() * radius;
        } else {
          c.x += (dx / d) * Math.min(speed * dt, d);
          c.z += (dz / d) * Math.min(speed * dt, d);
          c.yaw = Math.atan2(dx, dz);
          moving = true;
        }
      }
      if (Number.isNaN(c.y) || moving) c.y = ground(c.x, c.z, (Number.isNaN(c.y) ? 40 : c.y) + 2);
      c.phase += dt * (moving ? 14 : 2);
      return moving;
    };
    agoutis.current.forEach((c, i) => {
      step(c, 0.8, AGOUTI_SPOTS[i], 10, true);
      const g = agRefs.current[i];
      if (g) {
        g.position.set(c.x, c.y + Math.abs(Math.sin(c.phase)) * 0.05, c.z);
        g.rotation.y = c.yaw;
        g.visible = camera.position.distanceTo(g.position) < 90;
      }
      trackSubject(`agouti:${i}`, "agouti", c.x, c.y + 0.2, c.z);
    });
    turkeys.current.forEach((c, i) => {
      const id = `turkey-${i}`;
      const home = returned.includes(id) ? TURKEY_PEN : TURKEY_SPOTS[i];
      if (!returned.includes(id) && Math.hypot(p.x - c.x, p.z - c.z) < 1.4) {
        const before = rankIndex(computeXp());
        useProgress.getState().returnTurkey(id);
        c.tx = TURKEY_PEN[0];
        c.tz = TURKEY_PEN[1];
        c.wait = 0;
        useGame.getState().showToast(`🦃 ${useProgress.getState().turkeys.length}/4`);
        checkRankUp(before);
      }
      const runningHome = returned.includes(id) && Math.hypot(c.x - TURKEY_PEN[0], c.z - TURKEY_PEN[1]) > 6;
      step(c, runningHome ? 2.6 : 0.5, home, runningHome ? 0.1 : 4, false);
      const g = tkRefs.current[i];
      if (g) {
        g.position.set(c.x, c.y, c.z);
        g.rotation.y = c.yaw;
        g.rotation.x = Math.sin(c.phase) * 0.08;
        g.visible = camera.position.distanceTo(g.position) < 90;
      }
      trackSubject(`turkey:${i}`, "turkey", c.x, c.y + 0.4, c.z);
    });
  });
  return (
    <>
      {AGOUTI_SPOTS.map((_, i) => (
        <group key={`a${i}`} ref={(g) => void (agRefs.current[i] = g)}>
          <mesh geometry={ag.geometries[0]} material={ag.material} position={[0, 0.18, 0]} />
          <Blob size={0.6} />
          <mesh geometry={ag.geometries[1]} material={ag.material} position={[0, 0.24, 0.26]} />
          {[-0.07, 0.07].map((x) =>
            [-0.13, 0.13].map((z) => <mesh key={`${x}${z}`} geometry={ag.geometries[2]} material={ag.material} position={[x, 0.06, z]} />),
          )}
        </group>
      ))}
      {TURKEY_SPOTS.map((_, i) => (
        <group key={`t${i}`} ref={(g) => void (tkRefs.current[i] = g)}>
          <mesh geometry={tk.geometries[0]} material={tk.material} position={[0, 0.34, 0]} />
          <Blob size={0.6} />
          <mesh geometry={tk.geometries[1]} material={tk.material} position={[0, 0.55, 0.2]} />
          <mesh geometry={tk.geometries[2]} material={tk.material} position={[0, 0.5, -0.21]} rotation-x={-0.3} />
          <mesh geometry={tk.geometries[3]} material={tk.material} position={[-0.07, 0.08, 0]} />
          <mesh geometry={tk.geometries[3]} material={tk.material} position={[0.07, 0.08, 0]} />
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- digging

export function DigTracker() {
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (t.current < 0.2) return;
    t.current = 0;
    const dug = useProgress.getState().dug;
    const a = useAction.getState();
    const site = DIG_SITES.find((s) => !dug.includes(s.id) && Math.hypot(playerState.position.x - s.at[0], playerState.position.z - s.at[1]) < 2.2);
    if (site) a.set("dig", site.id);
    else if (a.kind === "dig") a.set(null);
  });
  return null;
}

export function finishDig(siteId: string) {
  const i = DIG_SITES.findIndex((s) => s.id === siteId);
  const artifact = ARTIFACTS[i % ARTIFACTS.length];
  const before = rankIndex(computeXp());
  useProgress.getState().addArtifact(siteId, artifact.id);
  useAction.getState().set(null);
  useAction.setState({ digging: null, reveal: { site: siteId, artifact: artifact.id, t: performance.now() } });
  // Let the artifact rise out of the ground before the card pops up.
  setTimeout(() => useAction.getState().setFound(artifact.id), 1300);
  checkRankUp(before);
}

// ---------------------------------------------------------------- ballgame

const COURT = { minX: 17, maxX: 27, minZ: 150, maxZ: 190, cx: 22, cz: 169 };
/** Macaw-head markers on the sloped walls (x, y, z, facing +1 = east-facing wall side). */
const MARKERS: [number, number, number, number][] = [
  [17.6, 1.6, 161, 1],
  [17.6, 1.6, 169, 1],
  [17.6, 1.6, 177, 1],
  [26.4, 1.6, 161, -1],
  [26.4, 1.6, 169, -1],
  [26.4, 1.6, 177, -1],
];

function macawHeadModel() {
  return buildPixelModel([
    {
      size: [0.55, 0.55, 0.6],
      paint: (t, f) => {
        solid(t, hex("#d8262a"), 0.08, 71);
        if (f === "left" || f === "right") {
          for (let y = 3; y < 11; y++) for (let x = 2; x < 8; x++) t.set(x, y, hex("#f2efe6"));
          t.set(5, 6, hex("#1a1a1a"));
          for (let x = 0; x < t.w; x++) t.set(x, t.h - 2, hex("#f2c42c"));
        }
      },
    },
    { size: [0.2, 0.3, 0.25], paint: (t) => solid(t, hex("#e8dcc0"), 0.05, 72) },
    {
      size: [0.38, 0.38, 0.38],
      paint: (t) => {
        solid(t, hex("#2a2420"), 0.12, 73);
        for (let x = 0; x < t.w; x += 4) for (let y = 0; y < t.h; y += 4) t.set(x, y, hex("#4a3f36"));
      },
    },
  ]);
}

export function BallGame() {
  const model = useMemo(macawHeadModel, []);
  const ball = useRef<RapierRigidBody>(null);
  const lastScore = useRef(0);
  const flash = useRef<(THREE.Group | null)[]>([]);
  const flashT = useRef<number[]>(MARKERS.map(() => 0));
  useFrame(({ clock }) => {
    const b = ball.current;
    if (!b) return;
    const p = b.translation();
    // Reset if it leaves the court.
    if (p.x < COURT.minX - 6 || p.x > COURT.maxX + 6 || p.z < COURT.minZ - 8 || p.z > COURT.maxZ + 8 || p.y < -3) {
      b.setTranslation({ x: COURT.cx, y: 1.5, z: COURT.cz }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    const pl = playerState.position;
    const close = Math.hypot(pl.x - p.x, pl.z - p.z) < 1.8 && Math.abs(pl.y - p.y) < 2;
    const a = useAction.getState();
    if (close) a.set("ball", "ball");
    else if (a.kind === "ball") a.set(null);
    if (ballHit.pending) {
      ballHit.pending = false;
      if (close) {
        // Hip bump: away from the player, a bit upward.
        const dx = p.x - pl.x;
        const dz = p.z - pl.z;
        const d = Math.hypot(dx, dz) || 1;
        const m = b.mass();
        b.applyImpulse({ x: (dx / d) * 7 * m, y: 3.2 * m, z: (dz / d) * 7 * m }, true);
      }
    }
    // Marker hits.
    MARKERS.forEach(([mx, my, mz], i) => {
      const d = Math.hypot(p.x - mx, p.y - my, p.z - mz);
      if (d < 0.75 && clock.elapsedTime - lastScore.current > 1.2) {
        lastScore.current = clock.elapsedTime;
        flashT.current[i] = clock.elapsedTime;
        const before = rankIndex(computeXp());
        useProgress.getState().scoreBall();
        useGame.getState().showToast(`${getT()("ball.score")} (${useProgress.getState().ballScore})`);
        checkRankUp(before);
      }
      const g = flash.current[i];
      if (g) g.scale.setScalar(1 + Math.max(0, 0.6 - (clock.elapsedTime - flashT.current[i])) * 0.8);
    });
    trackSubject("ballcourt-ball", "ballcourt", p.x, p.y, p.z);
  });
  return (
    <>
      <RigidBody ref={ball} colliders={false} position={[COURT.cx, 1.5, COURT.cz]} ccd linearDamping={0.25} angularDamping={0.4}>
        <BallCollider args={[0.2]} restitution={0.8} friction={0.6} density={60} />
        <mesh geometry={model.geometries[2]} material={model.material} />
      </RigidBody>
      {MARKERS.map(([x, y, z, side], i) => (
        <group key={i} ref={(g) => void (flash.current[i] = g)} position={[x, y, z]} rotation={[0, 0, side * 0.6]}>
          <mesh geometry={model.geometries[0]} material={model.material} rotation-y={side > 0 ? Math.PI / 2 : -Math.PI / 2} />
          <mesh geometry={model.geometries[1]} material={model.material} position={[side * 0.35, -0.1, 0]} />
        </group>
      ))}
      {/* Markers stick out a little from the walls: give them a body so the ball bounces off. */}
      <RigidBody type="fixed" colliders={false}>
        {MARKERS.map(([x, y, z], i) => (
          <CuboidCollider key={i} args={[0.28, 0.28, 0.3]} position={[x, y, z]} />
        ))}
      </RigidBody>
    </>
  );
}
