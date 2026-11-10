// The record box: opens from the record player on the bedroom desk. Same look as the credits
// book (CreditsBook.tsx) and the start menu's card, floating over the 3D room.
// A record sleeve with the disc sliding out (it spins while the music plays), what's playing,
// who made it, where it comes from, and a play / pause button. Tap outside it or press Esc to close.
import { useT } from "../i18n";
import { useRecord, useSound } from "../audio/sound";

const LOC = "https://www.loc.gov/item/jukebox-11139/";
const ARCHIVE = "https://archive.org/details/loc-jukebox-11139-la-muerte-del-bardo";

export function RecordBox({ onClose }: { onClose: () => void }) {
  const t = useT();
  const spinning = useRecord((s) => s.spinning);
  const wanted = useRecord((s) => s.wanted);
  const music = useSound((s) => s.music);
  const playing = wanted && music;
  return (
    <div className="maya-modal" onClick={onClose}>
      <section className="maya-window book book-single" role="dialog" aria-modal="true" aria-labelledby="record-title" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" onClick={onClose} aria-label={t("record.close")}>
          ×
        </button>
        <article className="book-page record-page">
          <div className="record-art" aria-hidden="true">
            <div className={spinning ? "record-disc spin" : "record-disc"}>
              <span className="record-label">
                <b>ADALID</b>
                <i>1914</i>
              </span>
            </div>
            <div className="record-sleeve">
              <span>♪</span>
            </div>
          </div>
          <div className="record-info">
            <p className="book-kicker">{t("record.kicker")}</p>
            <h2 id="record-title">La muerte del bardo</h2>
            <p className="record-kind">{t("record.kind")}</p>
            <h3>{t("record.composer")}</h3>
            <p>Manuel de Adalid y Gamero</p>
            <p className="book-note">{t("record.composerNote")}</p>
            <h3>{t("record.performers")}</h3>
            <p>{t("record.trio")}</p>
            <h3>{t("record.recorded")}</h3>
            <p>{t("record.recordedNote")}</p>
            <p className="book-note">{t("record.rights")}</p>
            <div className="book-actions">
              <button className="primary" onClick={() => useRecord.getState().toggle()}>
                {playing ? `❚❚ ${t("record.pause")}` : `▶ ${t("record.play")}`}
              </button>
            </div>
            <p className="book-links">
              <a href={LOC} target="_blank" rel="noopener noreferrer">
                {t("record.loc")} ↗
              </a>
              <a href={ARCHIVE} target="_blank" rel="noopener noreferrer">
                Internet Archive ↗
              </a>
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
