import { useEffect } from "react";
import { useGame } from "../state/useGame";
import { useL10n, useT } from "../i18n";
import { talkInfo, TALKERS } from "../npc/npcData";
import { JADES } from "../world/villageData";
import { POIS } from "../poi/poiData";
import { playerState } from "../player/playerState";

/** "Talk" button / E key when someone is close. */
export function TalkPrompt() {
  const target = useGame((s) => s.talkTarget);
  const dialogue = useGame((s) => s.dialogue);
  const open = useGame((s) => s.openDialogue);
  const t = useT();
  const l = useL10n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE" && e.code !== "Enter") return;
      const g = useGame.getState();
      if (g.dialogue) {
        const info = talkInfo(g.dialogue.id);
        g.nextLine(info?.lines.length ?? 0);
      } else if (g.talkTarget) g.openDialogue(g.talkTarget);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!target || dialogue) return null;
  const info = talkInfo(target);
  if (!info) return null;
  return (
    <button className="talk-prompt" onClick={() => open(target)}>
      <span className="talk-key">E</span> {t(info.verb)} · {l(info.name)}
    </button>
  );
}

export function DialogueBox() {
  const dialogue = useGame((s) => s.dialogue);
  const next = useGame((s) => s.nextLine);
  const close = useGame((s) => s.closeDialogue);
  const t = useT();
  const l = useL10n();
  useEffect(() => {
    playerState.frozen = !!dialogue;
  }, [dialogue]);
  if (!dialogue) return null;
  const info = talkInfo(dialogue.id);
  if (!info) return null;
  const last = dialogue.line >= info.lines.length - 1;
  return (
    <section className="dialogue" aria-live="polite">
      <header>
        <h2>{l(info.name)}</h2>
        <button className="icon-btn" onClick={close} aria-label={t("close")}>
          ×
        </button>
      </header>
      <p>{l(info.lines[dialogue.line])}</p>
      <footer>
        <span className="dots">
          {info.lines.map((_, i) => (
            <i key={i} className={i === dialogue.line ? "on" : ""} />
          ))}
        </span>
        <button className="primary small" onClick={() => next(info.lines.length)}>
          {last ? t("close") : t("next")} ▸
        </button>
      </footer>
    </section>
  );
}

/** Progress chips: jade found, places visited, people met. */
export function Progress() {
  const jades = useGame((s) => s.jades.length);
  const places = useGame((s) => s.places.length);
  const met = useGame((s) => s.met.filter((m) => !m.startsWith("jaguar")).length);
  const t = useT();
  return (
    <div className="progress">
      <span className="chip jade-chip">
        <i className="jade-icon" /> {jades}/{JADES.length}
      </span>
      <span className="chip">
        {t("places")} {places}/{POIS.length}
      </span>
      <span className="chip">
        {t("people")} {met}/{TALKERS.length}
      </span>
    </div>
  );
}

export function Toast() {
  const toast = useGame((s) => s.toast);
  if (!toast) return null;
  return (
    <div key={toast.key} className="toast">
      {toast.text}
    </div>
  );
}
