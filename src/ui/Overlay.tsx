import type { ReactNode } from "react";
import { useT } from "../i18n";

export function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useT();
  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="overlay-box" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("close")}>
            ×
          </button>
        </header>
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}
