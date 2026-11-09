// Material for the landing room (an original late-90s / early-2000s bedroom), in a PS2-era
// look: moderate polygon counts, smooth per-pixel lighting from a small fixed light rig
// (warm desk lamp spot, late-afternoon sun through the window, CRT glow, lava lamp), soft
// distance haze and a light ordered dither (no banding in the dark gradients). Rendered at a
// reduced resolution and scaled up smoothly (Landing.tsx). Colors are handled in display
// (sRGB) space like the consoles of the time: textures are not linearized, no tone mapping.
// (Names keep the "psx" prefix from the first, PS1-style version.)
import * as THREE from "three";

/** Shared light rig (uniform objects are shared by every room material). */
export const psxLights = {
  uAmbient: { value: new THREE.Color("#6a5240") },
  // Desk lamp: a warm spot pointing down at the desk.
  uLampPos: { value: new THREE.Vector3() },
  uLampDir: { value: new THREE.Vector3(0, -1, 0) },
  uLampColor: { value: new THREE.Color("#ffb066").multiplyScalar(2.3) },
  uLampRange: { value: 3.6 },
  // Late-afternoon sun through the window in the back wall (direction the light travels).
  uSunDir: { value: new THREE.Vector3(-0.35, -0.55, 0.76).normalize() },
  uSunColor: { value: new THREE.Color("#ffa862").multiplyScalar(0.95) },
  // CRT glow and lava lamp: small point lights.
  uScreenPos: { value: new THREE.Vector3() },
  uScreenColor: { value: new THREE.Color("#5fd0a0").multiplyScalar(0.55) },
  uLavaPos: { value: new THREE.Vector3() },
  uLavaColor: { value: new THREE.Color("#ff6a2a").multiplyScalar(0.5) },
  /** Kept for the PS1 variant; unused now. */
  uSnap: { value: new THREE.Vector2(320, 240) },
};

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    vec4 clip = projectionMatrix * viewMatrix * world;
    vDepth = clip.w;
    gl_Position = clip;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D map;
  uniform float uHasMap;
  uniform vec3 uColor;
  uniform vec3 uEmissive;
  uniform float uOpacity;
  uniform float uUnlit;
  uniform float uSunlit;
  uniform vec3 uAmbient;
  uniform vec3 uLampPos;
  uniform vec3 uLampDir;
  uniform vec3 uLampColor;
  uniform float uLampRange;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uScreenPos;
  uniform vec3 uScreenColor;
  uniform vec3 uLavaPos;
  uniform vec3 uLavaColor;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;

  vec3 pointLight(vec3 p, vec3 n, vec3 lp, vec3 col, float range) {
    vec3 d = lp - p;
    float dist = length(d);
    float att = clamp(1.0 - dist / range, 0.0, 1.0);
    return col * max(dot(n, d / dist), 0.0) * att * att;
  }

  float bayer(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    return float(m[x + y * 4]) / 16.0 - 0.5;
  }

  void main() {
    vec4 tex = uHasMap > 0.5 ? texture2D(map, vUv) : vec4(1.0);
    if (tex.a < 0.5) discard;
    vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 light = uAmbient;
    vec3 toLamp = uLampPos - vWorld;
    float dl = length(toLamp);
    float cone = smoothstep(0.55, 0.88, dot(-toLamp / dl, uLampDir));
    float att = clamp(1.0 - dl / uLampRange, 0.0, 1.0);
    light += uLampColor * max(dot(n, toLamp / dl), 0.0) * att * att * (0.22 + 0.78 * cone);
    light += uSunColor * max(dot(n, -uSunDir), 0.0) * uSunlit;
    light += pointLight(vWorld, n, uScreenPos, uScreenColor, 1.6);
    light += pointLight(vWorld, n, uLavaPos, uLavaColor, 1.4);
    light = mix(light, vec3(1.0), uUnlit);
    vec3 c = tex.rgb * uColor * light + uEmissive;
    float fog = clamp((vDepth - 3.5) / 4.0, 0.0, 1.0);
    c = mix(c, vec3(0.08, 0.05, 0.04), fog);
    // Light dither so the dark gradients don't band.
    c += bayer(gl_FragCoord.xy) / 255.0 * 1.5;
    gl_FragColor = vec4(c, uOpacity);
  }
`;

export interface PsxOptions {
  map?: THREE.Texture | null;
  color?: THREE.ColorRepresentation;
  emissive?: THREE.ColorRepresentation;
  /** Full brightness, no lighting (screens, the view outside, bulbs). */
  unlit?: boolean;
  /** Receives the window sun (off for things the sun can't reach). Default on. */
  sunlit?: boolean;
  side?: THREE.Side;
  opacity?: number;
}

export function psxMaterial(o: PsxOptions = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    side: o.side ?? THREE.FrontSide,
    transparent: (o.opacity ?? 1) < 1,
    uniforms: {
      ...psxLights,
      map: { value: o.map ?? null },
      uHasMap: { value: o.map ? 1 : 0 },
      uColor: { value: new THREE.Color(o.color ?? "#ffffff") },
      uEmissive: { value: new THREE.Color(o.emissive ?? "#000000") },
      uUnlit: { value: o.unlit ? 1 : 0 },
      uSunlit: { value: o.sunlit === false ? 0 : 1 },
      uOpacity: { value: o.opacity ?? 1 },
    },
  });
}

/** A canvas texture with smooth filtering and mipmaps (PS2-era), repeating by default. */
export function psxTexture(c: HTMLCanvasElement, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.colorSpace = THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
