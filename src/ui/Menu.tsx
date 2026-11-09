import { useGame } from "../state/useGame";
import { useT } from "../i18n";
import { LangToggle } from "./LangToggle";
import { Overlay } from "./Overlay";
import { Credits } from "./Credits";
import { Help } from "./Help";

export function Menu() {
  const t = useT();
  const setPlaying = useGame((s) => s.setPlaying);
  const overlay = useGame((s) => s.overlay);
  const setOverlay = useGame((s) => s.setOverlay);
  return (
    <main className="menu">
      <div className="menu-lang">
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
}
