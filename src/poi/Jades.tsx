import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { JADES } from "../world/villageData";
import { moundTop } from "../world/ladders";
import { buildPixelModel, hex, solid, type FaceName } from "../voxel/pixelModel";
import type { Tile } from "../voxel/textures";
import { playerState } from "../player/playerState";
import { useGame } from "../state/useGame";
import { getT } from "../i18n";

function jadeModel() {
  const JADE = hex("#2fae6e");
  const LIGHT = hex("#8fe0b0");
  const DARK = hex("#1b7a4a");
  const paint = (t: Tile, f: FaceName) => {
    solid(t, JADE, 0.1, 41);
    for (let x = 0; x < t.w; x++) {
      t.set(x, 0, LIGHT);
      t.set(x, t.h - 1, DARK);
    }
    if (f !== "top" && f !== "bottom") {
      t.set(1, 1, LIGHT);
      t.set(2, 1, LIGHT);
      t.set(Math.floor(t.w / 2), Math.floor(t.h / 2), DARK); // drill hole
    }
  };
  return buildPixelModel([{ size: [0.32, 0.32, 0.32], paint }]);
}

/** Hidden jade beads to collect (saved between visits). */
export function Jades() {
  const model = useMemo(jadeModel, []);
  const collected = useGame((s) => s.jades);
  const items = useMemo(
    () =>
      JADES.map((j) => ({
        id: j.id,
        pos: new THREE.Vector3(j.at[0], (j.mound ? moundTop(j.mound) : 0) + 0.9, j.at[1]),
      })),
    [],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const p = playerState.position;
    items.forEach((it, i) => {
      const m = refs.current[i];
      if (!m) return;
      m.rotation.y = clock.elapsedTime * 1.5 + i;
      m.rotation.x = 0.6;
      m.position.y = it.pos.y + Math.sin(clock.elapsedTime * 2 + i) * 0.12;
      if (m.visible && Math.hypot(p.x - it.pos.x, p.z - it.pos.z) < 1.3 && Math.abs(p.y - it.pos.y) < 1.8) {
        const g = useGame.getState();
        g.collectJade(it.id);
        const n = useGame.getState().jades.length;
        const t = getT();
        g.showToast(n >= JADES.length ? t("jade.all") : `${t("jade.found")} ${n}/${JADES.length}`);
      }
    });
  });
  return (
    <>
      {items.map((it, i) =>
        collected.includes(it.id) ? null : (
          <mesh
            key={it.id}
            ref={(m) => void (refs.current[i] = m)}
            geometry={model.geometries[0]}
            material={model.material}
            position={it.pos}
            castShadow
          />
        ),
      )}
    </>
  );
}
