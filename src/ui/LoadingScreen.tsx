import { useEffect, useState } from "react";
import { useL10n, useT } from "../i18n";
import { POIS } from "../poi/poiData";

/**
 * Full-screen loader with a progress bar and rotating facts. `done` fades it out;
 * it is unmounted after the fade.
 */
export function LoadingScreen({ progress, done = false }: { progress: number; done?: boolean }) {
  const t = useT();
  const l = useL10n();
  const [fact, setFact] = useState(() => Math.floor(Math.random() * POIS.length));
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setFact((f) => (f + 1) % POIS.length), 5000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setGone(true), 700);
    return () => clearTimeout(id);
  }, [done]);
  if (gone) return null;
  const poi = POIS[fact];
  const pct = Math.round(Math.max(0.03, Math.min(1, progress)) * 100);
  return (
    <div className={done ? "loader loader-done" : "loader"} role="status" aria-live="polite">
      <div className="loader-card">
        <img src="/favicon.svg" alt="" width={64} height={64} className="loader-logo" />
        <h1>{t("title")}</h1>
        <p className="loader-stage">{t(progress < 0.3 ? "loading.terrain" : progress < 0.99 ? "loading.city" : "loading.ready")}</p>
        <div className="loader-bar" aria-hidden="true">
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="loader-fact">
          <p className="eyebrow">{t("loading.didYouKnow")}</p>
          <strong>{l(poi.title)}</strong>
          <p>{l(poi.body).split(/(?<=[.!?])\s/)[0]}</p>
        </div>
      </div>
    </div>
  );
}
