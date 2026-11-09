import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, CuboidCollider, RigidBody, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { JAGUAR_RANGES, TALKERS, WALKERS, type Outfit } from "./npcData";
import { jaguarRig, personRig } from "./personModel";
import { PATHS } from "../world/siteData";
import { playerState } from "../player/playerState";
import { useGame } from "../state/useGame";
import { trackSubject } from "../game/subjects";
import { lensMix } from "../game/lens";
import { CharacterLayer } from "../game/layers";

const DRAW_DIST = 95;
const TALK_DIST = 2.8;
const JAGUAR_TALK_DIST = 5;

/** Shared per-frame registry of where talkable actors are (for the "talk" prompt). */
const talkables = new Map<string, THREE.Vector3>();

/** Where every actor (people and jaguars) is, so they keep out of each other's way. */
const actors = new Map<string, { x: number; z: number }>();
function place(key: string, x: number, z: number) {
  const a = actors.get(key);
  if (a) {
    a.x = x;
    a.z = z;
  } else actors.set(key, { x, z });
}
/** Nearest other actor within r of (x, z), or null. */
function nearestActor(key: string, x: number, z: number, r: number) {
  let best: { x: number; z: number } | null = null;
  let bd = r;
  for (const [k, a] of actors) {
    if (k === key) continue;
    const d = Math.hypot(a.x - x, a.z - z);
    if (d < bd) {
      bd = d;
      best = a;
    }
  }
  return best;
}
/** Personal space between actors (m). */
const SPACE = 1.1;

type Ray = InstanceType<ReturnType<typeof useRapier>["rapier"]["Ray"]>;

/**
 * Highest step an actor walks up in one go (m). The ground ray starts this far above the feet:
 * a wall, block or ledge taller than that puts the ray's start inside it (hit at distance 0),
 * so the actor turns back instead of popping up onto it.
 */
const STEP = 0.6;
/** Highest drop an actor walks off (m). */
const DROP = 1.2;

/** Ground height under (x, z), searching down from `fromY`. */
function useGround() {
  const { world, rapier } = useRapier();
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }), [rapier]) as Ray;
  return (x: number, z: number, fromY: number, exclude?: RapierRigidBody | null) => {
    ray.origin = { x, y: fromY, z };
    // Only the fixed world counts as ground: other characters' bodies (kinematic) and the
    // player (dynamic) would otherwise lift an actor into the air when they meet.
    const flags = rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_KINEMATIC | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC;
    const hit = world.castRay(ray, 80, true, flags, undefined, undefined, exclude ?? undefined);
    return hit ? fromY - hit.timeOfImpact : null;
  };
}

interface Limbs {
  legL: THREE.Group | null;
  legR: THREE.Group | null;
  armL: THREE.Group | null;
  armR: THREE.Group | null;
}

function Person({
  outfit,
  limbs,
  root,
}: {
  outfit: Outfit;
  limbs: React.MutableRefObject<Limbs>;
  root: React.RefObject<THREE.Group | null>;
}) {
  const r = useMemo(() => personRig(outfit), [outfit]);
  return (
    <CharacterLayer>
    <group ref={root}>
      <mesh geometry={r.body} material={r.material} />
      <group ref={(g) => void (limbs.current.legL = g)} position={[-r.legX, r.hip, 0]}>
        <mesh geometry={r.legL} material={r.material} />
      </group>
      <group ref={(g) => void (limbs.current.legR = g)} position={[r.legX, r.hip, 0]}>
        <mesh geometry={r.legR} material={r.material} />
      </group>
      <group ref={(g) => void (limbs.current.armL = g)} position={[-r.shoulder[0], r.shoulder[1], 0]}>
        <mesh geometry={r.armL} material={r.material} />
      </group>
      <group ref={(g) => void (limbs.current.armR = g)} position={[r.shoulder[0], r.shoulder[1], 0]}>
        <mesh geometry={r.armR} material={r.material} />
      </group>
    </group>
    </CharacterLayer>
  );
}

function swing(l: Limbs, phase: number, amount: number, carrying: boolean) {
  const s = Math.sin(phase) * amount;
  if (l.legL) l.legL.rotation.x = s;
  if (l.legR) l.legR.rotation.x = -s;
  if (l.armL) l.armL.rotation.x = carrying ? -2.9 : -s * 0.8;
  if (l.armR) l.armR.rotation.x = carrying ? -2.9 : s * 0.8;
}

