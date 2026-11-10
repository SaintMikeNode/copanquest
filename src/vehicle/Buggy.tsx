// The archaeologist's buggy (siteData BUGGY), drivable once he lends it (talk to him, npcData).
// Physics: Rapier's ray-cast vehicle controller on a light chassis with a low center of mass,
// plus arcade help so it is fun rather than realistic: quick steering that tightens with
// speed, a handbrake drift (rear grip drops), a turbo, gentle self-leveling in the air and an
// automatic flip back onto the wheels. The player's capsule is switched off while driving and
// rides along at the seat, so the camera, minimap and place cards keep following "the player".
// Must be inside <Physics>.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { CuboidCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierRigidBody } from "@react-three/rapier";
import type { DynamicRayCastVehicleController } from "@dimforge/rapier3d-compat";
import { useButtonStore, useJoystickStore } from "ecctrl/input";
import { BUGGY } from "../world/siteData";
import { playerState } from "../player/playerState";
import { kidModel } from "../player/kidModel";
import type { Control } from "../player/controls";
import { useGame } from "../state/useGame";
import { getT } from "../i18n";
import { CharacterLayer } from "../game/layers";
import { DEV_TOOLS, IS_TOUCH } from "../config";
import { BUGGY_GROUPS } from "../world/groups";
import { buildGreybox } from "../world/buildGreybox";
import { buggyBody, buggyWheel, SEAT_POS, WHEELS } from "./buggyModel";
import { buggy, lockedKey, pedals, useBuggy } from "./buggyState";
import { TUNE } from "./buggyTune";
import { smokePuff } from "../world/Smoke";
import { engineStart, engineStop, engineUpdate, play, soundDebug } from "../audio/sound";

/** Chassis origin above the ground at rest (the model is drawn from the ground up). */
const Y0 = 0.45;
/** Suspension: rest length and how far above the axle (at rest) it hangs from. */
const REST = 0.3;
const HANG = 0.24;
const ENTER_DIST = 2.4;


const up = new THREE.Vector3();
const fwd = new THREE.Vector3();
const q = new THREE.Quaternion();
const WORLD_UP = new THREE.Vector3(0, 1, 0);

/** Kid in the driver's seat: the walking model's parts, sitting, hands on the wheel. */
function SeatedKid({ steer }: { steer: React.RefObject<number> }) {
  const { geometries: G, material } = useMemo(kidModel, []);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  useFrame(() => {
    const s = steer.current ?? 0;
    if (armL.current) armL.current.rotation.set(-1.05 - s * 0.5, 0, 0);
    if (armR.current) armR.current.rotation.set(-1.05 + s * 0.5, 0, 0);
  });
  const part = (i: number, pos: [number, number, number]) => <mesh geometry={G[i]} material={material} position={pos} />;
  // Same layout as PlayerModel (feet at 0, hips at 0.43), legs straight forward.
  return (
    <group position={[SEAT_POS[0], SEAT_POS[1] - 0.43 - Y0, SEAT_POS[2]]}>
      {[-0.085, 0.085].map((x) => (
        <group key={x} position={[x, 0.43, 0]} rotation={[-1.4, 0, 0]}>
          {part(0, [0, -0.2, 0])}
          {part(1, [0, -0.395, 0.02])}
        </group>
      ))}
      {part(2, [0, 0.64, 0])}
      <group ref={armL} position={[-0.24, 0.83, 0]}>
        {part(3, [0, -0.17, 0])}
      </group>
      <group ref={armR} position={[0.24, 0.83, 0]}>
        {part(3, [0, -0.17, 0])}
      </group>
      {part(4, [0, 1.03, 0])}
      {part(6, [0, 1.215, 0])}
      {part(5, [0, 1.29, 0])}
    </group>
  );
}

/** Chassis footprint half size (x across, z along), for keeping off the stairs. */
const HALF: [number, number] = [0.62, 1.02];

/**
 * Staircases are off limits: the buggy ignores their walking ramps (BUGGY_GROUPS) and is pushed
 * back out of each stair's footprint instead, a solid wall from below and from the top. One
 * oriented rectangle per ramp (buildGreybox), from its 4 ground corners.
 */
