import { useGame } from "../state/useGame";
import { MayaBackground } from "./MayaBackground";
import { useT } from "../i18n";
import { LangToggle } from "./LangToggle";
import { SoundToggle } from "./SoundToggle";
import { Overlay } from "./Overlay";
import { Credits } from "./Credits";
import { Help } from "./Help";

/**
 * Start menu. `crt`: shown "inside" the bedroom computer's monitor (Landing.tsx), with a
 * beige bezel, scanlines and a Volver button that zooms back out.
 */
export function Menu({ crt = false, onBack }: { crt?: boolean; onBack?: () => void } = {}) {
  const t = useT();
  const setPlaying = useGame((s) => s.setPlaying);
  const overlay = useGame((s) => s.overlay);
  const setOverlay = useGame((s) => s.setOverlay);
  const menu = (
    <main className="menu">
      <MayaBackground />
      <div className="menu-lang">
        <SoundToggle />
        <LangToggle />
      </div>
      <div className="menu-card">
        <img src="/favicon.svg" alt="" width={72} height={72} />
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
        <button className="primary" onClick={() => setPlaying(true)}>
          {t("play")}
        </button>
        <div className="menu-row">
          <button onClick={() => setOverlay("help")}>{t("help")}</button>
          <button onClick={() => setOverlay("credits")}>{t("credits")}</button>
        </div>
      </div>
      {overlay === "credits" && (
        <Overlay title={t("credits")} onClose={() => setOverlay(null)}>
          <Credits />
        </Overlay>
      )}
      {overlay === "help" && (
        <Overlay title={t("help")} onClose={() => setOverlay(null)}>
          <Help />
        </Overlay>
      )}
    </main>
  );
  if (!crt) return menu;
  return (
    <div className="crt">
      <div className="crt-glass">
        {menu}
        <div className="crt-fx" aria-hidden="true" />
      </div>
      {onBack && (
        <button className="pill crt-back" onClick={onBack}>
          ◀ {t("back")}
        </button>
      )}
    </div>
  );
}
