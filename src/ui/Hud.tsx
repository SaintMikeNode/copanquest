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
import { DialogueBox, Progress, TalkPrompt, Toast } from "./Dialogue";
import { ActionPrompt, CameraOverlay, GlyphPuzzle, HudButtons, Journal } from "./GameUI";
import { useCamera } from "../game/camera";

export function Hud() {
  const t = useT();
  const overlay = useGame((s) => s.overlay);
  const dialogue = useGame((s) => s.dialogue);
  const camOn = useCamera((s) => s.active);
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
      <Progress />
      <HudButtons />
      <CameraOverlay />
      {!dialogue && !camOn && <InfoCard />}
      {!camOn && <TalkPrompt />}
      {!camOn && !dialogue && <ActionPrompt />}
      <DialogueBox />
      <Toast />
      {IS_TOUCH && !overlay && !dialogue && <TouchControls />}
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
      {overlay === "journal" && <Journal />}
      {overlay === "glyphs" && <GlyphPuzzle />}
      {overlay === "help" && (
        <Overlay title={t("help")} onClose={close}>
          <Help />
        </Overlay>
      )}
    </div>
  );
}
