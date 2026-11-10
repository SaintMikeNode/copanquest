// The CRT monitor's screen: a slightly bulged plane with a CRT shader (barrel curvature,
// scanlines, RGB phosphor mask, chromatic fringe, vignette, flicker, power-on) over a small
// canvas "title screen". Written for this project; technique as in common CRT shaders
// (e.g. the public-domain "crt-lottes"/"crt-easymode" ideas: curvature + scanlines + mask).
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { psxTexture } from "./psx";

const W = 256;
const H = 192;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D map;
  uniform float uTime;
  uniform float uPower;
  uniform float uBoost;
  varying vec2 vUv;

  vec2 curve(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    vec2 off = abs(uv.yx) / vec2(5.0, 4.0);
    uv += uv * off * off;
    return uv * 0.5 + 0.5;
  }

  void main() {
    vec2 uv = curve(vUv);
    // Power-on: the picture grows from a bright horizontal line.
    float open = clamp(uPower * 1.6, 0.0, 1.0);
    uv.y = (uv.y - 0.5) / max(open, 0.002) + 0.5;
    // Glass: dark grey-green with a soft reflection of the room (what an off CRT looks like).
    vec3 glass = vec3(0.035, 0.045, 0.04) + vec3(0.07, 0.055, 0.04) * smoothstep(0.9, 0.1, length(vUv - vec2(0.3, 0.75)));
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      vec3 g = glass + vec3(0.9, 1.0, 0.95) * step(abs(vUv.y - 0.5), 0.006) * uPower * step(uPower, 0.6) * 3.0;
      gl_FragColor = vec4(g, 1.0);
      return;
    }
    float fr = 0.0018;
    vec3 col;
    col.r = texture2D(map, uv + vec2(fr, 0.0)).r;
    col.g = texture2D(map, uv).g;
    col.b = texture2D(map, uv - vec2(fr, 0.0)).b;
    // Scanlines (one per source row) and an aperture-grille mask.
    float scan = 0.72 + 0.28 * pow(sin(uv.y * ${H}.0 * 3.14159), 2.0);
    float m = mod(floor(uv.x * ${W}.0 * 3.0), 3.0);
    vec3 mask = m < 1.0 ? vec3(1.0, 0.82, 0.82) : m < 2.0 ? vec3(0.82, 1.0, 0.82) : vec3(0.82, 0.82, 1.0);
    col *= scan * mask;
    // Phosphor glow and vignette.
    col += col * col * 0.35;
    vec2 v = uv * (1.0 - uv);
    col *= pow(v.x * v.y * 15.0, 0.22);
    // Flicker and a slow rolling band.
    col *= 0.97 + 0.03 * sin(uTime * 55.0);
    col *= 0.94 + 0.06 * smoothstep(0.0, 0.08, abs(fract(uv.y * 0.7 - uTime * 0.12) - 0.5));
    col *= 1.0 + uBoost * 0.35;
    col += vec3(0.9, 1.0, 0.95) * (1.0 - open) * step(abs(vUv.y - 0.5), 0.01) * uPower * 4.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** "CopánQuest" centered at (cx, cy). Pixelify Sans' capital C is nearly closed and reads as an
 *  O, so it's drawn clipped with a notch cut from its right side (like .title-c in styles.css). */
function drawTitle(g: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  const rest = "opánQuest";
  const wc = g.measureText("C").width;
  const total = g.measureText("C" + rest).width;
  const x0 = cx - total / 2;
  const size = 36;
  g.save();
  g.fillStyle = color;
  g.textAlign = "left";
  g.fillText(rest, x0 + wc, cy);
  g.beginPath();
  g.rect(x0 - 4, cy - size, wc + 8, size * 2);
  // Notch: right part of the letter around the middle (evenodd cuts it out of the clip).
  g.rect(x0 + wc * 0.58, cy - size * 0.1, wc, size * 0.2);
  g.clip("evenodd");
  g.fillText("C", x0, cy);
  g.restore();
}

/** Title screen: dark jade, logo, title and a blinking prompt. */
function drawScreen(g: CanvasRenderingContext2D, logo: HTMLImageElement | null, prompt: string, on: boolean) {
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0d2a20");
  grad.addColorStop(1, "#06140f");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // Faint step-fret bands top and bottom.
  g.fillStyle = "#1c4a36";
  for (let x = 0; x < W; x += 16) {
    g.fillRect(x, 10, 10, 3);
    g.fillRect(x + 7, 13, 3, 4);
    g.fillRect(x, H - 17, 10, 3);
    g.fillRect(x + 7, H - 14, 3, 4);
  }
  if (logo) g.drawImage(logo, W / 2 - 20, 34, 40, 40);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = '700 36px "Pixelify Sans", system-ui, sans-serif';
  drawTitle(g, W / 2 + 2, 98 + 2, "#7a1d10");
  drawTitle(g, W / 2, 98, "#f2c14e");
  g.font = '400 11px "Pixelify Sans", system-ui, sans-serif';
  g.fillStyle = "#9be3b5";
  g.fillText("Copán, Honduras · ca. 800 d. C.", W / 2, 122);
  if (on) {
    g.font = '700 18px "Pixelify Sans", system-ui, sans-serif';
    g.fillStyle = "#ffffff";
    g.fillText(prompt, W / 2, 152);
  }
}

export function CrtScreen({
  size,
  prompt,
  power,
  boost,
}: {
  size: [number, number];
  prompt: string;
  /** 0 → off, 1 → fully on (animated by the caller). */
  power: { current: number };
  /** Extra brightness while zooming in. */
  boost: { current: number };
}) {
  const { canvas, ctx, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const texture = psxTexture(canvas, false);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    return { canvas, ctx, texture };
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { map: { value: texture }, uTime: { value: 0 }, uPower: { value: 0 }, uBoost: { value: 0 } },
      }),
    [texture],
  );
  // Slightly bulged glass.
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(size[0], size[1], 12, 9);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / (size[0] / 2);
      const y = p.getY(i) / (size[1] / 2);
      p.setZ(i, 0.014 * (1 - 0.5 * (x * x + y * y)));
    }
    g.computeVertexNormals();
    return g;
  }, [size]);

  useEffect(() => {
    let logo: HTMLImageElement | null = null;
    let on = true;
    const draw = () => {
      drawScreen(ctx, logo, prompt, on);
      texture.needsUpdate = true;
    };
    const im = new Image();
    im.onload = () => {
      logo = im;
      draw();
    };
    im.src = "/favicon.svg";
    void document.fonts?.load('700 30px "Pixelify Sans"').then(draw, draw);
    draw();
    const id = setInterval(() => {
      on = !on;
      draw();
    }, 550);
    return () => clearInterval(id);
  }, [ctx, texture, prompt, canvas]);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
    material.uniforms.uPower.value = power.current;
    material.uniforms.uBoost.value = boost.current;
  });

  return <mesh geometry={geometry} material={material} />;
}
