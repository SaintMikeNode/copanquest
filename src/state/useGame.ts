import { create } from "zustand";
import type { Lang } from "../i18n";

export type Quality = "auto" | "high" | "low";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("cq-lang");
    if (saved === "es" || saved === "en") return saved;
  } catch {
    /* storage unavailable */
  }
  return "es";
}

interface GameState {
  lang: Lang;
  setLang: (lang: Lang) => void;

  playing: boolean;
  setPlaying: (playing: boolean) => void;

  /** User's choice; "auto" lets PerformanceMonitor pick. */
  quality: Quality;
  setQuality: (q: Quality) => void;
  /** What "auto" has settled on. */
  autoLevel: "high" | "low";
  setAutoLevel: (l: "high" | "low") => void;

  showDebug: boolean;
  physicsDebug: boolean;
  toggleDebug: () => void;
  togglePhysicsDebug: () => void;

  /** Point of interest the player is standing near (null = none). */
  activePoi: string | null;
  /** POI whose card the player closed; it stays hidden until they walk away. */
  dismissedPoi: string | null;
  setActivePoi: (id: string | null) => void;
  dismissPoi: () => void;

  overlay: null | "credits" | "map" | "help";
  setOverlay: (o: GameState["overlay"]) => void;

  /** Character or animal the player can talk to / observe right now. */
  talkTarget: string | null;
  setTalkTarget: (id: string | null) => void;
  /** Open dialogue: who and which line. */
  dialogue: { id: string; line: number } | null;
  openDialogue: (id: string) => void;
  nextLine: (lineCount: number) => void;
  closeDialogue: () => void;

  /** Saved progress. */
  jades: string[];
  collectJade: (id: string) => void;
  met: string[];
  places: string[];
  toast: { text: string; key: number } | null;
  showToast: (text: string) => void;
}

const SAVE_KEY = "cq-progress-v1";
function loadProgress(): { jades: string[]; met: string[]; places: string[] } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { jades: [], met: [], places: [], ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return { jades: [], met: [], places: [] };
}
function saveProgress(p: { jades: string[]; met: string[]; places: string[] }) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
const initialProgress = loadProgress();

export const useGame = create<GameState>((set, get) => ({
  lang: initialLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem("cq-lang", lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
    set({ lang });
  },

  playing: false,
  setPlaying: (playing) => set({ playing }),

  quality: "auto",
  setQuality: (quality) => set({ quality }),
  autoLevel: "high",
  setAutoLevel: (autoLevel) => set({ autoLevel }),

  showDebug: false,
  physicsDebug: false,
  toggleDebug: () => set({ showDebug: !get().showDebug }),
  togglePhysicsDebug: () => set({ physicsDebug: !get().physicsDebug }),

  activePoi: null,
  dismissedPoi: null,
  setActivePoi: (id) => {
    const s = get();
    if (s.activePoi === id) return;
    const places = id && !s.places.includes(id) ? [...s.places, id] : s.places;
    set({ activePoi: id, dismissedPoi: id === s.dismissedPoi ? s.dismissedPoi : null, places });
    if (places !== s.places) saveProgress({ jades: s.jades, met: s.met, places });
  },
  dismissPoi: () => set({ dismissedPoi: get().activePoi }),

  overlay: null,
  setOverlay: (overlay) => set({ overlay }),

  talkTarget: null,
  setTalkTarget: (talkTarget) => {
    if (get().talkTarget !== talkTarget) set({ talkTarget });
  },
  dialogue: null,
  openDialogue: (id) => {
    const s = get();
    const met = s.met.includes(id) ? s.met : [...s.met, id];
    set({ dialogue: { id, line: 0 }, met });
    if (met !== s.met) saveProgress({ jades: s.jades, met, places: s.places });
  },
  nextLine: (lineCount) => {
    const d = get().dialogue;
    if (!d) return;
    set({ dialogue: d.line + 1 >= lineCount ? null : { id: d.id, line: d.line + 1 } });
  },
  closeDialogue: () => set({ dialogue: null }),

  jades: initialProgress.jades,
  collectJade: (id) => {
    const s = get();
    if (s.jades.includes(id)) return;
    const jades = [...s.jades, id];
    set({ jades });
    saveProgress({ jades, met: s.met, places: s.places });
  },
  met: initialProgress.met,
  places: initialProgress.places,
  toast: null,
  showToast: (text) => set({ toast: { text, key: Date.now() } }),
}));

/** Effective render level after resolving "auto". */
export const useQualityLevel = () =>
  useGame((s) => (s.quality === "auto" ? s.autoLevel : s.quality));
