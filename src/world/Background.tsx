// The horizon: sky, the real mountains around the Copán valley (Copernicus DEM, 30 km) and
// Minecraft-style block clouds. They live in their own scene with a long-range camera that is
// drawn first; then the depth buffer is cleared and the world is drawn on top. That keeps
// depth precision for nearby blocks while showing mountains 15 km away.
import { use, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { shared } from "../voxel/material";
import { dayClock, skyTop } from "../game/time";
import { fulfilCapture } from "../game/camera";

interface Region {
  size: number;
  spacing: number;
  heights: Float32Array;
}

const regionPromise: Promise<Region | null> = (async () => {
  try {
    const base = import.meta.env.BASE_URL + "terrain/copan-region";
    const [m, b] = await Promise.all([fetch(base + ".json"), fetch(base + ".bin")]);
    if (!m.ok || !b.ok) return null;
    const meta = await m.json();
    const raw = new Uint16Array(await b.arrayBuffer());
    const range = meta.maxElevation - meta.minElevation;
    const heights = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) heights[i] = meta.minElevation + (raw[i] / 65535) * range - meta.datumElevation;
    return { size: meta.size, spacing: meta.spacingMeters, heights };
  } catch {
    return null;
  }
})();

function sample(r: Region, x: number, z: number) {
  const half = ((r.size - 1) * r.spacing) / 2;
  const fx = Math.min(r.size - 1.001, Math.max(0, (x + half) / r.spacing));
  const fz = Math.min(r.size - 1.001, Math.max(0, (z + half) / r.spacing));
  const c = Math.floor(fx);
  const w = Math.floor(fz);
  const tx = fx - c;
  const tz = fz - w;
  const i = w * r.size + c;
  const H = r.heights;
  return H[i] * (1 - tx) * (1 - tz) + H[i + 1] * tx * (1 - tz) + H[i + r.size] * (1 - tx) * tz + H[i + r.size + 1] * tx * tz;
}

/** Brightness of unlit backdrop surfaces (1 by day, dim at night). */
const lightU = { value: 1 };
const nightU = { value: 0 };
const venusU = { value: new THREE.Vector3(0, 1, 0) };

const hazeGLSL = /* glsl */ `
  uniform float light;
  uniform vec3 fogColor;
  uniform vec3 sunHaze;
  uniform float fogDist;
  uniform vec3 sunDirection;
  vec3 haze(vec3 c, float depth, vec3 worldPos) {
    vec3 v = normalize(worldPos - cameraPosition);
    float toSun = pow(max(dot(v, sunDirection), 0.0), 6.0);
    vec3 h = mix(fogColor, sunHaze, toSun * 0.65);
    return mix(c, h, 1.0 - exp(-depth / fogDist));
  }
`;

// ---------------------------------------------------------------- mountains

/**
 * Blocky mountains: columns of 100 m out to 4 km and 300 m out to 15 km, heights in 8 m
 * steps, colored by height and slope, skipping the 2 km square the world already covers.
 */
