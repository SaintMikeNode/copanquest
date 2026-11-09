import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { useRapier } from "@react-three/rapier";
import { Ecctrl, type EcctrlHandle } from "ecctrl";
import { useButtonStore, useJoystickStore } from "ecctrl/input";
import { JOYSTICK_RUN_THRESHOLD, type Control } from "./controls";
import { playerState } from "./playerState";
import { PLAYER_SPAWN } from "../world/siteData";
import { FollowCamera } from "./FollowCamera";
import { DEV_TOOLS } from "../config";
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";

// Kid-sized capsule: 2 × (0.35 + 0.28) ≈ 1.26 m tall, floating 0.2 m above the ground.
const HALF_HEIGHT = 0.35;
const RADIUS = 0.28;
const FLOAT = 0.2;
const FEET = -(HALF_HEIGHT + RADIUS + FLOAT);

const joystickInput = { x: 0, y: 0 };
const euler = new THREE.Euler();

function blobShadowTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// ---------------------------------------------------------------- explorer kid (pixel art)

const C = {
  skin: hex("#8d5a3b"),
  skinDark: hex("#74482e"),
  hair: hex("#1d1410"),
  shirt: hex("#18b4d8"), // Honduran flag turquoise
  shirtDark: hex("#1294b4"),
  white: hex("#f4f1e8"),
  shorts: hex("#a8925f"),
  shortsDark: hex("#8c784c"),
  shoe: hex("#f2f2ee"),
  shoeRed: hex("#d23a2e"),
  hat: hex("#c9b07a"),
  hatBand: hex("#5a3e22"),
  pack: hex("#e2762a"),
  packDark: hex("#b85c1c"),
  eye: hex("#1a1210"),
  mouth: hex("#5a2e22"),
};

