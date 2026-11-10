// Light shafts that make things to collect easy to spot from far away: every glow in the world
// is one instance of the same three crossed, additive quads (one draw call for all of them).
// Owners call `glow()` every frame for each thing that should shine; a glow that stops being
// reported disappears by itself.
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const MAX = 64;
/** Half-width of a shaft's quads in meters. */
const HALF = 0.7;

interface Source {
  x: number;
  y: number;
  z: number;
  height: number;
  color: THREE.Color;
  stamp: number;
}
const sources = new Map<string, Source>();
let frame = 0;

export const GLOW_GOLD = new THREE.Color("#ffd75e");
export const GLOW_JADE = new THREE.Color("#7dffb4");

/** Report a glow for this frame. (x, y, z) is the thing's center; `height` is the shaft's length in meters. */
export function glow(id: string, x: number, y: number, z: number, height = 3.2, color = GLOW_GOLD) {
  let s = sources.get(id);
  if (!s) sources.set(id, (s = { x, y, z, height, color, stamp: 0 }));
  s.x = x;
  s.y = y;
  s.z = z;
  s.height = height;
  s.color = color;
  s.stamp = frame;
}

function shaftGeometry() {
  const pos: number[] = [];
  const side: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    const dx = Math.cos(a) * HALF;
    const dz = Math.sin(a) * HALF;
    const o = i * 4;
    // y = 0 is half a meter below the thing, y = 1 the top of the shaft.
    pos.push(-dx, 0, -dz, dx, 0, dz, dx, 1, dz, -dx, 1, -dz);
    side.push(-1, 1, 1, -1);
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("side", new THREE.Float32BufferAttribute(side, 1));
  g.setIndex(idx);
  return g;
}

function shaftMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute float side;
      varying vec2 vAt;     // meters: across the quad, and up from its base
      varying float vUp;    // 0 at the base, 1 at the top
      varying vec3 vColor;
      varying float vPhase;
      void main() {
        float h = length(instanceMatrix[1].xyz);
        vAt = vec2(side * ${HALF.toFixed(2)}, position.y * h);
        vUp = position.y;
        vColor = instanceColor;
        vPhase = instanceMatrix[3].x + instanceMatrix[3].z;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      varying vec2 vAt;
      varying float vUp;
      varying vec3 vColor;
      varying float vPhase;
      void main() {
        float pulse = 0.8 + 0.2 * sin(time * 3.0 + vPhase);
        // Round halo around the thing (0.5 m above the base of the shaft).
        vec2 d = vAt - vec2(0.0, 0.5);
        float halo = exp(-dot(d, d) / 0.11) * 0.75;
        // Thin shaft of light fading out towards the top.
        float shaft = exp(-vAt.x * vAt.x / 0.012) * pow(1.0 - vUp, 1.6) * smoothstep(0.0, 0.25, vAt.y) * 0.55;
        float a = (halo + shaft) * pulse;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vColor * a, 1.0);
      }`,
  });
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** Draws every glow reported with `glow()`. Mount once, anywhere in the scene. */
export function Glows() {
  const geometry = useMemo(shaftGeometry, []);
  const material = useMemo(shaftMaterial, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  // After everything that reports glows this frame.
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    material.uniforms.time.value = clock.elapsedTime;
    let n = 0;
    for (const [id, g] of sources) {
      // Reported this frame or the last one (owners may run before or after this).
      if (g.stamp < frame - 1) {
        sources.delete(id);
        continue;
      }
      if (n >= MAX) break;
      q.setFromAxisAngle(UP, clock.elapsedTime * 0.4 + g.x);
      mesh.setMatrixAt(n, m.compose(p.set(g.x, g.y - 0.5, g.z), q, s.set(1, g.height, 1)));
      mesh.setColorAt(n, g.color);
      n++;
    }
    frame++;
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geometry, material, MAX]} frustumCulled={false} renderOrder={5} />;
}