/** Turn `cur` toward `target` angle smoothly. */
function turn(cur: number, target: number, k: number) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + d * k;
}

interface ActorState {
  x: number;
  z: number;
  y: number;
  yaw: number;
  tx: number;
  tz: number;
  wait: number;
  phase: number;
  s: number; // walker: distance along path
  dir: number; // walker: +1 / −1
  dodge: number; // walker: extra sideways offset while passing someone
}

function useActor(x: number, z: number) {
  return useRef<ActorState>({ x, z, y: NaN, yaw: Math.random() * 6, tx: x, tz: z, wait: Math.random() * 3, phase: 0, s: 0, dir: 1, dodge: 0 });
}

function Talker({ index }: { index: number }) {
  const t = TALKERS[index];
  const st = useActor(t.home[0], t.home[1]);
  const body = useRef<RapierRigidBody>(null);
  const root = useRef<THREE.Group>(null);
  const limbs = useRef<Limbs>({ legL: null, legR: null, armL: null, armR: null });
  const ground = useGround();
  const pos = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    const a = st.current;
    if (Number.isNaN(a.y)) a.y = ground(a.x, a.z, 60, body.current) ?? 0;
    const p = playerState.position;
    const dp = Math.hypot(p.x - a.x, p.z - a.z);
    const talking = useGame.getState().dialogue?.id === t.id;
    let moving = false;
    if (dp < 4.5 || talking) {
      a.yaw = turn(a.yaw, Math.atan2(p.x - a.x, p.z - a.z), 0.12);
    } else if (a.wait > 0) {
      a.wait -= dt;
    } else {
      const dx = a.tx - a.x;
      const dz = a.tz - a.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.2) {
        a.wait = 2 + Math.random() * 5;
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * t.wander;
        a.tx = t.home[0] + Math.cos(ang) * r;
        a.tz = t.home[1] + Math.sin(ang) * r;
      } else {
        const sp = 0.9 * dt;
        const nx = a.x + (dx / d) * Math.min(sp, d);
        const nz = a.z + (dz / d) * Math.min(sp, d);
        const g = ground(nx, nz, a.y + STEP, body.current);
        if (g === null || g - a.y > STEP - 0.05 || a.y - g > DROP || nearestActor(t.id, nx, nz, SPACE)) {
          // Wall, block, ledge or someone ahead: stay put and pick another spot after a pause.
          a.tx = a.x;
          a.tz = a.z;
          a.wait = 0.5;
        } else {
          a.x = nx;
          a.z = nz;
          a.y = g;
          a.yaw = turn(a.yaw, Math.atan2(dx, dz), 0.15);
          moving = true;
        }
      }
    }
    a.phase += dt * 6;
    swing(limbs.current, a.phase, moving ? 0.6 : 0, false);
    if (!moving && limbs.current.armR && dp < 4.5) limbs.current.armR.rotation.x = -0.6 + Math.sin(a.phase * 0.7) * 0.25; // gesturing
    body.current?.setNextKinematicTranslation({ x: a.x, y: a.y, z: a.z });
    if (root.current) {
      root.current.position.set(a.x, a.y, a.z);
      root.current.rotation.y = a.yaw;
      root.current.visible = camera.position.distanceTo(root.current.position) < DRAW_DIST;
    }
    talkables.set(t.id, pos.set(a.x, a.y, a.z));
    place(t.id, a.x, a.z);
    trackSubject(`npc:${t.id}`, t.id, a.x, a.y + 1.2, a.z);
  });
  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[t.home[0], 0, t.home[1]]}>
        <CapsuleCollider args={[0.5, 0.28]} position={[0, 0.8, 0]} />
      </RigidBody>
      <Person outfit={t.outfit} limbs={limbs} root={root} />
    </>
  );
}

