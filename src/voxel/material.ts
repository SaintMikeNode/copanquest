// Shaders for blocks, plants, carved monuments and water. They share one lighting model
// (sky/ground ambient + sun with real shadow maps + baked AO + fog + a vivid grade) so every
// surface looks like it belongs to the same world.
import * as THREE from "three";
import { L } from "./blocks";

/** Uniform objects shared by every material (update once, all materials follow). */
export const shared = {
  sunDirection: { value: new THREE.Vector3(-0.62, 0.58, 0.52).normalize() },
  sunColor: { value: new THREE.Color("#ffe6bf") },
  skyColor: { value: new THREE.Color("#b4cff7") },
  groundColor: { value: new THREE.Color("#8f8a6a") },
  /** Horizon haze (aerial perspective) and its warm tint toward the sun. */
  fogColor: { value: new THREE.Color("#c3d6f0") },
  sunHaze: { value: new THREE.Color("#ffdcae") },
  /** Distance at which ~63% of a surface's color has turned into haze. */
  fogDist: { value: 3200 },
  time: { value: 0 },
  /** Time lens: 0 = today, 1 = around AD 800. */
  lens: { value: 0 },
  /** Dark interiors (Rosalila chamber + tunnel) as min/max corners, and torch positions. */
  interiorAMin: { value: new THREE.Vector3() },
  interiorAMax: { value: new THREE.Vector3() },
  interiorBMin: { value: new THREE.Vector3() },
  interiorBMax: { value: new THREE.Vector3() },
  torches: { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, -999, 0)) },
};

const lightingPars = /* glsl */ `
  #include <common>
  #include <packing>
  #include <lights_pars_begin>
  #include <shadowmap_pars_fragment>
  #include <shadowmask_pars_fragment>
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform vec3 skyColor;
  uniform vec3 groundColor;
  uniform vec3 fogColor;
  uniform vec3 sunHaze;
  uniform float fogDist;
  uniform vec3 interiorAMin;
  uniform vec3 interiorAMax;
  uniform vec3 interiorBMin;
  uniform vec3 interiorBMax;
  uniform vec3 torches[8];
  uniform float time;

  float insideBox(vec3 p, vec3 mn, vec3 mx) {
    // Surfaces sit exactly on the box faces, so the dark zone extends a little past them.
    vec3 a = smoothstep(mn - 1.0, mn - 0.25, p) * (1.0 - smoothstep(mx + 0.25, mx + 1.0, p));
    return a.x * a.y * a.z;
  }
  /** 0 outdoors … 1 deep inside Rosalila's chamber or tunnel. */
  float interior(vec3 p) {
    return max(insideBox(p, interiorAMin, interiorAMax), insideBox(p, interiorBMin, interiorBMax));
  }
  /** Warm, flickering torchlight. */
  vec3 torchLight(vec3 p) {
    vec3 l = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      vec3 d = p - torches[i];
      float flick = 0.85 + 0.15 * sin(time * 13.0 + float(i) * 2.1) * sin(time * 7.3 + float(i));
      l += vec3(1.0, 0.62, 0.28) * flick / (1.0 + dot(d, d) * 0.22);
    }
    return l;
  }

  /** Aerial perspective shared by the world, the horizon mountains and the clouds. */
  vec3 haze(vec3 c, float depth, vec3 worldPos) {
    vec3 v = normalize(worldPos - cameraPosition);
    float toSun = pow(max(dot(v, sunDirection), 0.0), 6.0);
    vec3 h = mix(fogColor, sunHaze, toSun * 0.65);
    return mix(c, h, 1.0 - exp(-depth / fogDist));
  }

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }

  /** Light a texel. n = world normal, ao 0..1, depth = view distance. */
  vec3 shade(vec3 albedo, vec3 n, float ao, float depth, vec3 worldPos) {
    float shadow = getShadowMask();
    float face = n.y > 0.5 ? 1.0 : (n.y < -0.5 ? 0.6 : (abs(n.x) > 0.5 ? 0.88 : 0.8));
    vec3 hemi = mix(groundColor, skyColor, n.y * 0.5 + 0.5);
    float sun = max(dot(n, sunDirection), 0.0) * shadow;
    float occl = mix(0.38, 1.0, ao * ao);
    vec3 light = hemi * 0.58 * occl + sunColor * sun * mix(0.75, 1.0, ao) * 0.78;
    // Inside Rosalila's chamber: dark, lit by torches.
    float inner = interior(worldPos);
    if (inner > 0.0 || distance(worldPos, torches[0]) < 22.0) {
      light = mix(light, hemi * 0.06 * occl, inner) + torchLight(worldPos) * mix(0.35, 1.1, inner) * occl;
    }
    vec3 c = albedo * light * face;
    // Vivid grade: a touch more saturation and warmth.
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(l), c, 1.06) * vec3(1.03, 1.0, 0.97);
    return haze(c, depth, worldPos);
  }
`;

