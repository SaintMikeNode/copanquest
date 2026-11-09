// Small ambient life around the player: butterflies and drifting pollen in the sunlight.
// Both are single instanced draws that follow the player, so the cost is constant.
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { playerState } from "../player/playerState";
import { useQualityLevel } from "../state/useGame";

const BUTTERFLY_COLORS = ["#f2c42c", "#ff8a3d", "#6a7fe0", "#f4f1e8", "#e86aa4", "#58c4e8"];

function wingTexture() {
  // 8 × 8 pixel wing pair (left half mirrored) with dark edges.
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 8;
  const g = c.getContext("2d")!;
  const rows = ["..XX..XX", ".XooX.Xo", "XoooXXoo", "XoooooXo", ".XoooXX.", "..XooX..", "...XX...", "........"];
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (ch === ".") return;
      g.fillStyle = ch === "X" ? "#2a1a12" : "#ffffff";
      g.fillRect(x, y, 1, 1);
    }),
  );
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Butterflies({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geo, mat, seeds } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.25, 0.25);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: wingTexture(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    const seeds = Array.from({ length: count }, (_, i) => ({
      ox: (Math.random() - 0.5) * 40,
      oz: (Math.random() - 0.5) * 40,
      ph: Math.random() * 100,
      sp: 0.4 + Math.random() * 0.4,
      color: new THREE.Color(BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length]),
    }));
    return { geo, mat, seeds };
  }, [count]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const anchor = useRef(new THREE.Vector3());
  const colored = useRef(false);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    // Re-anchor the swarm when the player wanders off, so there are always some nearby.
    if (anchor.current.distanceTo(playerState.position) > 25) anchor.current.copy(playerState.position);
    const paint = !colored.current;
    colored.current = true;
    seeds.forEach((b, i) => {
      if (paint) mesh.setColorAt(i, b.color);
      const a = b.ph + t * b.sp;
      p.set(
        anchor.current.x + b.ox + Math.sin(a * 0.7) * 3 + Math.sin(a * 2.3) * 0.6,
        anchor.current.y + 0.6 + Math.abs(Math.sin(a * 1.7)) * 1.2,
        anchor.current.z + b.oz + Math.cos(a * 0.5) * 3,
      );
      const flap = 0.25 + Math.abs(Math.sin(t * 14 + b.ph)) * 0.75;
      e.set(0, a * 0.7, 0);
      q.setFromEuler(e);
      s.set(flap, 1, 1);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (paint && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
      mat.needsUpdate = true;
    }
  });
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />;
}

function Pollen({ count }: { count: number }) {
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { time: { value: 0 }, center: { value: new THREE.Vector3() } },
      vertexShader: /* glsl */ `
        uniform float time;
        uniform vec3 center;
        varying float vA;
        void main() {
          vec3 p = position;
          p.x += sin(time * 0.3 + p.z) * 1.5 + time * 0.4;
          p.y += sin(time * 0.5 + p.x * 0.7) * 0.6;
          p.z += cos(time * 0.27 + p.x) * 1.5;
          // Wrap into a 40 m box around the player.
          p.xz = mod(p.xz - center.xz + 20.0, 40.0) - 20.0 + center.xz;
          p.y += center.y;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = 0.5 + 0.5 * sin(time * 2.0 + position.x * 3.0);
          gl_PointSize = clamp(60.0 / -mv.z, 1.5, 4.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          gl_FragColor = vec4(1.0, 0.96, 0.78, 0.55 * vA);
        }
      `,
    });
    return { geo, mat };
  }, [count]);
  useFrame(({ clock }) => {
    mat.uniforms.time.value = clock.elapsedTime;
    mat.uniforms.center.value.copy(playerState.position);
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

export function Ambient() {
  const level = useQualityLevel();
  return (
    <>
      <Butterflies count={level === "low" ? 8 : 16} />
      <Pollen count={level === "low" ? 80 : 200} />
    </>
  );
}
