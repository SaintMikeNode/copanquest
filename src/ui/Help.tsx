import { useT } from "../i18n";
import { IS_TOUCH } from "../config";

export function Help() {
  const t = useT();
  return (
    <div className="help">
      {IS_TOUCH ? <p>{t("controls.touch")}</p> : (
        <>
          <p>{t("controls.keys")}</p>
          <p>{t("controls.mouse")}</p>
          <p>{t("controls.more")}</p>
        </>
      )}
      <p>{t("controls.poi")}</p>
      <p>{t("controls.talk")}</p>
      <p className="muted">{t("greybox")}</p>
    </div>
  );
}
