// A floating trowel over every excavation square that hasn't been dug yet, so the dig sites read
// as something to interact with (styled like the golden diamonds over the points of interest:
// flat, unlit colors). It points down at the square, spins and bobs; once the square is dug,
// its marker disappears.
import { use, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { terrainPromise } from "../world/Terrain";
import { sampleHeight } from "../world/terrainData";
import { REGION } from "../voxel/voxelWorld";
import { BLOCK } from "../voxel/blocks";
import { DIG_SITES } from "./gameData";
import { useProgress } from "../state/progress";

/** Kite-shaped trowel blade, tip at −y (pointing down at the square). */
function bladeGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.42);
  s.lineTo(0.2, 0.0);
  s.lineTo(0.17, 0.2);
  s.lineTo(-0.17, 0.2);
  s.lineTo(-0.2, 0.0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false });
  g.translate(0, 0, -0.025);
  return g;
}

const blade = bladeGeometry();
const ridge = new THREE.BoxGeometry(0.03, 0.5, 0.07);
const shank = new THREE.BoxGeometry(0.05, 0.16, 0.05);
const handle = new THREE.CylinderGeometry(0.055, 0.06, 0.36, 8);
const gold = new THREE.MeshBasicMaterial({ color: "#f2c14e" });
const goldDark = new THREE.MeshBasicMaterial({ color: "#b8862a" });
const wood = new THREE.MeshBasicMaterial({ color: "#8a5a33" });

export function DigMarkers() {
  const grid = use(terrainPromise);
  const dug = useProgress((s) => s.dug);
  const sites = useMemo(
    () =>
      DIG_SITES.map((s) => ({
        ...s,
        y: Math.round((sampleHeight(grid, s.at[0], s.at[1]) - REGION.minY) / BLOCK) * BLOCK + REGION.minY,
      })),
    [grid],
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    sites.forEach((s, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.rotation.y = t * 1.2 + i;
      g.position.y = s.y + 2.1 + Math.sin(t * 2 + i) * 0.15;
    });
  });
  return (
    <>
      {sites.map((s, i) =>
        dug.includes(s.id) ? null : (
          <group key={s.id} ref={(g) => void (refs.current[i] = g)} position={[s.at[0], s.y + 2.1, s.at[1]]} scale={1.35}>
            <mesh geometry={blade} material={gold} />
            <mesh geometry={ridge} material={goldDark} position={[0, -0.06, 0]} />
            <mesh geometry={shank} material={goldDark} position={[0, 0.27, 0]} />
            <mesh geometry={handle} material={wood} position={[0, 0.52, 0]} />
          </group>
        ),
      )}
    </>
  );
}
