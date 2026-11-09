// Soft blob shadow for characters and animals (they don't cast into the cached shadow map).
import * as THREE from "three";

let tex: THREE.Texture | null = null;
function texture() {
  if (tex) return tex;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(0,0,0,0.5)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  tex = new THREE.CanvasTexture(c);
  return tex;
}

const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
let mat: THREE.MeshBasicMaterial | null = null;

export function Blob({ size = 0.9, y = 0.04 }: { size?: number; y?: number }) {
  if (!mat) mat = new THREE.MeshBasicMaterial({ map: texture(), transparent: true, depthWrite: false });
  return <mesh geometry={geo} material={mat} position={[0, y, 0]} scale={[size, 1, size]} renderOrder={1} />;
}
