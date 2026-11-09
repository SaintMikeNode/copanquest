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
}

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
    set({ activePoi: id, dismissedPoi: id === s.dismissedPoi ? s.dismissedPoi : null });
  },
  dismissPoi: () => set({ dismissedPoi: get().activePoi }),

  overlay: null,
  setOverlay: (overlay) => set({ overlay }),
}));

/** Effective render level after resolving "auto". */
export const useQualityLevel = () =>
  useGame((s) => (s.quality === "auto" ? s.autoLevel : s.quality));