interface StairBox { cx: number; cz: number; ux: number; uz: number; hu: number; hv: number; y0: number; y1: number }
let stairBoxes: StairBox[] | null = null;
function stairs(): StairBox[] {
  if (stairBoxes) return stairBoxes;
  stairBoxes = buildGreybox().ramps.map((r) => {
    // Points: 0-1 top edge, 2-3 inner foot (lateral −w / +w), 4-5 outer foot.
    const ax = r[6], az = r[8], bx = r[9], bz = r[11], dx = r[12], dz = r[14];
    const run = Math.hypot(dx - ax, dz - az);
    const wid = Math.hypot(bx - ax, bz - az);
    return {
      cx: (ax + bx + dx + r[15]) / 4,
      cz: (az + bz + dz + r[17]) / 4,
      ux: (dx - ax) / run,
      uz: (dz - az) / run,
      hu: run / 2,
      hv: wid / 2,
      y0: r[7] - 1,
      y1: r[1] + 2,
    };
  });
  return stairBoxes;
}

/**
 * Smallest push (x, z) that takes the buggy's footprint (center p, forward f) out of a stair
 * box, or null if they don't overlap (separating axis test on both rectangles' axes).
 */
function pushOut(px: number, pz: number, fx: number, fz: number, b: StairBox): [number, number] | null {
  const dx = px - b.cx;
  const dz = pz - b.cz;
  const axes: [number, number][] = [[b.ux, b.uz], [-b.uz, b.ux], [fx, fz], [-fz, fx]];
  let best = Infinity;
  let bx = 0;
  let bz = 0;
  for (const [ax, az] of axes) {
    // Projected half sizes of both boxes on this axis, and the centers' distance.
    const rStair = b.hu * Math.abs(ax * b.ux + az * b.uz) + b.hv * Math.abs(-ax * b.uz + az * b.ux);
    const rCar = HALF[1] * Math.abs(ax * fx + az * fz) + HALF[0] * Math.abs(-ax * fz + az * fx);
    const d = dx * ax + dz * az;
    const overlap = rStair + rCar - Math.abs(d);
    if (overlap <= 0) return null;
    if (overlap < best) {
      best = overlap;
      const sgn = d < 0 ? -1 : 1;
      bx = ax * sgn * overlap;
      bz = az * sgn * overlap;
    }
  }
  return [bx, bz];
}

/** Engine (top of the block at the back) in chassis space. */
const ENGINE: [number, number, number] = [0, 0.84 - Y0, -0.68];
const PUFFS = 6;

/**
 * Smoke from the engine while the buggy is broken (until Tomás gets his toolbox back): the
 * village hearths' puffs (world/Smoke.tsx), smaller, rising straight up in world space.
 */
function EngineSmoke() {
  const unlocked = useBuggy((s) => s.unlocked);
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geo, mat } = useMemo(smokePuff, []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const src = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    const v = buggy.visual;
    if (!mesh || !v) return;
    v.updateWorldMatrix(true, false);
    src.set(...ENGINE).applyMatrix4(v.matrixWorld);
    const t = clock.elapsedTime;
    for (let k = 0; k < PUFFS; k++) {
      const life = (t * 0.32 + k / PUFFS) % 1;
      const size = 0.12 + life * 0.45;
      p.set(src.x + Math.sin(life * 4 + k) * 0.18 + life * 0.4, src.y + life * 3, src.z + Math.cos(life * 3 + k) * 0.15);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, life * 2 + k);
      s.setScalar(size * (1 - life * 0.3));
      mesh.setMatrixAt(k, m.compose(p, q, s));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  if (unlocked) return null;
  return <instancedMesh ref={ref} args={[geo, mat, PUFFS]} frustumCulled={false} />;
}

