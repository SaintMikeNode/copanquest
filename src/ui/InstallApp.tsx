// "Instalar app" (phones and tablets only): opens the browser's install dialog on Android /
// Chrome, or shows the steps where there isn't one (iPhone, or Chrome before it offers it).
// Hidden when the game is already running as an installed app.
import { useState } from "react";
import { useT } from "../i18n";
import { IS_TOUCH } from "../config";
import { isIOS, promptInstall, useInstall } from "../installApp";
import { Overlay } from "./Overlay";
import { Presence } from "./presence";

export function InstallApp({ className = "px-btn" }: { className?: string }) {
  const t = useT();
  const installed = useInstall((s) => s.installed);
  const [steps, setSteps] = useState(false);
  if (!IS_TOUCH || installed) return null;
  const click = async () => {
    if (!(await promptInstall())) setSteps(true);
  };
  return (
    <>
      <button className={`${className} install-app`} onClick={click}>
        📲 {t("install")}
      </button>
      <Presence show={steps}>
        <Overlay title={`📲 ${t("install")}`} onClose={() => setSteps(false)}>
          <div className="install-steps">
            <p>{t("install.why")}</p>
            <ol>
              {(isIOS() ? ["install.ios1", "install.ios2", "install.ios3"] : ["install.and1", "install.and2", "install.and3"]).map((k) => (
                <li key={k}>{t(k as Parameters<typeof t>[0])}</li>
              ))}
            </ol>
            <button className="primary" onClick={() => setSteps(false)}>
              {t("close")}
            </button>
          </div>
        </Overlay>
      </Presence>
    </>
  );
}
