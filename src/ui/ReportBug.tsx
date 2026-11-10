// "Reportar un error": opens an email to the project with a short template and the details that
// help reproduce a bug (page, browser, screen). Nothing is sent until the player sends the email.
import { useGame } from "../state/useGame";
import { useT } from "../i18n";

const TO = "hola@saintmikenode.com";

function href(lang: "es" | "en") {
  const es = lang === "es";
  const subject = es ? "CopánQuest: reporte de error" : "CopánQuest: bug report";
  const body = [
    es ? "¿Qué pasó?" : "What happened?",
    "",
    "",
    es ? "¿Qué estabas haciendo justo antes?" : "What were you doing right before?",
    "",
    "",
    "—",
    `${es ? "Página" : "Page"}: ${location.href}`,
    `${es ? "Navegador" : "Browser"}: ${navigator.userAgent}`,
    `${es ? "Pantalla" : "Screen"}: ${innerWidth}×${innerHeight} @${devicePixelRatio}x`,
  ].join("\n");
  return `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** A wooden button (`className` adds the menu's own layout) that opens the bug-report email. */
export function ReportBug({ className = "px-btn" }: { className?: string }) {
  const t = useT();
  const lang = useGame((s) => s.lang);
  return (
    // Built on click, so the screen size and page are the current ones.
    <a className={`${className} report-bug`} href={`mailto:${TO}`} onClick={(e) => ((e.currentTarget as HTMLAnchorElement).href = href(lang))}>
      🐞 {t("report")}
    </a>
  );
}
