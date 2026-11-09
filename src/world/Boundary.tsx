import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { ARRIVAL, BOUNDS, EXTRA_WALLS } from "./siteData";

const WALL_H = 60;

/** Invisible walls around the playable area, plus the arrival area outside the entrance gate. */
export function Boundary() {
  const { minX, maxX, minZ, maxZ } = BOUNDS;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const hx = (maxX - minX) / 2;
  const hz = (maxZ - minZ) / 2;
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[hx + 1, WALL_H, 0.5]} position={[cx, 0, minZ - 0.5]} />
      <CuboidCollider args={[hx + 1, WALL_H, 0.5]} position={[cx, 0, maxZ + 0.5]} />
      {/* West wall, open at the entrance gate. */}
      {(() => {
        const s0 = minZ - 1;
        const s1 = ARRIVAL.gateZ0;
        const n0 = ARRIVAL.gateZ1;
        const n1 = maxZ + 1;
        return (
          <>
            <CuboidCollider args={[0.5, WALL_H, (s1 - s0) / 2]} position={[minX - 0.5, 0, (s0 + s1) / 2]} />
            <CuboidCollider args={[0.5, WALL_H, (n1 - n0) / 2]} position={[minX - 0.5, 0, (n0 + n1) / 2]} />
          </>
        );
      })()}
      {/* Arrival area outside the gate: closed north, south and west. */}
      <CuboidCollider args={[(minX - ARRIVAL.minX) / 2 + 0.5, WALL_H, 0.5]} position={[(minX + ARRIVAL.minX) / 2, 0, ARRIVAL.minZ - 0.5]} />
      <CuboidCollider args={[(minX - ARRIVAL.minX) / 2 + 0.5, WALL_H, 0.5]} position={[(minX + ARRIVAL.minX) / 2, 0, ARRIVAL.maxZ + 0.5]} />
      <CuboidCollider args={[0.5, WALL_H, (ARRIVAL.maxZ - ARRIVAL.minZ) / 2 + 1]} position={[ARRIVAL.minX - 0.5, 0, (ARRIVAL.minZ + ARRIVAL.maxZ) / 2]} />
      <CuboidCollider args={[0.5, WALL_H, hz + 1]} position={[maxX + 0.5, 0, cz]} />
      {EXTRA_WALLS.map(([x, z, w, d], i) => (
        <CuboidCollider key={i} args={[w / 2, WALL_H, d / 2]} position={[x, 0, z]} />
      ))}
    </RigidBody>
  );
}
