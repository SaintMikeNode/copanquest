import { useGame } from "../state/useGame";
import { GameTitle } from "./GameTitle";
import { MayaBackground } from "./MayaBackground";
import { useT } from "../i18n";
import { LangToggle } from "./LangToggle";
import { SoundToggle } from "./SoundToggle";
import { Overlay } from "./Overlay";
import { Credits } from "./Credits";
import { Help } from "./Help";
import { Presence } from "./presence";
import { ReportBug } from "./ReportBug";
import { InstallApp } from "./InstallApp";

/**
 * Start menu. `crt`: shown "inside" the bedroom computer's monitor (Landing.tsx), with a
 * beige bezel, scanlines and a Volver button (top left, on the same row as the sound and language
 * buttons on the right) that zooms back out.
 */
export function Menu({ crt = false, onBack }: { crt?: boolean; onBack?: () => void } = {}) {
  const t = useT();
  const setPlaying = useGame((s) => s.setPlaying);
  const overlay = useGame((s) => s.overlay);
  const setOverlay = useGame((s) => s.setOverlay);
  const menu = (
    <main className="menu">
      <MayaBackground />
      {onBack && (
        <button className="primary menu-back" onClick={onBack}>
          ◀ {t("back")}
        </button>
      )}
      <div className="menu-lang">
        <SoundToggle />
        <LangToggle />
      </div>
      <div className="menu-card">
        <img src="/favicon.svg" alt="" width={72} height={72} />
        <h1>
          <GameTitle />
        </h1>
        <p>{t("subtitle")}</p>
        <button className="primary" onClick={() => setPlaying(true)}>
          {t("play")}
        </button>
        <div className="menu-row">
          <button onClick={() => setOverlay("help")}>{t("help")}</button>
          <button onClick={() => setOverlay("credits")}>{t("credits")}</button>
        </div>
        <div className="menu-row menu-extra">
          <InstallApp className="px-btn menu-small" />
          <ReportBug className="px-btn menu-small" />
        </div>
      </div>
      <Presence show={overlay === "credits"}>
        <Overlay title={t("credits")} onClose={() => setOverlay(null)}>
          <Credits />
        </Overlay>
      </Presence>
      <Presence show={overlay === "help"}>
        <Overlay title={t("help")} onClose={() => setOverlay(null)}>
          <Help />
        </Overlay>
      </Presence>
    </main>
  );
  if (!crt) return menu;
  return (
    <div className="crt">
      <div className="crt-glass">
        {menu}
        <div className="crt-fx" aria-hidden="true" />
      </div>
    </div>
  );
}