function kidModel() {
  const sleeve = (t: Tile, f: FaceName) => {
    solid(t, C.skin, 0.05, 3);
    if (f === "bottom") return;
    for (let y = 0; y < Math.ceil(t.h * 0.32); y++) for (let x = 0; x < t.w; x++) t.set(x, y, f === "top" ? C.shirt : y === Math.ceil(t.h * 0.32) - 1 ? C.shirtDark : C.shirt);
  };
  const leg = (t: Tile, f: FaceName) => {
    solid(t, C.skin, 0.05, 5);
    if (f === "bottom") return;
    const k = f === "top" ? t.h : Math.ceil(t.h * 0.45);
    for (let y = 0; y < k; y++) for (let x = 0; x < t.w; x++) t.set(x, y, y === k - 1 && f !== "top" ? C.shortsDark : C.shorts);
  };
  const shoe = (t: Tile, f: FaceName) => {
    solid(t, C.shoe, 0.04, 7);
    if (f === "front" || f === "back" || f === "left" || f === "right") for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, C.shoeRed);
    if (f === "top") for (let y = 0; y < t.h; y += 3) t.set(Math.floor(t.w / 2), y, C.shoeRed);
  };
  const body = (t: Tile, f: FaceName) => {
    solid(t, C.shirt, 0.05, 9);
    if (f === "front" || f === "back" || f === "left" || f === "right") {
      // White band with five stars, like the flag.
      const y0 = Math.floor(t.h * 0.36);
      for (let y = y0; y < y0 + 4; y++) for (let x = 0; x < t.w; x++) t.set(x, y, C.white);
      if (f === "front") for (let i = 0; i < 5; i++) t.set(Math.round(t.w * (0.2 + i * 0.15)), y0 + 1 + (i % 2), C.shirt);
      for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, C.shirtDark);
    }
  };
  const head = (t: Tile, f: FaceName) => {
    solid(t, C.skin, 0.04, 11);
    if (f === "top") return solid(t, C.hair, 0.1, 12);
    if (f === "bottom") return;
    const hairRows = f === "back" ? Math.floor(t.h * 0.7) : 3;
    for (let y = 0; y < hairRows; y++) for (let x = 0; x < t.w; x++) t.set(x, y, C.hair);
    if (f === "front") {
      // Face: brows, eyes with a highlight, nose shade, smile.
      const ey = 5;
      for (const ex of [2, t.w - 4]) {
        t.set(ex, ey - 1, C.hair);
        t.set(ex + 1, ey - 1, C.hair);
        t.set(ex, ey, C.white);
        t.set(ex + 1, ey, C.eye);
        t.set(ex + 1, ey + 1, C.eye);
        t.set(ex, ey + 1, C.eye);
      }
      t.set(Math.floor(t.w / 2), ey + 2, C.skinDark);
      for (let x = Math.floor(t.w / 2) - 1; x <= Math.floor(t.w / 2) + 1; x++) t.set(x, ey + 4, C.mouth);
    }
    if (f === "left" || f === "right") {
      for (let y = 3; y < 6; y++) t.set(f === "left" ? t.w - 1 : 0, y, C.hair);
      t.set(Math.floor(t.w / 2), 6, C.skinDark); // ear
    }
  };
  const hatCrown = (t: Tile, f: FaceName) => {
    solid(t, C.hat, 0.07, 13);
    if (f !== "top" && f !== "bottom") for (let x = 0; x < t.w; x++) t.set(x, t.h - 1, C.hatBand);
  };
  const hatBrim = (t: Tile) => solid(t, C.hat, 0.08, 14);
  const pack = (t: Tile, f: FaceName) => {
    solid(t, C.pack, 0.06, 15);
    if (f === "back") {
      for (let y = Math.floor(t.h * 0.5); y < t.h - 1; y++) for (let x = 1; x < t.w - 1; x++) t.set(x, y, C.packDark);
      for (let x = 1; x < t.w - 1; x++) t.set(x, Math.floor(t.h * 0.5), C.pack);
    }
  };
  return buildPixelModel([
    { size: [0.15, 0.36, 0.17], paint: leg }, // 0 leg
    { size: [0.17, 0.07, 0.22], paint: shoe }, // 1 shoe
    { size: [0.36, 0.42, 0.22], paint: body }, // 2 body
    { size: [0.11, 0.38, 0.13], paint: sleeve }, // 3 arm
    { size: [0.34, 0.34, 0.34], paint: head }, // 4 head
    { size: [0.3, 0.12, 0.3], paint: hatCrown }, // 5 hat crown
    { size: [0.48, 0.04, 0.48], paint: hatBrim }, // 6 hat brim
    { size: [0.28, 0.32, 0.12], paint: pack }, // 7 backpack
  ]);
}

/** Explorer kid with a simple walk cycle. */
function PlayerModel({ controller }: { controller: React.RefObject<EcctrlHandle | null> }) {
  const { geometries: G, material } = useMemo(kidModel, []);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const phase = useRef(0);
  useFrame((_, dt) => {
    const c = controller.current;
    const speed = c ? c.moveSpeed : 0;
    const air = c ? !c.isOnGround : false;
    phase.current += dt * (4 + speed * 2.2);
    const amp = air ? 0.5 : Math.min(1, speed / 3) * 0.85;
    const s = Math.sin(phase.current) * amp;
    if (legL.current) legL.current.rotation.x = s;
    if (legR.current) legR.current.rotation.x = -s;
    if (armL.current) armL.current.rotation.x = -s * 0.9;
    if (armR.current) armR.current.rotation.x = s * 0.9;
  });
  const part = (i: number, pos: [number, number, number]) => (
    <mesh geometry={G[i]} material={material} position={pos} castShadow />
  );
  // Feet at y = FEET (capsule bottom minus float height).
  return (
    <group position={[0, FEET, 0]}>
      <group ref={legL} position={[-0.085, 0.43, 0]}>
        {part(0, [0, -0.2, 0])}
        {part(1, [0, -0.395, 0.02])}
      </group>
      <group ref={legR} position={[0.085, 0.43, 0]}>
        {part(0, [0, -0.2, 0])}
        {part(1, [0, -0.395, 0.02])}
      </group>
      {part(2, [0, 0.64, 0])}
      {part(7, [0, 0.66, -0.17])}
      <group ref={armL} position={[-0.24, 0.82, 0]}>
        {part(3, [0, -0.17, 0])}
      </group>
      <group ref={armR} position={[0.24, 0.82, 0]}>
        {part(3, [0, -0.17, 0])}
      </group>
      {part(4, [0, 1.03, 0])}
      {part(6, [0, 1.215, 0])}
      {part(5, [0, 1.29, 0])}
    </group>
  );
}

