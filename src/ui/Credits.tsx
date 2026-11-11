import { useT } from "../i18n";
import { CREDITS } from "./creditsData";
import { useGame } from "../state/useGame";
import { ProjectCredit } from "./ProjectCredit";

/** `contact`: the email line under the author credit (the credits book already shows it on its
 *  left page, so it turns this one off). */
export function Credits({ contact = true }: { contact?: boolean }) {
  const t = useT();
  const lang = useGame((s) => s.lang);
  return (
    <div className="credits">
      <ProjectCredit contact={contact} />
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
                {it.license && <span className="license"> ({typeof it.license === "string" ? it.license : it.license[lang]})</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
