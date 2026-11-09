import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { BOUNDS, EXTRA_WALLS } from "./siteData";

const WALL_H = 60;

/** Invisible walls around the playable area. */
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
      <CuboidCollider args={[0.5, WALL_H, hz + 1]} position={[minX - 0.5, 0, cz]} />
      <CuboidCollider args={[0.5, WALL_H, hz + 1]} position={[maxX + 0.5, 0, cz]} />
      {EXTRA_WALLS.map(([x, z, w, d], i) => (
        <CuboidCollider key={i} args={[w / 2, WALL_H, d / 2]} position={[x, 0, z]} />
      ))}
    </RigidBody>
  );
}