export function Player() {
  const ref = useRef<EcctrlHandle>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const [, getKeys] = useKeyboardControls<Control>();
  const { world, rapier } = useRapier();
  const shadowTex = useMemo(blobShadowTexture, []);
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }), [rapier]);

  // Dev helper: window.cqTeleport(x, y, z) from the browser console.
  useEffect(() => {
    if (!DEV_TOOLS) return;
    const w = window as unknown as { cqTeleport?: (x: number, y: number, z: number) => void };
    w.cqTeleport = (x, y, z) => {
      ref.current?.body.setTranslation({ x, y, z }, true);
      ref.current?.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      ref.current?.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      ref.current?.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    };
    return () => {
      delete w.cqTeleport;
    };
  }, []);

  useFrame(() => {
    const c = ref.current;
    if (!c) return;

    // Merge keyboard + touch input and hand it to Ecctrl (it moves relative to the camera).
    const k = getKeys();
    const js = useJoystickStore.getState().joysticks.default;
    const jsActive = !!js?.active && (js.x !== 0 || js.y !== 0);
    joystickInput.x = jsActive ? js.x : 0;
    joystickInput.y = jsActive ? js.y : 0;
    const jsRun = jsActive && Math.hypot(js.x, js.y) >= JOYSTICK_RUN_THRESHOLD;
    c.setMovement({
      forward: k.forward,
      backward: k.backward,
      leftward: k.leftward,
      rightward: k.rightward,
      joystick: joystickInput,
      run: k.run || jsRun,
      jump: k.jump || !!useButtonStore.getState().buttons.jump,
    });

    // Share state with the minimap / POIs.
    playerState.position.copy(c.currPos);
    playerState.grounded = c.isOnGround;
    euler.setFromQuaternion(c.currQuat, "YXZ");
    playerState.facingYaw = euler.y;

    // Fell out of the world → back to the spawn point.
    if (c.currPos.y < -60) {
      c.body.setTranslation({ x: PLAYER_SPAWN[0], y: PLAYER_SPAWN[1] + 2, z: PLAYER_SPAWN[2] }, true);
      c.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    // Blob shadow: project straight down onto whatever is below.
    const shadow = shadowRef.current;
    if (shadow) {
      ray.origin = { x: c.currPos.x, y: c.currPos.y, z: c.currPos.z };
      const hit = world.castRay(ray, 20, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, c.body);
      if (hit) {
        const dist = hit.timeOfImpact;
        shadow.visible = true;
        shadow.position.set(c.currPos.x, c.currPos.y - dist + 0.04, c.currPos.z);
        const s = THREE.MathUtils.clamp(1.1 - (dist + FEET) * 0.15, 0.4, 1.1);
        shadow.scale.setScalar(s);
      } else {
        shadow.visible = false;
      }
    }
  });

  return (
    <>
      <Ecctrl
        ref={ref}
        position={PLAYER_SPAWN}
        capsuleHalfHeight={HALF_HEIGHT}
        capsuleRadius={RADIUS}
        floatHeight={FLOAT}
        maxWalkVel={3}
        maxRunVel={6.5}
        jumpVel={4.5}
        enableToggleRun={false}
        // Maya stairs are ~45–55°; their invisible ramps must stay walkable.
        slopeMaxAngle={THREE.MathUtils.degToRad(62)}
        applyCounterMass={false}
        applyCounterMoveImp={false}
        applyCounterJumpImp={false}
        // Only turn around Y: the kid can never tip over, even after a long frame.
        enabledRotations={[false, true, false]}
      >
        <PlayerModel controller={ref} />
      </Ecctrl>
      <mesh ref={shadowRef} rotation-x={-Math.PI / 2} renderOrder={1}>
        <planeGeometry args={[1.1, 1.1]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
      </mesh>
      <FollowCamera target={ref} />
    </>
  );
}
