// Game progression: quests, inventory, photos, glyphs, artifacts, ballgame, XP and ranks.
// Saved in localStorage (photos separately, they're bigger).
import { create } from "zustand";
import { useGame } from "./useGame";
import type { L10n } from "../i18n";

export type QuestState = "active" | "done";

interface ProgressState {
  quests: Record<string, QuestState>;
  items: Record<string, number>;
  /** World pickups already taken (they don't respawn). */
  picked: string[];
  solvedGlyphs: string[];
  artifacts: string[];
  dug: string[];
  ballScore: number;
  /** Turkeys returned home. */
  turkeys: string[];
  /** Subject id → small JPEG data URL. */
  photos: Record<string, string>;

  startQuest: (id: string) => void;
  finishQuest: (id: string) => void;
  addItem: (item: string, n?: number, pickupId?: string) => void;
  useItems: (item: string, n: number) => void;
  solveGlyph: (id: string) => void;
  addArtifact: (siteId: string, artifact: string) => void;
  scoreBall: () => void;
  returnTurkey: (id: string) => void;
  addPhoto: (subject: string, dataUrl: string) => void;
}

const KEY = "cq-progress-v2";
const PHOTO_KEY = "cq-photos-v1";

type Saved = Omit<ProgressState, keyof Actions>;
type Actions = Pick<
  ProgressState,
  "startQuest" | "finishQuest" | "addItem" | "useItems" | "solveGlyph" | "addArtifact" | "scoreBall" | "returnTurkey" | "addPhoto"
>;

function load(): Saved {
  const base: Saved = { quests: {}, items: {}, picked: [], solvedGlyphs: [], artifacts: [], dug: [], ballScore: 0, turkeys: [], photos: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(base, JSON.parse(raw));
    const ph = localStorage.getItem(PHOTO_KEY);
    if (ph) base.photos = JSON.parse(ph);
  } catch {
    /* storage unavailable */
  }
  return base;
}

function save(s: Saved) {
  try {
    const { photos, ...rest } = s;
    localStorage.setItem(KEY, JSON.stringify(rest));
    localStorage.setItem(PHOTO_KEY, JSON.stringify(photos));
  } catch {
    /* full or unavailable — progress still works this session */
  }
}

export const useProgress = create<ProgressState>((set, get) => {
  const commit = (patch: Partial<Saved>) => {
    set(patch);
    const s = get();
    save({
      quests: s.quests,
      items: s.items,
      picked: s.picked,
      solvedGlyphs: s.solvedGlyphs,
      artifacts: s.artifacts,
      dug: s.dug,
      ballScore: s.ballScore,
      turkeys: s.turkeys,
      photos: s.photos,
    });
  };
  return {
    ...load(),
    startQuest: (id) => {
      if (!get().quests[id]) commit({ quests: { ...get().quests, [id]: "active" } });
    },
    finishQuest: (id) => commit({ quests: { ...get().quests, [id]: "done" } }),
    addItem: (item, n = 1, pickupId) =>
      commit({
        items: { ...get().items, [item]: (get().items[item] ?? 0) + n },
        picked: pickupId ? [...get().picked, pickupId] : get().picked,
      }),
    useItems: (item, n) => commit({ items: { ...get().items, [item]: Math.max(0, (get().items[item] ?? 0) - n) } }),
    solveGlyph: (id) => {
      if (!get().solvedGlyphs.includes(id)) commit({ solvedGlyphs: [...get().solvedGlyphs, id] });
    },
    addArtifact: (siteId, artifact) => commit({ dug: [...get().dug, siteId], artifacts: [...get().artifacts, artifact] }),
    scoreBall: () => commit({ ballScore: get().ballScore + 1 }),
    returnTurkey: (id) => {
      if (!get().turkeys.includes(id)) commit({ turkeys: [...get().turkeys, id] });
    },
    addPhoto: (subject, dataUrl) => commit({ photos: { ...get().photos, [subject]: dataUrl } }),
  };
});

// ---------------------------------------------------------------- XP and ranks

export const RANKS: { xp: number; name: L10n; reward: L10n }[] = [
  { xp: 0, name: { es: "Turista", en: "Tourist" }, reward: { es: "Tu cámara de explorador", en: "Your explorer's camera" } },
  { xp: 120, name: { es: "Explorador/a", en: "Explorer" }, reward: { es: "Binoculares: la cámara hace zoom", en: "Binoculars: the camera can zoom" } },
  { xp: 350, name: { es: "Arqueólogo/a", en: "Archaeologist" }, reward: { es: "El lente del tiempo: mira Copán en el año 800", en: "The time lens: see Copán in the year 800" } },
  { xp: 700, name: { es: "Guardián/a de Copán", en: "Guardian of Copán" }, reward: { es: "El sombrero de jade", en: "The jade hat" } },
];

export function computeXp(): number {
  const g = useGame.getState();
  const p = useProgress.getState();
  return (
    g.places.length * 10 +
    g.met.filter((m) => !m.startsWith("jaguar")).length * 10 +
    g.jades.length * 25 +
    Object.keys(p.photos).length * 15 +
    Object.values(p.quests).filter((q) => q === "done").length * 50 +
    p.solvedGlyphs.length * 20 +
    p.artifacts.length * 20 +
    Math.min(p.ballScore, 5) * 10
  );
}

export function rankIndex(xp: number) {
  let r = 0;
  RANKS.forEach((k, i) => {
    if (xp >= k.xp) r = i;
  });
  return r;
}

/** XP as a React value (re-renders when any source changes). */
export function useXp() {
  useGame((s) => s.places.length + s.met.length * 100 + s.jades.length * 10000);
  useProgress((s) => s);
  return computeXp();
}

export const lensUnlocked = (xp: number) => rankIndex(xp) >= 2;
export const binocularsUnlocked = (xp: number) => rankIndex(xp) >= 1;
export const jadeHatUnlocked = (xp: number) => rankIndex(xp) >= 3;