export function Buggy() {
  const { world, rapier } = useRapier();
  const body = useRef<RapierRigidBody>(null);
  const ctrl = useRef<DynamicRayCastVehicleController | null>(null);
  const placed = useRef(false);
  const steer = useRef(0);
  const flipped = useRef(0);
  const grounded = useRef(false);
  const jumpWas = useRef(false);
  const hopReady = useRef(0);
  const hopPush = useRef<{ steps: number; dir: number } | null>(null);
  const wheels = useRef<THREE.InstancedMesh>(null);
  const seated = useRef<THREE.Group>(null);
  const model = useMemo(() => ({ body: buggyBody(), wheel: buggyWheel() }), []);
  const [, getKeys] = useKeyboardControls<Control>();
  const driving = useBuggy((s) => s.driving);
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }), [rapier]);
  const camera = useThree((s) => s.camera);

  // Vehicle controller: four wheels hanging from the chassis.
  useEffect(() => {
    const b = body.current;
    if (!b) return;
    const c = world.createVehicleController(b);
    c.indexUpAxis = 1;
    c.setIndexForwardAxis = 2;
    WHEELS.forEach((w, i) => {
      c.addWheel({ x: w.x, y: w.r + HANG - Y0, z: w.z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, REST, w.r);
      c.setWheelSuspensionStiffness(i, TUNE.stiffness);
      c.setWheelSuspensionCompression(i, TUNE.compression);
      c.setWheelSuspensionRelaxation(i, TUNE.relaxation);
      c.setWheelMaxSuspensionTravel(i, TUNE.travel);
      c.setWheelMaxSuspensionForce(i, 20000);
      c.setWheelFrictionSlip(i, TUNE.grip);
      c.setWheelSideFrictionStiffness(i, TUNE.sideStiff);
    });
    ctrl.current = c;
    buggy.body = b;
    return () => {
      ctrl.current = null;
      buggy.body = null;
      world.removeVehicleController(c);
    };
  }, [world]);

  // Dev helper: window.cqBuggy (state, handling numbers, place(x, z, yaw) to move it anywhere).
  useEffect(() => {
    if (!DEV_TOOLS) return;
    const w = window as unknown as { cqBuggy?: unknown };
    w.cqBuggy = {
      state: buggy,
      store: useBuggy,
      tune: TUNE,
      ctrl: () => ctrl.current,
      camera: () => camera,
      sound: soundDebug,
      place: (x: number, z: number, yaw = 0) => {
        const b = body.current;
        if (!b) return;
        ray.origin = { x, y: 60, z };
        const hit = world.castRay(ray, 120, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, b);
        b.setTranslation({ x, y: (hit ? 60 - hit.timeOfImpact : 0) + Y0 + 0.3, z }, true);
        b.setRotation(q.setFromAxisAngle(WORLD_UP, yaw), true);
        b.setLinvel({ x: 0, y: 0, z: 0 }, true);
        b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      },
    };
    return () => {
      delete w.cqBuggy;
    };
  }, [world, rapier, ray, camera]);

  // Getting in and out.
  useEffect(() => {
    const getIn = () => {
      const pb = playerState.body;
      if (!pb) return;
      pb.setLinvel({ x: 0, y: 0, z: 0 }, false);
      pb.setEnabled(false);
      useBuggy.getState().setDriving(true);
      engineStart();
    };
    const getOut = (relocate: boolean) => {
      const pb = playerState.body;
      const b = body.current;
      if (!useBuggy.getState().driving) return;
      useBuggy.getState().setDriving(false);
      engineStop();
      if (!pb) return;
      if (relocate && b) {
        // Step out on the right (parked, that's the mound side, away from Tomás on the trail
        // side), else the left, else behind, else in front; on the first spot with ground.
        const t = b.translation();
        const r = b.rotation();
        q.set(r.x, r.y, r.z, r.w);
        let spot: THREE.Vector3 | null = null;
        for (const [lx, lz] of [[1.35, 0], [-1.35, 0], [0, -2.1], [0, 2.1]]) {
          const p = new THREE.Vector3(lx, 0, lz).applyQuaternion(q).add(new THREE.Vector3(t.x, 0, t.z));
          ray.origin = { x: p.x, y: t.y + 2.5, z: p.z };
          const hit = world.castRay(ray, 6, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, b);
          // Free spot: the ground is reached from above the roof (not a wall) and isn't far down.
          if (hit && hit.timeOfImpact > 0.6) {
            spot = p.setY(t.y + 2.5 - hit.timeOfImpact + 0.95);
            break;
          }
        }
        if (!spot) spot = new THREE.Vector3(t.x, t.y + 2, t.z);
        pb.setTranslation(spot, true);
      }
      pb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      pb.setEnabled(true);
    };
    const interact = () => {
      const g = useGame.getState();
      if (g.overlay || g.dialogue) return;
      const s = useBuggy.getState();
      if (s.driving) return getOut(true);
      if (!s.near || g.talkTarget) return;
      if (s.unlocked) getIn();
      else g.showToast(getT()(lockedKey()));
    };
    const exit = () => getOut(true);
    // Back to the entrance (respawn, R key or the pause menu): respawn has already moved the
    // (disabled) capsule to the start, so just switch it back on; the buggy goes back to its
    // parking spot too (re-parked on the next physics step).
    const respawned = () => {
      getOut(false);
      placed.current = false;
    };
    window.addEventListener("cq-interact", interact);
    window.addEventListener("cq-buggy-enter", interact);
    window.addEventListener("cq-buggy-exit", exit);
    window.addEventListener("cq-respawn", respawned);
    return () => {
      window.removeEventListener("cq-interact", interact);
      window.removeEventListener("cq-buggy-enter", interact);
      window.removeEventListener("cq-buggy-exit", exit);
      window.removeEventListener("cq-respawn", respawned);
      getOut(false);
    };
  }, [world, rapier, ray]);

  // Driving, once per physics step.
  useBeforePhysicsStep(() => {
    const b = body.current;
    const c = ctrl.current;
    if (!b || !c) return;
    const dt = 1 / 60;

    // Park on the ground once the colliders exist (hold it in place until then).
    if (!placed.current) {
      ray.origin = { x: BUGGY.at[0], y: 60, z: BUGGY.at[1] };
      const hit = world.castRay(ray, 120, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, b);
      if (!hit) {
        b.setTranslation({ x: BUGGY.at[0], y: 40, z: BUGGY.at[1] }, false);
        b.setLinvel({ x: 0, y: 0, z: 0 }, false);
        return;
      }
      b.setTranslation({ x: BUGGY.at[0], y: 60 - hit.timeOfImpact + Y0 + 0.1, z: BUGGY.at[1] }, true);
      b.setRotation(q.setFromAxisAngle(WORLD_UP, BUGGY.yaw), true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      placed.current = true;
    }

    const r = b.rotation();
    q.set(r.x, r.y, r.z, r.w);
    up.set(0, 1, 0).applyQuaternion(q);
    fwd.set(0, 0, 1).applyQuaternion(q);
    const v = b.linvel();
    const speed = v.x * fwd.x + v.y * fwd.y + v.z * fwd.z;

    // Input: keyboard, or on touch screens the joystick (steering only) and the pedals.
    // Space / the hop button: drifts while moving; when (nearly) stopped, a little hop to get
    // unstuck (one per press).
    let gas = 0;
    let turn = 0;
    let jump = false;
    let turbo = false;
    if (useBuggy.getState().driving && !playerState.frozen) {
      const k = getKeys();
      gas = (k.forward ? 1 : 0) - (k.backward ? 1 : 0);
      turn = (k.leftward ? 1 : 0) - (k.rightward ? 1 : 0);
      jump = k.jump || !!useButtonStore.getState().buttons.jump || pedals.hop;
      turbo = k.run;
      if (pedals.gas || pedals.brake) gas = (pedals.gas ? 1 : 0) - (pedals.brake ? 1 : 0);
      // No Shift on a phone: the gas pedal always gives the turbo speed.
      if (pedals.gas) turbo = true;
      const js = useJoystickStore.getState().joysticks.default;
      if (js?.active && (js.x !== 0 || js.y !== 0)) {
        turn = THREE.MathUtils.clamp(-js.x * 1.3, -1, 1);
        // Without pedals (a mouse-less screen that isn't touch), up/down on the stick still drives.
        if (!IS_TOUCH) gas = THREE.MathUtils.clamp(js.y * 1.4, -1, 1);
      }
    }
    const pressed = jump && !jumpWas.current;
    jumpWas.current = jump;
    let handbrake = jump;
    const now = performance.now();
    if (pressed && Math.abs(speed) < TUNE.hopMaxSpeed && grounded.current && now > hopReady.current) {
      // Straight up first; the push forward (or back while reversing) comes once it's in the
      // air (hopPush), or it would just bounce off the side of the block it's stuck against.
      b.applyImpulse({ x: 0, y: TUNE.hopUp, z: 0 }, true);
      hopReady.current = now + 900;
      hopPush.current = { steps: 12, dir: gas < 0 ? -1 : 1 };
      play("jump", { rate: 0.7 });
    }
    if (hopPush.current && --hopPush.current.steps <= 0) {
      const d = hopPush.current.dir * TUNE.hopForward;
      b.applyImpulse({ x: fwd.x * d, y: 0, z: fwd.z * d }, true);
      hopPush.current = null;
    }
    if (Math.abs(speed) < TUNE.hopMaxSpeed) handbrake = false;

    // Steering: quick, and less of it at speed so it doesn't spin out.
    const k = Math.min(1, Math.abs(speed) / TUNE.maxSpeed);
    const maxSteer = THREE.MathUtils.lerp(TUNE.steerLow, TUNE.steerHigh, k);
    steer.current += (turn * maxSteer - steer.current) * Math.min(1, dt * TUNE.steerRate);
    c.setWheelSteering(0, steer.current);
    c.setWheelSteering(1, steer.current);

    // Engine on all four wheels (it's a buggy); brake when pushing against the motion.
    const top = turbo ? TUNE.turboSpeed : TUNE.maxSpeed;
    let force = 0;
    let brake = 0;
    if (gas > 0) {
      if (speed < -0.5) brake = TUNE.brake;
      else force = (turbo ? TUNE.turboEngine : TUNE.engine) * gas * THREE.MathUtils.clamp((top - speed) / 2, 0, 1);
    } else if (gas < 0) {
      if (speed > 0.5) brake = TUNE.brake;
      else force = TUNE.engine * 0.7 * gas * THREE.MathUtils.clamp((TUNE.reverseSpeed + speed) / 2, 0, 1);
    } else brake = TUNE.roll;
    for (let i = 0; i < 4; i++) {
      c.setWheelEngineForce(i, force / 4);
      const drifting = handbrake && !WHEELS[i].front;
      c.setWheelBrake(i, brake + (drifting ? TUNE.driftBrake : 0));
      // Handbrake: the back steps out.
      c.setWheelSideFrictionStiffness(i, drifting ? TUNE.driftSide : TUNE.sideStiff);
      c.setWheelFrictionSlip(i, drifting ? TUNE.driftGrip : TUNE.grip);
    }
    if (handbrake && turn !== 0 && speed > 3) b.applyTorqueImpulse({ x: up.x * turn * TUNE.driftYaw, y: up.y * turn * TUNE.driftYaw, z: up.z * turn * TUNE.driftYaw }, true);
    // A drift, not a spin: keep it moving (the sliding rear can't push) and cap how fast it can
    // swing around.
    if (handbrake && gas > 0 && speed > 2 && speed < top) b.applyImpulse({ x: fwd.x * TUNE.driftPush, y: 0, z: fwd.z * TUNE.driftPush }, true);
    if (handbrake) {
      const w = b.angvel();
      const yawRate = w.x * up.x + w.y * up.y + w.z * up.z;
      if (Math.abs(yawRate) > TUNE.maxYawRate) {
        const cut = yawRate - Math.sign(yawRate) * TUNE.maxYawRate;
        b.setAngvel({ x: w.x - up.x * cut, y: w.y - up.y * cut, z: w.z - up.z * cut }, true);
      }
    }
    // Wheels skip the stair ramps too (BUGGY_GROUPS): no driving up the steps.
    c.updateVehicle(dt, rapier.QueryFilterFlags.EXCLUDE_SENSORS, BUGGY_GROUPS, (col) => col.parent()?.handle !== playerState.body?.handle);

    // Air: level out gently so jumps land on the wheels. Ground: nothing (it's the suspension's job).
    let onGround = false;
    for (let i = 0; i < 4; i++) if (c.wheelIsInContact(i)) onGround = true;
    grounded.current = onGround;
    const tilt = new THREE.Vector3().crossVectors(up, WORLD_UP);
    if (!onGround) b.applyTorqueImpulse({ x: tilt.x * TUNE.level, y: 0, z: tilt.z * TUNE.level }, true);
    // On its side or roof for a second: flip back onto the wheels.
    if (up.y < 0.3 && Math.hypot(v.x, v.y, v.z) < 2) flipped.current += dt;
    else flipped.current = 0;
    if (flipped.current > 1) {
      const t = b.translation();
      const yaw = Math.atan2(fwd.x, fwd.z);
      b.setTranslation({ x: t.x, y: t.y + 1.2, z: t.z }, true);
      b.setRotation(q.setFromAxisAngle(WORLD_UP, yaw), true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      flipped.current = 0;
    }
    // Keep off the stairs: push out of any stair footprint and stop moving into it.
    {
      const t = b.translation();
      for (const st of stairs()) {
        if (t.y < st.y0 || t.y > st.y1 || Math.abs(t.x - st.cx) > st.hu + st.hv + 2 || Math.abs(t.z - st.cz) > st.hu + st.hv + 2) continue;
        const push = pushOut(t.x, t.z, fwd.x, fwd.z, st);
        if (!push) continue;
        const len = Math.hypot(push[0], push[1]) || 1;
        const nx = push[0] / len;
        const nz = push[1] / len;
        b.setTranslation({ x: t.x + push[0], y: t.y, z: t.z + push[1] }, true);
        const lv = b.linvel();
        const into = lv.x * nx + lv.z * nz;
        // A small bounce back, like hitting a wall.
        if (into < 0) b.setLinvel({ x: lv.x - nx * into * 1.3, y: lv.y, z: lv.z - nz * into * 1.3 }, true);
        t.x += push[0];
        t.z += push[1];
      }
    }

    // Fell out of the world: back to its parking spot.
    if (b.translation().y < -40) placed.current = false;

    // Shared state, and the driver rides along (the capsule is disabled; the camera follows it).
    const t = b.translation();
    buggy.position.set(t.x, t.y, t.z);
    buggy.yaw = Math.atan2(fwd.x, fwd.z);
    buggy.speed = speed;
    if (useBuggy.getState().driving) engineUpdate(Math.min(1, Math.abs(speed) / TUNE.turboSpeed), gas);
    if (useBuggy.getState().driving && playerState.body) playerState.body.setTranslation({ x: t.x, y: t.y + 0.3, z: t.z }, false);
  });

  // Who's close enough to get in (and wheel visuals).
  const m = useMemo(() => new THREE.Matrix4(), []);
  const wq = useMemo(() => new THREE.Quaternion(), []);
  const spin = useMemo(() => new THREE.Quaternion(), []);
  const wp = useMemo(() => new THREE.Vector3(), []);
  const ws = useMemo(() => new THREE.Vector3(), []);
  const X = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  useFrame(() => {
    const c = ctrl.current;
    const s = useBuggy.getState();
    const p = playerState.position;
    s.setNear(!s.driving && Math.hypot(p.x - buggy.position.x, p.z - buggy.position.z) < ENTER_DIST && Math.abs(p.y - buggy.position.y) < 2);
    if (!c || !wheels.current) return;
    for (let i = 0; i < 4; i++) {
      const w = WHEELS[i];
      const len = c.wheelSuspensionLength(i) ?? REST;
      wp.set(w.x, w.r + HANG - Y0 - len, w.z);
      wq.setFromAxisAngle(WORLD_UP, c.wheelSteering(i) ?? 0);
      spin.setFromAxisAngle(X, c.wheelRotation(i) ?? 0);
      wq.multiply(spin);
      ws.set(w.w, w.r, w.r);
      m.compose(wp, wq, ws);
      wheels.current.setMatrixAt(i, m);
    }
    wheels.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
    <EngineSmoke />
    <RigidBody
      ref={body}
      type="dynamic"
      colliders={false}
      position={[BUGGY.at[0], 40, BUGGY.at[1]]}
      rotation={[0, BUGGY.yaw, 0]}
      linearDamping={0.05}
      angularDamping={0.6}
      canSleep={false}
    >
      {/* Tub (all the mass, low down) and the roll cage, which keeps it off its roof. */}
      <CuboidCollider
        args={[0.52, 0.17, 0.95]}
        position={[0, 0.06, 0]}
        restitution={0.3}
        collisionGroups={BUGGY_GROUPS}
        massProperties={{
          mass: 150,
          centerOfMass: { x: 0, y: -0.2, z: 0 },
          principalAngularInertia: { x: 55, y: 65, z: 22 },
          angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 },
        }}
      />
      <CuboidCollider args={[0.5, 0.36, 0.42]} position={[0, 0.6, -0.1]} density={0.001} restitution={0.3} collisionGroups={BUGGY_GROUPS} />
      <group ref={(g) => void (buggy.visual = g)} />
      <CharacterLayer>
        <mesh geometry={model.body.geometry} material={model.body.material} position={[0, -Y0, 0]} />
        <instancedMesh ref={wheels} args={[model.wheel.geometry, model.wheel.material, 4]} frustumCulled={false} />
        <group ref={seated} visible={driving}>
          <SeatedKid steer={steer} />
        </group>
      </CharacterLayer>
    </RigidBody>
    </>
  );
}
