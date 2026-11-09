import { useEffect, useMemo, useRef } from "react";
import { buildGreybox } from "../world/buildGreybox";
import { BOUNDS, BLOCKS, MAP_LABELS, OPEN_AREAS, PATHS, TERRAIN_SCULPT } from "../world/siteData";
import { POIS } from "../poi/poiData";
import { HOUSEHOLDS } from "../world/villageData";
import { playerState } from "../player/playerState";
import { useGame } from "../state/useGame";
import { useL10n } from "../i18n";

const PAD = 6;
const W = BOUNDS.maxX - BOUNDS.minX;
const D = BOUNDS.maxZ - BOUNDS.minZ;

/** Top-down plan of the site (north up) with the player and their view direction. */
export function Minimap({ large = false }: { large?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const l = useL10n();
  const lang = useGame((s) => s.lang);
  const footprints = useMemo(() => buildGreybox().footprints, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const cssW = large ? Math.min(window.innerWidth - 32, (window.innerHeight - 120) * (W / D)) : 110;
    const cssH = (cssW * D) / W;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round((cssW + PAD * 2) * dpr);
    canvas.height = Math.round((cssH + PAD * 2) * dpr);
    canvas.style.width = `${cssW + PAD * 2}px`;
    canvas.style.height = `${cssH + PAD * 2}px`;
    const k = cssW / W;
    const X = (x: number) => PAD + (x - BOUNDS.minX) * k;
    const Z = (z: number) => PAD + (z - BOUNDS.minZ) * k;

    // Static plan, drawn once into an offscreen canvas.
    const base = document.createElement("canvas");
    base.width = canvas.width;
    base.height = canvas.height;
    const b = base.getContext("2d")!;
    b.scale(dpr, dpr);
    b.fillStyle = "#4f8f3a";
    b.fillRect(0, 0, cssW + PAD * 2, cssH + PAD * 2);
    b.fillStyle = "#7fbf52";
    for (const [x0, z0, x1, z1] of OPEN_AREAS) b.fillRect(X(x0), Z(z0), (x1 - x0) * k, (z1 - z0) * k);
    const river = TERRAIN_SCULPT[0];
    b.fillStyle = "#3f8fd8";
    b.fillRect(X(river.minX + 5), Z(river.minZ), (river.maxX - river.minX) * k, (river.maxZ - river.minZ) * k);
    b.strokeStyle = "#cf7f50";
    b.lineCap = "round";
    b.lineJoin = "round";
    for (const p of PATHS) {
      b.lineWidth = Math.max(1.2, p.width * k);
      b.beginPath();
      p.points.forEach(([x, z], i) => (i ? b.lineTo(X(x), Z(z)) : b.moveTo(X(x), Z(z))));
      b.stroke();
    }
    for (const blk of BLOCKS) {
      if (blk.id !== "sacbe") continue;
      const [x, , z] = blk.position;
      const [w, , d] = blk.size;
      b.fillStyle = "#d8cba9";
      b.save();
      b.translate(X(x), Z(z));
      b.rotate(-(blk.rotation?.[1] ?? 0));
      b.fillRect((-w / 2) * k, (-d / 2) * k, w * k, d * k);
      b.restore();
    }
    for (const f of footprints) {
      b.fillStyle = f.color;
      b.strokeStyle = "rgba(40,20,10,0.5)";
      b.lineWidth = 0.6;
      const [x0, z0, x1, z1] = f.rect;
      b.fillRect(X(x0), Z(z0), (x1 - x0) * k, (z1 - z0) * k);
      b.strokeRect(X(x0), Z(z0), (x1 - x0) * k, (z1 - z0) * k);
    }
    // Thatched houses of the wards.
    b.fillStyle = "#c9a24e";
    for (const hh of HOUSEHOLDS)
      for (const h of hh.houses) b.fillRect(X(h.at[0] - h.size[0] / 2), Z(h.at[1] - h.size[1] / 2), h.size[0] * k, h.size[1] * k);
    b.fillStyle = "#f2c14e";
    for (const p of POIS) {
      b.beginPath();
      b.arc(X(p.position[0]), Z(p.position[1]), large ? 3 : 1.6, 0, Math.PI * 2);
      b.fill();
    }
    if (large) {
      b.font = "600 12px system-ui, sans-serif";
      b.textAlign = "center";
      b.fillStyle = "#1d1a14";
      for (const lab of MAP_LABELS) b.fillText(l(lab.text), X(lab.position[0]), Z(lab.position[1]));
    }
    b.font = `700 ${large ? 13 : 9}px system-ui, sans-serif`;
    b.fillStyle = "#fff";
    b.textAlign = "left";
    b.fillText("N ↑", PAD + 2, PAD + (large ? 14 : 9));

    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 100) return; // 10 fps is plenty
      last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(base, 0, 0);
      ctx.scale(dpr, dpr);
      const px = X(playerState.position.x);
      const pz = Z(playerState.position.z);
      // View wedge: camera yaw 0 looks north (−z), which is "up" on the map.
      const yaw = playerState.viewYaw;
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const r = large ? 26 : 14;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(px, pz);
      const a = Math.atan2(fz, fx);
      ctx.arc(px, pz, r, a - 0.5, a + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c0392b";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, pz, large ? 5 : 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [large, footprints, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={canvasRef} className={large ? "minimap minimap-large" : "minimap"} />;
}
