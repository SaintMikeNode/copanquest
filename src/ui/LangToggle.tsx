import { useGame } from "../state/useGame";

export function LangToggle() {
  const lang = useGame((s) => s.lang);
  const setLang = useGame((s) => s.setLang);
  return (
    <div className="lang-toggle" role="group" aria-label="Idioma / Language">
      <button aria-pressed={lang === "es"} onClick={() => setLang("es")}>ES</button>
      <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
    </div>
  );
}
