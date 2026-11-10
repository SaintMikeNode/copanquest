// The book on the desk, next to the keyboard: a red cloth hardcover with gold lettering and a
// ribbon. A floating star marks it as clickable. Clicking it flies the camera down to it
// (Landing.tsx) while the front cover swings open on its spine (`open`, 0 → 1); then the
// readable pages appear on top (CreditsBook.tsx).
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { psxMaterial, psxTexture } from "./psx";
import { HandHint } from "./HandHint";

const W = 0.16; // across
const D = 0.215; // front to back
const H = 0.04; // thickness
const BOARD = 0.004; // cover thickness

/** World point the camera looks at when the book is open: the top of the spine. */
export const BOOK_FOCUS = new THREE.Vector3(-0.56, 0.8, -0.98);

function coverTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 172;
  const g = c.getContext("2d")!;
  g.fillStyle = "#7a2418";
  g.fillRect(0, 0, c.width, c.height);
  // Cloth grain.
  for (let i = 0; i < 900; i++) {
    g.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,220,200,0.05)";
    g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 1);
  }
  g.strokeStyle = "#d9b25a";
  g.lineWidth = 3;
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.lineWidth = 1;
  g.strokeRect(14, 14, c.width - 28, c.height - 28);
  // A jade glyph cartouche and the title.
  g.fillStyle = "#2fae6e";
  g.fillRect(48, 40, 32, 32);
  g.fillStyle = "#1b7a4a";
  g.fillRect(54, 46, 20, 20);
  g.fillStyle = "#8fe0b0";
  g.fillRect(58, 50, 6, 6);
  g.fillRect(66, 58, 6, 6);
  g.fillStyle = "#e8c66a";
  g.textAlign = "center";
  g.font = "bold 16px sans-serif";
  g.fillText("COPÁN", 64, 100);
  g.fillText("QUEST", 64, 118);
  g.font = "10px sans-serif";
  g.fillText("★ ★ ★", 64, 142);
  return psxTexture(c, false);
}

/** Inside of the front cover: marbled endpaper. */
function endpaperTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 86;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c9a86a";
  g.fillRect(0, 0, 64, 86);
  for (let i = 0; i < 140; i++) {
    g.fillStyle = ["#a8823f", "#2f7a52", "#d9bf86"][i % 3];
    g.fillRect(Math.random() * 64, Math.random() * 86, 3, 1);
  }
  return psxTexture(c, false);
}

/** The first page, seen when the cover is open: a title bar, a glyph and lines of text. */
function pageTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 172;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f3e8cc";
  g.fillRect(0, 0, 128, 172);
  g.fillStyle = "#8c2f1e";
  g.fillRect(18, 18, 70, 7);
  g.fillStyle = "#2fae6e";
  g.fillRect(96, 14, 14, 14);
  g.fillStyle = "#7d7262";
  for (let y = 40; y < 156; y += 9) g.fillRect(18, y, y % 4 ? 92 : 78, 3);
  return psxTexture(c, false);
}

function edgeTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 16;
  const g = c.getContext("2d")!;
  g.fillStyle = "#efe4c8";
  g.fillRect(0, 0, 64, 16);
  g.fillStyle = "#cbbd98";
  for (let y = 1; y < 16; y += 2) g.fillRect(0, y, 64, 1);
  return psxTexture(c, false);
}

function starTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.font = "bold 46px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 8;
  g.strokeStyle = "#3a1a10";
  g.strokeText("✦", 32, 34);
  g.fillStyle = "#f2c14e";
  g.fillText("✦", 32, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function CreditsBookModel({
  onOpen,
  hover,
  open,
}: {
  onOpen: () => void;
  hover: (on: boolean) => void;
  /** 0 = closed … 1 = cover fully open (driven by the camera zoom). */
  open: { current: number };
}) {
  const M = useMemo(() => {
    const cloth = psxMaterial({ color: "#7a2418" });
    const edge = psxMaterial({ map: edgeTexture() });
    return {
      cloth,
      spine: psxMaterial({ color: "#5e1a10" }),
      // Pages block faces: +x, −x, +y (first page), −y, +z, −z.
      pages: [edge, edge, psxMaterial({ map: pageTexture() }), edge, edge, edge],
      // Front cover board: +y outside (title), −y inside (endpaper).
      cover: [cloth, cloth, psxMaterial({ map: coverTexture() }), psxMaterial({ map: endpaperTexture() }), cloth, cloth],
      ribbon: psxMaterial({ color: "#2fae6e", side: THREE.DoubleSide }),
      star: new THREE.SpriteMaterial({ map: starTexture(), transparent: true, depthWrite: false }),
      hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    };
  }, []);
  const star = useRef<THREE.Sprite>(null);
  const hinge = useRef<THREE.Group>(null);
  const anchor = useRef<THREE.Object3D>(null);

  // Tell the camera where the spine is (the parent group sets position / rotation / scale).
  useLayoutEffect(() => {
    const a = anchor.current;
    if (!a) return;
    a.updateWorldMatrix(true, false);
    a.getWorldPosition(BOOK_FOCUS);
  }, []);

  useFrame(({ clock }) => {
    const k = open.current;
    // Swing the cover over to the left, almost flat.
    if (hinge.current) hinge.current.rotation.z = k * Math.PI * 0.97;
    const s = star.current;
    if (!s) return;
    s.visible = k < 0.02;
    const t = clock.elapsedTime;
    s.position.y = 0.14 + Math.sin(t * 2 + 1) * 0.012;
    s.material.rotation = t * 0.8;
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onOpen();
  };
  return (
    <group
      onClick={click}
      onPointerOver={(e) => {
        e.stopPropagation();
        hover(true);
      }}
      onPointerOut={() => hover(false)}
    >
      {/* Back board, spine, pages. */}
      <mesh material={M.cloth} position={[0, BOARD / 2, 0]}>
        <boxGeometry args={[W, BOARD, D]} />
      </mesh>
      <mesh material={M.spine} position={[-W / 2 + 0.003, H / 2, 0]}>
        <boxGeometry args={[0.006, H, D]} />
      </mesh>
      <mesh material={M.pages} position={[0.002, BOARD + (H - 2 * BOARD) / 2, 0]}>
        <boxGeometry args={[W - 0.01, H - 2 * BOARD, D - 0.008]} />
      </mesh>
      {/* Front cover, hinged on the spine (left edge). */}
      <group ref={hinge} position={[-W / 2, H - BOARD / 2, 0]}>
        <mesh material={M.cover} position={[W / 2, 0, 0]}>
          <boxGeometry args={[W, BOARD, D]} />
        </mesh>
      </group>
      <object3D ref={anchor} position={[-W / 2, H, 0]} />
      {/* Ribbon bookmark hanging out of the front edge. */}
      <mesh material={M.ribbon} position={[0.03, 0.002, D / 2 + 0.018]} rotation={[-Math.PI / 2, 0, 0.15]}>
        <planeGeometry args={[0.012, 0.045]} />
      </mesh>
      <sprite ref={star} material={M.star} position={[0.03, 0.14, 0.02]} scale={0.075} />
      <HandHint position={[0.03, 0.215, 0.02]} scale={0.055} phase={0.66} hidden={() => open.current > 0.02} />
      <mesh material={M.hit} position={[0, 0.07, 0]}>
        <boxGeometry args={[0.24, 0.16, 0.28]} />
      </mesh>
    </group>
  );
}
