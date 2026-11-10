// "Un proyecto de código abierto por nerdypunkdev como parte de Todos en la Web", linking the repo,
// nerdypunk.dev and todosenlaweb.com. Shown at the top of the credits and in the pause menu. (The
// bedroom page's footer in Landing.tsx is shorter and doesn't name the author.)
import { useT } from "../i18n";

export function ProjectCredit() {
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
    </p>
  );
}
