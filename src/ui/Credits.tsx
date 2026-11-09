import { useT } from "../i18n";
import { CREDITS } from "./creditsData";
import { useGame } from "../state/useGame";

export function Credits() {
  const t = useT();
  const lang = useGame((s) => s.lang);
  return (
    <div className="credits">
      <p>{t("credits.intro")}</p>
      {CREDITS.map((group) => (
        <section key={group.heading}>
          <h3>{t(group.heading)}</h3>
          <ul>
            {group.items.map((it) => (
              <li key={it.title}>
                <a href={it.url} target="_blank" rel="noreferrer">
                  {it.title}
                </a>
                {it.credit && <> — {typeof it.credit === "string" ? it.credit : it.credit[lang]}</>}
                {it.license && <span className="license"> ({it.license})</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
