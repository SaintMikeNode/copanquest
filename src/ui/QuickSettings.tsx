import { useGame } from "../state/useGame";
import { useT } from "../i18n";
import { LangToggle } from "./LangToggle";
import { SoundToggle } from "./SoundToggle";
import { exitToHome } from "./exitToHome";

/**
 * Language, sound, plus controls and "go home" (journal only: the pause menu has its own),
 * in the pause menu (Esc) and the journal (E / book button).
 * They used to sit in the HUD; here they are one tap away without covering the game.
 */
export function QuickSettings({ controls = false, home = false }: { controls?: boolean; home?: boolean }) {
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
      {controls && (
        <button className="px-btn" onClick={() => useGame.getState().setOverlay("help")}>
          {t("help")}
        </button>
      )}
      {home && (
        <button className="px-btn" onClick={exitToHome}>
          🏠 {t("home")}
        </button>
      )}
    </div>
  );
}
