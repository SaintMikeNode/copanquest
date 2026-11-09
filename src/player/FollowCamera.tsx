import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { useRapier } from "@react-three/rapier";
import type { EcctrlHandle } from "ecctrl";
import type { Control } from "./controls";
import { playerState } from "./playerState";
import { DEV_TOOLS } from "../config";

const MIN_DIST = 2.5;
const MAX_DIST = DEV_TOOLS ? 120 : 14;
const MIN_PITCH = -0.25;
const MAX_PITCH = 1.2;
const TARGET_HEIGHT = 0.9;
/** Gap kept between the camera and any wall it would otherwise clip into. */
const WALL_PADDING = 0.3;

/**
 * Third-person orbit camera. Drag (mouse or one finger on the canvas) to orbit, wheel to zoom,
 * Q/E to turn. A ray from the player to the camera pulls it in front of walls.
 */
export function FollowCamera({ target }: { target: RefObject<EcctrlHandle | null> }) {
  const { camera, gl } = useThree();
  const { world, rapier } = useRapier();
  const [, getKeys] = useKeyboardControls<Control>();

  const yaw = useRef(0); // 0 = camera south of the player, looking north
  const pitch = useRef(0.35);
  const wantDist = useRef(7);
  const dist = useRef(7);
  const focus = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }), [rapier]);

  // Dev helper: window.cqView(yaw, pitch, distance) from the browser console.
  useEffect(() => {
    if (!DEV_TOOLS) return;
    const w = window as unknown as { cqView?: (y: number, p: number, d: number) => void };
    w.cqView = (y, p, d) => {
      yaw.current = y;
      pitch.current = p;
      wantDist.current = d;
    };
    return () => {
      delete w.cqView;
    };
  }, []);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";
    let active: number | null = null;
    let lastX = 0;
    let lastY = 0;
    const pinch = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;

    const down = (e: PointerEvent) => {
      pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.size === 2) {
        const [a, b] = [...pinch.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      if (active !== null) return;
      active = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (pinch.has(e.pointerId)) pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.size === 2) {
        const [a, b] = [...pinch.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        wantDist.current = THREE.MathUtils.clamp(wantDist.current * (pinchDist / d || 1), MIN_DIST, MAX_DIST);
        pinchDist = d;
        return;
      }
      if (e.pointerId !== active) return;
      const scale = e.pointerType === "touch" ? 0.008 : 0.005;
      yaw.current -= (e.clientX - lastX) * scale;
      pitch.current = THREE.MathUtils.clamp(pitch.current + (e.clientY - lastY) * scale * 0.8, MIN_PITCH, MAX_PITCH);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      pinch.delete(e.pointerId);
      if (e.pointerId === active) active = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      wantDist.current = THREE.MathUtils.clamp(wantDist.current * (1 + e.deltaY * 0.001), MIN_DIST, MAX_DIST);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  // Run after Ecctrl has updated the body (higher priority runs later; >0 would disable auto-render).
  useFrame((_, delta) => {
    const c = target.current;
    if (!c) return;
    const dt = Math.min(delta, 0.1);
    const k = getKeys();
    if (k.lookLeft) yaw.current += dt * 2;
    if (k.lookRight) yaw.current -= dt * 2;

    focus.set(c.currPos.x, c.currPos.y + TARGET_HEIGHT, c.currPos.z);
    const cp = Math.cos(pitch.current);
    dir.set(Math.sin(yaw.current) * cp, Math.sin(pitch.current), Math.cos(yaw.current) * cp);

    // Collision: shorten the boom when something is between the player and the camera.
    ray.origin = { x: focus.x, y: focus.y, z: focus.z };
    ray.dir = { x: dir.x, y: dir.y, z: dir.z };
    const hit = world.castRay(
      ray,
      wantDist.current + WALL_PADDING,
      true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      undefined,
      c.body,
    );
    const allowed = hit ? Math.max(0.4, hit.timeOfImpact - WALL_PADDING) : wantDist.current;
    // Snap in immediately (never show the inside of a wall), ease back out.
    dist.current = allowed < dist.current ? allowed : THREE.MathUtils.damp(dist.current, allowed, 4, dt);

    camera.position.copy(focus).addScaledVector(dir, dist.current);
    camera.lookAt(focus);
    playerState.viewYaw = yaw.current;
  });

  return null;
}