function buildMountains(r: Region) {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const STEP = 8;
  const rings = [
    { cell: 100, ext: 4000, hole: 1000 },
    { cell: 300, ext: 15000, hole: 4000 },
  ];
  const sstep = (a: number, b: number, v: number) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  // Framing (an artistic choice, not exact geography: see README, Horizon). Hills are close to the
  // north, but the Copán river valley runs east–west and stays low for 15+ km that way. So:
  //  - a ring of hills (value noise shaped into peaks and valleys, up to ~500 m, starting
  //    1.1–1.7 km out depending on direction, like the real hills to the north) is a minimum
  //    height all around;
  //  - real ridges past 1.2 km (except the northern hills) and the added hills are both held
  //    under a skyline limit that varies with direction (~1.5–5.5°), so the horizon rises and
  //    dips instead of forming an even wall;
  //  - beyond 2.5 km the real terrain is also squashed above ~2° over the horizon (shape kept,
  //    30 % of the excess), so the big ranges 8–15 km out read as a low far skyline behind
  //    the nearer peaks instead of an even line at the same height all around.
  const hash = (i: number, j: number) => {
    const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return h - Math.floor(h);
  };
  const vnoise = (x: number, z: number) => {
    const i = Math.floor(x);
    const j = Math.floor(z);
    const fx = x - i;
    const fz = z - j;
    const u = fx * fx * (3 - 2 * fx);
    const v = fz * fz * (3 - 2 * fz);
    const a = hash(i, j);
    const b = hash(i + 1, j);
    const c = hash(i, j + 1);
    const d = hash(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  /** tan of a skyline limit that varies around the park: lo° to lo+span° with direction. */
  const limit = (ux: number, uz: number, seed: number, lo: number, span: number) =>
    Math.tan(((lo + span * sstep(0.3, 0.7, vnoise(ux * 5 + seed, uz * 5 - seed * 0.7))) * Math.PI) / 180);
  const hills = (x: number, z: number) => {
    const d = Math.hypot(x, z);
    // Where the hills start varies around the park (1.1–1.7 km), so ridges stand at different
    // depths and overlap instead of forming one even line. Noise on the direction vector, so
    // there is no seam where the angle wraps.
    const ux = x / (d || 1);
    const uz = z / (d || 1);
    const start = 1100 + 600 * vnoise(ux * 1.6 + 5.3, uz * 1.6 + 2.1);
    const ring = sstep(start, start + 1200, d) * (1 - sstep(10000, 14000, d));
    if (ring <= 0) return -1e4;
    // Peaks and valleys: most ground stays low (pow), some rises into peaks; a broad mask makes
    // whole stretches lower so there are gaps and saddles to see through.
    const n = 0.6 * vnoise(x / 900 + 17.3, z / 900 - 4.1) + 0.4 * vnoise(x / 350 - 3.7, z / 350 + 9.2);
    const mask = vnoise(x / 2200 + 3.1, z / 2200 - 7.7);
    let h = ring * 650 * Math.pow(n, 1.5) * (0.25 + 1.0 * mask);
    // Never towering: above a limit that changes with direction (~1.3–5° over the horizon),
    // keep only a tenth of the extra height.
    const cap = 20 + d * limit(ux, uz, 3.7, 1.3, 3.7);
    if (h > cap) h = cap + (h - cap) * 0.1;
    return h;
  };
  const height = (x: number, z: number) => {
    const d = Math.hypot(x, z);
    let real = sample(r, x, z);
    // Real ridges past ~1.2 km (the long one to the south read as a wall): above a limit that
    // changes with direction (~1.4–5.6°), 85 % of the extra height goes, so the skyline rises
    // and dips. The northern hills (the view from the entrance) are left as they are.
    if (d > 1100) {
      const ux = x / d;
      const uz = z / d;
      const north = sstep(0.7, 0.92, -uz);
      const soft = 20 + d * limit(ux, uz, 11.3, 1.4, 4.2);
      const k = sstep(1100, 1500, d) * (1 - north);
      if (real > soft) real -= (real - soft) * 0.85 * k;
    }
    if (d > 2500) {
      const soft = 60 + d * 0.03;
      if (real > soft) real = soft + (real - soft) * 0.3;
    }
    return Math.round(Math.max(real, hills(x, z)) / STEP) * STEP;
  };
  /** Height of the column containing (x, z) in whichever ring owns it. */
  const colH = (x: number, z: number) => {
    const m = Math.max(Math.abs(x), Math.abs(z));
    const ring = m < 4000 ? rings[0] : rings[1];
    const cx = (Math.floor(x / ring.cell) + 0.5) * ring.cell;
    const cz = (Math.floor(z / ring.cell) + 0.5) * ring.cell;
    return m < 1000 ? -1e4 : height(cx, cz);
  };
  const grass = new THREE.Color("#68863c");
  const forest = new THREE.Color("#2d6a2c");
  const pine = new THREE.Color("#2a5a34");
  const rock = new THREE.Color("#8a7a62");
  const c = new THREE.Color();
  const quad = (p: number[][], shade: number, color: THREE.Color) => {
    const b = pos.length / 3;
    for (const v of p) {
      pos.push(v[0], v[1], v[2]);
      col.push(color.r * shade, color.g * shade, color.b * shade);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  for (const ring of rings) {
    for (let z0 = -ring.ext; z0 < ring.ext; z0 += ring.cell)
      for (let x0 = -ring.ext; x0 < ring.ext; x0 += ring.cell) {
        const x1 = x0 + ring.cell;
        const z1 = z0 + ring.cell;
        if (Math.max(Math.abs(x0 + ring.cell / 2), Math.abs(z0 + ring.cell / 2)) < ring.hole) continue;
        const h = height((x0 + x1) / 2, (z0 + z1) / 2);
        const nb = [colH(x1 + 1, (z0 + z1) / 2), colH(x0 - 1, (z0 + z1) / 2), colH((x0 + x1) / 2, z1 + 1), colH((x0 + x1) / 2, z0 - 1)];
        const steep = Math.max(...nb.map((v) => (v > -1e3 ? Math.abs(v - h) : 0))) / ring.cell;
        // Lower slopes grassy, then forest, then darker pine-oak forest; steep faces rocky.
        c.copy(h < 120 ? grass : h < 600 ? forest : pine);
        if (steep > 0.55) c.lerp(rock, 0.6);
        const tint = 0.92 + ((Math.sin(x0 * 0.013) + Math.cos(z0 * 0.017)) * 0.04);
        // Relief: tops facing the morning sun (east-southeast) are lighter, those facing away
        // darker, from the slope between neighbors, so ridges and valleys read at a distance.
        const e = nb[0] > -1e3 ? nb[0] : h;
        const w = nb[1] > -1e3 ? nb[1] : h;
        const so = nb[2] > -1e3 ? nb[2] : h;
        const no = nb[3] > -1e3 ? nb[3] : h;
        const gx = (e - w) / (2 * ring.cell);
        const gz = (so - no) / (2 * ring.cell);
        const lit = THREE.MathUtils.clamp(1 - (gx * 0.85 + gz * 0.45) * 1.6, 0.72, 1.18);
        quad([[x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0]], tint * lit, c);
        const side = c.clone().lerp(rock, 0.25);
        if (nb[0] < h) quad([[x1, nb[0], z1], [x1, nb[0], z0], [x1, h, z0], [x1, h, z1]], 0.78, side);
        if (nb[1] < h) quad([[x0, nb[1], z0], [x0, nb[1], z1], [x0, h, z1], [x0, h, z0]], 0.72, side);
        if (nb[2] < h) quad([[x0, nb[2], z1], [x1, nb[2], z1], [x1, h, z1], [x0, h, z1]], 0.82, side);
        if (nb[3] < h) quad([[x1, nb[3], z0], [x0, nb[3], z0], [x0, h, z0], [x1, h, z0]], 0.68, side);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

const mountainMaterial = () =>
  new THREE.ShaderMaterial({
    vertexColors: true,
    uniforms: {
      light: lightU,
      fogColor: shared.fogColor,
      sunHaze: shared.sunHaze,
      fogDist: shared.fogDist,
      sunDirection: shared.sunDirection,
    },
    vertexShader: /* glsl */ `
      varying vec3 vColor;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vColor = color;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mv = viewMatrix * w;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${hazeGLSL}
      varying vec3 vColor;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        // Far ridges go bluer and paler (aerial perspective), like a painted backdrop. Nearby
        // hills get about half the world's haze per km so they stay readable; past ~4 km it
        // builds back up so the far skyline melts into the sky (~30 % at 3 km, ~75 % at 8 km,
        // ~95 % at 14 km, normal quality).
        float k = mix(0.35, 1.3, smoothstep(4000.0, 11000.0, vDepth));
        gl_FragColor = vec4(haze(vColor * light, vDepth * k, vWorld), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

// ---------------------------------------------------------------- clouds

/** Minecraft-like cloud layer: 20 m cells, 5 m thick, flat-shaded, slightly see-through. */
function buildClouds() {
  const CELL = 20;
  const N = 200; // 4 km square
  const ALT = 170;
  const T = 5;
  // Value-noise blobs.
  const rnd = (x: number, z: number) => {
    let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const noise = (x: number, z: number) => {
    const xi = Math.floor(x), zi = Math.floor(z);
    const tx = x - xi, tz = z - zi;
    const a = rnd(xi, zi), b = rnd(xi + 1, zi), c = rnd(xi, zi + 1), d = rnd(xi + 1, zi + 1);
    const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
    return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
  };
  const solid = new Uint8Array(N * N);
  for (let z = 0; z < N; z++)
    for (let x = 0; x < N; x++) solid[z * N + x] = noise(x / 7, z / 7) * 0.7 + noise(x / 2.5, z / 2.5) * 0.3 > 0.6 ? 1 : 0;
  const at = (x: number, z: number) => (x < 0 || z < 0 || x >= N || z >= N ? 0 : solid[z * N + x]);
  const pos: number[] = [];
  const shade: number[] = [];
  const idx: number[] = [];
  const o = (-N * CELL) / 2;
  const quad = (p: number[][], s: number) => {
    const b = pos.length / 3;
    for (const v of p) {
      pos.push(v[0], v[1], v[2]);
      shade.push(s);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  for (let z = 0; z < N; z++) {
    // Tops and bottoms merged into runs along x.
    let x = 0;
    while (x < N) {
      if (!at(x, z)) {
        x++;
        continue;
      }
      let e = x;
      while (e < N && at(e, z)) e++;
      const x0 = o + x * CELL, x1 = o + e * CELL, z0 = o + z * CELL, z1 = z0 + CELL;
      quad([[x0, ALT + T, z1], [x1, ALT + T, z1], [x1, ALT + T, z0], [x0, ALT + T, z0]], 1.0);
      quad([[x0, ALT, z0], [x1, ALT, z0], [x1, ALT, z1], [x0, ALT, z1]], 0.78);
      x = e;
    }
    for (let x2 = 0; x2 < N; x2++) {
      if (!at(x2, z)) continue;
      const x0 = o + x2 * CELL, x1 = x0 + CELL, z0 = o + z * CELL, z1 = z0 + CELL;
      if (!at(x2 + 1, z)) quad([[x1, ALT, z1], [x1, ALT, z0], [x1, ALT + T, z0], [x1, ALT + T, z1]], 0.9);
      if (!at(x2 - 1, z)) quad([[x0, ALT, z0], [x0, ALT, z1], [x0, ALT + T, z1], [x0, ALT + T, z0]], 0.86);
      if (!at(x2, z + 1)) quad([[x0, ALT, z1], [x1, ALT, z1], [x1, ALT + T, z1], [x0, ALT + T, z1]], 0.92);
      if (!at(x2, z - 1)) quad([[x1, ALT, z0], [x0, ALT, z0], [x0, ALT + T, z0], [x1, ALT + T, z0]], 0.84);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("shade", new THREE.Float32BufferAttribute(shade, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

const cloudMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      light: lightU,
      fogColor: shared.fogColor,
      sunHaze: shared.sunHaze,
      fogDist: shared.fogDist,
      sunDirection: shared.sunDirection,
    },
    vertexShader: /* glsl */ `
      attribute float shade;
      varying float vShade;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vShade = shade;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mv = viewMatrix * w;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${hazeGLSL}
      varying float vShade;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vec3 c = mix(fogColor, vec3(1.0), light) * vShade * (0.35 + 0.65 * light);
        c = haze(c, vDepth * 0.6, vWorld);
        float fade = 1.0 - smoothstep(1500.0, 2000.0, length(vWorld.xz - cameraPosition.xz));
        gl_FragColor = vec4(c, 0.86 * fade);
        #include <colorspace_fragment>
      }
    `,
  });

// ---------------------------------------------------------------- sky

const skyMaterial = () =>
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: skyTop },
      horizon: { value: shared.fogColor.value },
      sunHaze: shared.sunHaze,
      sunDirection: shared.sunDirection,
      night: nightU,
      venus: venusU,
      sunReal: { value: new THREE.Vector3() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 horizon;
      uniform vec3 sunHaze;
      uniform vec3 sunDirection;
      uniform float night;
      uniform vec3 venus;
      uniform vec3 sunReal;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        // Clean blue overhead, pale near the horizon (like a block-game sky).
        vec3 col = mix(horizon, top, pow(h, 0.45));
        float s = max(dot(d, sunDirection), 0.0);
        col = mix(col, sunHaze, pow(s, 5.0) * 0.55 * (1.0 - h * 0.6));
        col += vec3(1.0, 0.9, 0.7) * pow(s, 60.0) * 0.4;
        // Square sun (by day) or square moon (by night, opposite the sun).
        vec3 q = d - sunDirection;
        float disc = step(max(abs(q.x), max(abs(q.y), abs(q.z))), night > 0.5 ? 0.025 : 0.035);
        col = mix(col, night > 0.5 ? vec3(0.92, 0.94, 1.0) : vec3(1.0, 0.98, 0.88), disc);
        // Stars and Venus — the Maya tracked Venus very carefully.
        if (night > 0.01 && d.y > 0.0) {
          vec3 p = floor(d * 380.0);
          float h = fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          col += vec3(0.9, 0.95, 1.0) * night * smoothstep(0.9965, 1.0, h) * 1.4;
          vec3 qv = d - venus;
          col = mix(col, vec3(1.0, 0.97, 0.85), night * step(max(abs(qv.x), max(abs(qv.y), abs(qv.z))), 0.006));
        }
        if (d.y < 0.0) col = horizon;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

/**
 * Renders the background scene, clears depth, then renders the world.
 * Takes over R3F's render loop (useFrame priority 1).
 */
export function Background() {
  const region = use(regionPromise);
  const { scene, camera, mountains, clouds, sky } = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 20, 40000);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), skyMaterial());
    sky.frustumCulled = false;
    scene.add(sky);
    const mountains = region ? new THREE.Mesh(buildMountains(region), mountainMaterial()) : null;
    if (mountains) scene.add(mountains);
    const clouds = new THREE.Mesh(buildClouds(), cloudMaterial());
    clouds.frustumCulled = false;
    scene.add(clouds);
    return { scene, camera, mountains, clouds, sky };
  }, [region]);

  useFrame((state, delta) => {
    const { gl, camera: main } = state;
    const cam = main as THREE.PerspectiveCamera;
    camera.position.copy(cam.position);
    camera.quaternion.copy(cam.quaternion);
    if (camera.fov !== cam.fov || camera.aspect !== cam.aspect) {
      camera.fov = cam.fov;
      camera.aspect = cam.aspect;
      camera.updateProjectionMatrix();
    }
    sky.position.copy(cam.position);
    lightU.value = 0.22 + dayClock.daylight * 0.78;
    nightU.value = dayClock.night;
    // Venus sits ~40° from the sun along its path: the evening/morning star.
    const ang = (dayClock.t - 0.25) * Math.PI * 2 + (dayClock.t > 0.5 ? 0.7 : -0.7);
    venusU.value.set(Math.cos(ang), Math.sin(ang), 0.32).normalize();
    // Clouds drift slowly with the wind and stay centered around the player.
    const t = shared.time.value;
    clouds.position.set(Math.sin(t * 0.0005) * 1200, 0, Math.cos(t * 0.0004) * 300);
    void delta;
    void mountains;
    gl.autoClear = false;
    gl.clear();
    gl.render(scene, camera);
    gl.clearDepth();
    gl.render(state.scene, cam);
    fulfilCapture(gl.domElement);
  }, 1);
  return null;
}
