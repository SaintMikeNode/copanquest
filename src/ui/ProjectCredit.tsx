// "Un proyecto de código abierto por nerdypunkdev como parte de Todos en la Web", linking the repo,
// nerdypunk.dev and todosenlaweb.com, and the contact email on a second line. Shown at the top of
// the credits and in the pause menu. (The bedroom page's footer in Landing.tsx is shorter and
// doesn't name the author.)
import { useT } from "../i18n";

/** Contact email shown under the author credit and in the credits book. */
export const CONTACT = "hola@saintmikenode.org";

/** `contact`: the email line (off in the credits book, whose left page already shows it). */
export function ProjectCredit({ contact = true }: { contact?: boolean }) {
  const t = useT();
  return (
    <p className="project-credit">
      {t("footer.a")}{" "}
      <a href="https://github.com/SaintMikeNode/copanquest" target="_blank" rel="noopener noreferrer">
        {t("footer.project")}
      </a>{" "}
      {t("footer.by")}{" "}
      <a href="https://nerdypunk.dev" target="_blank" rel="noopener noreferrer">
        nerdypunkdev
      </a>{" "}
      {t("footer.partOf")}{" "}
      <a href="https://todosenlaweb.com" target="_blank" rel="noopener noreferrer">
        Todos en la Web
      </a>
      {contact && (
        <span className="credits-contact">
          {t("book.contact")}: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </span>
      )}
    </p>
  );
}
