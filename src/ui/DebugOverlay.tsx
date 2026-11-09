import { useEffect, useState } from "react";
import { perfStats } from "../world/PerfProbe";
import { playerState } from "../player/playerState";
import { useGame, type Quality } from "../state/useGame";
import { useT } from "../i18n";
import { DEV_TOOLS } from "../config";
import { voxelStats } from "../voxel/VoxelTerrain";

/** Always-on FPS counter; expands into a debug panel (F3, or tap the counter). */
export function DebugOverlay() {
  const t = useT();
  const [, tick] = useState(0);
  const showDebug = useGame((s) => s.showDebug);
  const toggleDebug = useGame((s) => s.toggleDebug);
  const physicsDebug = useGame((s) => s.physicsDebug);
  const togglePhysicsDebug = useGame((s) => s.togglePhysicsDebug);
  const quality = useGame((s) => s.quality);
  const setQuality = useGame((s) => s.setQuality);
  const autoLevel = useGame((s) => s.autoLevel);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 500);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "F3") {
        e.preventDefault();
        toggleDebug();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [toggleDebug]);

  const p = playerState.position;
  return (
    <div className="debug">
      <button className="fps" onClick={toggleDebug}>
        {perfStats.fps} {t("fps")}
      </button>
      {showDebug && (
        <div className="debug-panel">
          <strong>{t("debug.title")}</strong>
          <div>
            draw calls {perfStats.calls} · tris {(perfStats.triangles / 1000).toFixed(1)}k · dpr {perfStats.dpr.toFixed(2)}
          </div>
          <div>
            voxels {voxelStats.ms} ms · near {(voxelStats.nearTriangles / 1000).toFixed(0)}k / all{" "}
            {(voxelStats.triangles / 1000).toFixed(0)}k tris · {(voxelStats.plants / 1000).toFixed(1)}k plants
          </div>
          <div>
            x {p.x.toFixed(1)} · y {p.y.toFixed(1)} · z {p.z.toFixed(1)} {playerState.grounded ? "· ⏚" : ""}
          </div>
          <label>
            {t("quality")}{" "}
            <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
              {(["auto", "high", "low"] as const).map((q) => (
                <option key={q} value={q}>
                  {t(`quality.${q}`)}
                  {q === "auto" ? ` (${t(`quality.${autoLevel}`)})` : ""}
                </option>
              ))}
            </select>
          </label>
          {DEV_TOOLS && (
            <label>
              <input type="checkbox" checked={physicsDebug} onChange={togglePhysicsDebug} /> {t("debug.physics")}
            </label>
          )}
        </div>
      )}
    </div>
  );
}
