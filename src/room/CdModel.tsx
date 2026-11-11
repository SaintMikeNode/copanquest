// The "Acerca de" CD, leaning against the front of the computer case. Clicking it (or the Acerca de
// button, or A) plays the "how it was made" video: the computer's CD tray slides out, the disc
// flies onto it and the tray pulls it in (`insert`, 0 → 1, driven by Landing.tsx), then the camera
// zooms into the screen and the video plays there (AboutVideo.tsx). Zooming back out runs it
// backwards: the disc comes back out and returns to the desk.
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { psxMaterial } from "./psx";
import { HandHint } from "./HandHint";

const R = 0.06; // disc radius
const THICK = 0.0024;
/** Standing on the desk, leaning back against the front of the desktop case (right of its CD
 *  tray), label toward the room, just behind the keyboard. REST_TILT: rotation about x from flat. */
const REST_TILT = Math.PI / 2 - 0.15;
const REST = new THREE.Vector3(0.07, 0.7525 + R * Math.sin(REST_TILT) + 0.001, -1.08 + R * Math.cos(REST_TILT) + THICK / 2);
const REST_YAW = 0;
/** The CD tray on the desktop case's front (matches pcFrontTex: x −0.245…−0.08, y ≈ 0.795). */
const SLOT = new THREE.Vector3(-0.162, 0.795, -1.08);
const TRAY = { w: 0.15, h: 0.006, d: 0.13 };

/** Disc label: jade print with the title, a silver rim and the clear center ring. */
function labelTexture() {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const m = S / 2;
  const rim = g.createLinearGradient(0, 0, S, S);
  ["#d9dde2", "#9fd6e8", "#e6c3ef", "#f0e2a8", "#c9ced4"].forEach((col, i) => rim.addColorStop(i / 4, col));
  g.fillStyle = rim;
  g.fillRect(0, 0, S, S);
  g.beginPath();
  g.arc(m, m, m - 5, 0, Math.PI * 2);
  g.fillStyle = "#1f6b4a";
  g.fill();
  // Printed band and title.
  g.fillStyle = "#f2c14e";
  g.fillRect(14, m - 22, S - 28, 4);
  g.fillStyle = "#fff6e0";
  g.font = "bold 15px monospace";
  g.textAlign = "center";
  g.fillText("CopánQuest", m, m - 30);
  g.font = "bold 10px monospace";
  g.fillStyle = "#f2c14e";
  g.fillText("ACERCA DE · ABOUT", m, m + 36);
  // Center: clear ring and hole.
  g.beginPath();
  g.arc(m, m, 17, 0, Math.PI * 2);
  g.fillStyle = "#c9ced4";
  g.fill();
  g.beginPath();
  g.arc(m, m, 7, 0, Math.PI * 2);
  g.fillStyle = "#2a2622";
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const smooth = (a: number, b: number, t: number) => THREE.MathUtils.smoothstep(t, a, b);

export function CdModel({
  onOpen,
  hover,
  insert,
}: {
  onOpen: () => void;
  hover: (on: boolean) => void;
  /** 0 = on the desk … 1 = inside the computer. */
  insert: { current: number };
}) {
  const M = useMemo(() => {
    const silver = psxMaterial({ color: "#c9ced4" });
    return {
      // Cylinder groups: side, top (label), bottom (shiny side).
      disc: [silver, psxMaterial({ map: labelTexture() }), psxMaterial({ color: "#b9d8e6" })],
      tray: psxMaterial({ color: "#2f2b26" }),
      trayFront: psxMaterial({ color: "#d8ceb2" }),
      hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    };
  }, []);
  const disc = useRef<THREE.Group>(null);
  const tray = useRef<THREE.Group>(null);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const lift = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const k = insert.current;
    // Tray: out over 0–0.25, back in over 0.7–1.
    const out = smooth(0, 0.25, k) * (1 - smooth(0.7, 1, k));
    const trayZ = SLOT.z - TRAY.d / 2 + out * (TRAY.d - 0.004);
    if (tray.current) {
      tray.current.visible = out > 0.002;
      tray.current.position.set(SLOT.x, SLOT.y, trayZ);
    }
    const d = disc.current;
    if (!d) return;
    // Disc: lifts off the desk, arcs over to the tray, settles on it, rides it in.
    const up = smooth(0, 0.2, k);
    const fly = smooth(0.2, 0.6, k);
    const land = smooth(0.6, 0.7, k);
    lift.copy(REST);
    lift.y += 0.05 * up;
    lift.z += 0.05 * up; // off the case
    pos.set(SLOT.x, SLOT.y + 0.06 * (1 - land) + TRAY.h / 2 + THICK / 2, trayZ);
    d.position.lerpVectors(lift, pos, fly);
    d.position.y += Math.sin(fly * Math.PI) * 0.05;
    // Tips over flat while it flies, spinning (YXZ: the spin is around the vertical).
    d.rotation.x = REST_TILT * (1 - fly);
    d.rotation.y = REST_YAW * (1 - fly) + fly * Math.PI * 2;
    d.visible = k < 0.97;
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onOpen();
  };
  return (
    <>
      <group
        onClick={click}
        onPointerOver={(e) => {
          e.stopPropagation();
          hover(true);
        }}
        onPointerOut={() => hover(false)}
      >
        <group ref={disc} position={REST} rotation={[REST_TILT, REST_YAW, 0, "YXZ"]}>
          <mesh material={M.disc}>
            <cylinderGeometry args={[R, R, THICK, 24]} />
          </mesh>
        </group>
        <HandHint position={[REST.x, REST.y + 0.1, REST.z + 0.03]} scale={0.05} phase={0.15} hidden={() => insert.current > 0.01} />
        <mesh material={M.hit} position={[REST.x, REST.y, REST.z]}>
          <boxGeometry args={[0.13, 0.13, 0.04]} />
        </mesh>
      </group>
      {/* The CD tray, inside the case until it slides out. */}
      <group ref={tray} visible={false}>
        <mesh material={M.tray}>
          <boxGeometry args={[TRAY.w, TRAY.h, TRAY.d]} />
        </mesh>
        <mesh material={M.trayFront} position={[0, 0, TRAY.d / 2 - 0.002]}>
          <boxGeometry args={[TRAY.w + 0.01, 0.014, 0.004]} />
        </mesh>
      </group>
    </>
  );
}
