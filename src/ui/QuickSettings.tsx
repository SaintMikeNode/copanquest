import { useGame } from "../state/useGame";
import { useT } from "../i18n";
import { LangToggle } from "./LangToggle";
import { SoundToggle } from "./SoundToggle";

/**
 * Language, sound and credits, in the pause menu (Esc) and the journal (E / book button).
 * They used to sit in the HUD; here they are one tap away without covering the game.
 */
export function QuickSettings() {
  const t = useT();
  return (
    <div className="quick-settings">
      <label>
        <span>{t("language")}</span>
        <LangToggle />
      </label>
      <label>
        <span>{t("sound.title")}</span>
        <SoundToggle />
      </label>
      <button className="px-btn" onClick={() => useGame.getState().setOverlay("credits")}>
        {t("credits")}
      </button>
    </div>
  );
}