function Walker({ index }: { index: number }) {
  const w = WALKERS[index];
  const path = w.points ? { points: w.points, y: w.y ?? 0 } : PATHS[w.path ?? 0];
  const { pts, lengths, total } = useMemo(() => {
    const pts = path.points;
    const lengths = [0];
    for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, lengths, total: lengths[lengths.length - 1] };
  }, [path]);
  const st = useActor(pts[0][0], pts[0][1]);
  const root = useRef<THREE.Group>(null);
  const body = useRef<RapierRigidBody>(null);
  const limbs = useRef<Limbs>({ legL: null, legR: null, armL: null, armR: null });
  const ground = useGround();
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    const a = st.current;
    if (a.s === 0 && a.phase === 0) a.s = w.t * total;
    const p = playerState.position;
    // Politely stop if the player is right in front.
    const blocked = Math.hypot(p.x - a.x, p.z - a.z) < 1.4;
    if (!blocked) a.s += a.dir * w.speed * dt;
    if (a.s > total) {
      a.s = total;
      a.dir = -1;
    } else if (a.s < 0) {
      a.s = 0;
      a.dir = 1;
    }
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < a.s) i++;
    const f = (a.s - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
    const [x0, z0] = pts[i - 1];
    const [x1, z1] = pts[i];
    const dx = (x1 - x0) * a.dir;
    const dz = (z1 - z0) * a.dir;
    const len = Math.hypot(dx, dz) || 1;
    // Keep to one side of the trail, and step further aside to pass anyone in the way.
    const key = `walker:${index}`;
    const nX = dz / len;
    const nZ = -dx / len;
    const cx = x0 + (x1 - x0) * f + nX * w.side;
    const cz = z0 + (z1 - z0) * f + nZ * w.side;
    const other = nearestActor(key, cx + (dx / len) * 0.8, cz + (dz / len) * 0.8, SPACE + 0.6);
    // Step away from the other's side (or to our own side of the trail if dead ahead).
    const sideOf = other ? (other.x - cx) * nX + (other.z - cz) * nZ : 0;
    const want = other ? (Math.abs(sideOf) < 0.15 ? Math.sign(w.side || 1) : -Math.sign(sideOf)) * 1.2 : 0;
    a.dodge += (want - a.dodge) * Math.min(1, dt * 3);
    a.x = cx + nX * a.dodge;
    a.z = cz + nZ * a.dodge;
    a.yaw = turn(a.yaw, Math.atan2(dx, dz), 0.12);
    // Follow the ground down, and up only by small steps (never onto blocks beside the trail).
    const first = Number.isNaN(a.y);
    const g = ground(a.x, a.z, first ? path.y + 20 : a.y + STEP, body.current);
    if (g !== null && (first || g - a.y < STEP - 0.05)) a.y = g;
    a.phase += dt * 6.5;
    swing(limbs.current, a.phase, blocked ? 0 : 0.6, w.outfit.basket === true);
    body.current?.setNextKinematicTranslation({ x: a.x, y: a.y, z: a.z });
    // Era: tourists vanish through the time lens, ancient townspeople appear.
    const lens = lensMix.value;
    const present = w.era === "past" ? lens > 0.5 : w.era === "present" ? lens < 0.5 : true;
    // People from the other era don't take up room.
    if (present) place(key, a.x, a.z);
    else actors.delete(key);
    if (root.current) {
      root.current.position.set(a.x, a.y, a.z);
      root.current.rotation.y = a.yaw;
      root.current.visible = present && camera.position.distanceTo(root.current.position) < DRAW_DIST;
    }
    if (!present) body.current?.setNextKinematicTranslation({ x: a.x, y: -80, z: a.z });
  });
  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[pts[0][0], -50, pts[0][1]]}>
        <CapsuleCollider args={[0.5, 0.28]} position={[0, 0.8, 0]} />
      </RigidBody>
      <Person outfit={w.outfit} limbs={limbs} root={root} />
    </>
  );
}

