import { useGame } from "../state/useGame";
import { useT } from "../i18n";
import { IS_TOUCH } from "../config";
import { Minimap } from "./Minimap";
import { InfoCard } from "./InfoCard";
import { TouchControls } from "./TouchControls";
import { DebugOverlay } from "./DebugOverlay";
import { Overlay } from "./Overlay";
import { Credits } from "./Credits";
import { Help } from "./Help";
import { LangToggle } from "./LangToggle";

export function Hud() {
  const t = useT();
  const overlay = useGame((s) => s.overlay);
  const setOverlay = useGame((s) => s.setOverlay);
  const close = () => setOverlay(null);
  return (
    <div className="hud">
      <div className="hud-top-left">
        <LangToggle />
        <button className="pill" onClick={() => setOverlay("help")}>?</button>
        <button className="pill" onClick={() => setOverlay("credits")}>{t("credits")}</button>
        <DebugOverlay />
      </div>
      <button className="hud-map" onClick={() => setOverlay("map")} aria-label={t("map")}>
        <Minimap />
      </button>
      <InfoCard />
      {IS_TOUCH && !overlay && <TouchControls />}
      {overlay === "map" && (
        <Overlay title={t("map")} onClose={close}>
          <Minimap large />
        </Overlay>
      )}
      {overlay === "credits" && (
        <Overlay title={t("credits")} onClose={close}>
          <Credits />
        </Overlay>
      )}
      {overlay === "help" && (
        <Overlay title={t("help")} onClose={close}>
          <Help />
        </Overlay>
      )}
    </div>
  );
}
