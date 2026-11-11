import { useT } from "../i18n";
import { CREDITS } from "./creditsData";
import { useGame } from "../state/useGame";
import { ProjectCredit } from "./ProjectCredit";

/** `credit`: the author credit line at the top; `contact`: the email line under it. The credits
 *  book turns both off: its "Cómo se hizo" page already says who made it and shows the email. */
export function Credits({ credit = true, contact = true }: { credit?: boolean; contact?: boolean }) {
  const t = useT();
  const lang = useGame((s) => s.lang);
  return (
    <div className="credits">
      {credit && <ProjectCredit contact={contact} />}
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
