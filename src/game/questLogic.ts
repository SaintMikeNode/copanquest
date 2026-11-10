// Turns quest state into dialogue scripts, and handles finishing quests.
import type { L10n } from "../i18n";
import { getT } from "../i18n";
import { useGame } from "../state/useGame";
import { play } from "../audio/sound";
import { computeXp, rankIndex, RANKS, useProgress } from "../state/progress";
import { QUESTS, type QuestCheck } from "./gameData";
import { talkInfo, TALKERS } from "../npc/npcData";

export function questCheck(): QuestCheck {
  const p = useProgress.getState();
  return {
    items: p.items,
    photos: Object.keys(p.photos),
    solvedGlyphs: p.solvedGlyphs.length,
    ballScore: p.ballScore,
    turkeys: p.turkeys.length,
    artifacts: p.artifacts.length,
  };
}

export function questsOf(npc: string) {
  return QUESTS.filter((q) => q.giver === npc);
}

export interface Script {
  name: L10n;
  lines: L10n[];
  /** Runs when the dialogue is closed after the last line. */
  onEnd?: () => void;
}

/** The current quest an NPC cares about: first not-done one, in order. */
function currentQuest(npc: string) {
  const states = useProgress.getState().quests;
  return questsOf(npc).find((q) => states[q.id] !== "done");
}

export function scriptFor(id: string): Script | null {
  const info = talkInfo(id);
  if (!info) return null;
  const q = currentQuest(id);
  if (!q) return { name: info.name, lines: info.lines };
  const state = useProgress.getState().quests[q.id];
  const [have, need] = q.progress(questCheck());
  if (!state) {
    // First meeting: introduce yourself, then ask for help.
    const intro = info.lines;
    return { name: info.name, lines: [...intro, ...q.offer], onEnd: () => useProgress.getState().startQuest(q.id) };
  }
  if (have < need) {
    const r = q.remind;
    return {
      name: info.name,
      lines: [{ es: `${r.es} (${have}/${need})`, en: `${r.en} (${have}/${need})` }],
      onEnd: id === "scribe" ? () => useGame.getState().setOverlay("glyphs") : undefined,
    };
  }
  return { name: info.name, lines: q.done, onEnd: () => completeQuest(q.id) };
}

export function completeQuest(id: string) {
  const q = QUESTS.find((x) => x.id === id);
  if (!q) return;
  const before = rankIndex(computeXp());
  const p = useProgress.getState();
  if (q.consume) p.useItems(q.consume[0], q.consume[1]);
  p.finishQuest(id);
  const t = getT();
  const l = useGame.getState().lang;
  useGame.getState().showToast(`${t("quest.done")} ${q.title[l]} · +50 XP`);
  checkRankUp(before);
}

/** Show a celebration when an action pushed the player into a new rank. */
export function checkRankUp(before: number) {
  const after = rankIndex(computeXp());
  if (after > before) {
    const l = useGame.getState().lang;
    const t = getT();
    setTimeout(() => {
      useGame.getState().showToast(`${t("rank.up")} ${RANKS[after].name[l]}! ${RANKS[after].reward[l]}`);
      play("rankup");
    }, 3300);
  }
}

export type QuestMark = "new" | "ready" | "busy";

/** What each quest giver's floating sign shows (QuestMarkers.tsx); no entry = no sign. */
export function questMarks(): Record<string, QuestMark> {
  const marks: Record<string, QuestMark> = {};
  for (const t of TALKERS) {
    const q = currentQuest(t.id);
    if (!q) continue;
    if (!useProgress.getState().quests[q.id]) marks[t.id] = "new";
    else {
      const [have, need] = q.progress(questCheck());
      marks[t.id] = have >= need ? "ready" : "busy";
    }
  }
  return marks;
}
