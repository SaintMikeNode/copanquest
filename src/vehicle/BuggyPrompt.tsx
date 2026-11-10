// "Get in" next to the buggy, and "Get out" plus the controls while driving.
import { useGame } from "../state/useGame";
import { useT } from "../i18n";
import { IS_TOUCH } from "../config";
import { InteractKey } from "../ui/Dialogue";
import { useExit } from "../ui/presence";
import { lockedKey, useBuggy } from "./buggyState";
import { useProgress } from "../state/progress";

export function BuggyPrompt() {
  const t = useT();
  const near = useBuggy((s) => s.near);
  const driving = useBuggy((s) => s.driving);
  const unlocked = useBuggy((s) => s.unlocked);
  const talk = useGame((s) => s.talkTarget);
  const dialogue = useGame((s) => s.dialogue);
  useProgress((s) => s.quests.toolbox); // re-render when the quest starts
  const show = driving ? "out" : near && !talk && !dialogue ? (unlocked ? "in" : "locked") : null;
  const [shown, leaving] = useExit(show);
  if (!shown) return null;
  const fire = () => window.dispatchEvent(new Event(shown === "out" ? "cq-buggy-exit" : "cq-buggy-enter"));
  return (
    <>
      <button
        className={leaving ? "talk-prompt buggy-prompt ui-leave" : "talk-prompt buggy-prompt"}
        onClick={fire}
        onContextMenu={(e) => e.preventDefault()}
      >
        <InteractKey /> {shown === "out" ? t("buggy.out") : shown === "in" ? `🚙 ${t("buggy.in")}` : t(lockedKey())}
      </button>
      {shown === "out" && !IS_TOUCH && !leaving && <p className="buggy-keys">{t("buggy.keys")}</p>}
    </>
  );
}
