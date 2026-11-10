import { useGame } from "../state/useGame";
import { useL10n, useT } from "../i18n";
import { POI_BY_ID } from "../poi/poiData";
import { useExit } from "./presence";

export function InfoCard({ hidden = false }: { hidden?: boolean }) {
  const active = useGame((s) => s.activePoi);
  const dismissed = useGame((s) => s.dismissedPoi);
  const dismiss = useGame((s) => s.dismissPoi);
  const t = useT();
  const l = useL10n();
  const [id, leaving] = useExit(!hidden && active && active !== dismissed ? active : null);
  if (!id) return null;
  const poi = POI_BY_ID[id];
  if (!poi) return null;
  return (
    // Keyed by place, so walking from one place straight into the next plays the entrance again.
    <section key={id} className={leaving ? "info-card ui-leave" : "info-card"} aria-live="polite">
      <header>
        <p className="eyebrow">{t("nearby")}</p>
        <h2>{l(poi.title)}</h2>
        {poi.date && <p className="date">{l(poi.date)}</p>}
        <button className="icon-btn" onClick={dismiss} aria-label={t("close")}>
          ×
        </button>
      </header>
      <p>{l(poi.body)}</p>
      {poi.source && <p className="source">{poi.source}</p>}
    </section>
  );
}
