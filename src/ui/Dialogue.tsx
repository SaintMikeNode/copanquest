import { useEffect, useRef } from "react";
import { scriptFor, type Script } from "../game/questLogic";
import { MayaClock, RankChip } from "./GameUI";
import { useGame } from "../state/useGame";
import { useL10n, useT } from "../i18n";
import { isMainPerson, talkInfo, TALKERS } from "../npc/npcData";
import { JADES } from "../world/villageData";
import { POIS } from "../poi/poiData";
import { playerState } from "../player/playerState";
import { IS_TOUCH } from "../config";
import { useExit } from "./presence";

/** Key chip on the prompts: a mouse with its right button lit (none on touch, where you tap the
 * button itself). The words stay as the accessible label and tooltip. */
export function InteractKey() {
  const t = useT();
  if (IS_TOUCH) return null;
  return (
    <span className="talk-key mouse-key" role="img" aria-label={t("key.interact")} title={t("key.interact")}>
      <svg viewBox="0 0 16 22" width="14" height="19" aria-hidden="true">
        <path d="M8.6 1.6A6.4 6.4 0 0 1 14.4 8v1H8.6z" fill="#ffd95a" />
        <rect x="1.6" y="1.6" width="12.8" height="18.8" rx="6.4" fill="none" stroke="#fff" strokeWidth="1.6" />
        <path d="M8 1.6V9M1.6 9h12.8" stroke="#fff" strokeWidth="1.4" />
      </svg>
    </span>
  );
}

/** "Talk" button / right click when someone is close. Enter also advances a dialogue. */
export function TalkPrompt() {
  const target = useGame((s) => s.talkTarget);
  const dialogue = useGame((s) => s.dialogue);
  const open = useGame((s) => s.openDialogue);
  const t = useT();
  const l = useL10n();
  useEffect(() => {
    const interact = () => {
      const g = useGame.getState();
      if (g.overlay) return;
      if (g.dialogue) advance();
      else if (g.talkTarget) g.openDialogue(g.talkTarget);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" && useGame.getState().dialogue) advance();
    };
    window.addEventListener("cq-interact", interact);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("cq-interact", interact);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  const [who, leaving] = useExit(!dialogue && target);
  if (!who) return null;
  const info = talkInfo(who);
  if (!info) return null;
  return (
    <button className={leaving ? "talk-prompt ui-leave" : "talk-prompt"} onClick={() => open(who)} data-tut="talk">
      <InteractKey /> {t(info.verb)} · {l(info.name)}
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
  // While it closes, the last line stays on screen for the exit animation.
  const [shown, leaving] = useExit(dialogue);
  const dialogueId = shown?.id ?? null;
  // The script is built once when the conversation opens and kept until the box is gone: its end
  // action often changes the quest state, and rebuilding it then would give a different (shorter)
  // script than the line numbers being shown.
  // A conversation opens as a fresh { id, line: 0 } object (openDialogue), even with the same person.
  const kept = useRef<{ id: string; opened: unknown; script: Script | null } | null>(null);
  if (!dialogueId) kept.current = null;
  else if (dialogue && (!kept.current || kept.current.id !== dialogue.id || (dialogue.line === 0 && kept.current.opened !== dialogue))) {
    kept.current = { id: dialogue.id, opened: dialogue, script: scriptFor(dialogue.id) };
  }
  const script = kept.current?.script ?? null;
  current = dialogue ? script : null;
  useEffect(() => {
    playerState.frozen = !!dialogue;
  }, [dialogue]);
  if (!shown || !script) return null;
  const info = script;
  const lineText = info.lines[Math.min(shown.line, info.lines.length - 1)];
  if (!lineText) return null;
  const last = shown.line >= info.lines.length - 1;
  return (
    <section key={shown.id} className={leaving ? "dialogue ui-leave" : "dialogue"} aria-live="polite">
      <header>
        <h2>{l(info.name)}</h2>
        <button className="icon-btn" onClick={close} aria-label={t("close")}>
          ×
        </button>
      </header>
      {/* Keyed by line, so each new line slides in. */}
      <p key={shown.line} className="dialogue-line">
        {l(lineText)}
      </p>
      <footer>
        <span className="dots">
          {info.lines.map((_, i) => (
            <i key={i} className={i === shown.line ? "on" : ""} />
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
  const met = useGame((s) => s.met.filter(isMainPerson).length);
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
