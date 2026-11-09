import { useGame } from "../state/useGame";
import es from "./es.json";
import en from "./en.json";

export type Lang = "es" | "en";
export type Key = keyof typeof es;
/** Text that exists in both languages (used by site/POI data files). */
export type L10n = { es: string; en: string };

const dictionaries: Record<Lang, Record<Key, string>> = { es, en };

/** Returns t(key) for the current language. Spanish is the source of truth. */
export function useT() {
  const lang = useGame((s) => s.lang);
  return (key: Key) => dictionaries[lang][key] ?? dictionaries.es[key] ?? key;
}

/** Non-hook translator (for code outside React render). */
export function getT() {
  const lang = useGame.getState().lang;
  return (key: Key) => dictionaries[lang][key] ?? dictionaries.es[key] ?? key;
}

export function useL10n() {
  const lang = useGame((s) => s.lang);
  return (text: L10n) => text[lang] || text.es;
}
