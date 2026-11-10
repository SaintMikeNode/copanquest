import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import type { EcctrlHandle } from "ecctrl";
import { playerState } from "./playerState";
import { DEV_TOOLS } from "../config";
import { SPAWN_YAW } from "../world/siteData";
import { useCamera } from "../game/camera";
import { useGame } from "../state/useGame";
import { useAction } from "../game/WorldGame";
import { directorCam } from "../dev/directorCam";

/** True while a menu, dialogue or card needs the cursor. */
function blockedByUI() {
  const g = useGame.getState();
  return !!g.overlay || !!g.dialogue || !!useAction.getState().found;
}

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

  const yaw = useRef(SPAWN_YAW); // 0 = camera south of the player, looking north
  const pitch = useRef(0.35);
  const wantDist = useRef(7);
  const dist = useRef(7);
  const focus = useMemo(() => new THREE.Vector3(), []);
  const freeCam = useRef<number[] | null>(null);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }), [rapier]);

  // Dev helper: window.cqView(yaw, pitch, distance) from the browser console.
  useEffect(() => {
    if (!DEV_TOOLS) return;
    const w = window as unknown as {
      cqView?: (y: number, p: number, d: number) => void;
      cqFreeCam?: (...v: number[]) => void;
    };
    w.cqView = (y, p, d) => {
      yaw.current = y;
      pitch.current = p;
      wantDist.current = d;
    };
    // cqFreeCam(x, y, z, lookX, lookY, lookZ) parks the camera anywhere; cqFreeCam() releases it.
    w.cqFreeCam = (...v) => {
      freeCam.current = v.length >= 6 ? v : null;
    };
    return () => {
      delete w.cqView;
      delete w.cqFreeCam;
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

    // Desktop: click to lock the pointer, then the mouse turns the camera (like a PC game).
    const locked = () => document.pointerLockElement === el;
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button === 2) {
        // Right click interacts (talk, observe, dig, hit the ball), like in Minecraft.
        window.dispatchEvent(new Event("cq-interact"));
        return;
      }
      if (e.pointerType === "mouse") {
        if (locked()) {
          // Left click while aiming the explorer's camera takes the photo.
          if (e.button === 0 && useCamera.getState().active) window.dispatchEvent(new Event("cq-shutter"));
          return;
        }
        if (!blockedByUI()) {
          const req = el.requestPointerLock?.({ unadjustedMovement: true } as never) as Promise<void> | undefined;
          // Some browsers reject unadjustedMovement; retry without it.
          req?.catch?.(() => el.requestPointerLock?.());
          return;
        }
      }
      // A primary touch starts a new gesture: forget fingers whose "up" never arrived (a menu
      // opening mid-touch can swallow it), or the next drag is mistaken for a pinch and the
      // camera stops turning.
      if (e.pointerType === "touch" && e.isPrimary) {
        pinch.clear();
        active = null;
      }
      pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.size === 2) {
        const [a, b] = [...pinch.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      if (active !== null) return;
      active = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
    };
    const look = (e: MouseEvent) => {
      if (!locked()) return;
      yaw.current -= e.movementX * 0.0026;
      pitch.current = THREE.MathUtils.clamp(pitch.current + e.movementY * 0.0021, MIN_PITCH, MAX_PITCH);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && locked()) return;
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
    const noMenu = (e: MouseEvent) => e.preventDefault();
    const respawned = () => {
      yaw.current = SPAWN_YAW;
      pitch.current = THREE.MathUtils.clamp(0.35, MIN_PITCH, MAX_PITCH);
    };
    el.addEventListener("contextmenu", noMenu);
    window.addEventListener("cq-respawn", respawned);
    document.addEventListener("mousemove", look);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    // Opening or closing any window or dialogue also ends whatever drag was going on.
    const reset = () => {
      pinch.clear();
      active = null;
    };
    const unsubUI = useGame.subscribe((s, p) => {
      if (s.overlay !== p.overlay || s.dialogue !== p.dialogue) reset();
    });
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("contextmenu", noMenu);
      window.removeEventListener("cq-respawn", respawned);
      document.removeEventListener("mousemove", look);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", up);
      unsubUI();
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  // Run after Ecctrl has updated the body (higher priority runs later; >0 would disable auto-render).
  useFrame((_, delta) => {
    const c = target.current;
    if (!c) return;
    // Dev director (src/dev/Director.tsx) is filming: it owns the camera.
    if (directorCam.active) {
      const cam = camera as THREE.PerspectiveCamera;
      if (cam.fov !== directorCam.fov) {
        cam.fov = directorCam.fov;
        cam.updateProjectionMatrix();
      }
      camera.position.copy(directorCam.pos);
      camera.lookAt(directorCam.look);
      return;
    }
    const fc = freeCam.current;
    if (fc) {
      camera.position.set(fc[0], fc[1], fc[2]);
      camera.lookAt(fc[3], fc[4], fc[5]);
      return;
    }
    const dt = Math.min(delta, 0.1);

    // Explorer's camera: tighter, over the right shoulder, with optional zoom.
    const photo = useCamera.getState();
    const cam = camera as THREE.PerspectiveCamera;
    const wantFov = photo.active ? (photo.zoom ? 22 : 45) : 60;
    if (Math.abs(cam.fov - wantFov) > 0.1) {
      cam.fov = THREE.MathUtils.damp(cam.fov, wantFov, 8, dt);
      cam.updateProjectionMatrix();
    }
    focus.set(c.currPos.x, c.currPos.y + TARGET_HEIGHT + (photo.active ? 0.35 : 0), c.currPos.z);
    if (photo.active) {
      focus.x += Math.cos(yaw.current) * 0.45;
      focus.z -= Math.sin(yaw.current) * 0.45;
    }
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
    const want = photo.active ? 1.5 : wantDist.current;
    const allowed = hit ? Math.max(0.4, Math.min(want, hit.timeOfImpact - WALL_PADDING)) : want;
    // Snap in immediately (never show the inside of a wall), ease back out.
    dist.current = allowed < dist.current ? allowed : THREE.MathUtils.damp(dist.current, allowed, 4, dt);

    camera.position.copy(focus).addScaledVector(dir, dist.current);
    camera.lookAt(focus);
    playerState.viewYaw = yaw.current;
  });

  return null;
}
