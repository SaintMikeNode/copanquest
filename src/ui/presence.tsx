// Enter / exit animations for UI panels (dialogue, place cards, prompts, windows).
// Entering is plain CSS (each panel's class has an `animation`). Leaving needs the panel to stay
// on screen a moment after its state is gone: useExit keeps the last value for EXIT_MS and says
// it's leaving, so the component can still render it with the `ui-leave` class. The keyframes
// (styles.css, "UI enter / exit") only animate opacity and the individual translate / scale
// properties, which run on the compositor and leave each panel's own transform (centering) alone.
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Length of the exit animations (matches the `ui-*-out` keyframes). */
export const EXIT_MS = 190;

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The value to render: `value` while it's set, then the last one for EXIT_MS after it goes away
 * (with `leaving` true), then null.
 */
export function useExit<T>(value: T | null | undefined | false): [T | null, boolean] {
  const live = value === null || value === undefined || value === false ? null : value;
  const last = useRef<T | null>(live);
  // The value whose exit animation has finished (it is then no longer rendered).
  const [finished, setFinished] = useState<{ v: T } | null>(null);
  if (live !== null) last.current = live;
  // A new value: forget the finished one (so the same value can animate out again later).
  if (live !== null && finished !== null) setFinished(null);
  // The last value stays on screen from the very first render after it goes away: there must be
  // no frame without it, or the component would rebuild its content from changed state.
  const held = live === null && last.current !== null && !(finished && finished.v === last.current) ? last.current : null;
  useEffect(() => {
    if (live !== null || last.current === null) return;
    const v = last.current;
    if (reduced()) {
      setFinished({ v });
      return;
    }
    const t = window.setTimeout(() => setFinished({ v }), EXIT_MS);
    return () => clearTimeout(t);
  }, [live]);
  if (live !== null) return [live, false];
  return held !== null ? [held, true] : [null, false];
}

/**
 * For whole windows whose content doesn't depend on being open (journal, map, pause…): renders
 * `children` while `show`, and the same children inside a `ui-leave` wrapper while they animate
 * out. The wrapper is `display: contents`, so layout is untouched.
 */
export function Presence({ show, children }: { show: boolean; children: ReactNode }) {
  const kept = useRef<ReactNode>(null);
  if (show) kept.current = children;
  const [held, leaving] = useExit(show ? true : null);
  if (!held) return null;
  return <div className={leaving ? "ui-presence ui-leave" : "ui-presence"}>{show ? children : kept.current}</div>;
}
