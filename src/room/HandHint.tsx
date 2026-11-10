// A small pixel-art pointing hand (white glove, dark outline) that floats over the clickable
// things in the bedroom and taps down at them: the computer, the record player and the book.
// `hidden` is checked every frame (e.g. while the camera is zoomed in on that object).
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/**
 * The classic "pointing hand" cursor, drawn pixel by pixel and flipped to point down: the index
 * finger sits on the thumb side with the thumb next to it and the three other fingers folded on
 * the far side, so it can only read as pointing. # outline, o glove, y gold cuff, . clear.
 */
const HAND = [
  "......##........",
  ".....#oo#.......",
  ".....#oo#.......",
  ".....#oo#.......",
  ".....#oo#.......",
  ".....#oo###.....",
  ".....#oo#oo##...",
  ".....#oo#oo#o##.",
  ".##..#oo#oo#o#o#",
  "#oo#.#ooooooooo#",
  "#ooo##ooooooooo#",
  ".#ooo#ooooooooo#",
  "..#oooooooooooo#",
  "..#ooooooooooo#.",
  "...#oooooooooo#.",
  "...#ooooooooo#..",
  "....#oooooooo#..",
  "....#oooooooo#..",
  "....##########..",
  "....#yyyyyyyy#..",
  "....##########..",
];
const PX = 21;

function handTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = PX;
  const g = c.getContext("2d")!;
  const colors: Record<string, string> = { "#": "#2a1608", o: "#fff6e0", y: "#f2c14e" };
  HAND.forEach((row, r) => {
    const y = HAND.length - 1 - r; // flipped: the finger points down
    for (let x = 0; x < row.length; x++) {
      const col = colors[row[x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x + 2, y, 1, 1);
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let material: THREE.SpriteMaterial | null = null;
const handMaterial = () => (material ??= new THREE.SpriteMaterial({ map: handTexture(), transparent: true, depthWrite: false }));

export function HandHint({
  position,
  scale = 0.07,
  phase = 0,
  hidden,
}: {
  position: [number, number, number];
  scale?: number;
  /** Offsets the tapping so several hands don't move in step. */
  phase?: number;
  hidden?: () => boolean;
}) {
  const ref = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    const s = ref.current;
    if (!s) return;
    s.visible = !hidden?.();
    if (!s.visible) return;
    // Tap: a quick dip, a pause, again.
    const t = (clock.elapsedTime * 1.4 + phase) % 1;
    const dip = t < 0.35 ? Math.sin((t / 0.35) * Math.PI) : 0;
    s.position.y = position[1] - dip * scale * 0.35;
  });
  return <sprite ref={ref} material={handMaterial()} position={position} scale={scale} />;
}
