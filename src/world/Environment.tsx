import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { TERRAIN_SCULPT } from "./siteData";
import { shared, createWaterMaterial } from "../voxel/material";
import { createWaterTexture, rng } from "../voxel/textures";
import { playerState } from "../player/playerState";
import { useQualityLevel } from "../state/useGame";

export const SKY = "#cdd6f2";

/**
 * Painted cumulus clouds in a cylindrical strip (azimuth × elevation), generated once:
 * soft fbm blobs with toon-style bands — bright lit tops, lavender shaded bellies.
 */
function cloudTexture() {
  const W = 1024;
  const H = 256;
  const r = rng(42);
  const grid = 64;
  const g = new Float32Array((grid + 1) * (grid + 1)).map(() => r());
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x) % grid;
    const yi = Math.floor(y) % grid;
    const tx = x - Math.floor(x);
    const ty = y - Math.floor(y);
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const at = (a: number, b: number) => g[((b + grid) % grid) * (grid + 1) + ((a + grid) % grid)];
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const fbm = (x: number, y: number) => noise(x, y) * 0.55 + noise(x * 2, y * 2) * 0.28 + noise(x * 4, y * 4) * 0.17;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const e = 1 - y / H; // 0 = horizon, 1 = top of strip
      const band = Math.exp(-((e - 0.28) ** 2) / 0.045); // clouds hug the lower sky
      const n = fbm((x / W) * 24, (y / H) * 5) * band;
      const lit = fbm((x / W) * 24, ((y - 6) / H) * 5) * band; // sampled higher → light from above
      let a = 0;
      let c = [255, 255, 255];
      if (n > 0.36) {
        a = Math.min(1, (n - 0.36) * 9);
        const shadeAmt = Math.max(0, n - lit) * 9;
        c = shadeAmt > 0.5 ? [196, 186, 226] : shadeAmt > 0.2 ? [226, 220, 244] : [255, 252, 248];
      }
      const i = (y * W + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = a * 255;
    }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;
const skyFragment = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 top;
  uniform vec3 mid;
  uniform vec3 horizon;
  uniform vec3 sunDirection;
  uniform sampler2D clouds;
  uniform float time;
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 col = h < 0.25 ? mix(horizon, mid, smoothstep(0.0, 0.25, h)) : mix(mid, top, smoothstep(0.25, 0.9, h));
    // Sun glow and a crisp square sun.
    float s = max(dot(d, sunDirection), 0.0);
    col += vec3(1.0, 0.86, 0.66) * pow(s, 18.0) * 0.35;
    vec3 q = d - sunDirection;
    col = mix(col, vec3(1.0, 0.98, 0.9), step(max(abs(q.x), max(abs(q.y), abs(q.z))), 0.04));
    // Painted clouds: strip from the horizon up to ~60°.
    float az = atan(d.z, d.x) / 6.28318 + 0.5 + time * 0.0015;
    float el = asin(clamp(d.y, 0.0, 1.0)) / 1.05;
    if (el < 1.0 && d.y > -0.02) {
      vec4 c = texture2D(clouds, vec2(az, el));
      col = mix(col, c.rgb, c.a * smoothstep(0.0, 0.05, d.y + 0.02));
    }
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          top: { value: new THREE.Color("#5f8fe0") },
          mid: { value: new THREE.Color("#93b4ee") },
          horizon: { value: new THREE.Color(SKY) },
          sunDirection: shared.sunDirection,
          time: shared.time,
          clouds: { value: cloudTexture() },
        },
      }),
    [],
  );
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[100, 32, 16]} />
    </mesh>
  );
}

function River() {
  const r = TERRAIN_SCULPT[0];
  const material = useMemo(() => createWaterMaterial(createWaterTexture()), []);
  return (
    <mesh
      position={[(r.minX + r.maxX) / 2, r.y + 0.6, (r.minZ + r.maxZ) / 2]}
      rotation-x={-Math.PI / 2}
      material={material}
    >
      <planeGeometry args={[r.maxX - r.minX + 60, r.maxZ - r.minZ + 60]} />
    </mesh>
  );
}

/** Sun that follows the player so its shadow map always covers what you see. */
function Sun() {
  const level = useQualityLevel();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const light = useRef<THREE.DirectionalLight>(null);
  const shadows = level !== "low";

  useEffect(() => {
    gl.shadowMap.enabled = shadows;
    gl.shadowMap.type = THREE.PCFShadowMap;
    // Materials must recompile when shadows turn on/off.
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.needsUpdate = true;
    });
  }, [gl, scene, shadows]);

  useEffect(() => {
    const l = light.current;
    if (!l) return;
    scene.add(l.target);
    const cam = l.shadow.camera;
    cam.left = -55;
    cam.right = 55;
    cam.top = 55;
    cam.bottom = -55;
    cam.near = 1;
    cam.far = 260;
    cam.updateProjectionMatrix();
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.04;
    return () => {
      scene.remove(l.target);
    };
  }, [scene]);

  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const p = playerState.position;
    // Snap to shadow texels to avoid shimmering while walking.
    const snap = 110 / 2048;
    const tx = Math.round(p.x / snap) * snap;
    const tz = Math.round(p.z / snap) * snap;
    const d = shared.sunDirection.value;
    l.target.position.set(tx, p.y, tz);
    l.position.set(tx + d.x * 120, p.y + d.y * 120, tz + d.z * 120);
  });

  return <directionalLight ref={light} castShadow={shadows} intensity={0} />;
}

/** Sky, sun (shadows), water. The block shaders do their own lighting from `shared`. */
export function Environment() {
  return (
    <>
      <Sky />
      <Sun />
      <River />
      <hemisphereLight args={["#e8f2ff", "#6b5a3a", 1.4]} />
      <directionalLight position={[-120, 200, 100]} intensity={1.6} color="#fff1d6" />
    </>
  );
}
