// The credits book: opens from the book on the bedroom desk (or the Créditos button). Styled like
// the start menu's card (dark jade, wood frame, leaf trim), floating over the 3D room: "how it
// was made" on the left, the full credits on the right. On narrow screens one page at a time.
import { useState } from "react";
import { useL10n, useT } from "../i18n";
import { Credits } from "../ui/Credits";
import { ABOUT } from "./aboutData";

const REPO = "https://github.com/SaintMikeNode/copanquest";

export function CreditsBook({ onClose }: { onClose: () => void }) {
  const t = useT();
  const l = useL10n();
  const [page, setPage] = useState<0 | 1>(0);
  return (
    <div className="maya-modal" onClick={onClose}>
      <section className={`maya-window book book-show-${page}`} role="dialog" aria-modal="true" aria-labelledby="book-title" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" onClick={onClose} aria-label={t("close")}>
          ×
        </button>
        <nav className="book-tabs">
          <button className={page === 0 ? "primary" : "px-btn"} onClick={() => setPage(0)}>
            {t("book.about")}
          </button>
          <button className={page === 1 ? "primary" : "px-btn"} onClick={() => setPage(1)}>
            {t("credits")}
          </button>
        </nav>
        <article className="book-page book-left">
          <h2 id="book-title">{t("book.about")}</h2>
          {ABOUT.map((s) => (
            <section key={s.title.en}>
              <h3>{l(s.title)}</h3>
              {s.items.map((it) => (
                <p key={it.en}>{l(it)}</p>
              ))}
              {s.links && (
                <p className="book-links">
                  <a href={REPO} target="_blank" rel="noopener noreferrer">
                    GitHub ↗
                  </a>
                  <a href="https://nerdypunk.dev" target="_blank" rel="noopener noreferrer">
                    nerdypunk.dev ↗
                  </a>
                  <a href="https://todosenlaweb.com" target="_blank" rel="noopener noreferrer">
                    todosenlaweb.com ↗
                  </a>
                </p>
              )}
            </section>
          ))}
        </article>
        <article className="book-page book-right">
          <h2>{t("credits")}</h2>
          <Credits />
        </article>
      </section>
    </div>
  );
}
