const params = new URLSearchParams(window.location.search);

/** Dev tools (physics debug, debug panel) are on in `npm run dev` or with `?debug` in the URL. */
export const DEV_TOOLS = import.meta.env.DEV || params.has("debug");

/** Force touch controls on desktop for testing with `?touch`. */
export const FORCE_TOUCH = params.has("touch");

export const IS_TOUCH =
  FORCE_TOUCH || (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches);
