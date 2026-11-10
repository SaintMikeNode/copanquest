// The landing room: a late-90s / early-2000s bedroom desk in Honduras, PS2-era style.
// Units are meters; x right, y up, z toward the camera. The desk stands against the back wall
// (z = −1.7); the window is in the back wall, behind the right end of the desk. Everything uses
// the room material (psx.ts) and
// the painted textures in roomTextures.ts. Monitor clicks are handled by the caller.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { psxLights, psxMaterial } from "./psx";
import * as T from "./roomTextures";
import { CrtScreen } from "./Crt";
import { RecordPlayer } from "./RecordPlayer";
import { CreditsBookModel } from "./CreditsBookModel";
import { HandHint } from "./HandHint";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";

/** Screen center and size (used by the camera zoom). */
export const SCREEN = { center: new THREE.Vector3(-0.05, 1.125, -1.123), size: [0.33, 0.25] as [number, number] };

const ROOM = { x0: -2.2, x1: 2.2, z0: -1.7, z1: 1.9, h: 2.7 };
/** Height of the desk's top surface (things on the desk sit here). */
const DESK_TOP = 0.7525;
/** Contact shadows on the desk: [x, z, width, depth]. */
const deskShadows: [number, number, number, number][] = [
  [-0.06, -0.98, 0.56, 0.26], // keyboard
  [-0.05, -1.3, 0.62, 0.56], // PC + monitor
  [-0.42, -1.36, 0.2, 0.2], // speakers
  [0.32, -1.36, 0.2, 0.2],
  [0.22, -0.94, 0.13, 0.13], // mug
  [-0.76, -1.45, 0.26, 0.26], // lamp
  [0.6, -1.5, 0.15, 0.15], // lava lamp
  [0.84, -1.42, 0.36, 0.3], // game boxes
  [0.38, -0.99, 0.09, 0.13], // mouse
  [0.27, -1.2, 0.18, 0.16], // floppies
  [0.57, -1.215, 0.42, 0.34], // record player
  [-0.79, -1.23, 0.33, 0.33], // hat
  [-0.47, -0.985, 0.25, 0.31], // credits book
  [0.88, -1.02, 0.27, 0.34], // field notebook
  [0.64, -1.0, 0.3, 0.2], // trowel
  [-0.84, -0.94, 0.16, 0.12], // magnifier
];
/** Window in the back wall, behind the right end of the desk. */
const WIN = { x0: 0.95, x1: 1.95, y0: 1.0, y1: 2.12 };

/** Scale a geometry's UVs (so textures tile at a fixed size per meter). */
function tiled<Geo extends THREE.BufferGeometry>(g: Geo, su: number, sv: number) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}
/** Plane subdivided so per-vertex (Gouraud) lighting has enough vertices for gradients. */
const plane = (w: number, h: number, sw = 8, sh = 8) => new THREE.PlaneGeometry(w, h, sw, sh);

/** Box with rounded edges (moulded plastic, sanded wood). */
const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r);

/**
 * Classic soccer ball: a truncated icosahedron (12 black pentagons, 20 white hexagons).
 * Returns the white and black panels as two geometries plus the seams.
 */
function soccerBall(radius: number) {
  const phi = (1 + Math.sqrt(5)) / 2;
  const base = [
    [0, 1, 3 * phi],
    [1, 2 + phi, 2 * phi],
    [phi, 2, phi * phi * phi],
  ];
  const pts: THREE.Vector3[] = [];
  const seen = new Set<string>();
  for (const [a, b, c] of base)
    for (const sa of [1, -1]) for (const sb of [1, -1]) for (const sc of [1, -1])
      for (const [x, y, z] of [[a * sa, b * sb, c * sc], [b * sb, c * sc, a * sa], [c * sc, a * sa, b * sb]]) {
        const k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        pts.push(new THREE.Vector3(x, y, z));
      }
  const scale = radius / pts[0].length();
  pts.forEach((p) => p.multiplyScalar(scale));
  const hull = new ConvexGeometry(pts).toNonIndexed();
  // Pentagons face the 12 icosahedron vertex directions.
  const ico = [] as THREE.Vector3[];
  for (const s1 of [1, -1]) for (const s2 of [1, -1]) for (const [x, y, z] of [[0, s1, s2 * phi], [s1, s2 * phi, 0], [s2 * phi, 0, s1]]) ico.push(new THREE.Vector3(x, y, z).normalize());
  const pos = hull.attributes.position;
  const white: number[] = [];
  const black: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
    const pent = ico.some((d) => Math.abs(d.dot(n)) > 0.99 && d.dot(n) > 0);
    (pent ? black : white).push(...a.toArray(), ...b.toArray(), ...c.toArray());
  }
  const make = (arr: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Array((arr.length / 3) * 2).fill(0), 2));
    g.computeVertexNormals();
    return g;
  };
  // Seams: the polygon edges (not the triangulation diagonals).
  const seams = new THREE.EdgesGeometry(new ConvexGeometry(pts), 5);
  seams.scale(1.004, 1.004, 1.004);
  return { white: make(white), black: make(black), seams };
}

/** A square frustum (tapered box) from a 4-sided cylinder: the CRT's back. */
function frustum(wFront: number, hFront: number, wBack: number, hBack: number, depth: number) {
  const g = new THREE.CylinderGeometry(Math.SQRT1_2 * wBack, Math.SQRT1_2 * wFront, depth, 4, 1);
  g.rotateY(Math.PI / 4);
  g.rotateX(-Math.PI / 2);
  // Squash to the right aspect (cylinder radius gives a square section).
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getZ(i) + depth / 2) / depth; // 0 back … 1 front
    const ratio = (hBack + (hFront - hBack) * t) / (wBack + (wFront - wBack) * t);
    p.setY(i, p.getY(i) * ratio);
  }
  g.computeVertexNormals();
  return g;
}