const shadowVertexPars = /* glsl */ `
  #include <common>
  #include <shadowmap_pars_vertex>
`;
/** Expects `worldPosition`, `mvPosition`, `transformedNormal` to be defined. */
const shadowVertex = /* glsl */ `
  #include <shadowmap_vertex>
`;

function makeUniforms(extra: Record<string, THREE.IUniform>) {
  return { ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...shared, ...extra };
}

// ------------------------------------------------------------------ blocks

const blockVertex = /* glsl */ `
  ${shadowVertexPars}
  attribute vec2 vdata; // x = texture layer (base), y = ambient occlusion
  uniform float time;
  uniform float leavesLayer;
  uniform float figLayer;
  varying vec2 vUv;
  varying float vLayer;
  varying float vAo;
  varying vec3 vNormal;
  varying float vDepth;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vLayer = vdata.x;
    vAo = vdata.y;
    vNormal = normal;
    vec3 transformedNormal = normalMatrix * normal;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    float lay = floor(vdata.x + 0.5);
    if (lay == leavesLayer || lay == figLayer) {
      // Leaves breathe in the wind.
      vec3 w = worldPosition.xyz;
      worldPosition.xyz += vec3(sin(time * 1.3 + w.x * 0.21 + w.y * 0.13), 0.0, cos(time * 1.1 + w.z * 0.19)) * 0.07;
    }
    vec4 mvPosition = viewMatrix * worldPosition;
    ${shadowVertex}
    vWorld = worldPosition.xyz;
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const blockFragment = /* glsl */ `
  precision highp sampler2DArray;
  ${lightingPars}
  uniform sampler2DArray atlas;
  uniform float variants;
  uniform float grassLayer;
  uniform float leavesLayer;
  uniform float figLayer;
  uniform float stoneFirst;
  uniform float stoneLast;
  uniform float pathLayer;
  uniform float lens;
  uniform vec4 core; // city core rect (minX, minZ, maxX, maxZ)
  varying vec2 vUv;
  varying float vLayer;
  varying float vAo;
  varying vec3 vNormal;
  varying float vDepth;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(vNormal);
    // Pick one of the hand-made variants per block (stable hash of the block cell).
    vec2 cell = floor(vUv + 0.0001);
    float h = hash12(cell + n.xz * 57.0 + n.y * 113.0);
    float layer = floor(vLayer + 0.5) * variants + floor(h * variants);
    vec4 tex = textureGrad(atlas, vec3(fract(vUv), layer), dFdx(vUv), dFdy(vUv));
    // Gentle large-scale color variation so lawns and walls never look flat.
    float v = vnoise(vWorld.xz * 0.045) * 0.6 + vnoise(vWorld.xz * 0.21) * 0.4;
    vec3 albedo = tex.rgb * (0.92 + v * 0.16);
    float base = floor(vLayer + 0.5);
    if (base == grassLayer && n.y > 0.5) {
      // Lawn: drifting patches of lush deep green and sunny yellow-green.
      float p = vnoise(vWorld.xz * 0.06 + 7.0) * 0.65 + vnoise(vWorld.xz * 0.018) * 0.35;
      vec3 lush = albedo * vec3(0.82, 0.95, 0.78);
      vec3 sunny = albedo * vec3(1.12, 1.08, 0.78);
      albedo = mix(lush, sunny, smoothstep(0.3, 0.75, p));
    } else if (base >= stoneFirst && base <= stoneLast) {
      // Weathered masonry: vertical rain streaks, moss blotches, damp greener base.
      float along = abs(n.x) > 0.5 ? vWorld.z : vWorld.x;
      float streak = vnoise(vec2(along * 1.3, vWorld.y * 0.08)) * vnoise(vec2(along * 0.31, 3.0));
      albedo *= 1.0 - smoothstep(0.25, 0.6, streak) * 0.22;
      float moss = vnoise(vec2(along * 0.25, vWorld.y * 0.35) + vWorld.xz * 0.05);
      vec3 mossCol = vec3(0.29, 0.40, 0.19);
      albedo = mix(albedo, mossCol * (0.8 + tex.g), smoothstep(0.66, 0.82, moss) * 0.55 * step(abs(n.y), 0.5));
      float baseBand = 1.0 - smoothstep(0.0, 1.6, fract(vWorld.y / 3.0) * 3.0);
      albedo *= mix(1.0, 0.9, baseBand * step(abs(n.y), 0.5));
    } else if (base == leavesLayer || base == figLayer) {
      // Each tree a slightly different green.
      float t = vnoise(floor(vWorld.xz / 6.0) * 0.9);
      albedo *= mix(vec3(0.9, 1.0, 0.85), vec3(1.08, 1.04, 0.9), t);
    }
    if (lens > 0.001) {
      // Time lens: Copán around AD 800 — red-painted stucco and cream plaster floors.
      bool inCore = vWorld.x > core.x && vWorld.z > core.y && vWorld.x < core.z && vWorld.z < core.w;
      float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
      vec3 past = albedo;
      if (base >= stoneFirst && base <= stoneLast) {
        past = n.y > 0.5 ? vec3(0.86, 0.80, 0.68) * (0.85 + lum * 0.3) : vec3(0.70, 0.22, 0.14) * (0.8 + lum * 0.45);
      } else if (inCore && ((base == grassLayer && n.y > 0.5) || base == pathLayer)) {
        past = vec3(0.86, 0.80, 0.68) * (0.9 + lum * 0.2);
      }
      albedo = mix(albedo, past, lens);
    }
    gl_FragColor = vec4(shade(albedo, n, vAo, vDepth, vWorld), 1.0);
    #include <colorspace_fragment>
  }
