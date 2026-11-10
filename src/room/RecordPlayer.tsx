// Record player on the bedroom desk: plays "La muerte del bardo" (see src/audio/sound.ts). The
// record spins and the tonearm swings onto it while the music plays; a floating music note marks
// it as something to click, and clicking opens the record box (RecordBox.tsx).
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { psxMaterial, psxTexture } from "./psx";
import * as T from "./roomTextures";
import { useRecord } from "../audio/sound";
import { HandHint } from "./HandHint";

/** 78 rpm, in radians per second. */
const SPIN = (78 / 60) * Math.PI * 2;
/** Tonearm angles (around its pivot): parked beside the platter, and on the record. */
const ARM_REST = 0.12;
const ARM_PLAY = -0.63;

function recordTexture() {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const m = s / 2;
  g.fillStyle = "#141210";
  g.fillRect(0, 0, s, s);
  // Grooves, with a lead-in band and a gap between the outer and inner sections.
  for (let r = 124; r > 46; r -= 2) {
    g.strokeStyle = r % 4 ? "#1c1a17" : "#2a2622";
    if (r < 96 && r > 90) g.strokeStyle = "#0e0d0c";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(m, m, r, 0, Math.PI * 2);
    g.stroke();
  }
  // A soft sheen across the grooves.
  for (const a of [0.6, 0.6 + Math.PI]) {
    const grad = g.createRadialGradient(m, m, 50, m, m, 124);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.6, "rgba(255,240,220,0.12)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(m, m);
    g.arc(m, m, 124, a - 0.18, a + 0.18);
    g.closePath();
    g.fill();
  }
  // Label: dark red with gold rings and lettering (a plain label, no brand).
  g.fillStyle = "#7a2418";
  g.beginPath();
  g.arc(m, m, 44, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#d9b25a";
  g.lineWidth = 2;
  for (const r of [41, 36]) {
    g.beginPath();
    g.arc(m, m, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = "#e8c66a";
  g.textAlign = "center";
  g.font = "bold 11px sans-serif";
  g.fillText("ADALID", m, m - 12);
  g.font = "8px sans-serif";
  g.fillText("TRÍO VENECIANO", m, m + 20);
  g.fillText("1914", m, m + 29);
  g.fillStyle = "#e8e0d0";
  g.beginPath();
  g.arc(m, m, 3, 0, Math.PI * 2);
  g.fill();
  return psxTexture(c, false);
}

function noteTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.font = "bold 50px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 8;
  g.strokeStyle = "#3a1a10";
  g.strokeText("♪", 32, 34);
  g.fillStyle = "#f2c14e";
  g.fillText("♪", 32, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function RecordPlayer({
  onOpen,
  hover,
  position,
  rotation,
}: {
  onOpen: () => void;
  hover: (on: boolean) => void;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const M = useMemo(
    () => ({
      walnut: psxMaterial({ map: T.deskTex(), color: "#a8744c" }),
      plate: psxMaterial({ color: "#d8d4ca" }),
      dark: psxMaterial({ color: "#2b2926" }),
      chrome: psxMaterial({ color: "#d4d2cc" }),
      record: [psxMaterial({ color: "#141210" }), psxMaterial({ map: recordTexture() }), psxMaterial({ color: "#141210" })],
      led: psxMaterial({ color: "#ff4a2a", unlit: true }),
      ledOff: psxMaterial({ color: "#5a2018" }),
      note: new THREE.SpriteMaterial({ map: noteTexture(), transparent: true, depthWrite: false }),
      hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    }),
    [],
  );
  const geo = useMemo(
    () => ({
      plinth: new RoundedBoxGeometry(0.28, 0.06, 0.22, 3, 0.008),
      cyl: new THREE.CylinderGeometry(1, 1, 1, 28),
      disc: new THREE.CylinderGeometry(0.09, 0.09, 0.002, 40),
    }),
    [],
  );
  const disc = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  const led = useRef<THREE.Mesh>(null);
  const note = useRef<THREE.Sprite>(null);
  const speed = useRef(0);

  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05);
    const on = useRecord.getState().spinning;
    speed.current = THREE.MathUtils.damp(speed.current, on ? SPIN : 0, 3, d);
    if (disc.current) disc.current.rotation.y -= speed.current * d;
    if (arm.current) arm.current.rotation.y = THREE.MathUtils.damp(arm.current.rotation.y, on ? ARM_PLAY : ARM_REST, 4, d);
    if (led.current) led.current.material = on ? M.led : M.ledOff;
    if (note.current) {
      const t = clock.elapsedTime;
      note.current.position.y = 0.19 + Math.sin(t * 2.2) * 0.012;
      note.current.material.rotation = Math.sin(t * 1.6) * 0.18;
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onOpen();
  };

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={click}
      onPointerOver={(e) => {
        e.stopPropagation();
        hover(true);
      }}
      onPointerOut={() => hover(false)}
    >
      {/* Walnut plinth with a brushed-metal top plate. */}
      <mesh geometry={geo.plinth} material={M.walnut} position={[0, 0.03, 0]} />
      <mesh material={M.plate} position={[0, 0.0615, 0]}>
        <boxGeometry args={[0.268, 0.003, 0.208]} />
      </mesh>
      {/* Platter, record, spindle. */}
      <mesh geometry={geo.cyl} material={M.dark} position={[-0.035, 0.068, 0]} scale={[0.095, 0.01, 0.095]} />
      <group ref={disc} position={[-0.035, 0.0745, 0]}>
        <mesh geometry={geo.disc} material={M.record} />
      </group>
      <mesh geometry={geo.cyl} material={M.chrome} position={[-0.035, 0.08, 0]} scale={[0.003, 0.012, 0.003]} />
      {/* Tonearm: base, arm with headshell and counterweight, and its rest post. */}
      <mesh geometry={geo.cyl} material={M.chrome} position={[0.1, 0.072, -0.07]} scale={[0.016, 0.02, 0.016]} />
      <group ref={arm} position={[0.1, 0.086, -0.07]} rotation={[0, ARM_REST, 0]}>
        <mesh geometry={geo.cyl} material={M.chrome} position={[0, 0, 0.068]} rotation={[Math.PI / 2, 0, 0]} scale={[0.0035, 0.136, 0.0035]} />
        <mesh material={M.dark} position={[0, -0.004, 0.138]}>
          <boxGeometry args={[0.018, 0.008, 0.026]} />
        </mesh>
        <mesh geometry={geo.cyl} material={M.dark} position={[0, 0, -0.03]} rotation={[Math.PI / 2, 0, 0]} scale={[0.012, 0.025, 0.012]} />
      </group>
      <mesh geometry={geo.cyl} material={M.dark} position={[0.118, 0.072, 0.07]} scale={[0.004, 0.02, 0.004]} />
      {/* Speed knob and power light on the front. */}
      <mesh geometry={geo.cyl} material={M.chrome} position={[0.095, 0.068, 0.085]} scale={[0.01, 0.01, 0.01]} />
      <mesh ref={led} material={M.ledOff} position={[0.12, 0.03, 0.1105]}>
        <boxGeometry args={[0.008, 0.006, 0.002]} />
      </mesh>
      {/* Floating note: "this can be clicked". */}
      <sprite ref={note} material={M.note} position={[-0.09, 0.19, 0.04]} scale={0.075} />
      <HandHint position={[-0.09, 0.265, 0.04]} scale={0.055} phase={0.33} />
      {/* Larger invisible target, so it's easy to tap on a phone. */}
      <mesh material={M.hit} position={[0, 0.1, 0]}>
        <boxGeometry args={[0.34, 0.24, 0.28]} />
      </mesh>
    </group>
  );
}