export function RoomScene({
  onMonitor,
  onRecord,
  onBook,
  bookOpen,
  prompt,
  power,
  boost,
  hover,
}: {
  onMonitor: () => void;
  onRecord: () => void;
  onBook: () => void;
  bookOpen: { current: number };
  prompt: string;
  power: { current: number };
  boost: { current: number };
  hover: (on: boolean) => void;
}) {
  const M = useMemo(() => {
    const beige = T.beigeTex();
    return {
      wall: psxMaterial({ map: T.wallTex() }),
      wallShade: psxMaterial({ map: T.wallTex(), sunlit: false }),
      floor: psxMaterial({ map: T.floorTex() }),
      ceiling: psxMaterial({ color: "#5a4636", sunlit: false }),
      rug: psxMaterial({ map: T.rugTex() }),
      desk: psxMaterial({ map: T.deskTex() }),
      deskDark: psxMaterial({ map: T.deskTex(), color: "#9b7a5c" }),
      beige: psxMaterial({ map: beige }),
      beigeDark: psxMaterial({ map: beige, color: "#b8ab8c" }),
      black: psxMaterial({ color: "#1d1a17" }),
      metal: psxMaterial({ color: "#8a8f93" }),
      keyboard: psxMaterial({ map: T.keyboardTex() }),
      pcFront: psxMaterial({ map: T.pcFrontTex() }),
      grille: psxMaterial({ map: T.grilleTex() }),
      mousepad: psxMaterial({ map: T.mousepadTex() }),
      macaw: psxMaterial({ map: T.macawPosterTex() }),
      copan: psxMaterial({ map: T.copanPosterTex() }),
      calendar: psxMaterial({ map: T.calendarPosterTex() }),
      flag: psxMaterial({ map: T.flagTex(), side: THREE.DoubleSide }),
      sky: psxMaterial({ map: T.skyTex(), unlit: true }),
      town: psxMaterial({ map: T.townTex(), unlit: true, color: "#f2e6d0" }),
      banana: psxMaterial({ map: T.bananaTex(), unlit: true, color: "#c9d6a0", side: THREE.DoubleSide }),
      alu: psxMaterial({ color: "#c4c6c2" }),
      louver: psxMaterial({ color: "#7fa3a6", emissive: "#1c3638", opacity: 0.38 }),
      concrete: psxMaterial({ color: "#ebe7dc" }),
      frame: psxMaterial({ color: "#efe7d4" }),
      rosalila: psxMaterial({ map: T.rosalilaTex() }),
      hmap: psxMaterial({ map: T.hondurasMapTex() }),
      futbol: psxMaterial({ map: T.futbolPosterTex() }),
      scarf: psxMaterial({ map: T.scarfTex(), side: THREE.DoubleSide }),
      jersey: psxMaterial({ map: T.jerseyTex(), side: THREE.DoubleSide }),
      ballWhite: psxMaterial({ color: "#f2efe6" }),
      ballBlack: psxMaterial({ color: "#1c1a18" }),
      mosaic: psxMaterial({ map: T.jadeMosaicTex() }),
      shell: psxMaterial({ color: "#f4eee0" }),
      lenca: psxMaterial({ map: T.lencaTex() }),
      clay: psxMaterial({ color: "#b06a3a" }),
      // Archaeology kit and the explorer's hat (same khaki straw and dark band as the player's).
      hat: psxMaterial({ color: "#c9b07a" }),
      hatBand: psxMaterial({ color: "#5a3e22" }),
      steel: psxMaterial({ color: "#c9cfd3" }),
      handle: psxMaterial({ map: T.deskTex(), color: "#d8a070" }),
      bristle: psxMaterial({ color: "#3a2a1a" }),
      lens: psxMaterial({ color: "#cfe8f0", emissive: "#203038", opacity: 0.45 }),
      fieldbook: psxMaterial({ map: T.fieldbookTex() }),
      backpack: psxMaterial({ map: T.fabricTex("#2a4f8f", 71) }),
      backpackDark: psxMaterial({ map: T.fabricTex("#1d3766", 72) }),
      cable: psxMaterial({ color: "#2a2724" }),
      magazines: ["#c43c2a", "#f2c14e", "#2a63c9"].map((c) => psxMaterial({ color: c })),
      cork: psxMaterial({ map: T.corkTex() }),
      // Outside, in daylight (not lit by the room's lights).
      redOut: psxMaterial({ color: "#d42121", unlit: true }),
      yellowOut: psxMaterial({ color: "#e8c21c", unlit: true }),
      blueOut: psxMaterial({ color: "#2a63c9", unlit: true }),
      wireOut: psxMaterial({ color: "#2a2622", unlit: true }),
      curtain: psxMaterial({ map: T.curtainTex(), side: THREE.DoubleSide }),
      mug: psxMaterial({ map: T.mugTex() }),
      white: psxMaterial({ color: "#efe9dc" }),
      lampMetal: psxMaterial({ color: "#2e5a46" }),
      bulb: psxMaterial({ color: "#fff2c4", unlit: true }),
      lavaGlass: psxMaterial({ color: "#ff8a3a", emissive: "#b34012", unlit: true, opacity: 0.85 }),
      lavaBlob: psxMaterial({ color: "#ffd04a", unlit: true }),
      chrome: psxMaterial({ color: "#b8b4aa" }),
      chair: psxMaterial({ map: T.fabricTex("#3b3a52", 21) }),
      stela: psxMaterial({ map: T.stelaTex() }),
      jade: psxMaterial({ map: T.jadeTex() }),
      red: psxMaterial({ color: "#d42121" }),
      yellow: psxMaterial({ color: "#e8c21c" }),
      blue: psxMaterial({ color: "#2a63c9" }),
      terracotta: psxMaterial({ color: "#b4552c" }),
      leaf: psxMaterial({ color: "#3f8a3c", side: THREE.DoubleSide }),
      orchid: psxMaterial({ color: "#f3f0dc" }),
      spines: T.SPINES.map(([l, bg, fg]) => psxMaterial({ map: T.spineTex(l, bg, fg) })),
      bookColors: ["#7a2a18", "#2a3f8f", "#1f5e46", "#c98a3a", "#5a2a7a", "#8c2f1e", "#3b6e8f"].map((c) => psxMaterial({ color: c })),
      floppies: [T.floppyTex("COPÁN", "#2a2a2e"), T.floppyTex("MAPAS", "#2a3f8f"), T.floppyTex("TAREA", "#8c2f1e")].map((t) => psxMaterial({ map: t })),
      blob: new THREE.MeshBasicMaterial({ map: T.blobTex(), transparent: true, depthWrite: false }),
      beam: new THREE.MeshBasicMaterial({ map: T.beamTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    };
  }, []);

  // Light rig positions.
  const LAMP_HEAD = useMemo(() => new THREE.Vector3(-0.56, 1.36, -1.22), []);
  useEffect(() => {
    psxLights.uLampPos.value.copy(LAMP_HEAD);
    psxLights.uLampDir.value.set(0.35, -1, 0.25).normalize();
    psxLights.uScreenPos.value.copy(SCREEN.center).add(new THREE.Vector3(0, 0, 0.25));
    psxLights.uLavaPos.value.set(0.6, 0.95, -1.45);
  }, [LAMP_HEAD]);

  const geo = useMemo(
    () => ({
      floor: tiled(plane(ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0, 10, 10), 4, 3.5),
      back: tiled(plane(ROOM.x1 - ROOM.x0, ROOM.h, 10, 6), 4, 2.5),
      left: tiled(plane(ROOM.z1 - ROOM.z0, ROOM.h, 8, 6), 3.5, 2.5),
      ceiling: plane(ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0, 4, 4),
      monitorBack: frustum(0.42, 0.38, 0.3, 0.27, 0.32),
      lampHead: new THREE.ConeGeometry(0.085, 0.13, 20, 1, true),
      cyl8: new THREE.CylinderGeometry(1, 1, 1, 20),
      cyl6: new THREE.CylinderGeometry(1, 1, 1, 12),
      sphere: new THREE.IcosahedronGeometry(1, 2),
      pennant: (() => {
        const s = new THREE.Shape();
        s.moveTo(0, 0);
        s.lineTo(0.42, 0.11);
        s.lineTo(0, 0.22);
        const g = new THREE.ShapeGeometry(s);
        // UVs from position for the flag stripes.
        const p = g.attributes.position;
        const uv = g.attributes.uv;
        for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.42, p.getY(i) / 0.22);
        return g;
      })(),
    }),
    [],
  );

  const beams = useMemo(() => {
    // One soft sheet per pane: from the top edge of the window along the sun, fading out.
    const dir = psxLights.uSunDir.value;
    const len = 2.4;
    const mid = (WIN.x0 + WIN.x1) / 2;
    return [
      [WIN.x0 + 0.06, mid - 0.03],
      [mid + 0.03, WIN.x1 - 0.06],
    ].map(([xa, xb]) => {
      const a = new THREE.Vector3(xa, WIN.y1 - 0.06, ROOM.z0);
      const b = new THREE.Vector3(xb, WIN.y1 - 0.06, ROOM.z0);
      const g = new THREE.BufferGeometry();
      const pts = [a, b, b.clone().addScaledVector(dir, len), a.clone().addScaledVector(dir, len)];
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts.flatMap((p) => p.toArray()), 3));
      // v = 0 at the window (bright) … 1 at the far end (faded).
      g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      return g;
    });
  }, []);
  // Louvers: 13 per column, 7.6 cm apart, tilted open.
  const louvers = useMemo(() => {
    const out: [number, number, number][] = [];
    const colW = (WIN.x1 - WIN.x0) / 2 - 0.05;
    for (const cx of [WIN.x0 + (WIN.x1 - WIN.x0) / 4, WIN.x0 + (3 * (WIN.x1 - WIN.x0)) / 4])
      for (let k = 0; k < 13; k++) out.push([cx, WIN.y0 + 0.08 + k * ((WIN.y1 - WIN.y0 - 0.14) / 12), colW]);
    return out;
  }, []);
  const curtains = useMemo(
    () =>
      [0, 1].map(() => {
        const g = plane(0.32, 1.5, 12, 1);
        const p = g.attributes.position;
        for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getX(k) * 40) * 0.025);
        g.computeVertexNormals();
        return g;
      }),
    [],
  );
  const backWall = useMemo(
    () =>
      [
        [ROOM.x0, WIN.x0, 0, ROOM.h],
        [WIN.x1, ROOM.x1, 0, ROOM.h],
        [WIN.x0, WIN.x1, 0, WIN.y0],
        [WIN.x0, WIN.x1, WIN.y1, ROOM.h],
      ].map(([x0, x1, y0, y1]) => ({
        geo: tiled(plane(x1 - x0, y1 - y0, 2, 2), (x1 - x0) * 0.9, (y1 - y0) * 0.9),
        pos: [(x0 + x1) / 2, (y0 + y1) / 2, ROOM.z0] as [number, number, number],
      })),
    [],
  );

  const ball = useMemo(() => soccerBall(0.11), []);
  // Pointing trowel blade: a long diamond.
  const trowelBlade = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.1);
    sh.lineTo(0.035, 0.0);
    sh.lineTo(0.03, 0.05);
    sh.lineTo(-0.03, 0.05);
    sh.lineTo(-0.035, 0.0);
    sh.closePath();
    return new THREE.ShapeGeometry(sh);
  }, []);
  // Cables from the back of the desk down to the power strip on the floor.
  const cables = useMemo(
    () =>
      [
        [-0.1, 0.42],
        [0.05, 0.3],
        [-0.42, 0.22],
      ].map(([x0, x1]) => {
        const c = new THREE.CatmullRomCurve3([
          new THREE.Vector3(x0, DESK_TOP, -1.64),
          new THREE.Vector3(x0 + 0.02, 0.45, -1.66),
          new THREE.Vector3((x0 + x1) / 2, 0.06, -1.6),
          new THREE.Vector3(x1, 0.025, -1.55),
        ]);
        return new THREE.TubeGeometry(c, 16, 0.006, 5, false);
      }),
    [],
  );
  const vaseGeo = useMemo(() => {
    // Lathe profile: foot, round belly, narrow neck, flared lip.
    const pts = [[0.0, 0], [0.09, 0], [0.11, 0.03], [0.16, 0.14], [0.17, 0.22], [0.14, 0.32], [0.08, 0.4], [0.07, 0.44], [0.095, 0.47]].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(pts, 20);
  }, []);

  // Lava lamp blobs and dust motes.
  const blobs = useRef<THREE.Mesh[]>([]);
  const dust = useRef<THREE.Points>(null);
  const dustGeo = useMemo(() => {
    const n = 70;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = 0.6 + Math.random() * 1.4;
      a[i * 3 + 1] = 0.5 + Math.random() * 1.6;
      a[i * 3 + 2] = -1.6 + Math.random() * 1.2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    blobs.current.forEach((b, i) => {
      if (!b) return;
      b.position.y = 0.12 + 0.17 * (0.5 + 0.5 * Math.sin(t * 0.35 + i * 2.1));
      const s = 0.022 + 0.006 * Math.sin(t * 0.8 + i);
      b.scale.set(s, s * 1.3, s);
    });
    if (dust.current) {
      dust.current.rotation.y = Math.sin(t * 0.05) * 0.05;
      dust.current.position.y = Math.sin(t * 0.21) * 0.03;
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onMonitor();
  };

  const box = (w: number, h: number, d: number) => [w, h, d] as [number, number, number];

  return (
    <group>
      {/* ---------------------------------------------------------------- room shell */}
      <mesh geometry={geo.floor} material={M.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (ROOM.z0 + ROOM.z1) / 2]} />
      <mesh geometry={geo.ceiling} material={M.ceiling} rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.h, (ROOM.z0 + ROOM.z1) / 2]} />
      {backWall.map((g, i) => (
        <mesh key={i} geometry={g.geo} material={M.wall} position={g.pos} />
      ))}
      <mesh geometry={geo.left} material={M.wallShade} rotation={[0, Math.PI / 2, 0]} position={[ROOM.x0, ROOM.h / 2, (ROOM.z0 + ROOM.z1) / 2]} />
      <mesh geometry={geo.left} material={M.wallShade} rotation={[0, -Math.PI / 2, 0]} position={[ROOM.x1, ROOM.h / 2, (ROOM.z0 + ROOM.z1) / 2]} />
      {/* Skirting board. */}
      <mesh material={M.deskDark} position={[0, 0.05, ROOM.z0 + 0.01]}>
        <boxGeometry args={box(ROOM.x1 - ROOM.x0, 0.1, 0.02)} />
      </mesh>
      <mesh geometry={plane(2.3, 1.6, 2, 2)} material={M.rug} rotation={[-Math.PI / 2, 0, 0]} position={[0.05, 0.004, -0.25]} />

      {/* ---------------------------------------------------------------- window */}
      {/* Outside, back to front: sky and hills, the town (tile roofs, church tower), a power
          line with a scarlet macaw (they fly over Copán Ruinas), banana leaves. */}
      <mesh geometry={plane(5, 3.2, 1, 1)} material={M.sky} position={[(WIN.x0 + WIN.x1) / 2, 1.75, ROOM.z0 - 4]} />
      <mesh geometry={plane(3.6, 1.8, 1, 1)} material={M.town} position={[(WIN.x0 + WIN.x1) / 2 + 0.1, 1.32, ROOM.z0 - 2.6]} />
      <mesh material={M.wireOut} position={[1.45, 1.93, ROOM.z0 - 1.2]} rotation={[0, 0, -0.04]}>
        <boxGeometry args={box(2.6, 0.006, 0.006)} />
      </mesh>
      <group position={[1.62, 1.935, ROOM.z0 - 1.2]} rotation={[0, 0.5, 0]}>
        <mesh geometry={geo.sphere} material={M.redOut} scale={[0.04, 0.06, 0.04]} position={[0, 0.05, 0]} />
        <mesh geometry={geo.sphere} material={M.redOut} scale={[0.03, 0.03, 0.03]} position={[0, 0.12, 0.01]} />
        <mesh material={M.yellowOut} position={[0.035, 0.05, -0.005]}>
          <boxGeometry args={box(0.012, 0.06, 0.05)} />
        </mesh>
        <mesh material={M.blueOut} position={[0.036, 0.02, -0.012]}>
          <boxGeometry args={box(0.012, 0.035, 0.045)} />
        </mesh>
        <mesh material={M.redOut} position={[0, -0.05, -0.035]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={box(0.018, 0.13, 0.012)} />
        </mesh>
      </group>
      <mesh geometry={plane(1.1, 1.1, 1, 1)} material={M.banana} position={[WIN.x1 - 0.3, 1.25, ROOM.z0 - 0.45]} />
      {/* Celosía: aluminum frame, a center mullion and two columns of tilted tinted-glass louvers. */}
      {[WIN.y0 + 0.018, WIN.y1 - 0.018].map((y, i) => (
        <mesh key={`fh${i}`} material={M.alu} position={[(WIN.x0 + WIN.x1) / 2, y, ROOM.z0 + 0.01]}>
          <boxGeometry args={box(WIN.x1 - WIN.x0, 0.036, 0.05)} />
        </mesh>
      ))}
      {[WIN.x0 + 0.018, (WIN.x0 + WIN.x1) / 2, WIN.x1 - 0.018].map((x, i) => (
        <mesh key={`fv${i}`} material={M.alu} position={[x, (WIN.y0 + WIN.y1) / 2, ROOM.z0 + 0.01]}>
          <boxGeometry args={box(i === 1 ? 0.045 : 0.036, WIN.y1 - WIN.y0, 0.05)} />
        </mesh>
      ))}
      {louvers.map(([x, y, w], i) => (
        <mesh key={`l${i}`} material={M.louver} position={[x, y, ROOM.z0 + 0.01]} rotation={[-0.95, 0, 0]}>
          <boxGeometry args={box(w, 0.082, 0.004)} />
        </mesh>
      ))}
      {/* Concrete sill, as in Honduran houses, with an orchid (the national flower,
          Rhyncholaelia digbyana). */}
      <mesh material={M.concrete} position={[(WIN.x0 + WIN.x1) / 2, WIN.y0 - 0.03, ROOM.z0 + 0.08]}>
        <boxGeometry args={box(WIN.x1 - WIN.x0 + 0.18, 0.06, 0.2)} />
      </mesh>
      <group position={[WIN.x1 - 0.18, WIN.y0, ROOM.z0 + 0.13]}>
        <mesh geometry={geo.cyl8} material={M.terracotta} scale={[0.06, 0.1, 0.06]} position={[0, 0.05, 0]} />
        {[[-0.4, 0], [0.5, 1], [1.6, 2], [2.6, 3], [3.6, 4]].map(([a, k]) => (
          <mesh key={k} material={M.leaf} position={[Math.cos(a) * 0.05, 0.14, Math.sin(a) * 0.05]} rotation={[0.5, a, 0.3]}>
            <planeGeometry args={[0.04, 0.16]} />
          </mesh>
        ))}
        {[[0.03, 0.28, 0.0], [-0.03, 0.25, 0.04], [0.0, 0.3, -0.04]].map(([x, y, z], k) => (
          <mesh key={`f${k}`} geometry={geo.sphere} material={M.orchid} position={[x, y, z]} scale={[0.028, 0.02, 0.028]} />
        ))}
      </group>
      {/* Curtains. */}
      {curtains.map((g, i) => (
        <mesh key={i} geometry={g} material={M.curtain} position={[i ? WIN.x1 + 0.17 : WIN.x0 - 0.17, (WIN.y0 + WIN.y1) / 2 + 0.12, ROOM.z0 + 0.08]} />
      ))}
      {/* Sun beams: sheets from the window panes along the sun's direction, fading out. */}
      {beams.map((g, i) => (
        <mesh key={i} geometry={g} material={M.beam} />
      ))}

      {/* ---------------------------------------------------------------- posters & flag */}
      <mesh geometry={plane(0.5, 0.67, 2, 2)} material={M.macaw} position={[-1.62, 1.6, ROOM.z0 + 0.01]} />
      <mesh geometry={plane(0.34, 0.45, 2, 2)} material={M.futbol} position={[-1.08, 1.55, ROOM.z0 + 0.01]} />
      <mesh geometry={plane(0.4, 0.53, 2, 2)} material={M.calendar} position={[-0.66, 1.57, ROOM.z0 + 0.01]} />
      {/* Cork board behind the monitor: polaroids of Copán, a bus ticket, timetable, a note. */}
      <mesh geometry={rbox(0.6, 0.375, 0.02, 0.006)} material={[M.deskDark, M.deskDark, M.deskDark, M.deskDark, M.cork, M.deskDark]} position={[-0.02, 1.57, ROOM.z0 + 0.012]} />
      {/* Jade mosaic mask (souvenir replica) right of the monitor, over the lava lamp: tiled
          face, shell eyes with dark pupils, ear flares, a headband, a nose bead. */}
      <group position={[0.47, 1.45, ROOM.z0 + 0.04]}>
        <mesh geometry={rbox(0.24, 0.3, 0.05, 0.03)} material={M.mosaic} />
        <mesh material={M.mosaic} position={[0, 0.17, 0.005]}>
          <boxGeometry args={box(0.3, 0.05, 0.05)} />
        </mesh>
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <mesh geometry={geo.cyl8} material={M.mosaic} position={[sx * 0.15, 0.0, 0.01]} rotation={[Math.PI / 2, 0, 0]} scale={[0.045, 0.02, 0.045]} />
            <mesh geometry={geo.cyl8} material={M.shell} position={[sx * 0.15, 0.0, 0.022]} rotation={[Math.PI / 2, 0, 0]} scale={[0.016, 0.01, 0.016]} />
            <mesh material={M.shell} position={[sx * 0.055, 0.05, 0.027]}>
              <boxGeometry args={box(0.06, 0.028, 0.006)} />
            </mesh>
            <mesh material={M.black} position={[sx * 0.055, 0.05, 0.031]}>
              <boxGeometry args={box(0.02, 0.022, 0.004)} />
            </mesh>
          </group>
        ))}
        <mesh material={M.mosaic} position={[0, 0.0, 0.04]}>
          <boxGeometry args={box(0.04, 0.08, 0.035)} />
        </mesh>
        <mesh geometry={geo.sphere} material={M.jade} position={[0, -0.045, 0.05]} scale={0.012} />
        <mesh material={M.shell} position={[0, -0.085, 0.028]}>
          <boxGeometry args={box(0.08, 0.02, 0.006)} />
        </mesh>
        <mesh material={M.black} position={[0, -0.085, 0.032]}>
          <boxGeometry args={box(0.07, 0.006, 0.004)} />
        </mesh>
      </group>
      <mesh geometry={plane(0.8, 0.3, 2, 2)} material={M.rosalila} position={[-1.42, 2.11, ROOM.z0 + 0.01]} />
      <mesh geometry={plane(0.42, 0.315, 2, 2)} material={M.hmap} position={[-0.74, 2.05, ROOM.z0 + 0.01]} />
      {/* Supporters' scarf hanging from the shelf. */}
      {[0, 1].map((i) => (
        <mesh key={`sc${i}`} geometry={plane(0.065, 0.5, 1, 4)} material={M.scarf} position={[-0.42 + i * 0.05, 1.6 - i * 0.05, ROOM.z0 + 0.235 + i * 0.004]} rotation={[0, 0, i ? 0.06 : -0.03]} />
      ))}
      <mesh geometry={plane(0.5, 0.67, 2, 2)} material={M.copan} rotation={[0, Math.PI / 2, 0]} position={[ROOM.x0 + 0.01, 1.55, -0.85]} />
      <mesh geometry={geo.pennant} material={M.flag} position={[0.35, 2.15, ROOM.z0 + 0.012]} rotation={[0, 0, -0.12]} />

      {/* ---------------------------------------------------------------- shelf */}
      <group position={[0.22, 1.86, ROOM.z0 + 0.12]}>
        <mesh material={M.desk}>
          <boxGeometry args={box(1.3, 0.03, 0.22)} />
        </mesh>
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} material={M.deskDark} position={[x, -0.06, -0.05]}>
            <boxGeometry args={box(0.02, 0.1, 0.1)} />
          </mesh>
        ))}
        {/* Books. */}
        {Array.from({ length: 9 }, (_, i) => {
          const h = 0.17 + ((i * 37) % 7) * 0.012;
          return (
            <mesh key={i} material={M.bookColors[i % M.bookColors.length]} position={[-0.6 + i * 0.045, 0.015 + h / 2, 0]} rotation={[0, 0, i === 8 ? -0.25 : 0]}>
              <boxGeometry args={box(0.038, h, 0.15)} />
            </mesh>
          );
        })}
        {/* Clay jaguar figurine (sitting). */}
        <group position={[-0.19, 0.015, 0]}>
          <mesh material={M.clay} position={[0, 0.04, 0]}>
            <boxGeometry args={box(0.05, 0.08, 0.07)} />
          </mesh>
          <mesh material={M.clay} position={[0, 0.095, 0.02]}>
            <boxGeometry args={box(0.045, 0.04, 0.04)} />
          </mesh>
          <mesh material={M.black} position={[0, 0.1, 0.041]}>
            <boxGeometry args={box(0.03, 0.006, 0.002)} />
          </mesh>
        </group>
        {/* A small replica of a Copán stela. */}
        <mesh material={M.stela} position={[-0.1, 0.13, 0]}>
          <boxGeometry args={box(0.07, 0.23, 0.05)} />
        </mesh>
        {/* Jade mask on a little stand. */}
        <group position={[0.1, 0.1, 0]}>
          <mesh material={M.jade} position={[0, 0.03, 0]}>
            <boxGeometry args={box(0.11, 0.13, 0.04)} />
          </mesh>
          <mesh material={M.jade} position={[0, 0.03, 0.03]}>
            <boxGeometry args={box(0.03, 0.05, 0.03)} />
          </mesh>
          <mesh material={M.black} position={[0, -0.05, 0]}>
            <boxGeometry args={box(0.06, 0.04, 0.05)} />
          </mesh>
        </group>
        {/* Toy macaw. */}
        <group position={[0.36, 0.06, 0]} rotation={[0, -0.6, 0]}>
          <mesh geometry={geo.sphere} material={M.red} scale={[0.035, 0.05, 0.035]} position={[0, 0.04, 0]} />
          <mesh geometry={geo.sphere} material={M.red} scale={[0.025, 0.025, 0.025]} position={[0, 0.1, 0.01]} />
          <mesh material={M.yellow} position={[0.03, 0.04, -0.005]}>
            <boxGeometry args={box(0.012, 0.05, 0.04)} />
          </mesh>
          <mesh material={M.blue} position={[0.031, 0.015, -0.01]}>
            <boxGeometry args={box(0.012, 0.03, 0.035)} />
          </mesh>
          <mesh material={M.red} position={[0, -0.03, -0.03]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={box(0.015, 0.09, 0.012)} />
          </mesh>
        </group>
        {/* CD tower. */}
        <mesh material={M.black} position={[0.56, 0.1, 0]}>
          <boxGeometry args={box(0.13, 0.2, 0.13)} />
        </mesh>
      </group>

      {/* ---------------------------------------------------------------- desk */}
      <group position={[0.05, 0, -1.27]}>
        <mesh geometry={rbox(2.0, 0.045, 0.82, 0.012)} material={M.desk} position={[0, 0.73, 0]} />
        <mesh material={M.deskDark} position={[-0.97, 0.36, 0]}>
          <boxGeometry args={box(0.04, 0.72, 0.78)} />
        </mesh>
        {/* Drawer unit with three drawers. */}
        <mesh material={M.deskDark} position={[0.75, 0.36, 0]}>
          <boxGeometry args={box(0.46, 0.72, 0.78)} />
        </mesh>
        {[0.6, 0.38, 0.16].map((y) => (
          <group key={y}>
            <mesh material={M.desk} position={[0.75, y, 0.395]}>
              <boxGeometry args={box(0.42, 0.18, 0.01)} />
            </mesh>
            <mesh material={M.metal} position={[0.75, y + 0.02, 0.405]}>
              <boxGeometry args={box(0.1, 0.015, 0.012)} />
            </mesh>
          </group>
        ))}
        <mesh material={M.deskDark} position={[0, 0.4, -0.38]}>
          <boxGeometry args={box(1.9, 0.5, 0.02)} />
        </mesh>
      </group>
      {/* Fake contact shadows on the floor. */}
      <mesh geometry={plane(2.3, 1.1, 1, 1)} material={M.blob} rotation={[-Math.PI / 2, 0, 0]} position={[0.05, 0.006, -1.25]} />

      {/* ---------------------------------------------------------------- computer (clickable) */}
      <group
        onClick={click}
        onPointerOver={(e) => {
          e.stopPropagation();
          hover(true);
        }}
        onPointerOut={() => hover(false)}
      >
        {/* Desktop case under the monitor. */}
        <mesh geometry={rbox(0.48, 0.13, 0.44, 0.015)} material={[M.beige, M.beige, M.beige, M.beige, M.pcFront, M.beige]} position={[-0.05, 0.815, -1.3]} />
        {/* Monitor: front shell, bezel, tapered back, power LED. */}
        <mesh geometry={rbox(0.44, 0.38, 0.1, 0.022)} material={M.beige} position={[-0.05, 1.125, -1.2]} />
        <mesh geometry={geo.monitorBack} material={M.beigeDark} position={[-0.05, 1.12, -1.41]} />
        <mesh material={M.beigeDark} position={[-0.05, 0.9, -1.25]}>
          <boxGeometry args={box(0.24, 0.04, 0.2)} />
        </mesh>
        <mesh material={M.black} position={[-0.05, 1.125, -1.151]}>
          <boxGeometry args={box(0.355, 0.275, 0.004)} />
        </mesh>
        <mesh material={M.bulb} position={[0.13, 0.955, -1.148]}>
          <boxGeometry args={box(0.012, 0.008, 0.004)} />
        </mesh>
        <group position={[SCREEN.center.x, SCREEN.center.y, -1.15]}>
          <CrtScreen size={SCREEN.size} prompt={prompt} power={power} boost={boost} />
        </group>
        {/* Pointing hand over the monitor (hidden while the camera zooms into the screen). */}
        <HandHint position={[-0.05, 1.38, -1.17]} scale={0.065} hidden={() => boost.current > 0.02} />
      </group>

      {/* Keyboard, mouse and Maya mousepad. */}
      <mesh geometry={rbox(0.46, 0.03, 0.16, 0.008)} material={[M.beigeDark, M.beigeDark, M.keyboard, M.beigeDark, M.beigeDark, M.beigeDark]} position={[-0.06, DESK_TOP + 0.02, -0.98]} rotation={[0.06, 0, 0]} />
      <mesh geometry={plane(0.22, 0.18, 1, 1)} material={M.mousepad} rotation={[-Math.PI / 2, 0, 0]} position={[0.38, DESK_TOP + 0.0015, -1.0]} />
      <mesh geometry={geo.sphere} material={M.beige} position={[0.38, 0.77, -0.99]} scale={[0.03, 0.02, 0.05]} />

      {/* Café de Honduras mug. */}
      <group position={[0.22, 0.75, -0.94]} rotation={[0, 0.7, 0]}>
        <mesh geometry={geo.cyl8} material={[M.mug, M.white, M.black]} scale={[0.04, 0.1, 0.04]} position={[0, 0.05, 0]} />
        <mesh material={M.white} position={[0.048, 0.055, 0]}>
          <torusGeometry args={[0.022, 0.007, 8, 12]} />
        </mesh>
      </group>

      {/* Floppy disks and a CD. */}
      {M.floppies.map((m, i) => (
        <mesh key={i} material={[M.black, M.black, m, M.black, M.black, M.black]} position={[0.24 + i * 0.03, DESK_TOP + 0.002 + i * 0.0045, -1.21 + i * 0.015]} rotation={[0, 0.2 + i * 0.35, 0]}>
          <boxGeometry args={box(0.09, 0.004, 0.09)} />
        </mesh>
      ))}
      {/* Record player (clickable: opens the record box). */}
      <group position={[0.57, DESK_TOP, -1.215]} rotation={[0, -0.12, 0]} scale={1.22}>
        <RecordPlayer position={[0, 0, 0]} onOpen={onRecord} hover={hover} />
      </group>
      {/* Credits book (clickable: opens the credits book). */}
      <group position={[-0.47, DESK_TOP, -0.985]} rotation={[0, 0.1, 0]} scale={1.18}>
        <CreditsBookModel onOpen={onBook} hover={hover} open={bookOpen} />
      </group>
      {/* The explorer's hat, like the player's: khaki straw, dark band. */}
      <group position={[-0.79, DESK_TOP + 0.003, -1.23]} rotation={[0.03, 0.4, -0.02]} scale={0.75}>
        <mesh geometry={geo.cyl8} material={M.hat} scale={[0.19, 0.012, 0.19]} position={[0, 0.008, 0]} />
        <mesh geometry={geo.cyl8} material={M.hat} scale={[0.1, 0.1, 0.1]} position={[0, 0.062, 0]} />
        <mesh geometry={geo.cyl8} material={M.hatBand} scale={[0.103, 0.026, 0.103]} position={[0, 0.027, 0]} />
        <mesh geometry={geo.sphere} material={M.hat} scale={[0.09, 0.025, 0.09]} position={[0, 0.112, 0]} />
      </group>
      {/* Archaeology kit: field notebook with an excavation brush on it, a pointing trowel,
          a magnifying glass. */}
      <group position={[0.88, DESK_TOP, -1.02]} rotation={[0, 0.25, 0]} scale={1.35}>
        <mesh material={[M.fieldbook, M.fieldbook, M.fieldbook, M.fieldbook, M.white, M.fieldbook]} position={[0, 0.008, 0]}>
          <boxGeometry args={box(0.14, 0.016, 0.2)} />
        </mesh>
        <group position={[0.0, 0.026, 0.0]} rotation={[0, 0.7, Math.PI / 2]}>
          <mesh geometry={geo.cyl8} material={M.handle} scale={[0.008, 0.12, 0.008]} position={[0, -0.03, 0]} />
          <mesh geometry={geo.cyl8} material={M.steel} scale={[0.011, 0.025, 0.011]} position={[0, 0.04, 0]} />
          <mesh material={M.bristle} position={[0, 0.07, 0]}>
            <boxGeometry args={box(0.03, 0.04, 0.012)} />
          </mesh>
        </group>
      </group>
      <group position={[0.64, DESK_TOP, -1.0]} rotation={[0, -0.9, 0]} scale={1.4}>
        <mesh geometry={trowelBlade} material={M.steel} position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        <mesh material={M.steel} position={[0, 0.012, 0.075]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={box(0.008, 0.006, 0.04)} />
        </mesh>
        <mesh geometry={geo.cyl8} material={M.handle} scale={[0.013, 0.11, 0.013]} position={[0, 0.02, 0.145]} rotation={[Math.PI / 2, 0, 0]} />
      </group>
      <group position={[-0.82, DESK_TOP, -0.93]} rotation={[0, 2.6, 0]} scale={1.3}>
        <mesh material={M.black} position={[0, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.035, 0.005, 6, 20]} />
        </mesh>
        <mesh geometry={geo.cyl8} material={M.lens} scale={[0.033, 0.003, 0.033]} position={[0, 0.005, 0]} />
        <mesh geometry={geo.cyl8} material={M.black} scale={[0.008, 0.09, 0.008]} position={[0.08, 0.006, 0]} rotation={[0, 0, Math.PI / 2]} />
      </group>
      {/* Soft contact shadows on the desk. */}
      {deskShadows.map(([x, z, w, d], i) => (
        <mesh key={`ds${i}`} geometry={plane(w, d, 1, 1)} material={M.blob} rotation={[-Math.PI / 2, 0, 0]} position={[x, DESK_TOP + 0.0008, z]} />
      ))}

      {/* Speakers. */}
      {[-0.42, 0.32].map((x) => (
        <mesh key={x} geometry={rbox(0.11, 0.21, 0.12, 0.012)} material={[M.beige, M.beige, M.beige, M.beige, M.grille, M.beige]} position={[x, 0.86, -1.36]} />
      ))}

      {/* Stack of game boxes (fictional titles). */}
      <group position={[0.84, 0.75, -1.42]}>
        {M.spines.map((m, i) => (
          <mesh key={i} material={[M.black, M.black, M.black, M.black, m, M.black]} position={[(i % 2) * 0.01, 0.022 + i * 0.044, 0]} rotation={[0, (i % 3) * 0.04 - 0.04, 0]}>
            <boxGeometry args={box(0.26, 0.042, 0.2)} />
          </mesh>
        ))}
      </group>

      {/* Lava lamp. */}
      <group position={[0.6, 0.75, -1.5]}>
        <mesh geometry={geo.cyl8} material={M.chrome} scale={[0.05, 0.08, 0.05]} position={[0, 0.04, 0]} />
        <mesh material={M.lavaGlass} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.03, 0.045, 0.24, 20]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} ref={(m) => void (blobs.current[i] = m!)} geometry={geo.sphere} material={M.lavaBlob} position={[(i - 1) * 0.008, 0.15, 0]} />
        ))}
        <mesh geometry={geo.cyl8} material={M.chrome} scale={[0.03, 0.04, 0.03]} position={[0, 0.34, 0]} />
      </group>

      {/* Desk lamp: base, two arms, open cone head, bulb. */}
      <group>
        <mesh geometry={geo.cyl8} material={M.lampMetal} scale={[0.09, 0.03, 0.09]} position={[-0.76, 0.765, -1.45]} />
        <mesh material={M.lampMetal} position={[-0.74, 1.0, -1.42]} rotation={[0.15, 0, -0.12]}>
          <boxGeometry args={box(0.02, 0.48, 0.02)} />
        </mesh>
        <mesh material={M.lampMetal} position={[-0.64, 1.3, -1.33]} rotation={[0.7, 0, -0.9]}>
          <boxGeometry args={box(0.02, 0.3, 0.02)} />
        </mesh>
        <mesh geometry={geo.lampHead} material={M.lampMetal} position={LAMP_HEAD.toArray()} rotation={[-0.25, 0, 0.55]} />
        <mesh geometry={geo.sphere} material={M.bulb} position={[LAMP_HEAD.x + 0.015, LAMP_HEAD.y - 0.05, LAMP_HEAD.z + 0.01]} scale={0.032} />
      </group>

      {/* Soccer ball on the rug, and a Lenca clay vase (La Campa, western Honduras) by the desk. */}
      <group position={[0.12, 0.11, -1.02]} rotation={[0.3, 0.8, 0.2]}>
        <mesh geometry={ball.white} material={M.ballWhite} />
        <mesh geometry={ball.black} material={M.ballBlack} />
        <lineSegments geometry={ball.seams}>
          <lineBasicMaterial color="#2a2622" />
        </lineSegments>
      </group>
      <mesh geometry={plane(0.32, 0.32, 1, 1)} material={M.blob} rotation={[-Math.PI / 2, 0, 0]} position={[0.12, 0.007, -1.02]} />
      <mesh geometry={vaseGeo} material={M.lenca} position={[1.32, 0, -1.48]} />
      <mesh geometry={plane(0.4, 0.4, 1, 1)} material={M.blob} rotation={[-Math.PI / 2, 0, 0]} position={[1.32, 0.007, -1.48]} />

      {/* Under the desk: a school backpack, magazines, the power strip and cables. */}
      <group position={[-0.74, 0, -1.25]} rotation={[0, 0.35, 0.1]}>
        <mesh geometry={rbox(0.3, 0.36, 0.16, 0.06)} material={M.backpack} position={[0, 0.18, 0]} />
        <mesh geometry={rbox(0.22, 0.16, 0.06, 0.04)} material={M.backpackDark} position={[0, 0.12, 0.1]} />
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} geometry={rbox(0.04, 0.3, 0.02, 0.008)} material={M.backpackDark} position={[x, 0.2, -0.09]} />
        ))}
      </group>
      <mesh geometry={plane(0.45, 0.35, 1, 1)} material={M.blob} rotation={[-Math.PI / 2, 0, 0]} position={[-0.74, 0.007, -1.25]} />
      {M.magazines.map((m, i) => (
        <mesh key={`mg${i}`} material={m} position={[-0.02, 0.006 + i * 0.012, -1.45]} rotation={[0, 0.25 * i - 0.2, 0]}>
          <boxGeometry args={box(0.21, 0.01, 0.28)} />
        </mesh>
      ))}
      <mesh geometry={rbox(0.32, 0.04, 0.06, 0.01)} material={M.white} position={[0.3, 0.02, -1.55]} />
      {cables.map((g, i) => (
        <mesh key={`cb${i}`} geometry={g} material={M.cable} />
      ))}

      {/* Office chair, pulled out to the left, with a #10 jersey over the back. */}
      <group position={[-1.05, 0, -0.3]} rotation={[0, 0.7, 0]}>
        <mesh geometry={rbox(0.48, 0.08, 0.46, 0.035)} material={M.chair} position={[0, 0.48, 0]} />
        <mesh geometry={rbox(0.44, 0.62, 0.07, 0.03)} material={M.chair} position={[0, 0.85, -0.22]} rotation={[-0.08, 0, 0]} />
        <mesh geometry={plane(0.4, 0.46, 2, 2)} material={M.jersey} position={[0, 0.9, -0.18]} rotation={[-0.08, 0, 0]} />
        <mesh geometry={geo.cyl6} material={M.black} scale={[0.025, 0.36, 0.025]} position={[0, 0.27, 0]} />
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} material={M.black} position={[Math.cos((i / 5) * Math.PI * 2) * 0.15, 0.06, Math.sin((i / 5) * Math.PI * 2) * 0.15]} rotation={[0, -(i / 5) * Math.PI * 2, 0]}>
            <boxGeometry args={box(0.3, 0.03, 0.04)} />
          </mesh>
        ))}
        <mesh geometry={plane(0.8, 0.8, 1, 1)} material={M.blob} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} />
      </group>

      {/* Dust in the light. */}
      <points ref={dust} geometry={dustGeo}>
        <pointsMaterial color="#ffd9a0" size={0.012} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}