`;

export function createBlockMaterial(atlas: THREE.DataArrayTexture, variants: number) {
  const m = new THREE.ShaderMaterial({
    vertexShader: blockVertex,
    fragmentShader: blockFragment,
    lights: true,
    uniforms: makeUniforms({
      atlas: { value: null },
      variants: { value: variants },
      grassLayer: { value: L("grassTop") },
      leavesLayer: { value: L("leaves") },
      figLayer: { value: L("fig") },
      stoneFirst: { value: L("stone") },
      stoneLast: { value: L("rubble") },
      pathLayer: { value: L("path") },
      core: { value: new THREE.Vector4(-90, -50, 145, 380) },
    }),
  });
  m.uniforms.atlas.value = atlas;
  return m;
}

// ------------------------------------------------------------------ plants (instanced)

const plantVertex = /* glsl */ `
  ${shadowVertexPars}
  attribute vec4 inst; // xyz = base position, w = plant layer + 16 * rotation
  uniform float time;
  uniform vec3 viewerPos;
  uniform float drawDistance;
  varying vec2 vUv;
  varying float vLayer;
  varying float vDepth;
  varying float vFade;
  varying vec3 vWorld;
  void main() {
    float code = inst.w;
    float rot = floor(code / 16.0);
    vLayer = code - rot * 16.0;
    float a = rot * 0.785398 + 0.4;
    float c = cos(a), s = sin(a);
    vec3 p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
    // Wind: only the top of the sprite moves.
    float w = sin(time * 1.7 + inst.x * 0.37 + inst.z * 0.23) + 0.5 * sin(time * 3.1 + inst.x * 1.3);
    p.xz += vec2(0.06, 0.04) * w * uv.y;
    vec3 world = inst.xyz + p;
    float d = distance(world.xz, viewerPos.xz);
    vFade = 1.0 - smoothstep(drawDistance * 0.8, drawDistance, d);
    world.y -= (1.0 - vFade) * 1.2; // sink into the ground instead of popping
    vUv = uv;
    vec3 transformedNormal = normalMatrix * vec3(0.0, 1.0, 0.0);
    vec4 worldPosition = vec4(world, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;
    ${shadowVertex}
    vWorld = world;
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const plantFragment = /* glsl */ `
  precision highp sampler2DArray;
  ${lightingPars}
  uniform sampler2DArray plants;
  uniform float lens;
  varying vec2 vUv;
  varying float vLayer;
  varying float vDepth;
  varying float vFade;
  varying vec3 vWorld;
  void main() {
    vec4 tex = texture(plants, vec3(vUv, vLayer));
    if (tex.a < 0.5 || vFade <= 0.0) discard;
    // Time lens: the city core was paved and swept — wild plants fade away.
    if (lens > 0.0 && vWorld.x > -90.0 && vWorld.x < 145.0 && vWorld.z > -50.0 && vWorld.z < 380.0 && fract(sin(dot(floor(vWorld.xz * 2.0), vec2(12.9898, 78.233))) * 43758.5453) < lens) discard;
    // Darker near the ground, like the grass is shading itself.
    float ao = mix(0.45, 1.0, smoothstep(0.0, 0.7, vUv.y));
    gl_FragColor = vec4(shade(tex.rgb, vec3(0.0, 1.0, 0.0), ao, vDepth, vWorld), 1.0);
    #include <colorspace_fragment>
  }
`;

export function createPlantMaterial(plants: THREE.DataArrayTexture) {
  const m = new THREE.ShaderMaterial({
    vertexShader: plantVertex,
    fragmentShader: plantFragment,
    lights: true,
    side: THREE.DoubleSide,
    uniforms: makeUniforms({
      plants: { value: null },
      viewerPos: { value: new THREE.Vector3() },
      drawDistance: { value: 70 },
    }),
  });
  m.uniforms.plants.value = plants;
  return m;
}

// ------------------------------------------------------------------ monuments (2D pixel art)

const monumentVertex = /* glsl */ `
  ${shadowVertexPars}
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vDepth;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec3 transformedNormal = normalMatrix * normal;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;
    ${shadowVertex}
    vWorld = worldPosition.xyz;
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const monumentFragment = /* glsl */ `
  ${lightingPars}
  uniform sampler2D map;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vDepth;
  varying vec3 vWorld;
  void main() {
    vec4 tex = texture2D(map, vUv);
    gl_FragColor = vec4(shade(tex.rgb, normalize(vNormal), 1.0, vDepth, vWorld), 1.0);
    #include <colorspace_fragment>
  }
`;

export function createMonumentMaterial(map: THREE.Texture) {
  const m = new THREE.ShaderMaterial({
    vertexShader: monumentVertex,
    fragmentShader: monumentFragment,
    lights: true,
    uniforms: makeUniforms({ map: { value: null } }),
  });
  m.uniforms.map.value = map;
  return m;
}

// ------------------------------------------------------------------ water

const waterVertex = /* glsl */ `
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const waterFragment = /* glsl */ `
  precision highp sampler2DArray;
  uniform sampler2DArray water;
  uniform float time;
  uniform vec3 fogColor;
  uniform float fogDist;
  uniform vec3 skyColor;
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec2 uv = vWorld.xz / 0.5 + vec2(time * 0.25, time * 0.6);
    float frame = mod(floor(time * 5.0), 8.0);
    vec4 tex = textureGrad(water, vec3(fract(uv), frame), dFdx(uv), dFdy(uv));
    vec3 c = tex.rgb * 1.05 + skyColor * 0.06;
    c = mix(c, fogColor, 1.0 - exp(-vDepth / fogDist));
    gl_FragColor = vec4(c, 0.86);
    #include <colorspace_fragment>
  }
`;

export function createWaterMaterial(tex: THREE.DataArrayTexture) {
  const m = new THREE.ShaderMaterial({
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    transparent: true,
    uniforms: { ...shared, water: { value: null } },
  });
  m.uniforms.water.value = tex;
  return m;
}
