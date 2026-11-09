import { useEffect, useMemo } from "react";
import { scriptFor, type Script } from "../game/questLogic";
import { MayaClock, RankChip } from "./GameUI";
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
      if (g.dialogue) advance();
      else if (g.talkTarget) g.openDialogue(g.talkTarget);
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

/** The script of the open dialogue (computed once when it opens). */
let current: Script | null = null;

/** Next line, or close and run the script's end action. */
function advance() {
  const g = useGame.getState();
  if (!g.dialogue || !current) return;
  if (g.dialogue.line + 1 >= current.lines.length) {
    const end = current.onEnd;
    g.closeDialogue();
    end?.();
  } else g.nextLine(current.lines.length);
}

export function DialogueBox() {
  const dialogue = useGame((s) => s.dialogue);
  const close = useGame((s) => s.closeDialogue);
  const t = useT();
  const l = useL10n();
  const dialogueId = dialogue?.id ?? null;
  const script = useMemo(() => (dialogueId ? scriptFor(dialogueId) : null), [dialogueId]);
  current = script;
  useEffect(() => {
    playerState.frozen = !!dialogue;
  }, [dialogue]);
  if (!dialogue || !script) return null;
  const info = script;
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
        <button className="primary small" onClick={advance}>
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
      <RankChip />
      <MayaClock />
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
