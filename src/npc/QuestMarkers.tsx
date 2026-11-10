// A floating pixel sign above every villager who has a mission:
//   gold "!"  a mission to give
//   gold "?"  the mission is finished: come back to hand it in
//   pale "?"  the mission is in progress
// Nothing once all their missions are done.
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../state/useGame";
import { useProgress } from "../state/progress";
import { questMarks, type QuestMark } from "../game/questLogic";
import { TALKERS } from "./npcData";

const EXCLAMATION = [".###.", ".###.", ".###.", ".###.", ".###.", "..#..", ".....", ".###.", ".###."];
const QUESTION = [".####.", "##..##", "##..##", "...##.", "..##..", "..##..", "......", "..##..", "..##.."];

/** Pixel glyph with a dark outline and a lighter top-left edge. */
function signTexture(rows: string[], fill: string, light: string) {
  const w = rows[0].length + 2;
  const h = rows.length + 2;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const on = (x: number, y: number) => rows[y]?.[x] === "#";
  g.fillStyle = "#3a1c0e";
  for (let y = -1; y <= rows.length; y++)
    for (let x = -1; x <= rows[0].length; x++) {
      let touch = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) touch ||= on(x + dx, y + dy);
      if (touch) g.fillRect(x + 1, y + 1, 1, 1);
    }
  for (let y = 0; y < rows.length; y++)
    for (let x = 0; x < rows[0].length; x++) {
      if (!on(x, y)) continue;
      g.fillStyle = !on(x - 1, y) || !on(x, y - 1) ? light : fill;
      g.fillRect(x + 1, y + 1, 1, 1);
    }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return { texture: t, aspect: w / h };
}

function signMaterials() {
  const make = (rows: string[], fill: string, light: string) => {
    const { texture, aspect } = signTexture(rows, fill, light);
    return { material: new THREE.SpriteMaterial({ map: texture, alphaTest: 0.5, fog: false }), aspect };
  };
  return {
    new: make(EXCLAMATION, "#f2c14e", "#fff0a8"),
    ready: make(QUESTION, "#f2c14e", "#fff0a8"),
    busy: make(QUESTION, "#cfc4a8", "#f1e8d2"),
  } satisfies Record<QuestMark, { material: THREE.SpriteMaterial; aspect: number }>;
}

/** Meters above the villager's feet (they are about 1.75 m tall with a headdress). */
const ABOVE = 2.3;
const SEEN_FROM = 110;

export function QuestMarkers({ positions }: { positions: Map<string, THREE.Vector3> }) {
  const signs = useMemo(signMaterials, []);
  const progress = useProgress();
  const marks = useMemo(questMarks, [progress]);
  const refs = useRef<Record<string, THREE.Sprite | null>>({});
  useFrame(({ camera, clock }) => {
    const talkingTo = useGame.getState().dialogue?.id;
    TALKERS.forEach((t, i) => {
      const sprite = refs.current[t.id];
      const at = positions.get(t.id);
      const mark = marks[t.id];
      if (!sprite) return;
      if (!at || !mark || talkingTo === t.id) {
        sprite.visible = false;
        return;
      }
      const y = at.y + ABOVE + Math.sin(clock.elapsedTime * 2.4 + i) * 0.08;
      sprite.position.set(at.x, y, at.z);
      const d = camera.position.distanceTo(sprite.position);
      sprite.visible = d < SEEN_FROM;
      // Grows with distance so it can still be read from across a plaza.
      const size = THREE.MathUtils.clamp(d * 0.035, 0.6, 2.2) * (mark === "busy" ? 0.8 : 1);
      sprite.scale.set(size * signs[mark].aspect, size, 1);
    });
  });
  return (
    <>
      {TALKERS.map((t) => {
        const mark = marks[t.id];
        return mark ? <sprite key={t.id} ref={(s) => void (refs.current[t.id] = s)} material={signs[mark].material} visible={false} /> : null;
      })}
    </>
  );
}