function Jaguar({ index }: { index: number }) {
  const range = JAGUAR_RANGES[index];
  const id = `jaguar-${index}`;
  const cx = (range[0] + range[2]) / 2;
  const cz = (range[1] + range[3]) / 2;
  const st = useActor(cx, cz);
  const rig = useMemo(jaguarRig, []);
  const root = useRef<THREE.Group>(null);
  const body = useRef<RapierRigidBody>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const tail = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const ground = useGround();
  const pos = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const a = st.current;
    if (Number.isNaN(a.y)) a.y = ground(a.x, a.z, 60, body.current) ?? 0;
    const p = playerState.position;
    const dp = Math.hypot(p.x - a.x, p.z - a.z);
    let moving = false;
    let sitting = false;
    if (dp < 8) {
      // Curious: stops, sits and watches you.
      sitting = true;
      a.yaw = turn(a.yaw, Math.atan2(p.x - a.x, p.z - a.z), 0.06);
    } else if (a.wait > 0) {
      a.wait -= dt;
      sitting = a.wait > 3;
    } else {
      const dx = a.tx - a.x;
      const dz = a.tz - a.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3) {
        a.wait = 2 + Math.random() * 8;
        a.tx = range[0] + Math.random() * (range[2] - range[0]);
        a.tz = range[1] + Math.random() * (range[3] - range[1]);
      } else {
        const sp = 1.3 * dt;
        const nx = a.x + (dx / d) * Math.min(sp, d);
        const nz = a.z + (dz / d) * Math.min(sp, d);
        const g = ground(nx, nz, a.y + STEP, body.current);
        if (g === null || g - a.y > STEP - 0.05 || a.y - g > DROP || nearestActor(id, nx, nz, SPACE + 0.4)) {
          a.tx = a.x;
          a.tz = a.z;
          a.wait = 0.5;
        } else {
          a.x = nx;
          a.z = nz;
          a.y = g;
          a.yaw = turn(a.yaw, Math.atan2(dx, dz), 0.06);
          moving = true;
        }
      }
    }
    a.phase += dt * (moving ? 7 : 0);
    const s = Math.sin(a.phase) * (moving ? 0.55 : 0);
    const L = legs.current;
    // Diagonal gait: front-left with back-right.
    if (L[0]) L[0].rotation.x = s;
    if (L[3]) L[3].rotation.x = s;
    if (L[1]) L[1].rotation.x = -s;
    if (L[2]) L[2].rotation.x = -s;
    if (torso.current) {
      torso.current.rotation.x = THREE.MathUtils.lerp(torso.current.rotation.x, sitting ? -0.45 : 0, 0.08);
      torso.current.position.y = THREE.MathUtils.lerp(torso.current.position.y, sitting ? -0.12 : 0, 0.08);
    }
    if (tail.current) tail.current.rotation.y = Math.sin(clock.elapsedTime * 1.6 + index) * 0.5;
    body.current?.setNextKinematicTranslation({ x: a.x, y: a.y, z: a.z });
    if (root.current) {
      root.current.position.set(a.x, a.y, a.z);
      root.current.rotation.y = a.yaw;
      root.current.visible = camera.position.distanceTo(root.current.position) < DRAW_DIST;
    }
    talkables.set(id, pos.set(a.x, a.y, a.z));
    place(id, a.x, a.z);
    trackSubject(`jaguar:${index}`, "jaguar", a.x, a.y + 0.7, a.z);
  });
  const legPos: [number, number, number][] = [
    [-0.14, 0.42, 0.42],
    [0.14, 0.42, 0.42],
    [-0.14, 0.42, -0.42],
    [0.14, 0.42, -0.42],
  ];
  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[cx, -50, cz]}>
        <CuboidCollider args={[0.25, 0.45, 0.75]} position={[0, 0.5, 0]} />
      </RigidBody>
      <CharacterLayer>
      <group ref={root}>
        <group ref={torso}>
          <mesh geometry={rig.body} material={rig.material} />
          <group ref={tail} position={[0, 0.72, -0.55]} rotation-x={0.5}>
            <mesh geometry={rig.tail} material={rig.material} />
          </group>
        </group>
        {legPos.map((lp, i) => (
          <group key={i} ref={(g) => void (legs.current[i] = g)} position={lp}>
            <mesh geometry={rig.leg} material={rig.material} />
          </group>
        ))}
      </group>
      </CharacterLayer>
    </>
  );
}

/** Decides who the player can talk to right now. */
function TalkTracker() {
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (t.current < 0.15) return;
    t.current = 0;
    const p = playerState.position;
    let best: string | null = null;
    let bestD = Infinity;
    for (const [id, v] of talkables) {
      const d = Math.hypot(p.x - v.x, p.z - v.z);
      const max = id.startsWith("jaguar") ? JAGUAR_TALK_DIST : TALK_DIST;
      if (d < max && Math.abs(p.y - v.y) < 2.5 && d < bestD) {
        best = id;
        bestD = d;
      }
    }
    const g = useGame.getState();
    g.setTalkTarget(best);
    if (g.dialogue && g.dialogue.id !== best) g.closeDialogue();
  });
  return null;
}

/** Villagers, townspeople on the trails and jaguars. Must be inside <Physics>. */
export function People() {
  return (
    <>
      {TALKERS.map((_, i) => (
        <Talker key={`t${i}`} index={i} />
      ))}
      {WALKERS.map((_, i) => (
        <Walker key={`w${i}`} index={i} />
      ))}
      {JAGUAR_RANGES.map((_, i) => (
        <Jaguar key={`j${i}`} index={i} />
      ))}
      <TalkTracker />
    </>
  );
}
